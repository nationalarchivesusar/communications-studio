import path from 'node:path';

function int(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value, fallback = false) {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

const root = process.cwd();
const publicBaseUrl = (process.env.PUBLIC_BASE_URL || 'http://localhost:8787').replace(/\/$/, '');
const frontendOrigin = (process.env.FRONTEND_ORIGIN || 'http://localhost:8000').replace(/\/$/, '');
const frontendPath = process.env.FRONTEND_PATH || '/';

export const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: int(process.env.PORT, 8787),
  publicBaseUrl,
  frontendOrigin,
  frontendPath,
  databasePath: process.env.DATABASE_PATH || path.join(root, 'data', 'communications-studio.sqlite'),
  sessionCookie: process.env.SESSION_COOKIE || 'cs_session',
  sessionTtlDays: int(process.env.SESSION_TTL_DAYS, 30),
  oauthTtlMinutes: int(process.env.OAUTH_TTL_MINUTES, 10),
  cookieSecure: bool(process.env.COOKIE_SECURE, publicBaseUrl.startsWith('https://')),
  cookieSameSite: process.env.COOKIE_SAME_SITE || (frontendOrigin === new URL(publicBaseUrl).origin ? 'lax' : 'none'),
  requireDiscord: bool(process.env.REQUIRE_DISCORD, true),
  authzCacheSeconds: int(process.env.AUTHZ_CACHE_SECONDS, 300),
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    guildId: process.env.DISCORD_GUILD_ID || '',
    botToken: process.env.DISCORD_BOT_TOKEN || '',
    redirectUri: process.env.DISCORD_REDIRECT_URI || `${publicBaseUrl}/auth/discord/callback`
  },
  roblox: {
    clientId: process.env.ROBLOX_CLIENT_ID || '',
    clientSecret: process.env.ROBLOX_CLIENT_SECRET || '',
    redirectUri: process.env.ROBLOX_REDIRECT_URI || `${publicBaseUrl}/auth/roblox/callback`
  },
  pingRoles: {
    white_house: process.env.PING_ROLE_WHITE_HOUSE || '',
    executive: process.env.PING_ROLE_EXECUTIVE || '',
    legislative: process.env.PING_ROLE_LEGISLATIVE || '',
    military: process.env.PING_ROLE_MILITARY || '',
    judicial: process.env.PING_ROLE_JUDICIAL || '',
    independent: process.env.PING_ROLE_INDEPENDENT || ''
  }
});

export function validateRuntimeConfig() {
  const problems = [];
  if (!config.discord.clientId || !config.discord.clientSecret || !config.discord.guildId) {
    problems.push('Discord OAuth is not fully configured.');
  }
  if (!config.roblox.clientId || !config.roblox.clientSecret) {
    problems.push('Roblox OAuth is not fully configured.');
  }
  if (config.cookieSameSite === 'none' && !config.cookieSecure) {
    problems.push('SameSite=None cookies require COOKIE_SECURE=true in browsers.');
  }
  return problems;
}
