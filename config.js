/**
 * Runtime configuration.
 *
 * The production API is exposed through Tailscale Funnel. Secrets remain
 * server-side; this file contains only public runtime endpoints.
 */
window.COMMUNICATIONS_STUDIO_CONFIG = Object.freeze({
  apiBase: "https://ray-500-c60.tail6f3caa.ts.net:10000",
  discordAuthPath: "/auth/discord",
  robloxAuthPath: "/auth/roblox",
  sessionPath: "/auth/session",
  logoutPath: "/auth/logout",
  enablePreviewAccess: true,
  guildName: "United States of America Roblox",
  docsUrl: "https://docs.discord.com/developers/components/reference"
});
