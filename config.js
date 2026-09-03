/**
 * Runtime configuration.
 *
 * The canonical production Studio is served by the backend itself so auth and
 * session cookies are first-party. GitHub Pages remains a compatibility entry
 * point and is redirected to that host by index.html.
 */
const COMMUNICATIONS_STUDIO_PRODUCTION_API = "https://ray-500-c60.tail6f3caa.ts.net:10000";
const COMMUNICATIONS_STUDIO_BACKEND_HOST = "ray-500-c60.tail6f3caa.ts.net";

window.COMMUNICATIONS_STUDIO_CONFIG = Object.freeze({
  apiBase: location.hostname === COMMUNICATIONS_STUDIO_BACKEND_HOST
    ? location.origin
    : COMMUNICATIONS_STUDIO_PRODUCTION_API,
  discordAuthPath: "/auth/discord",
  robloxAuthPath: "/auth/roblox",
  sessionPath: "/auth/session",
  logoutPath: "/auth/logout",
  enablePreviewAccess: true,
  guildName: "United States of America Roblox",
  docsUrl: "https://docs.discord.com/developers/components/reference"
});
