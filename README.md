# Vtuber & Friends

[English](README.md) | [Español](README.es.md)

Voice-driven, layered 2D dragon avatars for Discord calls and Streamlabs. **Only the streamer installs the app.** Guests use regular Discord.

**Windows x64 · Portable · English / Spanish UI · Version 0.8.0**

[Download the latest release](https://github.com/Only4Dev/VtuberFriends/releases/latest) · [Changelog](CHANGELOG.md)

## Get started

1. Download **VtuberFriends-Windows-x64.zip** from Releases and extract the entire ZIP into a writable folder.
2. Open **VtuberFriends.exe**. Keep the `app` and `Sonidos` folders beside it. No .NET installation or PowerShell is required for the release.
   On an unconfigured installation, **Setup wizard** guides you through bot creation, invitation, IDs, connection and your first avatar source. Skip it or reopen it from the sidebar or Settings. Configured installations do not launch it automatically.
3. In **Settings**, enter your Discord bot token, server ID and voice-channel ID, then choose **Save and connect**. Create and invite an official bot through the [Discord Developer Portal](https://discord.com/developers/applications); it needs access to view and connect to the voice channel.
4. Click **+ Add source**, choose a Puppet and assign a guest. You can prepare a guest by Discord user ID before they join.
5. Enable **Show**, copy the source URL and add a **Browser Source** in Streamlabs. Use **1440 × 1080** for HD, or **800 × 600** for lower resource use.

A new installation starts with **zero sources**. Existing installations keep their sources, settings and URLs. Up to 64 sources can be added; removing one requires confirmation and never renumbers another source or reuses its URL.

## Customize your cast

- Eight layered Puppets and four original **Legacy** avatars.
- Per-Puppet accessories, positioning, scale and rotation. Add items by category, select them on the preview and use the drag handles.
- Voice sensitivity and mouth response, head/eye gestures, wings, breathing and selective glow.
- Entrance/exit animations, sounds, auras, runes, smoke and lightning.
- Name labels, opacity, a performance mode and an offline test mode for arranging Streamlabs sources.
- Put audio files in **Sonidos** and refresh the library when needed; the app does not constantly rescan the folder.

## Updates

The panel checks public GitHub Releases when opened (enabled by default). When a compatible update is available, it shows the version, **View changelog** and **Update**. Clicking **Update** downloads and verifies the patch, closes the receiver, creates a backup, installs it and restarts the app.

Install updates after your stream. The updater preserves `config.json`, `.local`, bot credentials, sound files, avatar assignments and positions. It checks the exact installed version and refuses incompatible or modified program files. See [UPDATES.md](docs/UPDATES.md) for the release contract and rollback rules.

## Your data

`config.json`, `.local` and `Sonidos` live beside the main executable. Keep them when moving or backing up an installation. The bot token is encrypted for the current Windows account; configure it again on another Windows account or PC. Never upload your token or `.local` folder to GitHub.

To keep your setup when downloading this release, close the app and extract the full ZIP into the same app folder, replacing program files. **Do not delete that folder first.** The ZIP contains no personal settings; keep `config.json`, `.local` and `Sonidos` beside the root executable. No separate incorporation patch is needed.

Closing the last panel window stops the receiver after a short grace period. Minimizing keeps it running. Browser sources alone do not keep a closed panel's receiver alive.

## Development

Requires the .NET 10 SDK selected by `global.json`. The native Windows x64 voice libraries are pinned in `native/win-x64`; do not upgrade libdave independently of Discord.Net.

```powershell
.\scripts\run.ps1
```

Development uses isolated settings under `.local/dev`. Use `-UseExistingData` only when you explicitly want to open the older local setup. Use `-Demo -NoPanel -DataDirectory <temporary-folder>` for isolated tests without Discord.

Build a portable release with `scripts/publish.ps1`. Compiling the small native launcher also requires the Visual Studio C++ build tools. A GitHub Actions template is provided in `.github/workflow-templates/release.yml`; it is not active until installed under `.github/workflows/` using an account credential with workflow permission. The first release is published through the GitHub API. See [PATCH_WORKFLOW.md](docs/PATCH_WORKFLOW.md).

## Validation and limits

Audio recovery, settings preservation, source management, updater validation and panel behavior have synthetic tests. These do not prove uninterrupted multi-hour Discord/DAVE calls or replace a real Streamlabs visual/audio check. Fatal MLS/DAVE failures stop automatic retries; silence alone never triggers reconnection.

Third-party components retain their respective licenses; see `third-party/` and the notices included with the download.
