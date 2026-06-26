//! Export engine. A small block document model is built from a project + Prompt
//! Pack, then rendered to Markdown, PDF, or DOCX. JSON is a direct serialization.

use crate::models::{Character, Environment, Project, PromptPack, Prop};
use anyhow::Result;
use serde::Serialize;

/// Lightweight document model shared by every renderer.
pub enum Block {
    H1(String),
    H2(String),
    H3(String),
    Para(String),
    Bullet(String),
    Spacer,
}

fn kv(label: &str, value: &str) -> Block {
    Block::Bullet(format!("{label}: {value}"))
}

/// Build the document outline from a project and its Prompt Pack.
pub fn build_blocks(project: &Project, pack: &PromptPack) -> Vec<Block> {
    let cd = &pack.creative_direction;
    let st = &pack.style;
    let mut b = Vec::new();

    b.push(Block::H1(if cd.working_title.is_empty() {
        project.name.clone()
    } else {
        cd.working_title.clone()
    }));
    b.push(Block::Para(format!(
        "{} · {} · {} · {}",
        project.project_type, cd.aspect_ratio, cd.duration, project.status
    )));
    b.push(Block::Spacer);

    b.push(Block::H2("Creative Direction".into()));
    if !cd.goal.is_empty() {
        b.push(Block::Para(cd.goal.clone()));
    }
    b.push(kv("Audience", &cd.audience));
    b.push(kv("Emotional Tone", &cd.emotional_tone));
    b.push(kv("Duration", &cd.duration));
    b.push(kv("Aspect Ratio", &cd.aspect_ratio));
    b.push(kv("Recommended Models", &cd.recommended_models.join(", ")));
    b.push(Block::Spacer);

    b.push(Block::H2("Style".into()));
    b.push(kv("Visual Language", &st.visual_language));
    b.push(kv("Color Palette", &st.color_palette.join(", ")));
    b.push(kv("Typography", &st.typography));
    b.push(kv("Materials", &st.materials));
    b.push(kv("Mood", &st.mood));
    b.push(kv("Atmosphere", &st.atmosphere));
    b.push(Block::Spacer);

    b.push(Block::H2("Shot Breakdown".into()));
    for shot in &pack.shots {
        b.push(Block::H3(format!("Shot {} — {}", shot.number, shot.name)));
        if !shot.visual_description.is_empty() {
            b.push(Block::Para(shot.visual_description.clone()));
        }
        b.push(kv("Purpose", &shot.purpose));
        b.push(kv("Duration", &shot.duration));
        b.push(kv("Transition", &shot.transition));
        b.push(kv("Audio", &shot.audio));

        let c = &shot.camera;
        b.push(kv(
            "Camera",
            &format!(
                "{} | {} | {} | {} | {}",
                c.shot_type, c.lens, c.camera_height, c.camera_angle, c.movement
            ),
        ));
        b.push(kv("Composition", &c.composition));
        b.push(kv(
            "Camera Purpose",
            &format!("{} / {}", c.emotional_purpose, c.editorial_purpose),
        ));

        let l = &shot.lighting;
        b.push(kv(
            "Lighting",
            &format!(
                "{} | key: {} | fill: {} | rim: {}",
                l.scene_intent, l.key_light, l.fill_light, l.rim_light
            ),
        ));
        b.push(kv(
            "Light Detail",
            &format!(
                "{} | {} | {}",
                l.color_temperature, l.contrast_ratio, l.atmosphere
            ),
        ));
        b.push(Block::Spacer);
    }

    b.push(Block::H2("QC Checklist".into()));
    for item in &pack.qc_checklist {
        let mark = if item.checked { "[x]" } else { "[ ]" };
        b.push(Block::Bullet(format!("{mark} {}", item.label)));
    }

    b
}

// ---------------------------------------------------------------------------
// Visual Production Bible — every Character / Environment / Prop DNA in one doc.
// ---------------------------------------------------------------------------

fn kv_opt(b: &mut Vec<Block>, label: &str, value: &str) {
    if !value.trim().is_empty() {
        b.push(kv(label, value));
    }
}

