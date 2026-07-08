// Music-video template system.
//
// Templates are intelligent production blueprints, NOT rigid presets. Each one
// carries a full creative brief (visual style, palette, camera/lighting,
// editing rhythm, performance + dance style, wardrobe/set/prop direction, and
// recommended providers) PLUS direction *biases* the Director Brain uses to
// adapt the blueprint to the user's actual song — location/wardrobe pools, a
// cut-pace multiplier, and a performance lean. The song's tempo, sections,
// energy, and lyrics always drive the result; the template flavors it.

export type TemplateCategory = "Genre" | "Style" | "Format";

/** How strongly a template pushes non-chorus sections toward performance. */
export type PerformanceLean = "balanced" | "performance" | "narrative";

export interface MvTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  tagline: string;
  mood: string;
  accent: string;
  // Creative brief (shown to the user)
  visualStyle: string;
  palette: string[];
  cameraLanguage: string;
  lightingStyle: string;
  editingRhythm: string;
  shotStructure: string;
  performanceStyle: string;
  /** Maps to a Choreography engine style where one fits. */
  danceStyle?: string;
  wardrobe: string;
  setDirection: string;
  props: string;
  recommendedProviders: string[];
  // Director Brain biases
  locations: string[];
  wardrobePool: string[];
  /** Cut-length multiplier: <1 faster cutting, >1 slower/held. */
  cutBias: number;
  lean: PerformanceLean;
}

const T = (t: MvTemplate) => t;

