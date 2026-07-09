# Director Studio 1.0.0 Release Notes

Director Studio 1.0.0 is the first commercial Windows release candidate for the unified Director Studio platform.

## What ships

- Music Video Director: song import, guided Magic Flow, directorial treatment, cast, choreography, timeline, and export flow.
- Motion Studio: motion-template planning and visual production workflow.
- Glam Studio: luxury campaign intake, brand DNA, concepting, format planning, hero workflow, and export approval.
- Web Studio: site strategy, responsive page compilation, SEO structure, and export.
- Campaign Studio: campaign strategy, channel planning, production handoffs, calendar, and package export.
- Shared production libraries: Script Studio, Character Bible, World Bible, Props & Vehicles, Asset Library, and Brand Kits.
- Local-first router mode for planning without provider calls.
- Versioned local storage wrappers and migration tests.

## System requirements

- Windows 10/11 x64
- Microsoft WebView2 Runtime
- Optional: FFmpeg on PATH for final video render workflows
- Optional: provider API keys for image, video, text, or voice generation

## Signing status

This build is unsigned unless a signing certificate is supplied at package time. Windows SmartScreen may show an "unrecognized app" warning. If you trust this build, choose "More info" and then "Run anyway".

## Identity decision

The user-visible product name is Director Studio. The Windows bundle identifier is `ai.wheelbarrow.directorstudio` in 1.0.0. Windows treats this as a distinct app identity from earlier MotionForge builds, so prior WebView2/localStorage data is not automatically reused by this release.

## Known issues

- Provider-backed media generation requires user-supplied API keys and may vary by provider availability.
- Fully automated update delivery is not configured for this unsigned release.
- Packaged end-to-end visual QA must be run on the target Windows machine before customer distribution.
