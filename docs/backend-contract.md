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
- file uploads for File components and `attachment://` media
- final payload validation
- posting, editing, and deleting Discord webhook messages
- audit records

The frontend will continue to own announcement composition, live preview, editable draft state, and builder interaction.

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

The exact user object can evolve; the current frontend only requires `authenticated` plus a displayable user identity.

## OAuth entry points

### `GET /auth/discord?return_to=<url>`

Starts Discord OAuth and redirects back to an allow-listed return URL. The callback should exchange the code server-side, resolve the Discord user and USAR guild membership/roles, attach or create the internal user, establish a persistent application session, then return to Communications Studio.

### `GET /auth/roblox?return_to=<url>`

Same shape for Roblox OAuth. Roblox should normally be a linked identity rather than the sole authorization source for Discord publishing permissions.

## Session persistence

Use a rotating opaque server-side session identifier in a cookie with appropriate `Secure`, `HttpOnly`, and `SameSite` attributes. Do not place Discord or Roblox access/refresh tokens in localStorage or expose them to the frontend.

If the frontend remains on `nationalarchivesusar.github.io` while the API lives on an unrelated domain, cross-site cookie restrictions can complicate persistent sessions. A same-site custom-domain arrangement is the cleanest long-term deployment, for example `communications.example.gov` plus `api.communications.example.gov`.

## Logout

### `POST /auth/logout`

Invalidates the current application session.

## Future publishing

### `POST /api/publish`

Proposed request:

```json
{
  "identity_id": "white-house",
  "channel_id": "1234567890",
  "builder_document": {
    "schema": "usar.communications-studio/v1",
    "version": 1,
    "message": {},
    "containers": []
  }
}
```

The backend must not trust browser-supplied webhook credentials, role lists, channel permissions, or publishing identities. It should re-check the session and current Discord roles, verify identity/channel access, validate the Studio document, construct `allowed_mentions` from server policy, resolve uploads, render the final Discord payload, execute the server-owned webhook with `wait=true`, and store the resulting message ID plus immutable audit snapshot.

## Draft persistence

The current frontend uses localStorage so it works immediately. The same document schema can later back authenticated endpoints such as `GET/POST /api/drafts` and `GET/PUT/DELETE /api/drafts/:id`; local storage can remain an offline/recovery copy.

## File uploads

Discord File components use `attachment://filename` references. The real publish endpoint will therefore need multipart handling and must map Studio File/media references to Discord attachments. The current frontend represents the reference accurately but does not pretend that typing a filename uploads a file.

## Authorization

A likely future policy model:

```text
Discord role ID
    -> publishing identity
        -> permitted destination channels
        -> can draft / can publish / can manage identity
        -> mention policy
```

Authorization must always be enforced by the backend even if the frontend hides unavailable identities or channels.