pub fn build_bible_blocks(
    characters: &[Character],
    environments: &[Environment],
    props: &[Prop],
) -> Vec<Block> {
    let mut b = Vec::new();
    b.push(Block::H1("Visual Production Bible".into()));
    b.push(Block::Para(format!(
        "{} characters · {} environments · {} props & vehicles",
        characters.len(),
        environments.len(),
        props.len()
    )));
    b.push(Block::Spacer);

    b.push(Block::H2("Characters".into()));
    if characters.is_empty() {
        b.push(Block::Para("No characters defined yet.".into()));
    }
    for c in characters {
        let role = [c.role.as_str(), c.occupation.as_str()]
            .iter()
            .filter(|s| !s.is_empty())
            .cloned()
            .collect::<Vec<_>>()
            .join(" · ");
        b.push(Block::H3(format!(
            "{}{}{}",
            c.name,
            if role.is_empty() { "" } else { " — " },
            role
        )));
        kv_opt(&mut b, "Identity", &[c.age.as_str(), c.gender.as_str()].join(" ").trim().to_string());
        kv_opt(&mut b, "Face", &[c.face_shape.as_str(), c.eye_shape.as_str(), c.eye_color.as_str(), c.skin_tone.as_str(), c.distinguishing_features.as_str()].iter().filter(|s| !s.is_empty()).cloned().collect::<Vec<_>>().join(", "));
        kv_opt(&mut b, "Hair", &[c.hair_style.as_str(), c.hair_color.as_str()].iter().filter(|s| !s.is_empty()).cloned().collect::<Vec<_>>().join(", "));
        kv_opt(&mut b, "Body", &c.body_type);
        kv_opt(&mut b, "Wardrobe", &[c.primary_outfit.as_str(), c.accessories.as_str()].iter().filter(|s| !s.is_empty()).cloned().collect::<Vec<_>>().join("; "));
        kv_opt(&mut b, "Personality", &c.traits);
        kv_opt(&mut b, "Motivations", &c.motivations);
        kv_opt(&mut b, "Goals", &c.goals);
        kv_opt(&mut b, "Prompt DNA", &c.prompt_dna);
        kv_opt(&mut b, "Consistency Rules", &c.consistency_rules.replace('\n', " "));
        b.push(Block::Bullet(format!(
            "Status: {}",
            if c.locked { "Canon (locked)" } else { "Draft" }
        )));
        b.push(Block::Spacer);
    }

    b.push(Block::H2("World / Environments".into()));
    if environments.is_empty() {
        b.push(Block::Para("No environments defined yet.".into()));
    }
    for e in environments {
        b.push(Block::H3(e.name.clone()));
        kv_opt(&mut b, "Description", &e.description);
        kv_opt(&mut b, "Architecture", &e.architecture);
        kv_opt(&mut b, "Materials", &e.materials);
        kv_opt(&mut b, "Time of Day", &e.time_of_day);
        kv_opt(&mut b, "Lighting", &e.lighting_style);
        kv_opt(&mut b, "Mood", &e.mood);
        kv_opt(&mut b, "Color Palette", &e.color_palette.join(", "));
        kv_opt(&mut b, "Key Props", &e.key_props);
        kv_opt(&mut b, "Prompt DNA", &e.prompt_dna);
        kv_opt(&mut b, "Rules", &e.environment_rules);
        b.push(Block::Bullet(format!(
            "Status: {}",
            if e.locked { "Canon (locked)" } else { "Draft" }
        )));
        b.push(Block::Spacer);
    }

    b.push(Block::H2("Props & Vehicles".into()));
    if props.is_empty() {
        b.push(Block::Para("No props defined yet.".into()));
    }
    for p in props {
        b.push(Block::H3(format!("{} — {}", p.name, p.category)));
        kv_opt(&mut b, "Materials", &p.materials);
        kv_opt(&mut b, "Condition", &p.condition);
        kv_opt(&mut b, "Dimensions", &p.dimensions);
        kv_opt(&mut b, "Color Palette", &p.color_palette.join(", "));
        kv_opt(&mut b, "Usage", &p.usage);
        kv_opt(&mut b, "Story Significance", &p.story_significance);
        kv_opt(&mut b, "Prompt DNA", &p.prompt_dna);
        b.push(Block::Bullet(format!(
            "Status: {}",
            if p.locked { "Canon (locked)" } else { "Draft" }
        )));
        b.push(Block::Spacer);
    }

    b
}

