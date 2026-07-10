//! SQLite persistence (local-first). A single connection guarded by a Mutex is
//! held in Tauri state. Schema follows MOTIONFORGE_PLAN.md §5; Phase 0 implements
//! the `projects` table — child tables are created here too, ready for Phase 1+.

use crate::models::{BrandKit, Character, Environment, NewProject, Project, Prop, VersionMeta};
use anyhow::{anyhow, Result};
use chrono::Utc;
use rusqlite::{Connection, OptionalExtension};
use std::sync::Mutex;
use uuid::Uuid;

pub struct Db(pub Mutex<Connection>);

pub fn init(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS projects (
            id             TEXT PRIMARY KEY,
            name           TEXT NOT NULL,
            description    TEXT NOT NULL DEFAULT '',
            type           TEXT NOT NULL,
            status         TEXT NOT NULL DEFAULT 'draft',
            aspect_ratio   TEXT NOT NULL DEFAULT '16:9',
            duration       TEXT NOT NULL DEFAULT '30s',
            emotional_tone TEXT NOT NULL DEFAULT '',
            created_at     TEXT NOT NULL,
            updated_at     TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS scenes (
            id          TEXT PRIMARY KEY,
            project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            name        TEXT NOT NULL,
            intent      TEXT NOT NULL DEFAULT '',
            order_index INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS shots (
            id                TEXT PRIMARY KEY,
            scene_id          TEXT NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
            number            INTEGER NOT NULL,
            name              TEXT NOT NULL,
            purpose           TEXT NOT NULL DEFAULT '',
            duration          TEXT NOT NULL DEFAULT '',
            order_index       INTEGER NOT NULL DEFAULT 0,
            visual_description TEXT NOT NULL DEFAULT '',
            transition        TEXT NOT NULL DEFAULT '',
            audio_notes       TEXT NOT NULL DEFAULT '',
            locked            INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS prompt_packs (
            id           TEXT PRIMARY KEY,
            project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            content_json TEXT NOT NULL,
            version      INTEGER NOT NULL DEFAULT 1,
            created_at   TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS assets (
            id              TEXT PRIMARY KEY,
            project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            shot_number     INTEGER,
            kind            TEXT NOT NULL DEFAULT 'image',
            file_path       TEXT NOT NULL,
            source_provider TEXT NOT NULL DEFAULT '',
            created_at      TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS characters (
            id                      TEXT PRIMARY KEY,
            name                    TEXT NOT NULL DEFAULT 'New Character',
            age                     TEXT NOT NULL DEFAULT '',
            gender                  TEXT NOT NULL DEFAULT '',
            occupation              TEXT NOT NULL DEFAULT '',
            role                    TEXT NOT NULL DEFAULT '',
            face_shape              TEXT NOT NULL DEFAULT '',
            eye_shape               TEXT NOT NULL DEFAULT '',
            eye_color               TEXT NOT NULL DEFAULT '',
            hair_style              TEXT NOT NULL DEFAULT '',
            hair_color              TEXT NOT NULL DEFAULT '',
            body_type               TEXT NOT NULL DEFAULT '',
            skin_tone               TEXT NOT NULL DEFAULT '',
            distinguishing_features TEXT NOT NULL DEFAULT '',
            primary_outfit          TEXT NOT NULL DEFAULT '',
            secondary_outfit        TEXT NOT NULL DEFAULT '',
            accessories             TEXT NOT NULL DEFAULT '',
            traits                  TEXT NOT NULL DEFAULT '',
            motivations             TEXT NOT NULL DEFAULT '',
            fears                   TEXT NOT NULL DEFAULT '',
            goals                   TEXT NOT NULL DEFAULT '',
            style_preset            TEXT NOT NULL DEFAULT '',
            prompt_dna              TEXT NOT NULL DEFAULT '',
            consistency_rules       TEXT NOT NULL DEFAULT '',
            reference_images_json   TEXT NOT NULL DEFAULT '[]',
            portrait_url            TEXT NOT NULL DEFAULT '',
            locked                  INTEGER NOT NULL DEFAULT 0,
            created_at              TEXT NOT NULL,
            updated_at              TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS environments (
            id                    TEXT PRIMARY KEY,
            name                  TEXT NOT NULL DEFAULT 'New Environment',
            description           TEXT NOT NULL DEFAULT '',
            architecture          TEXT NOT NULL DEFAULT '',
            time_of_day           TEXT NOT NULL DEFAULT '',
            mood                  TEXT NOT NULL DEFAULT '',
            lighting_style        TEXT NOT NULL DEFAULT '',
            color_palette_json    TEXT NOT NULL DEFAULT '[]',
            materials             TEXT NOT NULL DEFAULT '',
            key_props             TEXT NOT NULL DEFAULT '',
            environment_rules     TEXT NOT NULL DEFAULT '',
            style_preset          TEXT NOT NULL DEFAULT '',
            prompt_dna            TEXT NOT NULL DEFAULT '',
            consistency_rules     TEXT NOT NULL DEFAULT '',
            reference_images_json TEXT NOT NULL DEFAULT '[]',
            establishing_url      TEXT NOT NULL DEFAULT '',
            locked                INTEGER NOT NULL DEFAULT 0,
            created_at            TEXT NOT NULL,
            updated_at            TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS props (
            id                    TEXT PRIMARY KEY,
            name                  TEXT NOT NULL DEFAULT 'New Prop',
            category              TEXT NOT NULL DEFAULT 'Prop',
            dimensions            TEXT NOT NULL DEFAULT '',
            materials             TEXT NOT NULL DEFAULT '',
            condition             TEXT NOT NULL DEFAULT '',
            color_palette_json    TEXT NOT NULL DEFAULT '[]',
            usage                 TEXT NOT NULL DEFAULT '',
            story_significance    TEXT NOT NULL DEFAULT '',
            style_preset          TEXT NOT NULL DEFAULT '',
            prompt_dna            TEXT NOT NULL DEFAULT '',
            consistency_rules     TEXT NOT NULL DEFAULT '',
            reference_images_json TEXT NOT NULL DEFAULT '[]',
            hero_url              TEXT NOT NULL DEFAULT '',
            locked                INTEGER NOT NULL DEFAULT 0,
            created_at            TEXT NOT NULL,
            updated_at            TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS brand_kits (
            id           TEXT PRIMARY KEY,
            name         TEXT NOT NULL,
            colors_json  TEXT NOT NULL DEFAULT '[]',
            fonts        TEXT NOT NULL DEFAULT '',
            voice        TEXT NOT NULL DEFAULT '',
            visual_rules TEXT NOT NULL DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        "#,
    )?;
    Ok(())
}

pub fn list_projects(conn: &Connection) -> Result<Vec<Project>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, description, type, status, aspect_ratio, duration,
                emotional_tone, created_at, updated_at
         FROM projects ORDER BY updated_at DESC",
    )?;
    let rows = stmt.query_map([], |r| {
        Ok(Project {
            id: r.get(0)?,
            name: r.get(1)?,
            description: r.get(2)?,
            project_type: r.get(3)?,
            status: r.get(4)?,
            aspect_ratio: r.get(5)?,
            duration: r.get(6)?,
            emotional_tone: r.get(7)?,
            created_at: r.get(8)?,
            updated_at: r.get(9)?,
        })
    })?;
    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}

pub fn get_project(conn: &Connection, id: &str) -> Result<Option<Project>> {
    use rusqlite::OptionalExtension;
    let project = conn
        .query_row(
            "SELECT id, name, description, type, status, aspect_ratio, duration,
                    emotional_tone, created_at, updated_at
             FROM projects WHERE id = ?1",
            [id],
            |r| {
                Ok(Project {
                    id: r.get(0)?,
                    name: r.get(1)?,
                    description: r.get(2)?,
                    project_type: r.get(3)?,
                    status: r.get(4)?,
                    aspect_ratio: r.get(5)?,
                    duration: r.get(6)?,
                    emotional_tone: r.get(7)?,
                    created_at: r.get(8)?,
                    updated_at: r.get(9)?,
                })
            },
        )
        .optional()?;
    Ok(project)
}

pub fn create_project(conn: &Connection, input: NewProject) -> Result<Project> {
    let now = Utc::now().to_rfc3339();
    let project = Project {
        id: Uuid::new_v4().to_string(),
        name: input.name,
        description: input.description,
        project_type: input.project_type,
        status: "draft".into(),
        aspect_ratio: "16:9".into(),
        duration: "30s".into(),
        emotional_tone: String::new(),
        created_at: now.clone(),
        updated_at: now,
    };
    conn.execute(
        "INSERT INTO projects
            (id, name, description, type, status, aspect_ratio, duration,
             emotional_tone, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            project.id,
            project.name,
            project.description,
            project.project_type,
            project.status,
            project.aspect_ratio,
            project.duration,
            project.emotional_tone,
            project.created_at,
            project.updated_at,
        ],
    )?;
    Ok(project)
}

pub fn delete_project(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM projects WHERE id = ?1", [id])?;
    Ok(())
}

pub fn list_versions(conn: &Connection, project_id: &str) -> Result<Vec<VersionMeta>> {
    let mut stmt = conn.prepare(
        "SELECT id, version, created_at FROM prompt_packs
         WHERE project_id = ?1 ORDER BY created_at DESC",
    )?;
    let rows = stmt.query_map([project_id], |r| {
        Ok(VersionMeta {
            id: r.get(0)?,
            version: r.get(1)?,
            created_at: r.get(2)?,
        })
    })?;
    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}

fn next_version(conn: &Connection, project_id: &str) -> Result<i64> {
    let max: Option<i64> = conn
        .query_row(
            "SELECT MAX(version) FROM prompt_packs WHERE project_id = ?1",
            [project_id],
            |r| r.get(0),
        )
        .optional()?
        .flatten();
    Ok(max.unwrap_or(0) + 1)
}

/// Freeze the current pack by copying it into a new top version.
pub fn snapshot_version(conn: &Connection, project_id: &str) -> Result<()> {
    let content: Option<String> = conn
        .query_row(
            "SELECT content_json FROM prompt_packs
             WHERE project_id = ?1 ORDER BY created_at DESC LIMIT 1",
            [project_id],
            |r| r.get(0),
        )
        .optional()?;
    let content = content.ok_or_else(|| anyhow!("no pack to snapshot"))?;
    let v = next_version(conn, project_id)?;
    conn.execute(
        "INSERT INTO prompt_packs (id, project_id, content_json, version, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![
            Uuid::new_v4().to_string(),
            project_id,
            content,
            v,
            Utc::now().to_rfc3339(),
        ],
    )?;
    Ok(())
}

/// Make an old version current by copying it into a new top version. Returns JSON.
pub fn restore_version(conn: &Connection, version_id: &str) -> Result<String> {
    let row: Option<(String, String)> = conn
        .query_row(
            "SELECT project_id, content_json FROM prompt_packs WHERE id = ?1",
            [version_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()?;
    let (project_id, content) = row.ok_or_else(|| anyhow!("version not found"))?;
    let v = next_version(conn, &project_id)?;
    conn.execute(
        "INSERT INTO prompt_packs (id, project_id, content_json, version, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![
            Uuid::new_v4().to_string(),
            project_id,
            content,
            v,
            Utc::now().to_rfc3339(),
        ],
    )?;
    Ok(content)
}

/// Copy a project (metadata + latest pack + asset records) under a new id.
pub fn duplicate_project(conn: &Connection, project_id: &str) -> Result<Project> {
    let src = conn
        .query_row(
            "SELECT name, description, type, status, aspect_ratio, duration, emotional_tone
             FROM projects WHERE id = ?1",
            [project_id],
            |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, String>(2)?,
                    r.get::<_, String>(3)?,
                    r.get::<_, String>(4)?,
                    r.get::<_, String>(5)?,
                    r.get::<_, String>(6)?,
                ))
            },
        )
        .optional()?
        .ok_or_else(|| anyhow!("project not found"))?;

    let now = Utc::now().to_rfc3339();
    let new = Project {
        id: Uuid::new_v4().to_string(),
        name: format!("{} (copy)", src.0),
        description: src.1,
        project_type: src.2,
        status: src.3,
        aspect_ratio: src.4,
        duration: src.5,
        emotional_tone: src.6,
        created_at: now.clone(),
        updated_at: now.clone(),
    };
    conn.execute(
        "INSERT INTO projects
            (id, name, description, type, status, aspect_ratio, duration,
             emotional_tone, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
        rusqlite::params![
            new.id,
            new.name,
            new.description,
            new.project_type,
            new.status,
            new.aspect_ratio,
            new.duration,
            new.emotional_tone,
            new.created_at,
            new.updated_at,
        ],
    )?;

    // Copy the latest pack, if any.
    let content: Option<String> = conn
        .query_row(
            "SELECT content_json FROM prompt_packs
             WHERE project_id = ?1 ORDER BY created_at DESC LIMIT 1",
            [project_id],
            |r| r.get(0),
        )
        .optional()?;
    if let Some(content) = content {
        conn.execute(
            "INSERT INTO prompt_packs (id, project_id, content_json, version, created_at)
             VALUES (?1, ?2, ?3, 1, ?4)",
            rusqlite::params![Uuid::new_v4().to_string(), new.id, content, now],
        )?;
    }

    // Copy asset records (files are shared on disk for now).
    conn.execute(
        "INSERT INTO assets (id, project_id, shot_number, kind, file_path, source_provider, created_at)
         SELECT lower(hex(randomblob(16))), ?1, shot_number, kind, file_path, source_provider, created_at
         FROM assets WHERE project_id = ?2",
        rusqlite::params![new.id, project_id],
    )?;

    Ok(new)
}

// ----- Characters --------------------------------------------------------

/// Column list shared by the row reader so SELECT order stays in sync.
const CHARACTER_COLS: &str = "id, name, age, gender, occupation, role,
    face_shape, eye_shape, eye_color, hair_style, hair_color, body_type,
    skin_tone, distinguishing_features, primary_outfit, secondary_outfit,
    accessories, traits, motivations, fears, goals, style_preset, prompt_dna,
    consistency_rules, reference_images_json, portrait_url, locked,
    created_at, updated_at";

fn read_character(r: &rusqlite::Row) -> rusqlite::Result<Character> {
    let refs_json: String = r.get(24)?;
    Ok(Character {
        id: r.get(0)?,
        name: r.get(1)?,
        age: r.get(2)?,
        gender: r.get(3)?,
        occupation: r.get(4)?,
        role: r.get(5)?,
        face_shape: r.get(6)?,
        eye_shape: r.get(7)?,
        eye_color: r.get(8)?,
        hair_style: r.get(9)?,
        hair_color: r.get(10)?,
        body_type: r.get(11)?,
        skin_tone: r.get(12)?,
        distinguishing_features: r.get(13)?,
        primary_outfit: r.get(14)?,
        secondary_outfit: r.get(15)?,
        accessories: r.get(16)?,
        traits: r.get(17)?,
        motivations: r.get(18)?,
        fears: r.get(19)?,
        goals: r.get(20)?,
        style_preset: r.get(21)?,
        prompt_dna: r.get(22)?,
        consistency_rules: r.get(23)?,
        reference_images: serde_json::from_str(&refs_json).unwrap_or_default(),
        portrait_url: r.get(25)?,
        locked: r.get::<_, i64>(26)? != 0,
        created_at: r.get(27)?,
        updated_at: r.get(28)?,
    })
}

pub fn list_characters(conn: &Connection) -> Result<Vec<Character>> {
    let sql = format!("SELECT {CHARACTER_COLS} FROM characters ORDER BY updated_at DESC");
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], read_character)?;
    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}

pub fn get_character(conn: &Connection, id: &str) -> Result<Option<Character>> {
    let sql = format!("SELECT {CHARACTER_COLS} FROM characters WHERE id = ?1");
    let c = conn.query_row(&sql, [id], read_character).optional()?;
    Ok(c)
}

pub fn save_character(conn: &Connection, c: &Character) -> Result<()> {
    let refs_json = serde_json::to_string(&c.reference_images)?;
    conn.execute(
        "INSERT INTO characters
            (id, name, age, gender, occupation, role, face_shape, eye_shape,
             eye_color, hair_style, hair_color, body_type, skin_tone,
             distinguishing_features, primary_outfit, secondary_outfit, accessories,
             traits, motivations, fears, goals, style_preset, prompt_dna,
             consistency_rules, reference_images_json, portrait_url, locked,
             created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,
                 ?19,?20,?21,?22,?23,?24,?25,?26,?27,?28,?29)
         ON CONFLICT(id) DO UPDATE SET
            name=?2, age=?3, gender=?4, occupation=?5, role=?6, face_shape=?7,
            eye_shape=?8, eye_color=?9, hair_style=?10, hair_color=?11,
            body_type=?12, skin_tone=?13, distinguishing_features=?14,
            primary_outfit=?15, secondary_outfit=?16, accessories=?17, traits=?18,
            motivations=?19, fears=?20, goals=?21, style_preset=?22, prompt_dna=?23,
            consistency_rules=?24, reference_images_json=?25, portrait_url=?26,
            locked=?27, updated_at=?29",
        rusqlite::params![
            c.id,
            c.name,
            c.age,
            c.gender,
            c.occupation,
            c.role,
            c.face_shape,
            c.eye_shape,
            c.eye_color,
            c.hair_style,
            c.hair_color,
            c.body_type,
            c.skin_tone,
            c.distinguishing_features,
            c.primary_outfit,
            c.secondary_outfit,
            c.accessories,
            c.traits,
            c.motivations,
            c.fears,
            c.goals,
            c.style_preset,
            c.prompt_dna,
            c.consistency_rules,
            refs_json,
            c.portrait_url,
            c.locked as i64,
            c.created_at,
            c.updated_at,
        ],
    )?;
    Ok(())
}

pub fn delete_character(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM characters WHERE id = ?1", [id])?;
    Ok(())
}

// ----- Environments ------------------------------------------------------

const ENVIRONMENT_COLS: &str = "id, name, description, architecture, time_of_day,
    mood, lighting_style, color_palette_json, materials, key_props,
    environment_rules, style_preset, prompt_dna, consistency_rules,
    reference_images_json, establishing_url, locked, created_at, updated_at";

fn read_environment(r: &rusqlite::Row) -> rusqlite::Result<Environment> {
    let palette: String = r.get(7)?;
    let refs: String = r.get(14)?;
    Ok(Environment {
        id: r.get(0)?,
        name: r.get(1)?,
        description: r.get(2)?,
        architecture: r.get(3)?,
        time_of_day: r.get(4)?,
        mood: r.get(5)?,
        lighting_style: r.get(6)?,
        color_palette: serde_json::from_str(&palette).unwrap_or_default(),
        materials: r.get(8)?,
        key_props: r.get(9)?,
        environment_rules: r.get(10)?,
        style_preset: r.get(11)?,
        prompt_dna: r.get(12)?,
        consistency_rules: r.get(13)?,
        reference_images: serde_json::from_str(&refs).unwrap_or_default(),
        establishing_url: r.get(15)?,
        locked: r.get::<_, i64>(16)? != 0,
        created_at: r.get(17)?,
        updated_at: r.get(18)?,
    })
}

pub fn list_environments(conn: &Connection) -> Result<Vec<Environment>> {
    let sql = format!("SELECT {ENVIRONMENT_COLS} FROM environments ORDER BY updated_at DESC");
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], read_environment)?;
    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}

