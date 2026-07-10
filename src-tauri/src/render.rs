//! Music-video render — assemble per-shot stills/clips into one MP4, muxed to
//! the song audio, via FFmpeg.
//!
//! Each segment is normalized to the same resolution / fps / codec (so the
//! concat demuxer can stream-copy them), then concatenated, then the master
//! audio is muxed on top and trimmed to the shorter stream. FFmpeg must be on
//! PATH (or pointed to by the `MOTIONFORGE_FFMPEG` env var) — it's already a
//! declared media dependency of the app.

use std::path::{Path, PathBuf};
use uuid::Uuid;

/// One timeline segment: a still image or a video clip held for `duration` secs.
#[derive(serde::Deserialize)]
pub struct Segment {
    /// Absolute path to the source image or video.
    pub src: String,
    /// How long this segment occupies on the timeline, in seconds.
    pub duration: f64,
}

/// A generated spoken/vocal layer to mix on top of the master track, delayed to
/// start at `at_sec` on the timeline.
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoiceLayer {
    /// Absolute path to the audio file.
    pub src: String,
    /// Start time on the timeline, in seconds.
    #[serde(default)]
    pub at_sec: f64,
    /// Linear gain applied to this layer (1.0 = unchanged).
    #[serde(default = "default_volume")]
    pub volume: f64,
    /// When true, the master track ducks (sidechain-compresses) under this layer.
    #[serde(default)]
    pub duck: bool,
}

fn default_volume() -> f64 {
    1.0
}

fn is_image(path: &str) -> bool {
    let lower = path.to_lowercase();
    [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"]
        .iter()
        .any(|ext| lower.ends_with(ext))
}

/// Run ffmpeg with the given args, surfacing the tail of stderr on failure.
fn run(bin: &str, args: &[String]) -> Result<(), String> {
    let mut cmd = std::process::Command::new(bin);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    }
    let output = cmd
        .args(args)
        .output()
        .map_err(|e| format!("Could not launch FFmpeg ('{bin}'): {e}."))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let tail: Vec<&str> = stderr.lines().rev().take(10).collect();
        let tail: Vec<&str> = tail.into_iter().rev().collect();
        return Err(format!("FFmpeg failed:\n{}", tail.join("\n")));
    }
    Ok(())
}

/// Scale+pad filter that fits any source into width×height without distortion.
fn video_filter(width: u32, height: u32, fps: u32) -> String {
    format!(
        "scale={w}:{h}:force_original_aspect_ratio=decrease,\
         pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps={fps},format=yuv420p",
        w = width,
        h = height,
        fps = fps
    )
}

/// Normalize a single segment into a self-contained intermediate clip.
fn render_segment(
    bin: &str,
    seg: &Segment,
    out: &Path,
    width: u32,
    height: u32,
    fps: u32,
) -> Result<(), String> {
    let dur = seg.duration.max(0.2);
    let vf = video_filter(width, height, fps);
    let out_s = out.to_string_lossy().to_string();

    let args: Vec<String> = if is_image(&seg.src) {
        // Hold a still for `dur` seconds.
        vec![
            "-y".into(),
            "-loop".into(),
            "1".into(),
            "-i".into(),
            seg.src.clone(),
            "-t".into(),
            format!("{dur}"),
            "-vf".into(),
            vf,
            "-c:v".into(),
            "libx264".into(),
            "-pix_fmt".into(),
            "yuv420p".into(),
            "-r".into(),
            format!("{fps}"),
            "-an".into(),
            out_s,
        ]
    } else {
        // Loop the clip if it's shorter than the slot, then trim to `dur`.
        vec![
            "-y".into(),
            "-stream_loop".into(),
            "-1".into(),
            "-i".into(),
            seg.src.clone(),
            "-t".into(),
            format!("{dur}"),
            "-vf".into(),
            vf,
            "-c:v".into(),
            "libx264".into(),
            "-pix_fmt".into(),
            "yuv420p".into(),
            "-r".into(),
            format!("{fps}"),
            "-an".into(),
            out_s,
        ]
    };
    run(bin, &args)
}

