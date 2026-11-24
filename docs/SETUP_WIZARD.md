# Setup Wizard

The sidebar and Settings expose **Setup wizard**. The complete wizard is available in English and Spanish, including illustrations, controls and status messages. It uses local app endpoints, never asks for a GitHub account and requires no command line.

## Steps
1. Requirements and what will be configured.
2. Developer Mode in Discord: Settings → Developer (or Advanced in other versions).
3. Create a Discord application and bot; distinguish Application ID from the secret token. No privileged intents are required by this app's Guilds/GuildVoiceStates gateway configuration.
4. Guild Install and invitation: bot scope, View Channels + Connect. The optional generated invitation uses the public Application ID and permissions1049600. Channel overrides must also allow access. No Administrator permission.
5. Copy Server ID and a voice-channel ID; join that channel.
6. Generate/copy the bot token, encrypted local save and connect. A blank token keeps an existing saved one. No token is stored in wizard preferences, localStorage or illustrations.
7. Explicitly create one source or choose an existing one; assign a participant or user ID and a Puppet. Retry reuses the created source. Other source settings are preserved.
8. Copy that source's actual URL into a Streamlabs Browser Source,1440×1080; position it in the scene.
9. Check real connection, membership, enabled source, Test Mode off and increasing PCM frame evidence. The user confirms seeing the working source in Streamlabs; the app cannot inspect their scene.

Opening or navigating the wizard never connects a bot or creates a source. Those actions require their respective Save buttons. Closing with X/Escape or Skip writes only `.local/setup-wizard.json`; finishing writes the same preference. API writes require the normal panel header and origin checks.

## First run and existing users
Automatic display requires default port17861, no saved guild/channel IDs, no token file/environment token, zero stored sources, no skip/completion preference and non-demo mode. Any partial connection setup or legacy source array suppresses it. Manual opening is always possible. Discovery is read-only; updates never reset settings to make the wizard appear.

The figures are generic, local illustrative diagrams, not screenshots of an account. They contain no usernames, server IDs or credentials. The user-supplied screenshots were used as UI references and are not distributed.

## Reference material
- [Discord official bot guide](https://github.com/discord/discord-api-docs/blob/main/developers/quick-start/getting-started.mdx): creation, credentials, installation and invitation.
- [Discord IDs guide](https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID): Developer Mode and copying IDs.
- The supplied newer Discord screenshot places Developer Mode under **Developer**; the guide also mentions **Advanced** for other client versions.

## Verification
`SetupWizardProbe`, `setup-wizard-http-probe.mjs` and `setup-wizard-ui-probe.mjs` cover first-run detection, preservation, explicit actions, bilingual flow, duplicate-source retry and audio/scene completion gates. They use synthetic data and simulated DOM, not live Discord or Streamlabs acceptance.
