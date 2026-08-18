# Communications Studio backend contract

The frontend and backend are deliberately separated. GitHub Pages owns the builder UI; the backend owns authentication, authorization, and eventually Discord publishing.

## Canonical Discord guild

Communications Studio is scoped to the United States of America Roblox Discord server:

`886068973886640129`

All Discord-role authorization is evaluated only against this guild.

## Backend responsibilities

Implemented now:

- Discord OAuth
- Roblox OAuth / account linking
- persistent application sessions
- Discord guild membership and role lookup
- Roblox group/rank snapshots
- publishing identity authorization
- `/auth/session`
- `/api/identities`
- authorization-gated `/api/publish` stub

Still to implement before live publishing:

- destination-channel authorization
- application-owned webhook credentials
- managed webhook display names and avatars
- managed ping-role IDs and allowed-mentions policy
- final Components V2 validation/rendering
- posting/editing/deleting Discord webhook messages
- audit records

The frontend owns announcement composition, live preview, editable draft state, and builder interaction.

Communications Studio deliberately does **not** expose arbitrary webhook appearance, arbitrary mentions, File components, multiple Containers, or interactive non-link buttons.

## Session model

### `GET /auth/session`

Called on page load with `credentials: "include"`.

Unauthenticated:

```json
{"authenticated":false}
```

Authenticated shape:

```json
{
  "authenticated": true,
  "user": {
    "id": "internal-user-id",
    "display_name": "Example User",
    "username": "example",
    "provider": "Discord",
    "studio_access": true,
    "allowed_identity_ids": ["white_house", "doj"],
    "publishing_identities": [
      {
        "id": "white_house",
        "category": "White House",
        "label": "The White House",
        "display_name": "The White House",
        "avatar_url": "",
        "avatar_initials": "WH",
        "avatar_color": "#16365d",
        "ping_label": "@White House Ping",
        "ping_enabled": false
      }
    ],
    "discord": {
      "id": "1234567890",
      "guild_id": "886068973886640129",
      "roles": ["...", "..."]
    },
    "roblox": {
      "id": "123456",
      "username": "Example"
    }
  }
}
```

The frontend dropdown is built from `publishing_identities`. Production users therefore never receive unauthorized identity options. Browser Preview intentionally bypasses this and displays the complete local catalog.

`allowed_identity_ids` and hidden frontend options are conveniences, not the security boundary. The backend recomputes authorization and must check it again at publish time.

## OAuth entry points

### `GET /auth/discord?return_to=<url>`

Starts Discord OAuth using `identify guilds.members.read`. The callback exchanges the code server-side, resolves membership in guild `886068973886640129`, links/creates the internal Studio user, and creates a persistent Studio session.

Discord is the primary Studio login. When the bot token is configured, subsequent authorization checks refresh guild roles directly through the installed bot rather than trusting the roles observed at login forever.

### `GET /auth/roblox?return_to=<url>`

Starts Roblox OAuth using `openid profile` and PKCE. Roblox can be linked to an existing Discord-authenticated Studio user or can establish a session that then prompts the user to connect Discord.

Roblox group/rank authorization is used for the government publishing identities defined in [`publishing-identities.md`](publishing-identities.md).

Roblox is rolling out domain-scoped user IDs in 2026. The current implementation takes an initial group-role snapshot with Roblox's recommended v2 group-role endpoint. The production refresh path should move to Roblox OAuth/Open Cloud group-membership lookup so authorization remains safe as scoped IDs become the norm.

## Discord-role-controlled identities

FEC and NARA do not depend on Roblox ranks.

In guild `886068973886640129`:

- FEC: `1459393135175270593`, `1031740186750636042`
- NARA: `1089923208079220797`

All other currently configured identities use the curated Roblox group/rank policy.

## Session persistence

The backend uses a random opaque server-side session identifier. The cookie is `HttpOnly`, `Secure` in production, and defaults to a 30-day lifetime.

Do not place Discord or Roblox access/refresh tokens in localStorage or expose provider credentials to frontend JavaScript.

If the frontend stays at `nationalarchivesusar.github.io` while the API is on an unrelated domain, cross-site cookie restrictions can interfere with persistent sessions even with `SameSite=None; Secure`. A shared custom-domain arrangement is preferred long-term.

## Logout

### `POST /auth/logout`

Invalidates the current application session and clears the session cookie.

## Publishing identities

Publishing identities are server-managed policy records. Each identity contains its display name/avatar metadata, category, ping policy, and an authorization rule based on either Roblox group ranks or Discord roles.

The complete current matrix is in [`publishing-identities.md`](publishing-identities.md).

The browser chooses only an authorized identity ID. It never controls:

- webhook credentials
- final display name
- final avatar
- Discord application badge
- timestamp
- arbitrary role IDs
- arbitrary `allowed_mentions`

## `GET /api/identities`

Returns only the identities the authenticated user currently qualifies for.

Example:

```json
{
  "identities": [
    {
      "id": "usms",
      "category": "Department of Justice",
      "label": "United States Marshals Service",
      "display_name": "United States Marshals Service",
      "avatar_url": "",
      "avatar_initials": "USMS",
      "avatar_color": "#4a3b26",
      "ping_label": "@Executive Ping",
      "ping_enabled": false
    }
  ]
}
```

## `POST /api/publish`

The route exists now as an authorization gate and intentionally returns `501 publishing_not_configured` after verifying the selected identity. Discord webhook execution is the next backend phase.

Final request shape:

```json
{
  "identity_id": "white_house",
  "send_ping": true,
  "channel_id": "1234567890",
  "builder_document": {
    "schema": "usar.communications-studio/v1",
    "version": 1,
    "message": {
      "identityId": "white_house",
      "sendPing": true
    },
    "containers": [
      {
        "kind": "container",
        "children": []
      }
    ]
  }
}
```

Before sending a live message the backend must:

1. re-check the application session;
2. refresh current Discord/Roblox authorization as appropriate;
3. verify the selected identity and destination channel;
4. require exactly one Container;
5. reject File components and attachment-backed media;
6. reject non-link Buttons;
7. load server-managed webhook display name/avatar;
8. if `send_ping` is true, inject only that identity's configured ping role and whitelist only that role in `allowed_mentions`;
9. render the final Components V2 payload;
10. execute the server-owned/application-owned webhook with `wait=true`; and
11. store the resulting Discord message ID plus an immutable audit snapshot.

Discord itself supplies the real timestamp and APP/application badge.

## Draft persistence

The frontend currently uses localStorage. The same builder document can later be persisted behind authenticated `GET/POST /api/drafts` and `GET/PUT/DELETE /api/drafts/:id` endpoints; localStorage can remain as a recovery copy.

## Media

Communications Studio permits URL-based media in Thumbnails and Media Galleries. It does not permit Discord File components or `attachment://` media references.

## Authorization rule

The browser is never trusted to decide access.

```text
Studio session
    -> Discord roles in guild 886068973886640129
    + linked Roblox group/rank state
        -> authorized publishing identities
            -> allowed destination channels
            -> managed webhook identity
            -> one optional managed ping
```