#[derive(Serialize)]
struct BibleJson<'a> {
    characters: &'a [Character],
    environments: &'a [Environment],
    props: &'a [Prop],
}

pub fn bible_to_json(
    characters: &[Character],
    environments: &[Environment],
    props: &[Prop],
) -> Result<String> {
    Ok(serde_json::to_string_pretty(&BibleJson {
        characters,
        environments,
        props,
    })?)
}

// ---------------------------------------------------------------------------
// Renderers
// ---------------------------------------------------------------------------

pub fn to_markdown(blocks: &[Block]) -> String {
    let mut s = String::new();
    for block in blocks {
        match block {
            Block::H1(t) => s.push_str(&format!("# {t}\n\n")),
            Block::H2(t) => s.push_str(&format!("## {t}\n\n")),
            Block::H3(t) => s.push_str(&format!("### {t}\n\n")),
            Block::Para(t) => s.push_str(&format!("{t}\n\n")),
            Block::Bullet(t) => s.push_str(&format!("- {t}\n")),
            Block::Spacer => s.push('\n'),
        }
    }
    s
}

#[derive(Serialize)]
struct JsonExport<'a> {
    project: &'a Project,
    pack: &'a PromptPack,
}

pub fn to_json(project: &Project, pack: &PromptPack) -> Result<String> {
    Ok(serde_json::to_string_pretty(&JsonExport { project, pack })?)
}

pub fn to_pdf(blocks: &[Block]) -> Result<Vec<u8>> {
    use printpdf::{BuiltinFont, Mm, PdfDocument};

    const W: f32 = 210.0;
    const H: f32 = 297.0;
    const LEFT: f32 = 18.0;
    const TOP: f32 = 280.0;
    const BOTTOM: f32 = 18.0;

    let (doc, page1, layer1) = PdfDocument::new("MotionForge Export", Mm(W), Mm(H), "Layer 1");
    let regular = doc.add_builtin_font(BuiltinFont::Helvetica)?;
    let bold = doc.add_builtin_font(BuiltinFont::HelveticaBold)?;

    let mut layer = doc.get_page(page1).get_layer(layer1);
    let mut y = TOP;

    // Naive width-based wrapping (Helvetica avg ~0.5em).
    let wrap = |text: &str, size: f32| -> Vec<String> {
        let usable_mm = W - LEFT - 12.0;
        let char_mm = size * 0.35 * 0.3528; // pt→mm rough
        let max_chars = ((usable_mm / char_mm) as usize).max(20);
        let mut lines = Vec::new();
        let mut line = String::new();
        for word in text.split_whitespace() {
            if line.len() + word.len() + 1 > max_chars {
                lines.push(std::mem::take(&mut line));
            }
            if !line.is_empty() {
                line.push(' ');
            }
            line.push_str(word);
        }
        if !line.is_empty() {
            lines.push(line);
        }
        if lines.is_empty() {
            lines.push(String::new());
        }
        lines
    };

    let emit = |doc_layer: &mut printpdf::PdfLayerReference,
                    y: &mut f32,
                    text: &str,
                    size: f32,
                    is_bold: bool,
                    gap: f32| {
        for line in wrap(text, size) {
            if *y < BOTTOM {
                let (p, l) = doc.add_page(Mm(W), Mm(H), "Layer 1");
                *doc_layer = doc.get_page(p).get_layer(l);
                *y = TOP;
            }
            let font = if is_bold { &bold } else { &regular };
            doc_layer.use_text(line, size, Mm(LEFT), Mm(*y), font);
            *y -= size * 0.45 + 1.0;
        }
        *y -= gap;
    };

    for block in blocks {
        match block {
            Block::H1(t) => emit(&mut layer, &mut y, t, 22.0, true, 3.0),
            Block::H2(t) => emit(&mut layer, &mut y, t, 15.0, true, 2.0),
            Block::H3(t) => emit(&mut layer, &mut y, t, 12.0, true, 1.0),
            Block::Para(t) => emit(&mut layer, &mut y, t, 10.0, false, 2.0),
            Block::Bullet(t) => emit(&mut layer, &mut y, &format!("•  {t}"), 10.0, false, 0.5),
            Block::Spacer => y -= 3.0,
        }
    }

    let mut buf = std::io::Cursor::new(Vec::<u8>::new());
    doc.save(&mut std::io::BufWriter::new(&mut buf))?;
    Ok(buf.into_inner())
}