pub fn save_environment(conn: &Connection, e: &Environment) -> Result<()> {
    let palette = serde_json::to_string(&e.color_palette)?;
    let refs = serde_json::to_string(&e.reference_images)?;
    conn.execute(
        "INSERT INTO environments
            (id, name, description, architecture, time_of_day, mood, lighting_style,
             color_palette_json, materials, key_props, environment_rules, style_preset,
             prompt_dna, consistency_rules, reference_images_json, establishing_url,
             locked, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19)
         ON CONFLICT(id) DO UPDATE SET
            name=?2, description=?3, architecture=?4, time_of_day=?5, mood=?6,
            lighting_style=?7, color_palette_json=?8, materials=?9, key_props=?10,
            environment_rules=?11, style_preset=?12, prompt_dna=?13,
            consistency_rules=?14, reference_images_json=?15, establishing_url=?16,
            locked=?17, updated_at=?19",
        rusqlite::params![
            e.id,
            e.name,
            e.description,
            e.architecture,
            e.time_of_day,
            e.mood,
            e.lighting_style,
            palette,
            e.materials,
            e.key_props,
            e.environment_rules,
            e.style_preset,
            e.prompt_dna,
            e.consistency_rules,
            refs,
            e.establishing_url,
            e.locked as i64,
            e.created_at,
            e.updated_at,
        ],
    )?;
    Ok(())
}

