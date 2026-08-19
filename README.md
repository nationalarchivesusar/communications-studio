# USAR Communications Studio

A browser-based builder for official United States of America Roblox Discord announcements using Discord Components V2.

The project consists of a static GitHub Pages frontend plus a standalone backend service maintained at [`ray4390/communications-studio-backend`](https://github.com/ray4390/communications-studio-backend).

## Current frontend

- Responsive single-page builder with Discord and Roblox sign-in entry points
- Browser Preview mode for frontend development
- Browser-local draft autosave and undo/redo
- Exactly one Discord Components V2 Container per announcement
- Drag-to-reorder child components
- Click-to-edit live Discord preview
- Full-width dark/light desktop/mobile preview workspace
- Managed publishing identities; webhook name/avatar/timestamp/APP badge are not user-editable
- Server-managed destination channels and notification policy
- Text Displays, Sections, Separators, Media Galleries, Link Buttons, and select menus
- No File components or attachment-backed media
- No interactive non-link Buttons
- Discord's 40-component limit validation
- Components V2 import/export using `flags: 32768`

## Publishing identities

Production users do **not** receive the full identity catalog. The backend computes authorized identities from the user's current Discord roles and linked Roblox group ranks and sends only those identities to the builder.

Browser Preview intentionally shows the complete catalog.

The Studio is scoped to Discord guild:

`886068973886640129`

FEC and NARA use Discord-role authorization in that guild. Other current identities use curated Roblox group ranks.

The frontend copy of the authorization design remains in [`docs/publishing-identities.md`](docs/publishing-identities.md). The runtime/canonical backend policy lives in the standalone backend repository.

## Backend

**Canonical backend repository:** [`ray4390/communications-studio-backend`](https://github.com/ray4390/communications-studio-backend)

The standalone backend currently implements:

- persistent opaque Studio sessions
- Discord OAuth (`identify guilds.members.read`)
- Roblox OAuth (`openid profile`) with PKCE
- Discord + Roblox account linking
- fresh Discord guild membership/role checks using the installed bot token
- Roblox group/rank authorization
- `/auth/session`
- `/api/identities`
- server-enforced destination channel/ping policy
- authorization-gated `/api/publish` stub
- SQLite persistence
- Docker/Compose deployment
- automated identity and routing tests

The legacy `backend/` directory in this frontend repository is retained temporarily as a migration snapshot and should **not** be treated as the deployment source. It can be removed after the standalone backend has been deployed and smoke-tested.

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