pub fn to_docx(blocks: &[Block]) -> Result<Vec<u8>> {
    use docx_rs::*;

    let mut docx = Docx::new();
    let para = |text: &str, size: usize, bold: bool| {
        let mut run = Run::new().add_text(text).size(size);
        if bold {
            run = run.bold();
        }
        Paragraph::new().add_run(run)
    };

    for block in blocks {
        docx = match block {
            Block::H1(t) => docx.add_paragraph(para(t, 40, true)),
            Block::H2(t) => docx.add_paragraph(para(t, 30, true)),
            Block::H3(t) => docx.add_paragraph(para(t, 26, true)),
            Block::Para(t) => docx.add_paragraph(para(t, 22, false)),
            Block::Bullet(t) => docx.add_paragraph(para(&format!("•  {t}"), 22, false)),
            Block::Spacer => docx.add_paragraph(Paragraph::new()),
        };
    }

    let mut buf = std::io::Cursor::new(Vec::<u8>::new());
    docx.build().pack(&mut buf)?;
    Ok(buf.into_inner())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::*;

    fn sample() -> (Project, PromptPack) {
        let project = Project {
            id: "p1".into(),
            name: "Test".into(),
            description: "d".into(),
            project_type: "SaaS Product".into(),
            status: "draft".into(),
            aspect_ratio: "16:9".into(),
            duration: "30s".into(),
            emotional_tone: "confident".into(),
            created_at: "now".into(),
            updated_at: "now".into(),
        };
        let pack = PromptPack {
            creative_direction: CreativeDirection {
                working_title: "Pulse Launch".into(),
                goal: "Sell the product".into(),
                audience: "Devs".into(),
                duration: "30s".into(),
                aspect_ratio: "16:9".into(),
                emotional_tone: "confident".into(),
                recommended_models: vec!["Gemini".into(), "fal".into()],
            },
            style: Style {
                visual_language: "Dark premium".into(),
                color_palette: vec!["#000".into()],
                typography: "Inter".into(),
                materials: "glass".into(),
                mood: "focused".into(),
                atmosphere: "haze".into(),
            },
            shots: vec![ShotBreakdown {
                number: 1,
                name: "Cold Open".into(),
                purpose: "hook".into(),
                duration: "3s".into(),
                visual_description: "Logo resolves from particles in a dark studio".into(),
                camera_movement: "push in".into(),
                transition: "match cut".into(),
                audio: "riser".into(),
                locked: false,
                image_url: String::new(),
                video_url: String::new(),
                camera: CameraPlan {
                    shot_type: "MCU".into(),
                    lens: "50mm".into(),
                    ..Default::default()
                },
                lighting: LightingPlan {
                    key_light: "soft key".into(),
                    ..Default::default()
                },
            }],
            qc_checklist: vec![QcItem {
                label: "Text readability".into(),
                checked: true,
            }],
        };
        (project, pack)
    }

    #[test]
    fn renders_all_formats() {
        let (project, pack) = sample();
        let blocks = build_blocks(&project, &pack);

        let md = to_markdown(&blocks);
        assert!(md.contains("# Pulse Launch"));
        assert!(md.contains("## Shot Breakdown"));
        assert!(md.contains("Shot 1 — Cold Open"));
        assert!(md.contains("[x] Text readability"));

        let json = to_json(&project, &pack).unwrap();
        assert!(json.contains("\"workingTitle\": \"Pulse Launch\""));

        let pdf = to_pdf(&blocks).unwrap();
        assert!(pdf.len() > 1000, "pdf too small: {}", pdf.len());
        assert_eq!(&pdf[0..4], b"%PDF");

        let docx = to_docx(&blocks).unwrap();
        assert!(docx.len() > 1000, "docx too small: {}", docx.len());
        assert_eq!(&docx[0..2], b"PK"); // zip magic
    }
}
