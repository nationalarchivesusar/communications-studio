# USAR Communications Studio

A browser-based builder for official United States of America Roblox Discord announcements using Discord Components V2.

The project now consists of a static GitHub Pages frontend plus an in-repository Node/Express backend ready to deploy on the USAR Linux server.

## Current frontend

- Responsive single-page builder with Discord and Roblox sign-in entry points
- Browser Preview mode for frontend development
- Browser-local draft autosave and undo/redo
- Exactly one Discord Components V2 Container per announcement
- Drag-to-reorder child components
- Click-to-edit live Discord preview
- Full-width dark/light desktop/mobile preview workspace
- Managed publishing identities; webhook name/avatar/timestamp/APP badge are not user-editable
- Per-identity approved ping toggle only; no arbitrary mention configuration
- Text Displays, Sections, Separators, Media Galleries, Link Buttons, and select menus
- No File components or attachment-backed media
- No interactive non-link Buttons
- Discord's 40-component limit validation
- Components V2 import/export using `flags: 32768`

## Publishing identities

Production users do **not** receive the full identity catalog. The backend computes authorized identities from the user's current Discord roles and linked Roblox group ranks and sends only those identities to the builder.

Browser Preview intentionally shows the complete catalog.

The canonical authorization matrix is documented in [`docs/publishing-identities.md`](docs/publishing-identities.md).

The Studio is scoped to Discord guild:

`886068973886640129`

FEC and NARA use Discord-role authorization in that guild. Other current identities use curated Roblox group ranks.

## Backend

The backend currently implements:

- persistent opaque 30-day Studio sessions
- Discord OAuth (`identify guilds.members.read`)
- Roblox OAuth (`openid profile`) with PKCE
- Discord + Roblox account linking
- Discord role refresh through the installed bot
- Roblox group/rank authorization snapshots
- `/auth/session`
- `/api/identities`
- authorization-gated `/api/publish` stub
- SQLite persistence
- automated identity-policy tests

See [`backend/README.md`](backend/README.md) for deployment/configuration and [`docs/backend-contract.md`](docs/backend-contract.md) for the API boundary.

## Preview fidelity

The preview deliberately targets the Discord desktop message surface. A third-party webpage cannot guarantee literal pixel identity across every Discord client because Discord's production CSS, proprietary `gg sans` font, density settings, OS font rasterization, themes, and client revisions are not a public compatibility contract.

The builder therefore separates API accuracy from visual fidelity. A future **Send test message** action should post the payload to a private Discord preview channel; Discord itself is the authoritative renderer.

## Local frontend development

No frontend build step is required.

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000` and choose **Open Builder Preview**.

## GitHub Pages

The frontend is served from the repository root at:

`https://nationalarchivesusar.github.io/communications-studio/`

`config.js` is public runtime configuration. Never put OAuth client secrets, bot tokens, webhook tokens, database credentials, or production role secrets in it.

Once the API has a public HTTPS hostname, set `apiBase` in `config.js`. Until then the browser preview remains usable with no backend.

## Security model

The browser is never the authorization boundary. The backend re-evaluates publishing access, owns session/OAuth secrets, owns destination/webhook policy, resolves approved ping roles, and will perform final message validation before posting.

## Discord references

- https://docs.discord.com/developers/components/reference
- https://docs.discord.com/developers/components/using-message-components
- https://docs.discord.com/developers/resources/webhook