/// Render the full music video. Returns the output file path.
pub fn render(
    out_dir: &Path,
    ffmpeg: &str,
    width: u32,
    height: u32,
    fps: u32,
    audio: Option<&str>,
    voices: &[VoiceLayer],
    segments: &[Segment],
) -> Result<PathBuf, String> {
    if segments.is_empty() {
        return Err("Nothing to render — no segments supplied.".into());
    }

    let tmp = out_dir.join(format!("tmp_{}", Uuid::new_v4()));
    std::fs::create_dir_all(&tmp).map_err(|e| e.to_string())?;

    // 1) Normalize each segment to an intermediate clip.
    let mut seg_paths: Vec<PathBuf> = Vec::with_capacity(segments.len());
    for (i, seg) in segments.iter().enumerate() {
        let p = tmp.join(format!("seg_{i:04}.mp4"));
        if let Err(e) = render_segment(ffmpeg, seg, &p, width, height, fps) {
            let _ = std::fs::remove_dir_all(&tmp);
            return Err(e);
        }
        seg_paths.push(p);
    }

    // 2) Concat list (forward slashes so the demuxer is happy on Windows too).
    let list_path = tmp.join("list.txt");
    let list = seg_paths
        .iter()
        .map(|p| format!("file '{}'", p.to_string_lossy().replace('\\', "/")))
        .collect::<Vec<_>>()
        .join("\n");
    std::fs::write(&list_path, list).map_err(|e| e.to_string())?;

    let silent = tmp.join("concat.mp4");
    let concat_args: Vec<String> = vec![
        "-y".into(),
        "-f".into(),
        "concat".into(),
        "-safe".into(),
        "0".into(),
        "-i".into(),
        list_path.to_string_lossy().to_string(),
        "-c".into(),
        "copy".into(),
        silent.to_string_lossy().to_string(),
    ];
    if let Err(e) = run(ffmpeg, &concat_args) {
        let _ = std::fs::remove_dir_all(&tmp);
        return Err(e);
    }

    // 3) Mux the master audio + any delayed voice layers onto the silent video.
    let total: f64 = segments.iter().map(|s| s.duration.max(0.2)).sum();
    let master = audio.filter(|p| Path::new(p).exists());
    let voices: Vec<&VoiceLayer> = voices
        .iter()
        .filter(|v| Path::new(&v.src).exists())
        .collect();

    let final_path = out_dir.join(format!("render_{}.mp4", Uuid::new_v4()));
    let silent_s = silent.to_string_lossy().to_string();
    let final_s = final_path.to_string_lossy().to_string();

    let final_args: Vec<String> = if master.is_none() && voices.is_empty() {
        // No audio at all — just finalize the silent cut.
        vec![
            "-y".into(),
            "-i".into(),
            silent_s,
            "-c".into(),
            "copy".into(),
            "-movflags".into(),
            "+faststart".into(),
            final_s,
        ]
    } else if voices.is_empty() {
        // Master only — simple map, trimmed to the shorter stream.
        let audio_path = master.unwrap().to_string();
        vec![
            "-y".into(),
            "-i".into(),
            silent_s,
            "-i".into(),
            audio_path,
            "-map".into(),
            "0:v:0".into(),
            "-map".into(),
            "1:a:0".into(),
            "-c:v".into(),
            "copy".into(),
            "-c:a".into(),
            "aac".into(),
            "-b:a".into(),
            "192k".into(),
            "-shortest".into(),
            "-movflags".into(),
            "+faststart".into(),
            final_s,
        ]
    } else {
        // Master (optional) + delayed, volume-adjusted voices → filter_complex.
        // Layers flagged `duck` sidechain-compress the master so the music dips
        // while they play.
        let mut args: Vec<String> = vec!["-y".into(), "-i".into(), silent_s];
        let mut idx: u32 = 1; // input 0 is the video
        let mut filters: Vec<String> = Vec::new();
        let mut mix_labels: Vec<String> = Vec::new(); // voice streams feeding the final mix
        let mut duck_keys: Vec<String> = Vec::new(); // sidechain keys (ducking voices)

        let master_label = master.map(|a| {
            args.push("-i".into());
            args.push(a.to_string());
            let l = format!("[{idx}:a]");
            idx += 1;
            l
        });

        for (n, v) in voices.iter().enumerate() {
            args.push("-i".into());
            args.push(v.src.clone());
            let delay_ms = (v.at_sec.max(0.0) * 1000.0).round() as i64;
            let vol = if v.volume > 0.0 { v.volume } else { 1.0 };
            // adelay + per-layer volume.
            filters.push(format!(
                "[{idx}:a]adelay={delay_ms}:all=1,volume={vol:.3}[pre{n}]"
            ));
            if v.duck && master_label.is_some() {
                // Split: one copy feeds the mix, one feeds the sidechain key.
                filters.push(format!("[pre{n}]asplit=2[mix{n}][sc{n}]"));
                mix_labels.push(format!("[mix{n}]"));
                duck_keys.push(format!("[sc{n}]"));
            } else {
                mix_labels.push(format!("[pre{n}]"));
            }
            idx += 1;
        }

        // Master, optionally ducked by the sum of the ducking voices.
        if let Some(ml) = master_label {
            let master_for_mix = if duck_keys.is_empty() {
                ml
            } else {
                let key = if duck_keys.len() == 1 {
                    duck_keys[0].clone()
                } else {
                    filters.push(format!(
                        "{}amix=inputs={}:normalize=0[sckey]",
                        duck_keys.join(""),
                        duck_keys.len()
                    ));
                    "[sckey]".into()
                };
                filters.push(format!(
                    "{ml}{key}sidechaincompress=threshold=0.05:ratio=8:attack=15:release=300[duckm]"
                ));
                "[duckm]".to_string()
            };
            mix_labels.insert(0, master_for_mix);
        }

        let aout = if mix_labels.len() == 1 {
            mix_labels[0].clone()
        } else {
            filters.push(format!(
                "{}amix=inputs={}:normalize=0:dropout_transition=0[aout]",
                mix_labels.join(""),
                mix_labels.len()
            ));
            "[aout]".into()
        };

        args.push("-filter_complex".into());
        args.push(filters.join(";"));
        args.push("-map".into());
        args.push("0:v:0".into());
        args.push("-map".into());
        args.push(aout);
        args.push("-c:v".into());
        args.push("copy".into());
        args.push("-c:a".into());
        args.push("aac".into());
        args.push("-b:a".into());
        args.push("192k".into());
        // Clamp to the video length so a late/long voice can't extend the file.
        args.push("-t".into());
        args.push(format!("{total:.3}"));
        args.push("-movflags".into());
        args.push("+faststart".into());
        args.push(final_s);
        args
    };
    let result = run(ffmpeg, &final_args);

    // 4) Best-effort cleanup of the intermediates.
    let _ = std::fs::remove_dir_all(&tmp);

    result.map(|_| final_path)
}
