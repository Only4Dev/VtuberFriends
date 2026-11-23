# Changelog

## 0.7.0 — 2026-11-23

First functional public build and baseline for future updates. Earlier development builds remain historical.

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
- Download `VtuberFriends-Windows-x64.zip`, extract it and open `VtuberFriends.exe`.
- To keep your setup, close the app and extract the ZIP into the same app folder, replacing program files when prompted. Keep `config.json`, `.local` and `Sonidos` in that folder; the ZIP does not include or overwrite your settings. Do not delete the old folder first.
- On the same Windows account, your encrypted token, avatar assignments, positions, sounds and Streamlabs source URLs are retained. A separate empty folder starts a new setup unless you copy those data files into it.

### Validation boundary
Synthetic audio, HTTP/WebSocket, updater, persistence and simulated-DOM tests do not replace prolonged real Discord/DAVE and Streamlabs acceptance tests.