export const TEMPLATES: MvTemplate[] = [
  // ---------------- Genre ----------------
  T({
    id: "afrobeats",
    name: "Afrobeats",
    category: "Genre",
    tagline: "Sun-soaked, communal, full of movement.",
    mood: "Joyful, warm, vibrant",
    accent: "#f59e0b",
    visualStyle: "Saturated, sunlit, textured film grain; vivid color and life.",
    palette: ["#F4A300", "#E0397F", "#19A974", "#2A2A4A"],
    cameraLanguage: "Handheld energy, dolly glides, drone reveals over the crew.",
    lightingStyle: "Golden-hour sun, bounce fill, practical neon at night.",
    editingRhythm: "On-beat cuts to the log drum; bursts of fast cutting in the hook.",
    shotStructure: "Establish world → artist intro → crew dance → chorus payoff.",
    performanceStyle: "Charismatic lead, big crew energy, direct-to-lens joy.",
    danceStyle: "Afrobeats",
    wardrobe: "Street-luxe color, statement prints, gold accents.",
    setDirection: "Rooftops, markets, courtyards, sunset streets.",
    props: "Classic cars, speakers, flags, foliage.",
    recommendedProviders: ["fal (clips)", "Imagen / Nano Banana (frames)", "ElevenLabs (tags)"],
    locations: [
      "sun-soaked rooftop",
      "vibrant market street",
      "palm courtyard at golden hour",
      "neon-lit night block",
    ],
    wardrobePool: ["bold-print street-luxe", "all-white with gold", "color-blocked fits"],
    cutBias: 0.9,
    lean: "performance",
  }),
  T({
    id: "hiphop",
    name: "Hip Hop",
    category: "Genre",
    tagline: "Bold, gritty, larger than life.",
    mood: "Confident, raw, powerful",
    accent: "#d97706",
    visualStyle: "High-contrast, grainy, wide-lens swagger; cinematic grit.",
    palette: ["#0B0B0B", "#D4AF37", "#3A3A3A", "#C0392B"],
    cameraLanguage: "Low-angle hero shots, fisheye energy, snap zooms on the beat.",
    lightingStyle: "Hard key, deep shadow, neon and street practicals.",
    editingRhythm: "Punchy beat-synced cuts; freeze hits on the snare.",
    shotStructure: "Cold open → posted-up verses → crew chorus → flex outro.",
    performanceStyle: "Direct, commanding, posse shots, mean-mug confidence.",
    danceStyle: "Hip Hop",
    wardrobe: "Designer streetwear, chains, statement outerwear.",
    setDirection: "Warehouses, blocks, rooftops, luxury interiors.",
    props: "Cars, jewelry, cash props, motorcycles.",
    recommendedProviders: ["Kling / fal (clips)", "GPT Image / Imagen (frames)"],
    locations: [
      "raw concrete warehouse",
      "night city block",
      "rooftop skyline",
      "luxury penthouse",
    ],
    wardrobePool: ["designer streetwear + chains", "all-black statement fit", "vintage sportswear"],
    cutBias: 0.85,
    lean: "performance",
  }),
  T({
    id: "kpop",
    name: "K-Pop",
    category: "Genre",
    tagline: "Hyper-polished, synchronized, set-piece spectacle.",
    mood: "Bright, sharp, high-concept",
    accent: "#e0397f",
    visualStyle: "Glossy, candy-clean color, immaculate sets, zero grit.",
    palette: ["#FF6FB5", "#7A5CFF", "#00D9FF", "#FFFFFF"],
    cameraLanguage: "Symmetrical dollies, crane moves, precise group framing.",
    lightingStyle: "Bright high-key, colored gels, set-integrated LEDs.",
    editingRhythm: "Tight cuts locked to choreography hits; clean transitions.",
    shotStructure: "Set reveal → member close-ups → unison dance → key-point chorus.",
    performanceStyle: "Flawless synchronized group choreography + idol close-ups.",
    danceStyle: "Pop / Commercial",
    wardrobe: "Coordinated high-fashion sets, multiple wardrobe changes.",
    setDirection: "Built color sets, infinity rooms, stylized rooms.",
    props: "Set pieces, props matched to each concept room.",
    recommendedProviders: ["Kling / fal (clips)", "Nano Banana Pro (frames)"],
    locations: [
      "pastel infinity set",
      "neon concept room",
      "all-white studio cyc",
      "mirror-lined room",
    ],
    wardrobePool: [
      "coordinated high-fashion set",
      "monochrome concept fit",
      "pastel statement look",
    ],
    cutBias: 0.8,
    lean: "performance",
  }),
  T({
    id: "gospel",
    name: "Gospel",
    category: "Genre",
    tagline: "Uplifting, radiant, full of spirit.",
    mood: "Hopeful, soaring, communal",
    accent: "#0e9f6e",
    visualStyle: "Warm, luminous, light-filled; reverent and joyful.",
    palette: ["#F4ECD2", "#D4AF37", "#1C3D5A", "#8A6D3B"],
    cameraLanguage: "Rising cranes, slow pushes, wide choir reveals.",
    lightingStyle: "God-rays, warm key, light streaming through windows.",
    editingRhythm: "Builds with the music; swells into the chorus.",
    shotStructure: "Quiet intro → testimony verses → choir swell → triumphant chorus.",
    performanceStyle: "Heartfelt lead, full choir, hands raised, congregation energy.",
    danceStyle: "Gospel",
    wardrobe: "Robes, elegant Sunday-best, flowing fabrics.",
    setDirection: "Churches, halls, open fields, light-filled rooms.",
    props: "Microphones, instruments, candles.",
    recommendedProviders: ["fal / Veo (clips)", "Imagen (frames)", "ElevenLabs (spoken word)"],
    locations: [
      "light-filled church",
      "open field at sunrise",
      "grand hall with windows",
      "candlelit room",
    ],
    wardrobePool: ["flowing robes", "elegant Sunday-best", "all-white ensemble"],
    cutBias: 1.25,
    lean: "balanced",
  }),
  T({
    id: "rnb",
    name: "R&B",
    category: "Genre",
    tagline: "Sensual, moody, intimate.",
    mood: "Smooth, late-night, emotional",
    accent: "#7c5cff",
    visualStyle: "Soft, moody, shallow focus; rich shadow and skin tones.",
    palette: ["#1A1030", "#7A5CFF", "#C2557F", "#E8C8A0"],
    cameraLanguage: "Slow dollies, intimate close-ups, gentle handheld.",
    lightingStyle: "Single-source practicals, neon glow, deep falloff.",
    editingRhythm: "Slow, lingering cuts; let moments breathe.",
    shotStructure: "Intimate intro → story verses → emotional chorus → quiet outro.",
    performanceStyle: "Understated, magnetic, close and personal.",
    danceStyle: "Contemporary",
    wardrobe: "Sleek minimal, silk and satin, tonal looks.",
    setDirection: "Apartments at night, neon bars, hotel rooms, cars.",
    props: "Practical lamps, mirrors, city lights.",
    recommendedProviders: ["fal / Kling (clips)", "Imagen / GPT Image (frames)"],
    locations: [
      "neon-lit apartment at night",
      "rain-slick street",
      "dim hotel room",
      "car at night",
    ],
    wardrobePool: ["silk tonal look", "sleek minimal black", "satin statement piece"],
    cutBias: 1.3,
    lean: "narrative",
  }),
  T({
    id: "pop",
    name: "Pop",
    category: "Genre",
    tagline: "Bright, catchy, universally fun.",
    mood: "Upbeat, glossy, feel-good",
    accent: "#0891b2",
    visualStyle: "Clean, colorful, high-key; commercial polish.",
    palette: ["#00D9FF", "#FF6FB5", "#FFD93D", "#FFFFFF"],
    cameraLanguage: "Smooth dollies, playful angles, pose-and-pivot moves.",
    lightingStyle: "Bright even key, pops of color, clean separation.",
    editingRhythm: "Bouncy on-beat cuts with clean pose holds.",
    shotStructure: "Hook intro → playful verses → big chorus → confetti outro.",
    performanceStyle: "Charismatic lead with sharp commercial choreography.",
    danceStyle: "Pop / Commercial",
    wardrobe: "Trend-forward, colorful, multiple looks.",
    setDirection: "Color studios, fun real-world locations.",
    props: "Color props, balloons, bold set pieces.",
    recommendedProviders: ["fal (clips)", "Nano Banana Pro (frames)"],
    locations: ["color-block studio", "sunny city plaza", "retro diner", "pastel set"],
    wardrobePool: ["trend-forward colorful fit", "all-white pop look", "statement accessory look"],
    cutBias: 0.85,
    lean: "performance",
  }),
  T({
    id: "dancehall",
    name: "Dancehall",
    category: "Genre",
    tagline: "Hot, rhythmic, party energy.",
    mood: "Spicy, lively, bold",
    accent: "#16a34a",
    visualStyle: "Vivid, sweaty, saturated; tropical heat and motion.",
    palette: ["#19A974", "#FFD93D", "#E0397F", "#0B0B0B"],
    cameraLanguage: "Handheld in the crowd, low wides, quick whips.",
    lightingStyle: "Colored party lights, strobes, warm night practicals.",
    editingRhythm: "Fast, rhythmic, riddim-locked cutting.",
    shotStructure: "Street intro → dance circle → chorus party → night-block outro.",
    performanceStyle: "High-energy, crowd dancing, riddim attitude.",
    danceStyle: "Afrobeats",
    wardrobe: "Bright, daring, summer streetwear.",
    setDirection: "Yards, beaches, night streets, parties.",
    props: "Speakers, neon, vehicles.",
    recommendedProviders: ["fal / Kling (clips)", "Imagen (frames)"],
    locations: [
      "night street party",
      "beach at dusk",
      "yard with sound system",
      "neon club exterior",
    ],
    wardrobePool: ["bright summer streetwear", "daring statement fit", "color-pop look"],
    cutBias: 0.8,
    lean: "performance",
  }),
  T({
    id: "reggaeton",
    name: "Reggaeton",
    category: "Genre",
    tagline: "Sleek, hot, club-driven.",
    mood: "Sultry, confident, nocturnal",
    accent: "#dc2626",
    visualStyle: "Glossy night, neon and chrome, high-contrast heat.",
    palette: ["#0B0B16", "#FF2D6F", "#00D9FF", "#C0C0C0"],
    cameraLanguage: "Slick gimbal moves, orbits, low wides.",
    lightingStyle: "Neon, hard rim, club haze.",
    editingRhythm: "Punchy dembow-locked cuts; orbiting hooks.",
    shotStructure: "Night arrival → flex verses → club chorus → afterparty outro.",
    performanceStyle: "Smooth confidence, partner/crew dance, club energy.",
    danceStyle: "Pop / Commercial",
    wardrobe: "Designer night-out, chrome and leather accents.",
    setDirection: "Clubs, penthouses, exotic cars, pools.",
    props: "Cars, bottles, neon signage.",
    recommendedProviders: ["Kling / fal (clips)", "GPT Image (frames)"],
    locations: [
      "neon nightclub",
      "rooftop pool at night",
      "chrome penthouse",
      "exotic car at night",
    ],
    wardrobePool: ["designer night-out fit", "leather + chrome look", "all-black sleek"],
    cutBias: 0.82,
    lean: "performance",
  }),
  T({
    id: "country",
    name: "Country",
    category: "Genre",
    tagline: "Heartfelt, open-road, golden.",
    mood: "Warm, nostalgic, earnest",
    accent: "#b45309",
    visualStyle: "Warm naturalistic, golden dust, wide American vistas.",
    palette: ["#C9A66B", "#7A6A4F", "#E8DEC8", "#3B5323"],
    cameraLanguage: "Wide landscapes, slow dollies, handheld warmth.",
    lightingStyle: "Golden hour, natural light, warm practicals.",
    editingRhythm: "Relaxed, story-led cutting with the song's swing.",
    shotStructure: "Landscape open → story verses → singalong chorus → sunset outro.",
    performanceStyle: "Authentic, grounded, story-driven performance.",
    wardrobe: "Denim, boots, plaid, earthy tones.",
    setDirection: "Fields, barns, trucks, small towns, porches.",
    props: "Trucks, guitars, hay, string lights.",
    recommendedProviders: ["Veo / fal (clips)", "Imagen (frames)"],
    locations: ["golden wheat field", "old barn at dusk", "open highway", "small-town porch"],
    wardrobePool: ["denim + boots", "plaid and earth tones", "vintage western look"],
    cutBias: 1.25,
    lean: "narrative",
  }),
  T({
    id: "rock",
    name: "Rock",
    category: "Genre",
    tagline: "Raw, electric, high-voltage.",
    mood: "Intense, rebellious, loud",
    accent: "#ef4444",
    visualStyle: "Gritty, high-contrast, smoke and strobe; raw energy.",
    palette: ["#0B0B0B", "#C0392B", "#7A7A7A", "#E8E8E8"],
    cameraLanguage: "Handheld chaos, fast push-ins, stage wides.",
    lightingStyle: "Hard backlight, strobes, smoke, silhouettes.",
    editingRhythm: "Aggressive fast cutting; hits on the downbeat.",
    shotStructure: "Stage intro → band verses → headbang chorus → blackout outro.",
    performanceStyle: "Full-band performance, sweat, motion, intensity.",
    wardrobe: "Leather, denim, band tees, dark tones.",
    setDirection: "Stages, warehouses, underpasses, garages.",
    props: "Amps, instruments, smoke, lights.",
    recommendedProviders: ["fal / Kling (clips)", "GPT Image (frames)"],
    locations: ["smoky stage", "industrial warehouse", "underpass at night", "garage rehearsal"],
    wardrobePool: ["leather + denim", "band-tee grunge", "all-black rock look"],
    cutBias: 0.8,
    lean: "performance",
  }),
  T({
    id: "edm",
    name: "EDM",
    category: "Genre",
    tagline: "Euphoric, kinetic, festival-scale.",
    mood: "Hypnotic, explosive, electric",
    accent: "#6d5dfc",
    visualStyle: "Neon, lasers, motion blur; hypnotic light and scale.",
    palette: ["#070B16", "#00E5FF", "#FF3CAC", "#7A5CFF"],
    cameraLanguage: "Sweeping drone, strobing whips, crowd-scale wides.",
    lightingStyle: "Lasers, LED walls, strobes, volumetric haze.",
    editingRhythm: "Build-and-drop editing; frantic cutting on the drop.",
    shotStructure: "Build intro → tension verses → DROP spectacle → comedown outro.",
    performanceStyle: "Crowd euphoria, DJ moments, abstract motion.",
    danceStyle: "House",
    wardrobe: "Futuristic rave, reflective, glow accents.",
    setDirection: "Festival stages, warehouses, abstract light spaces.",
    props: "LED walls, lasers, CO2 jets.",
    recommendedProviders: ["fal / Kling (clips)", "Nano Banana Pro (frames)"],
    locations: [
      "festival main stage",
      "laser-filled warehouse",
      "abstract LED void",
      "crowd at the drop",
    ],
    wardrobePool: ["futuristic rave fit", "reflective techwear", "glow-accent look"],
    cutBias: 0.7,
    lean: "performance",
  }),
  T({
    id: "worship",
    name: "Worship",
    category: "Genre",
    tagline: "Reverent, cinematic, light-filled.",
    mood: "Sacred, expansive, intimate",
    accent: "#0ea5e9",
    visualStyle: "Soft cinematic, atmospheric haze, luminous and still.",
    palette: ["#0E2A47", "#E8F0FF", "#D4AF37", "#5B7DB1"],
    cameraLanguage: "Slow drifting moves, wide congregation reveals, close hands.",
    lightingStyle: "Volumetric god-rays, soft key, backlit haze.",
    editingRhythm: "Slow, swelling, builds with the bridge.",
    shotStructure: "Stillness → quiet verses → congregation bridge → soaring chorus.",
    performanceStyle: "Sincere lead, raised hands, congregation in worship.",
    danceStyle: "Gospel",
    wardrobe: "Simple, neutral, flowing.",
    setDirection: "Modern church, stage with haze, open landscapes.",
    props: "Soft lights, banners, instruments.",
    recommendedProviders: ["Veo / fal (clips)", "Imagen (frames)"],
    locations: [
      "hazy worship stage",
      "modern sanctuary",
      "mountain vista at dawn",
      "candlelit hall",
    ],
    wardrobePool: ["simple neutral tones", "flowing light fabrics", "muted layered look"],
    cutBias: 1.35,
    lean: "balanced",
  }),
  T({
    id: "cinematic-ballad",
    name: "Cinematic Ballad",
    category: "Genre",
    tagline: "Emotional, filmic, story-first.",
    mood: "Tender, dramatic, sweeping",
    accent: "#64748b",
    visualStyle: "Anamorphic film look, muted grade, deep emotion.",
    palette: ["#1C2230", "#8A93A6", "#C9A66B", "#E8E2D0"],
    cameraLanguage: "Slow cinematic dollies, shallow focus, wide drama.",
    lightingStyle: "Motivated natural light, soft contrast, blue-hour.",
    editingRhythm: "Patient, emotional cutting; holds on faces.",
    shotStructure: "Story open → narrative verses → emotional peak → resolved outro.",
    performanceStyle: "Restrained, acting-led, intercut performance.",
    danceStyle: "Contemporary",
    wardrobe: "Timeless, muted, character-driven.",
    setDirection: "Real locations, homes, coasts, cities at dusk.",
    props: "Story-driven objects, practical light.",
    recommendedProviders: ["Veo / Kling (clips)", "Imagen / GPT Image (frames)"],
    locations: [
      "coast at blue hour",
      "rain-streaked window",
      "empty city at dusk",
      "quiet home interior",
    ],
    wardrobePool: ["timeless muted look", "character-driven outfit", "soft neutral layers"],
    cutBias: 1.4,
    lean: "narrative",
  }),

  // ---------------- Style ----------------
  T({
    id: "anime-amv",
    name: "Anime Music Video",
    category: "Style",
    tagline: "Stylized 2D anime energy and emotion.",
    mood: "Dramatic, kinetic, expressive",
    accent: "#ff3ca0",
    visualStyle: "Cel-shaded anime, dynamic speed lines, expressive eyes.",
    palette: ["#1B1B3A", "#FF6B6B", "#37D5FF", "#FFD93D"],
    cameraLanguage: "Dynamic anime angles, speed-line push-ins, sakuga motion.",
    lightingStyle: "Dramatic anime rim light, glow, lens flares.",
    editingRhythm: "Snappy AMV cuts synced to the beat; impact frames.",
    shotStructure: "Cold open → character beats → action chorus → emotional finale.",
    performanceStyle: "Character-driven, expressive, action set-pieces.",
    wardrobe: "Anime character design, distinctive silhouettes.",
    setDirection: "Anime cityscapes, skies, stylized interiors.",
    props: "Stylized anime props and effects.",
    recommendedProviders: ["Kling / fal (anime clips)", "Nano Banana Pro / Imagen (frames)"],
    locations: [
      "anime city rooftop at dusk",
      "cherry-blossom street",
      "neon anime alley",
      "vast anime sky",
    ],
    wardrobePool: ["anime character outfit", "school-uniform style", "stylized hero costume"],
    cutBias: 0.78,
    lean: "balanced",
  }),
  T({
    id: "2d-animated",
    name: "2D Animated Video",
    category: "Style",
    tagline: "Flat, illustrative, design-forward.",
    mood: "Playful, artful, charming",
    accent: "#f97316",
    visualStyle: "Flat 2D illustration, bold shapes, textured fills.",
    palette: ["#2A2A4A", "#FF8FB1", "#FFD66B", "#6BCB77"],
    cameraLanguage: "2D parallax, snap pans, design-driven framing.",
    lightingStyle: "Art-directed color blocking, flat shadows.",
    editingRhythm: "Graphic on-beat transitions; shape wipes.",
    shotStructure: "Title reveal → illustrated verses → animated chorus → logo lock.",
    performanceStyle: "Stylized characters, motion-graphic accents.",
    wardrobe: "Illustrated character styling.",
    setDirection: "Illustrated worlds, flat environments.",
    props: "Designed 2D props and motifs.",
    recommendedProviders: ["fal (stylized clips)", "Imagen / GPT Image (frames)"],
    locations: [
      "flat illustrated city",
      "pattern backdrop",
      "paper-cut landscape",
      "graphic stage",
    ],
    wardrobePool: ["illustrated character look", "bold flat-color outfit", "geometric styling"],
    cutBias: 0.9,
    lean: "balanced",
  }),
  T({
    id: "3d-animated",
    name: "3D Animated Video",
    category: "Style",
    tagline: "Pixar-grade CG charm and depth.",
    mood: "Bright, polished, expressive",
    accent: "#0ea5e9",
    visualStyle: "Stylized 3D render, soft GI, expressive characters.",
    palette: ["#2A2A4A", "#FF8FB1", "#FFD66B", "#8AD3FF"],
    cameraLanguage: "Virtual camera moves, dolly + crane, depth of field.",
    lightingStyle: "Soft global illumination, hero key, rim separation.",
    editingRhythm: "Playful, musical cutting with animated overshoot.",
    shotStructure: "World reveal → character verses → big set-piece chorus → finale.",
    performanceStyle: "3D character performance, exaggerated animation.",
    wardrobe: "3D character costume design.",
    setDirection: "Rendered 3D worlds and sets.",
    props: "Modeled hero props.",
    recommendedProviders: ["Kling / fal (3D-style clips)", "Nano Banana Pro (frames)"],
    locations: [
      "stylized 3D town",
      "fantastical set-piece",
      "cozy rendered interior",
      "vast CG vista",
    ],
    wardrobePool: ["3D character costume", "stylized hero outfit", "expressive character look"],
    cutBias: 0.95,
    lean: "balanced",
  }),
  T({
    id: "luxury-fashion",
    name: "Luxury Fashion Video",
    category: "Style",
    tagline: "Editorial, opulent, high-fashion.",
    mood: "Elegant, cold, exclusive",
    accent: "#d4af37",
    visualStyle: "Editorial film, refined grade, opulent texture.",
    palette: ["#0A0A0A", "#D4AF37", "#1C1C1C", "#F4ECD2"],
    cameraLanguage: "Slow elegant dollies, locked symmetry, macro detail.",
    lightingStyle: "Sculpted hard light, deep contrast, gold accents.",
    editingRhythm: "Slow, deliberate, editorial cutting.",
    shotStructure: "Detail open → posed verses → runway chorus → iconic outro.",
    performanceStyle: "Posed, statuesque, model-like presence.",
    wardrobe: "High-fashion couture, sculptural silhouettes.",
    setDirection: "Marble halls, galleries, penthouses, deserts.",
    props: "Luxury objects, sculpture, fabric.",
    recommendedProviders: ["Veo / Kling (clips)", "Nano Banana Pro / GPT Image (frames)"],
    locations: ["marble gallery", "minimal penthouse", "desert at dusk", "mirror-lined hall"],
    wardrobePool: ["sculptural couture", "all-black high fashion", "gold-accented gown/suit"],
    cutBias: 1.3,
    lean: "narrative",
  }),
  T({
    id: "afrofuturist",
    name: "Futuristic / Afrofuturist",
    category: "Style",
    tagline: "Bold sci-fi heritage and chrome.",
    mood: "Visionary, regal, electric",
    accent: "#22d3ee",
    visualStyle: "Sleek sci-fi meets rich cultural motif; chrome and color.",
    palette: ["#0B1026", "#22D3EE", "#E0397F", "#D4AF37"],
    cameraLanguage: "Smooth tech moves, orbits, holographic reveals.",
    lightingStyle: "Neon, holographic glow, hard chrome rim.",
    editingRhythm: "Precise, futuristic, beat-synced with FX accents.",
    shotStructure: "World reveal → regal verses → tech chorus → ascension outro.",
    performanceStyle: "Regal, futuristic, commanding presence.",
    danceStyle: "Street / Krump",
    wardrobe: "Afrofuturist couture, chrome, traditional fusion.",
    setDirection: "Sci-fi sets, neon temples, chrome voids.",
    props: "Holograms, chrome artifacts, light tech.",
    recommendedProviders: ["Kling / fal (clips)", "Nano Banana Pro (frames)"],
    locations: [
      "neon sci-fi temple",
      "chrome void stage",
      "holographic throne room",
      "futuristic skyline",
    ],
    wardrobePool: ["afrofuturist couture", "chrome statement fit", "regal tech-traditional fusion"],
    cutBias: 0.85,
    lean: "performance",
  }),

  // ---------------- Format ----------------
  T({
    id: "performance",
    name: "Performance Video",
    category: "Format",
    tagline: "Pure artist energy, one strong space.",
    mood: "Direct, magnetic, focused",
    accent: "#e0397f",
    visualStyle: "Clean cinematic performance; one iconic location.",
    palette: ["#0B0B0B", "#E0397F", "#00D9FF", "#E8E8E8"],
    cameraLanguage: "Orbits, push-ins, dynamic handheld around the artist.",
    lightingStyle: "Dramatic key + rim, haze, controlled color.",
    editingRhythm: "Beat-driven cutting that rides the performance.",
    shotStructure: "Artist reveal → performance verses → full-out chorus → final hold.",
    performanceStyle: "Lip-sync forward, commanding, to-lens energy.",
    danceStyle: "Hip Hop",
    wardrobe: "One or two strong hero looks.",
    setDirection: "A single striking set: soundstage, location, void.",
    props: "Minimal — light, haze, one hero element.",
    recommendedProviders: ["fal / Kling (clips)", "Imagen / GPT Image (frames)"],
    locations: [
      "haze-filled soundstage",
      "single bold-color cyc",
      "striking real location",
      "dark void with light",
    ],
    wardrobePool: ["bold hero look", "all-black statement", "single iconic outfit"],
    cutBias: 0.9,
    lean: "performance",
  }),
  T({
    id: "dance",
    name: "Dance Video",
    category: "Format",
    tagline: "Choreography is the star.",
    mood: "Kinetic, sharp, athletic",
    accent: "#6d5dfc",
    visualStyle: "Crisp, high-energy, movement-first framing.",
    palette: ["#0B0B16", "#6D5DFC", "#00E5FF", "#FFFFFF"],
    cameraLanguage: "Wide full-body shots, tracking, orbits, beat whips.",
    lightingStyle: "Even bright key with rim for crisp silhouettes.",
    editingRhythm: "Cut tightly to the choreography and the beat.",
    shotStructure: "Formation reveal → verse routine → full chorus dance → finale.",
    performanceStyle: "Crew choreography front and center, full-body.",
    danceStyle: "Pop / Commercial",
    wardrobe: "Coordinated, movement-friendly, clean lines.",
    setDirection: "Studios, plazas, rooftops, clean spaces.",
    props: "Minimal — keep the floor clear for movement.",
    recommendedProviders: ["Kling / fal (clips)", "Nano Banana Pro (frames)"],
    locations: ["bright dance studio", "urban plaza", "rooftop at golden hour", "clean cyc stage"],
    wardrobePool: ["coordinated crew fit", "movement-friendly streetwear", "clean monochrome set"],
    cutBias: 0.82,
    lean: "performance",
  }),
  T({
    id: "club",
    name: "Club Video",
    category: "Format",
    tagline: "Sweaty, neon, after-dark.",
    mood: "Hot, immersive, nocturnal",
    accent: "#ec4899",
    visualStyle: "Neon haze, motion blur, immersive low-light energy.",
    palette: ["#0B0B16", "#FF2D6F", "#00D9FF", "#7A5CFF"],
    cameraLanguage: "Handheld in the crowd, gimbal weaves, strobe whips.",
    lightingStyle: "Club lights, lasers, neon practicals, haze.",
    editingRhythm: "Fast, frenetic, beat-locked cutting.",
    shotStructure: "Arrival → crowd verses → peak chorus → afterglow outro.",
    performanceStyle: "Crowd energy, partying, in-the-mix presence.",
    danceStyle: "House",
    wardrobe: "Night-out, reflective, bold.",
    setDirection: "Clubs, warehouses, neon-lit spaces.",
    props: "Bottles, lights, lasers, crowd.",
    recommendedProviders: ["fal / Kling (clips)", "GPT Image (frames)"],
    locations: ["packed neon club", "warehouse rave", "VIP booth", "neon-lit corridor"],
    wardrobePool: ["night-out reflective fit", "bold club look", "all-black sleek"],
    cutBias: 0.75,
    lean: "performance",
  }),
  T({
    id: "street",
    name: "Street Video",
    category: "Format",
    tagline: "Raw, real, city texture.",
    mood: "Authentic, gritty, alive",
    accent: "#a16207",
    visualStyle: "Documentary realism, natural grit, real city texture.",
    palette: ["#1A1A1A", "#C9A227", "#5B5B5B", "#D8D2C4"],
    cameraLanguage: "Handheld, run-and-gun, candid wides and follows.",
    lightingStyle: "Natural + available light, neon practicals at night.",
    editingRhythm: "Energetic but grounded; cut with the swagger.",
    shotStructure: "Block intro → posted verses → crew chorus → night outro.",
    performanceStyle: "Authentic, crew presence, lived-in confidence.",
    danceStyle: "Hip Hop",
    wardrobe: "Everyday streetwear, real and current.",
    setDirection: "Real streets, blocks, corners, transit.",
    props: "Cars, bikes, real-world textures.",
    recommendedProviders: ["fal / Kling (clips)", "Imagen (frames)"],
    locations: ["busy city corner", "graffiti alley", "subway platform", "night block under neon"],
    wardrobePool: ["everyday streetwear", "vintage sportswear", "layered street look"],
    cutBias: 0.88,
    lean: "performance",
  }),
  T({
    id: "blank-studio",
    name: "Blank Studio",
    category: "Format",
    tagline: "No blueprint — you direct every choice.",
    mood: "Neutral, open-ended",
    accent: "#64748b",
    visualStyle: "Clean, neutral starting point; define the look yourself.",
    palette: ["#1C1C1C", "#888888", "#D4D4D4", "#FFFFFF"],
    cameraLanguage: "Director's choice — no imposed camera language.",
    lightingStyle: "Director's choice.",
    editingRhythm: "Cut to the song's own energy, no style bias.",
    shotStructure: "Free-form; build the sequence by hand.",
    performanceStyle: "Whatever the production calls for.",
    wardrobe: "Define per character.",
    setDirection: "Define per scene.",
    props: "Add as needed.",
    recommendedProviders: ["Any configured provider"],
    locations: [],
    wardrobePool: [],
    cutBias: 1,
    lean: "balanced",
  }),
];

