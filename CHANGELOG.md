# Changelog

## 0.7.0 — 2026-11-23

First public release.

### Added
- Portable Windows x64 download with a clear root executable and bundled runtime in `app`.
- English and Spanish panel, contextual tooltips and organized customization tabs.
- Empty first-run studio, explicit source creation/removal, confirmation and stable, non-reused source IDs (up to 64).
- Eight layered dragon Puppets and four Legacy avatars.
- Per-Puppet accessory profiles, categorized item picker, direct selection and move/scale/rotate handles.
- Entrance and exit animations, local sounds, glows, runes, auras, smoke and lightning.
- Public GitHub update checks, release changelog, one-click verified download/install/restart and backups.
- Separate development settings and privacy exclusions for releases/source publication.

### Fixed
- Damaged Spanish characters and overlapping/contextless editor controls.
- Audio-reader reattachment after voice reconnection, bounded recovery attempts and retry-window resumption.
- Closing the last panel now stops the receiver; minimization keeps it running.

### Compatibility
- Existing avatar assignments, settings, transforms, sound files and Streamlabs URLs are preserved.
- New installations start with zero sources; updates do not reset an existing setup.
- Runtime/dependency changes require a separately validated compatible release; incompatible deltas are rejected.

### Downloads
- **New installation:** extract `VtuberFriends-Windows-x64.zip` and open its root executable.
- **Existing audio05 installation:** close the app, extract **all** of `vf-20261123-first-release-07.zip` beside its existing executable, run `Aplicar parche.exe`, then reopen the app. This adds the updater while preserving the existing folder layout and settings. The patch refuses other versions; do not force it.
- Keep your existing installation and its data. The full-download ZIP is a clean installation, not a replacement for a configured folder.

### Validation boundary
Synthetic audio, HTTP/WebSocket, updater, persistence and simulated-DOM tests do not replace prolonged real Discord/DAVE and Streamlabs acceptance tests.