pub fn delete_environment(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM environments WHERE id = ?1", [id])?;
    Ok(())
}

// ----- Props -------------------------------------------------------------

const PROP_COLS: &str = "id, name, category, dimensions, materials, condition,
    color_palette_json, usage, story_significance, style_preset, prompt_dna,
    consistency_rules, reference_images_json, hero_url, locked, created_at,
    updated_at";

fn read_prop(r: &rusqlite::Row) -> rusqlite::Result<Prop> {
    let palette: String = r.get(6)?;
    let refs: String = r.get(12)?;
    Ok(Prop {
        id: r.get(0)?,
        name: r.get(1)?,
        category: r.get(2)?,
        dimensions: r.get(3)?,
        materials: r.get(4)?,
        condition: r.get(5)?,
        color_palette: serde_json::from_str(&palette).unwrap_or_default(),
        usage: r.get(7)?,
        story_significance: r.get(8)?,
        style_preset: r.get(9)?,
        prompt_dna: r.get(10)?,
        consistency_rules: r.get(11)?,
        reference_images: serde_json::from_str(&refs).unwrap_or_default(),
        hero_url: r.get(13)?,
        locked: r.get::<_, i64>(14)? != 0,
        created_at: r.get(15)?,
        updated_at: r.get(16)?,
    })
}