export const TEMPLATE_CATEGORIES: TemplateCategory[] = ["Genre", "Style", "Format"];

// --- custom (user-authored) templates --------------------------------------

const LS_CUSTOM = "mf.customTemplates";

export function isCustomTemplateId(id: string): boolean {
  return id.startsWith("custom-");
}

export function loadCustomTemplates(): MvTemplate[] {
  try {
    const raw = localStorage.getItem(LS_CUSTOM);
    return raw ? (JSON.parse(raw) as MvTemplate[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomTemplate(t: MvTemplate): void {
  const all = loadCustomTemplates();
  const i = all.findIndex((x) => x.id === t.id);
  if (i >= 0) all[i] = t;
  else all.unshift(t);
  localStorage.setItem(LS_CUSTOM, JSON.stringify(all));
}

export function deleteCustomTemplate(id: string): void {
  localStorage.setItem(LS_CUSTOM, JSON.stringify(loadCustomTemplates().filter((t) => t.id !== id)));
}

/** Built-in + custom templates, in one list (built-ins first). */
export function allTemplates(): MvTemplate[] {
  return [...TEMPLATES, ...loadCustomTemplates()];
}

/** A blank custom template, optionally seeded from an existing one. */
export function newCustomTemplate(seed?: Partial<MvTemplate>): MvTemplate {
  const base: MvTemplate = {
    id: `custom-${crypto.randomUUID()}`,
    name: "My Template",
    category: "Format",
    tagline: "",
    mood: "",
    accent: "#6d5dfc",
    visualStyle: "",
    palette: ["#0B0B0B", "#6d5dfc", "#00D9FF", "#FFFFFF"],
    cameraLanguage: "",
    lightingStyle: "",
    editingRhythm: "Cut to the song's energy.",
    shotStructure: "",
    performanceStyle: "",
    danceStyle: undefined,
    wardrobe: "",
    setDirection: "",
    props: "",
    recommendedProviders: [],
    locations: [],
    wardrobePool: [],
    cutBias: 1,
    lean: "balanced",
  };
  // Seed copies content but always gets a fresh custom id.
  return { ...base, ...seed, id: `custom-${crypto.randomUUID()}` };
}

export function getTemplate(id: string | null | undefined): MvTemplate | null {
  if (!id) return null;
  return allTemplates().find((t) => t.id === id) ?? null;
}

// --- persistence (the user's chosen template, global) ----------------------

const LS_TEMPLATE = "mf.activeTemplate";

export function loadActiveTemplateId(): string | null {
  try {
    return localStorage.getItem(LS_TEMPLATE);
  } catch {
    return null;
  }
}

export function saveActiveTemplateId(id: string | null): void {
  try {
    if (id) localStorage.setItem(LS_TEMPLATE, id);
    else localStorage.removeItem(LS_TEMPLATE);
  } catch {
    /* ignore */
  }
}
