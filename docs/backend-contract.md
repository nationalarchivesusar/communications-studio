# Planned backend contract

The frontend is built so authentication and publishing can be added without changing the builder data model.

## Goals

The backend will eventually own:

- Discord OAuth
- Roblox OAuth / account linking
- persistent application sessions
- Discord guild membership and role lookup
- publishing identities and authorization
- channel authorization
- incoming/application-owned webhook credentials
- managed webhook display names and avatars
- managed ping-role IDs and allowed-mentions policy
- final payload validation
- posting, editing, and deleting Discord webhook messages
- audit records

The frontend will continue to own announcement composition, live preview, editable draft state, and builder interaction.

Communications Studio deliberately does **not** expose arbitrary webhook appearance, arbitrary mentions, File components, multiple Containers, or interactive non-link buttons.

## Session model

### `GET /auth/session`

Called on page load with `credentials: "include"`.

Unauthenticated:

```json
{"authenticated":false}
```

Authenticated example:

```json
{
  "authenticated": true,
  "user": {
    "id": "internal-user-id",
    "display_name": "Ray",
    "username": "ray4390",
    "provider": "Discord",
    "avatar_url": "https://...",
    "allowed_identity_ids": ["white_house", "doj"],
    "discord": {
      "id": "1234567890",
      "guild_id": "...",
      "roles": ["...", "..."]
    },
    "roblox": {
      "id": "123456",
      "username": "Example"
    }
  }
}
```

`allowed_identity_ids` is the frontend convenience list used to hide identities the user cannot select. It is not an authorization boundary; the backend must re-check the user's current Discord roles at publish time.

## OAuth entry points

### `GET /auth/discord?return_to=<url>`

Starts Discord OAuth and redirects back to an allow-listed return URL. The callback should exchange the code server-side, resolve the Discord user and USAR guild membership/roles, attach or create the internal user, establish a persistent application session, then return to Communications Studio.

### `GET /auth/roblox?return_to=<url>`

Same shape for Roblox OAuth. Roblox should normally be a linked identity rather than the sole authorization source for Discord publishing permissions.

## Session persistence

Use a rotating opaque server-side session identifier in a cookie with appropriate `Secure`, `HttpOnly`, and `SameSite` attributes. Do not place Discord or Roblox access/refresh tokens in localStorage or expose them to the frontend.

If the frontend remains on `nationalarchivesusar.github.io` while the API lives on an unrelated domain, cross-site cookie restrictions can complicate persistent sessions. A same-site custom-domain arrangement is the cleanest long-term deployment.

## Logout

### `POST /auth/logout`

Invalidates the current application session.

## Publishing identities

Publishing identities are server-managed records. A typical record should contain:

```json
{
  "id": "white_house",
  "display_name": "The White House",
  "avatar_url": "https://...",
  "ping_label": "@White House Ping",
  "ping_role_id": "1234567890",
  "authorized_role_ids": ["..."],
  "allowed_channel_ids": ["..."]
}
```

The browser chooses only the identity ID. It never supplies or overrides `display_name`, `avatar_url`, `ping_role_id`, webhook credentials, or the final `allowed_mentions` object.

Examples of identities include the White House, Department of Justice, Department of State, Secret Service, Marshals Service, House of Representatives, Senate, Department of Defense, Department of the Army, Capitol Police, Metropolitan Police Department, and NARA.

## Future publishing

### `POST /api/publish`

Proposed request:

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

The backend must not trust browser-supplied webhook credentials, role lists, channel permissions, publishing identities, display names, avatars, role IDs, or mention payloads. It should:

1. re-check the session and current Discord roles;
2. verify access to the selected identity and destination channel;
3. require exactly one Container;
4. reject File components and attachment-backed media;
5. reject non-link Buttons;
6. load the server-managed webhook display name/avatar for the identity;
7. if `send_ping` is true, inject only the identity's configured ping role and whitelist only that role in `allowed_mentions`;
8. render the final Components V2 payload;
9. execute the server-owned webhook with `wait=true`; and
10. store the resulting Discord message ID plus an immutable audit snapshot.

Discord itself supplies the actual message timestamp and application badge. The frontend only simulates those values for preview and does not permit users to edit them.

## Draft persistence

The current frontend uses localStorage so it works immediately. The same document schema can later back authenticated endpoints such as `GET/POST /api/drafts` and `GET/PUT/DELETE /api/drafts/:id`; local storage can remain an offline/recovery copy.

## Media

Communications Studio permits URL-based media in Thumbnails and Media Galleries. It does not permit Discord File components or `attachment://` media references. If uploads are added someday, that should be a separate explicitly approved product decision rather than an implicit capability of the current builder.

## Authorization

A likely policy model:

```text
Discord role ID
    -> publishing identity
        -> managed webhook name/avatar
        -> permitted destination channels
        -> can draft / can publish
        -> one permitted ping role
```

Authorization must always be enforced by the backend even if the frontend hides unavailable identities or channels.