pub fn list_props(conn: &Connection) -> Result<Vec<Prop>> {
    let sql = format!("SELECT {PROP_COLS} FROM props ORDER BY updated_at DESC");
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], read_prop)?;
    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}

pub fn save_prop(conn: &Connection, p: &Prop) -> Result<()> {
    let palette = serde_json::to_string(&p.color_palette)?;
    let refs = serde_json::to_string(&p.reference_images)?;
    conn.execute(
        "INSERT INTO props
            (id, name, category, dimensions, materials, condition, color_palette_json,
             usage, story_significance, style_preset, prompt_dna, consistency_rules,
             reference_images_json, hero_url, locked, created_at, updated_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17)
         ON CONFLICT(id) DO UPDATE SET
            name=?2, category=?3, dimensions=?4, materials=?5, condition=?6,
            color_palette_json=?7, usage=?8, story_significance=?9, style_preset=?10,
            prompt_dna=?11, consistency_rules=?12, reference_images_json=?13,
            hero_url=?14, locked=?15, updated_at=?17",
        rusqlite::params![
            p.id,
            p.name,
            p.category,
            p.dimensions,
            p.materials,
            p.condition,
            palette,
            p.usage,
            p.story_significance,
            p.style_preset,
            p.prompt_dna,
            p.consistency_rules,
            refs,
            p.hero_url,
            p.locked as i64,
            p.created_at,
            p.updated_at,
        ],
    )?;
    Ok(())
}

