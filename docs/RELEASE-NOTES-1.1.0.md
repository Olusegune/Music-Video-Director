# Director Studio 1.1.0 — GenerationSpec Core

Director Studio 1.1.0 starts the post-1.0 platform program with a shared generation contract:

- Added `GenerationSpec`, one typed request shape for text/image/video/audio generation surfaces.
- Added router fallback chains, per-model preferred aggregators, recoverable-failure fallback notification hooks, and local-mode no-network conformance tests.
- Added model capability flags so unsupported seed/negative/batch/resolution/reference parameters can be surfaced instead of silently dropped.
- Added shared `ModelSelector` and `GenerateBar` components for StudioMode-aware generation controls.
- Added a module manifest registry for Music Video Director, Motion Studio, Glam Studio, Web Studio, and Campaign Studio.

Packaging artifacts for 1.1.0 are not emitted yet in this implementation slice; source checks run before handoff.
