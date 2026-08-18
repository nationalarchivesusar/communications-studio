# Communications Studio backend

Node/Express backend for authentication, publishing authorization, and future Discord message publishing.

## What is implemented

- Persistent opaque application sessions (30 days by default)
- Discord OAuth (`identify guilds.members.read`)
- Roblox OAuth (`openid profile`) with PKCE
- Discord/Roblox account linking into one Studio user
- Fresh Discord guild-role checks through the installed Discord bot
- Roblox group/rank snapshots and authorization policy
- Curated publishing identity matrix
- `/auth/session`
- `/api/identities`
- authorization-gated `/api/publish` stub
- SQLite persistence
- FEC/NARA Discord-role authorization

## Canonical Discord server

The Studio is scoped to guild:

`886068973886640129`

The configured Discord application/bot must be installed in that server. All Discord role checks are performed against that guild only.

## Development

```bash
cd backend
cp .env.example .env
npm install
npm test
npm start
```

Default development API: `http://localhost:8787`.

## Required secrets/configuration

At minimum configure:

- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_BOT_TOKEN`
- `ROBLOX_CLIENT_ID`
- `ROBLOX_CLIENT_SECRET`
- the final public `PUBLIC_BASE_URL`
- matching Discord and Roblox OAuth callback URLs

Do not commit a real `.env` file.

## Frontend integration

Once the API has a public HTTPS hostname, update root `config.js`:

```js
apiBase: "https://your-api-host.example"
```

The existing frontend already calls `/auth/session`, `/auth/discord`, `/auth/roblox`, and `/auth/logout`. The production publishing-identity dropdown is derived from the backend's authorized `publishing_identities`; it does not expose the full catalog. Browser Preview intentionally exposes all identities.

## Identity authorization

See [`../docs/publishing-identities.md`](../docs/publishing-identities.md).

FEC and NARA are controlled by Discord roles in guild `886068973886640129`:

- FEC: `1459393135175270593`, `1031740186750636042`
- NARA: `1089923208079220797`

All other current identities use curated Roblox community ranks.

## Roblox authorization note

Roblox is rolling out domain-scoped user identifiers in 2026. The current code uses the recommended v2 group-role lookup to build a cached role snapshot, but production should migrate the refresh path to Roblox's OAuth/Open Cloud group-membership APIs as scoped-ID support settles. Do not design authorization around the assumption that a Roblox numeric user ID is globally portable forever.

## Session deployment note

The GitHub Pages frontend and a separately hosted API are cross-site origins. Persistent `HttpOnly` cookies are configured for `SameSite=None; Secure`, but browser third-party-cookie restrictions can still make that architecture fragile. The preferred production arrangement is a shared site/domain, for example:

- `communications.example.org` — frontend
- `api.communications.example.org` — API

or serving both through the same reverse proxy/domain.

## Next backend phase

1. Configure OAuth applications and deploy the API.
2. Verify real Discord and Roblox account linking end-to-end.
3. Replace Roblox cached-role refresh with scoped-ID-safe Open Cloud membership checks.
4. Add destination-channel policy and application-owned webhook storage.
5. Implement `/api/publish` rendering, ping enforcement, webhook execution, edit/delete, and audit records.