pub fn delete_prop(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM props WHERE id = ?1", [id])?;
    Ok(())
}

pub fn list_brand_kits(conn: &Connection) -> Result<Vec<BrandKit>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, colors_json, fonts, voice, visual_rules
         FROM brand_kits ORDER BY name",
    )?;
    let rows = stmt.query_map([], |r| {
        let colors_json: String = r.get(2)?;
        Ok(BrandKit {
            id: r.get(0)?,
            name: r.get(1)?,
            colors: serde_json::from_str(&colors_json).unwrap_or_default(),
            fonts: r.get(3)?,
            voice: r.get(4)?,
            visual_rules: r.get(5)?,
        })
    })?;
    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}

pub fn save_brand_kit(conn: &Connection, kit: &BrandKit) -> Result<()> {
    let colors_json = serde_json::to_string(&kit.colors)?;
    conn.execute(
        "INSERT INTO brand_kits (id, name, colors_json, fonts, voice, visual_rules)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(id) DO UPDATE SET
            name = ?2, colors_json = ?3, fonts = ?4, voice = ?5, visual_rules = ?6",
        rusqlite::params![
            kit.id,
            kit.name,
            colors_json,
            kit.fonts,
            kit.voice,
            kit.visual_rules,
        ],
    )?;
    Ok(())
}

pub fn delete_brand_kit(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("DELETE FROM brand_kits WHERE id = ?1", [id])?;
    Ok(())
}
