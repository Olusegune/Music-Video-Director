# MotionForge Studio

# UI / UX Design Specification

Version: 1.0

---

# Overview

This document defines the user experience, interface architecture, navigation system, design language, and interaction patterns for MotionForge Studio.

MotionForge Studio is an AI-powered motion graphics pre-production platform that transforms ideas into complete production-ready creative packages.

This specification applies to:

* Web Application
* Windows Desktop Application

---

# Product Experience Philosophy

## Core Principle

MotionForge is not a chatbot.

MotionForge is a creative production workspace.

Users should feel like they are directing a film, building a commercial, or planning a motion graphics project.

The AI should feel embedded into the workflow rather than becoming the workflow itself.

---

# Product Inspirations

Primary references:

* Figma
* Linear
* Notion
* Frame.io
* DaVinci Resolve
* Arc Browser

Secondary references:

* Adobe After Effects
* Milanote
* Pitch
* Framer

Avoid:

* ChatGPT-style interfaces
* Single prompt box experiences
* Endless scrolling outputs
* Conversation-first workflows

---

# UX Principles

## Visual First

Always prioritize visual outputs before text outputs.

Examples:

* Storyboards
* Moodboards
* Shot Cards
* Timelines
* Camera Diagrams
* Lighting Plans

---

## Project-Centric

All content exists inside a project.

Hierarchy:

Project
→ Scene
→ Shot
→ Asset
→ Prompt

---

## Editable Everything

Every AI-generated output must remain editable.

Users can:

* Modify
* Duplicate
* Lock
* Regenerate
* Version

Any output at any stage.

---

## Professional Tooling

The interface should resemble creative software.

Not a chat application.

---

# Information Architecture

## Top-Level Navigation

Dashboard

Projects

Storyboard

Camera Director

Lighting Director

Prompt Builder

Exports

Asset Library

Settings

---

# Primary Application Layout

Three-Panel Layout

---

LEFT PANEL

Navigation
Projects
Assets
Templates

---

CENTER PANEL

Workspace

---

RIGHT PANEL

Inspector

---

---

# Dashboard

Purpose:

Project Management

Widgets:

* Recent Projects
* Favorites
* Templates
* Recent Exports
* Team Activity
* Quick Create

Primary CTA:

Create New Project

---

# Project Workspace

Purpose:

Primary production workspace.

Project Header Displays:

* Project Name
* Project Type
* Aspect Ratio
* Duration
* Status
* Version
* Last Modified

Primary Actions:

* Generate
* Export
* Duplicate
* Share
* Archive

---

# Workspace Modes

## Storyboard Mode

Primary creative view.

Displays:

Storyboard Cards

Each Card Includes:

* Thumbnail
* Shot Number
* Shot Name
* Duration
* Camera Type
* Lighting Type
* Status

Actions:

* Reorder
* Duplicate
* Delete
* Lock
* Regenerate

---

## Shot Detail Mode

Selecting a storyboard card opens detailed shot view.

Displays:

* Shot Description
* Camera Plan
* Lighting Plan
* Prompt Output
* Audio Notes
* References

---

## Prompt Builder Mode

Split-screen layout.

Left Panel:

Prompt Components

Right Panel:

Generated Prompt

Live Preview Updates

Prompt Types:

* Image
* Video
* Voiceover
* Storyboard

---

# Camera Director Workspace

Purpose:

Visual cinematography planning.

Layout:

Camera Timeline

Camera Diagram

Lens Inspector

Movement Controls

Coverage Planner

---

# Camera Card Structure

Fields:

Shot Type

Lens

Camera Height

Camera Angle

Movement

Composition

Emotional Purpose

Editorial Purpose

Visual Storytelling Notes

---

# Lighting Director Workspace

Purpose:

Scene lighting design.

Layout:

Lighting Diagram

Color Script

Scene Breakdown

Atmosphere Controls

Lighting Continuity Rules

---

# Lighting Card Structure

Fields:

Scene Intent

Visual Strategy

Key Light

Fill Light

Rim Light

Color Temperature

Contrast Ratio

Atmospheric Elements

Depth Separation

Lighting Continuity Rules

---

# Timeline Workspace

Professional planning view.

Horizontal structure.

Scene 1
Shot 1
Shot 2
Shot 3

Scene 2
Shot 4
Shot 5

Features:

* Drag and Drop
* Reorder
* Resize
* Lock
* Group

---

# Asset Library

Purpose:

Centralized creative asset storage.

Stores:

* Storyboards
* Images
* Videos
* Scripts
* Prompt Packs
* Exports
* Brand Assets

Features:

* Search
* Tagging
* Collections
* Filtering

---

# Brand Kit Manager

Purpose:

Maintain creative consistency.

Stores:

* Logos
* Typography
* Color Systems
* Motion Rules
* Voice Guidelines
* Lighting Preferences

Brand Kits may be applied to entire projects.

---

# Export Center

Purpose:

Generate deliverables.

Supported Exports:

* PDF
* DOCX
* Markdown
* JSON
* Production Package

Export Options:

* Full Project
* Scene
* Shot
* Prompt Bundle

---

# AI Assistant Panel

Secondary feature.

Not the primary interface.

Location:

Bottom Right Drawer

Functions:

* Edit outputs
* Refine prompts
* Ask questions
* Regenerate content

Example Commands:

"Make this more cinematic."

"Use Deakins-style lighting."

"Convert this to Veo format."

"Shorten runtime to 30 seconds."

---

# Visual Design System

## Color Palette

Background:
#0B0D10

Surface:
#14171A

Surface Elevated:
#1C1F24

Primary:
#6D5DFC

Accent:
#00D9FF

Success:
#4ADE80

Warning:
#F59E0B

Danger:
#EF4444

Text Primary:
#FFFFFF

Text Secondary:
#A3A3A3

Border:
#2A2D33

---

# Typography

Primary:

Inter

Secondary:

SF Pro Display

Monospace:

JetBrains Mono

---

# Spacing System

Base Unit:

8px

Scale:

8
16
24
32
48
64
96

---

# Component Radius

Cards:

12px

Inputs:

10px

Buttons:

10px

Modals:

16px

---

# Motion System

Microinteractions:

200ms

Page Transitions:

300ms

Modal Animations:

250ms

Panel Expansions:

250ms

Animation Style:

Subtle
Professional
Cinematic

Avoid:

* Excessive bounce
* Flashy effects
* Distracting transitions

---

# Desktop Application UX

Technology:

Tauri

Desktop-specific features:

* Offline Projects
* Local Asset Management
* Local AI Providers
* Folder Sync
* Batch Exports
* Drag-and-Drop Asset Import

Desktop UX should remain visually identical to Web UX whenever possible.

---

# Accessibility Requirements

Minimum Contrast Ratio:

4.5:1

Keyboard Navigation:

Required

Screen Reader Support:

Required

Reduced Motion Support:

Required

Focus Indicators:

Required

---

# Future UX Modules

Planned Features:

* Moodboard Builder
* AI Storyboard Generator
* Prompt Diff Viewer
* Timeline Editor
* Frame Commenting
* Team Reviews
* Client Review Links
* Presentation Mode
* Approval Workflows

---

# Golden Rule

Users should feel like they are directing a film.

Not chatting with an AI.
