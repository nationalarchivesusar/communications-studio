# Communications Studio backend

Node/Express backend for Communications Studio authentication, identity authorization, publication routing, and future Discord webhook execution.

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
- authorization-gated `/api/publish` routing stub
- SQLite persistence
- FEC/NARA Discord-role authorization
- Server-enforced destination-channel policy
- Server-enforced notification-role policy
- FEC `@everyone` exception
- Docker image + Docker Compose deployment
- Caddy reverse-proxy example
- automated policy/routing tests and Docker build CI

## Canonical Discord server

The Studio is scoped to guild:

`886068973886640129`

The configured Discord application/bot must be installed in that server. All Discord role checks are performed against that guild only.

## Publication channels

- White House: `899467464826556427`
- Executive Branch: `886076674792390707`
- Legislative Branch: `886077286414172171`
- Judicial Branch: `886077834911678464`
- Federal Election Commission: `1076283102822940713`

Normal identities are locked to their assigned route. NARA may select any of the four branch channels. FEC is locked to its dedicated FEC channel.

## Notification roles

- Executive Ping: `937155572342587392`
- White House Ping: `1156347407899041812`
- Legislative Ping: `1156346015234924615`
- Judicial Ping: `1156346227286360236`

Normal identities may publish silently or use only their assigned notification role. NARA may select any combination of the four roles but cannot use `@everyone`. FEC may select any combination of the four roles and may also use `@everyone`.

The backend constructs `allowed_mentions` itself. The browser never supplies arbitrary role IDs.

## Development

```bash
cd backend
cp .env.example .env
npm install
npm test
npm start
```

Default development API: `http://localhost:8787`.

## Production with Docker Compose

```bash
cd backend
cp .env.example .env
nano .env

docker compose -f compose.yml build
docker compose -f compose.yml up -d

docker compose -f compose.yml ps
curl http://127.0.0.1:8787/health
```

The container binds only to `127.0.0.1:8787`. Put Caddy or another HTTPS reverse proxy in front of it. `Caddyfile.example` contains the minimal Caddy configuration.

SQLite data is stored in the named Docker volume `communications_studio_data` and survives container replacement/rebuilds.

## Required secrets/configuration

At minimum configure:

- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_BOT_TOKEN`
- `ROBLOX_CLIENT_ID`
- `ROBLOX_CLIENT_SECRET`
- the final public `PUBLIC_BASE_URL`
- matching Discord and Roblox OAuth callback URLs

The production Discord guild/channel/ping IDs already have safe defaults matching the USAR server. They remain environment-overridable for staging/testing.

Do not commit a real `.env` file.

## Frontend integration

Once the API has a public HTTPS hostname, update root `config.js`:

```js
apiBase: "https://your-api-host.example"
```

The existing frontend already calls `/auth/session`, `/auth/discord`, `/auth/roblox`, and `/auth/logout`. The production publishing-identity dropdown is derived from the backend's authorized `publishing_identities`; it does not expose the full catalog. Browser Preview intentionally exposes all identities.

Each returned identity also includes its server-approved channel list, notification-role options, and whether `@everyone` is permitted. The frontend uses this only for presentation; `/api/publish` independently validates the same routing again.

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

## What `/api/publish` does today

It currently performs the security-sensitive checks but deliberately stops before sending a Discord message:

1. authenticates the Studio session;
2. refreshes current Discord/Roblox authorization;
3. verifies the selected publishing identity;
4. verifies the selected destination channel;
5. verifies every selected notification role;
6. verifies the FEC/NARA `@everyone` policy; and
7. returns the server-approved routing/`allowed_mentions` decision with HTTP 501 because webhook execution is not configured yet.

This lets us test authorization without accidentally publishing real messages while OAuth/webhook credentials are still being set up.

## Next backend phase

1. Create/configure the Discord application and bot, and install it in guild `886068973886640129`.
2. Create/configure the Roblox OAuth application.
3. Choose the public HTTPS API hostname and deploy this service.
4. Verify Discord + Roblox account linking end-to-end.
5. Add application-owned webhook provisioning/storage for the five publication channels.
6. Add final Components V2 server-side document validation/rendering.
7. Execute webhooks with `wait=true` and store immutable audit records/message IDs.
8. Add edit/delete/re-publish controls after initial publishing is stable.
