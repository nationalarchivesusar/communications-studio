# USAR Communications Studio

A browser-based builder for official USAR Discord announcements using Discord Components V2.

The current repository is intentionally frontend-first. It is a static application suitable for GitHub Pages today, while keeping authentication, role resolution, webhook credentials, file uploads, and publishing behind a future backend API.

## Current features

- Responsive single-page builder with a dedicated sign-in screen
- Discord and Roblox OAuth entry points already wired to configurable backend routes
- Browser-local preview session for frontend development
- Browser-local draft autosave
- Undo / redo
- Drag-to-reorder Containers and child components
- Click components in the live Discord preview to edit them
- Dark and light Discord preview modes
- Desktop and compact/mobile preview widths
- Editable webhook display name, avatar, timestamp preview, and allowed-mentions policy
- V2 Container accent colors and spoilers
- Text Display with live Discord-style Markdown rendering
- Section with 1–3 Text Displays and a Thumbnail or Button accessory
- Separator with small/large spacing and optional divider
- Media Gallery with 1–10 items
- File attachment references
- Action Rows with either up to five Buttons or one select menu
- String, User, Role, Mentionable, and Channel selects
- Discord's 40-component message-limit tracking
- Interactive `custom_id` validation and duplicate detection
- Import existing Components V2 JSON into editable builder state
- Export either an editable Studio document or a Discord webhook Components V2 JSON body

The API exporter uses `flags: 32768` (`IS_COMPONENTS_V2`) and Discord's native component type IDs.

## Preview fidelity

The preview deliberately targets the current Discord desktop message surface. A third-party webpage cannot promise literal pixel identity across every Discord client because Discord's production CSS, proprietary `gg sans` font, client density, platform font rasterization, themes, and client revisions are not a public compatibility contract.

The builder therefore separates:

1. **API accuracy** — component nesting, field names, type IDs, limits, and exported payload shape follow Discord's current developer documentation.
2. **Visual fidelity** — original CSS closely recreates the current desktop message surface without bundling Discord proprietary assets.

A future **Send test message** action should post the payload to a private Discord preview channel; Discord itself is the only authoritative renderer.

## Local development

No build step is required.

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000` and choose **Open Builder Preview**.

## GitHub Pages

The app uses relative asset paths and includes `.nojekyll`, so it can be served directly from the repository root at:

`https://nationalarchivesusar.github.io/communications-studio/`

Enable Pages for the `main` branch / repository root in GitHub settings if it is not already enabled.

## Authentication configuration

`config.js` is public runtime configuration. Never put OAuth client secrets, provider tokens, webhook tokens, database credentials, or signing keys in it.

When the backend exists, set `apiBase` and disable preview access. See [`docs/backend-contract.md`](docs/backend-contract.md) for the planned API boundary.

## Security model

The production backend should own OAuth exchanges and tokens, rotating application sessions, Discord guild-role authorization, Roblox account linking, webhook secrets, attachment uploads, allowed-mention enforcement, and final publish authorization. The browser UI is never the authorization boundary.

## Discord references

- https://docs.discord.com/developers/components/reference
- https://docs.discord.com/developers/components/using-message-components
- https://docs.discord.com/developers/resources/webhook
