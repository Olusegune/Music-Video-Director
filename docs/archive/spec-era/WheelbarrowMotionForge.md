# MOTIONFORGE STUDIO

## COMPLETE ENGINEERING SPECIFICATION

### FOR CLAUDE OPUS / CLAUDE CODE

Version: 1.0

---

# PRODUCT OVERVIEW

Wheelbarrow MotionForge Studio is an AI-powered motion graphics pre-production platform that transforms concepts, scripts, products, datasets, educational topics, advertisements, and brand stories into complete production-ready motion graphics packages.

The platform functions as:

* Motion Graphics Creative Director
* Storyboard Artist
* Cinematographer
* Lighting Director
* Prompt Engineer
* Production Planner

The system generates:

* Creative Direction
* Style Recommendations
* Shot Lists
* Storyboards
* Camera Plans
* Lighting Plans
* Image Prompts
* Video Prompts
* Voiceover Scripts
* Audio Direction
* Exportable Production Documents

Target Platforms:

1. Web Application
2. Windows Desktop Application

---

# CORE PRODUCT OBJECTIVE

User enters:

* Idea
* Script
* Product Description
* Dataset
* Educational Topic
* Marketing Concept
* PDF
* URL

System returns:

Complete MotionForge Prompt Pack

Including:

* Creative Direction
* Style Recommendation
* Shot Breakdown
* Cinematic Direction
* Lighting Direction
* Image Prompts
* Video Prompts
* Audio Design
* QC Checklist

---

# PRIMARY DIFFERENTIATOR

Existing AI Tools:

ChatGPT
Midjourney
Runway
Sora
Veo
Kling

Generate isolated outputs.

MotionForge generates:

Idea
→ Story
→ Camera
→ Lighting
→ Prompting
→ Production Package

The product is a complete AI Pre-Production Operating System.

---

# FUNCTIONAL REQUIREMENTS

## FR-001 PROJECT CREATION

Users can create projects.

Project Fields:

* id
* name
* description
* type
* status
* owner
* created_at
* updated_at

Project Types:

* SaaS Product
* Social Ad
* AI Tool
* Documentary
* Explainer
* Education
* Product Launch
* Finance
* Historical
* Custom

---

## FR-002 AI PROJECT ANALYSIS

Input:

Freeform text.

Output:

{
content_type,
audience,
emotional_tone,
recommended_styles,
runtime,
aspect_ratio,
pacing
}

---

## FR-003 STYLE RECOMMENDATION ENGINE

Supported Styles:

* Premium Glassmorphism SaaS
* Dark Neon System Diagram
* Editorial Data Visualization
* Cinematic App Walkthrough
* Retro CRT
* Low Poly Explainer
* Documentary Timeline
* Futuristic HUD
* Minimalist Kinetic Typography
* Luxury Brand Film
* Y2K Cyber Pop
* Explainer Infographic
* AI Tool Comparison
* Finance Dashboard
* Social Ad Hook

Output:

Top 3 style recommendations.

---

## FR-004 SHOT GENERATION ENGINE

Generate:

Shot Number
Shot Name
Duration
Purpose
Visual Description
Camera
Movement
Transition
Audio Notes

Each shot must include:

Purpose
Emotional Goal
Visual Goal
Edit Goal

---

## FR-005 CINEMATIC DIRECTOR ENGINE

Automatically generate:

Shot Type
Lens
Camera Height
Framing
Movement
Composition
Editorial Purpose

Supported Concepts:

* Dolly
* Push In
* Pull Back
* Tracking
* Crane
* Steadicam
* Handheld
* Whip Pan
* Rack Focus
* Deep Focus
* POV
* OTS
* Reveal
* Match Cut

Output Structure:

{
shot_type,
lens,
camera_height,
movement,
framing,
composition,
emotional_effect,
editorial_purpose
}

---

## FR-006 LIGHTING DIRECTOR ENGINE

Automatically activated for every project.

Generate:

Scene Intent
Visual Strategy
Lighting Plan
Color Script
Atmosphere Notes
Emotional Effect

Per Shot:

Light Quality
Light Direction
Color Temperature
Motivated Source
Contrast Ratio
Modifiers
Atmospherics
Depth Separation

Continuity Rules:

Key Direction Lock
Fill Strategy Lock
Rim Strategy Lock
Shadow Consistency
Background Separation

AI Lighting Lock:

{
key_light,
fill,
rim,
atmosphere_density,
highlight_behavior,
shadow_behavior
}

---

## FR-007 IMAGE PROMPT GENERATION

Generate prompts for:

* ChatGPT Image
* Midjourney
* Flux
* SDXL
* Nano Banana

Prompt Sections:

Subject
Composition
Style
Materials
Lighting
Color Palette
Lens
Camera Angle
Background
Negative Prompt

---

## FR-008 VIDEO PROMPT GENERATION

Generate prompts for:

* Sora
* Veo
* Runway
* Kling
* Pika
* Luma
* Seedance

Each prompt contains:

Duration
Timing
Camera Motion
Object Motion
Typography Behavior
Lighting Behavior
Atmospherics
Audio Direction
Lock Rules

---

## FR-009 STORYBOARD GENERATION

Create:

Storyboard Frames

Frame Fields:

* frame_number
* description
* composition
* camera
* lighting
* notes

---

## FR-010 VOICEOVER ENGINE

Generate:

Voiceover
Dialogue
Narration
CTA Copy

---

## FR-011 EXPORT ENGINE

Supported Exports:

PDF
DOCX
Markdown
JSON

---

# SYSTEM ARCHITECTURE

Frontend:

Next.js
React
TypeScript
Tailwind
ShadCN

Backend:

NestJS
TypeScript
PostgreSQL
Prisma
Redis

AI Layer:

PromptPackService
StoryboardService
CameraDirectorService
LightingDirectorService
VoiceoverService
ExportService

Storage:

PostgreSQL
S3

Authentication:

Clerk or Auth0

---

# DESKTOP APPLICATION

Framework:

Tauri

Language:

Rust + React

Capabilities:

Offline Mode
Local Project Storage
Asset Synchronization
Export Engine
Local AI Integration

---

# DATABASE SCHEMA

Users

Projects

Scenes

Shots

Storyboards

Prompts

Exports

Assets

BrandKits

Versions

Teams

Comments

Approvals

---

# API DESIGN

POST /projects

POST /generate/style

POST /generate/storyboard

POST /generate/camera

POST /generate/lighting

POST /generate/prompts

POST /generate/voiceover

POST /export/pdf

POST /export/docx

GET /projects

GET /project/{id}

---

# IMPLEMENTATION ROADMAP

PHASE 1

Authentication
Projects
Prompt Generation
Camera Director
Lighting Director
PDF Export

PHASE 2

Storyboards
Brand Kits
Asset Library

PHASE 3

Collaboration
Approvals
Versioning

PHASE 4

Desktop Application

PHASE 5

AI Image Generation

PHASE 6

AI Video Generation

---

# SUCCESS METRICS

Reduce pre-production planning time by 80%.

Generate complete production packages in under 60 seconds.

Support web and desktop workflows.

Become the operating system for AI motion graphics production.
