import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config, validateRuntimeConfig } from './config.js';
import {
  accountsForUser, createAppSession, createOauthState, consumeOauthState,
  linkProviderAccount, readAppSession, revokeAppSession, updateAccountMetadata
} from './db.js';
import { authorizedIdentities, getIdentity } from './policy.js';
import { enrichIdentityRouting, validatePublishRouting } from './routing.js';
import {
  discordAuthorizeUrl, discordBotGuildMember, discordOauthGuildMember, discordUser, exchangeDiscordCode,
  exchangeRobloxCode, pkcePair, robloxAuthorizeUrl, robloxGroupRoles, robloxUserInfo
} from './providers.js';

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: config.frontendOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));

function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i <= 0) continue;
    out[decodeURIComponent(part.slice(0, i).trim())] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function cookieOptions({ httpOnly = true, maxAge } = {}) {
  return {
    httpOnly,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: '/',
    ...(maxAge ? { maxAge } : {})
  };
}

function sessionFromRequest(req) {
  const raw = parseCookies(req)[config.sessionCookie];
  const row = readAppSession(raw);
  return row ? { ...row, rawToken: raw } : null;
}

function safeReturnTo(raw) {
  try {
    const fallback = `${config.frontendOrigin}${config.frontendPath}`;
    if (!raw) return fallback;
    const url = new URL(raw);
    if (url.origin !== config.frontendOrigin) return fallback;
    if (!url.pathname.startsWith(config.frontendPath)) return fallback;
    return url.toString();
  } catch {
    return `${config.frontendOrigin}${config.frontendPath}`;
  }
}

function setSessionCookie(res, token, expiresAt) {
  res.cookie(config.sessionCookie, token, cookieOptions({ maxAge: Math.max(1, expiresAt - Date.now()) }));
}

function stateCookie(provider) { return `cs_oauth_${provider}`; }
function setStateCookie(res, provider, state) {
  res.cookie(stateCookie(provider), state, cookieOptions({ maxAge: config.oauthTtlMinutes * 60_000 }));
}
function clearStateCookie(res, provider) { res.clearCookie(stateCookie(provider), cookieOptions()); }

async function freshAuthorization(userId) {
  const accounts = Object.fromEntries(accountsForUser(userId).map((account) => [account.provider, account]));
  const discord = accounts.discord || null;
  const roblox = accounts.roblox || null;
  const now = Date.now();

  let discordRoleIds = Array.isArray(discord?.metadata?.role_ids) ? discord.metadata.role_ids.map(String) : [];
  if (discord && config.discord.botToken) {
    const checkedAt = Number(discord.metadata?.roles_checked_at || 0);
    if (now - checkedAt >= config.authzCacheSeconds * 1000) {
      const member = await discordBotGuildMember(discord.provider_user_id);
      discordRoleIds = Array.isArray(member?.roles) ? member.roles.map(String) : [];
      const next = { ...discord.metadata, role_ids: discordRoleIds, in_guild: Boolean(member), roles_checked_at: now };
      updateAccountMetadata(userId, 'discord', next);
      discord.metadata = next;
    }
  }

  let robloxRoles = Array.isArray(roblox?.metadata?.group_roles) ? roblox.metadata.group_roles : [];
  if (roblox) {
    const checkedAt = Number(roblox.metadata?.roles_checked_at || 0);
    if (now - checkedAt >= config.authzCacheSeconds * 1000) {
      try {
        robloxRoles = await robloxGroupRoles(roblox.provider_user_id);
        const next = { ...roblox.metadata, group_roles: robloxRoles, roles_checked_at: now };
        updateAccountMetadata(userId, 'roblox', next);
        roblox.metadata = next;
      } catch (error) {
        console.warn('Roblox role refresh failed; using cached roles:', error.message);
      }
    }
  }

  const identities = authorizedIdentities({
    discordRoleIds,
    robloxUserId: roblox?.provider_user_id || null,
    robloxGroupRoles: robloxRoles
  }, config.pingRoles).map((identity) => enrichIdentityRouting(identity, config));

  return { accounts, discordRoleIds, robloxRoles, identities };
}

function sessionUserShape(userId, authz) {
  const discord = authz.accounts.discord;
  const roblox = authz.accounts.roblox;
  const preferred = discord || roblox;
  return {
    id: userId,
    display_name: discord?.display_name || roblox?.display_name || preferred?.username || 'Authenticated User',
    username: discord?.username || roblox?.username || '',
    provider: discord ? 'Discord' : 'Roblox',
    studio_access: config.requireDiscord ? Boolean(discord) : Boolean(discord || roblox),
    discord: discord ? {
      id: discord.provider_user_id,
      username: discord.username,
      display_name: discord.display_name,
      avatar_url: discord.avatar_url,
      guild_id: config.discord.guildId,
      roles: authz.discordRoleIds
    } : null,
    roblox: roblox ? {
      id: roblox.provider_user_id,
      username: roblox.username,
      display_name: roblox.display_name,
      avatar_url: roblox.avatar_url
    } : null,
    allowed_identity_ids: authz.identities.map((identity) => identity.id),
    publishing_identities: authz.identities
  };
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'communications-studio-api',
    guild_id: config.discord.guildId,
    configured_channels: config.channels,
    config_warnings: validateRuntimeConfig()
  });
});

app.get('/auth/session', async (req, res, next) => {
  try {
    const session = sessionFromRequest(req);
    if (!session) return res.json({ authenticated: false });
    const authz = await freshAuthorization(session.user_id);
    res.json({ authenticated: true, user: sessionUserShape(session.user_id, authz) });
  } catch (error) { next(error); }
});

app.get('/api/identities', async (req, res, next) => {
  try {
    const session = sessionFromRequest(req);
    if (!session) return res.status(401).json({ error: 'authentication_required' });
    const authz = await freshAuthorization(session.user_id);
    const user = sessionUserShape(session.user_id, authz);
    if (!user.studio_access) return res.status(403).json({ error: 'discord_link_required', identities: [] });
    res.json({ identities: authz.identities });
  } catch (error) { next(error); }
});

app.get('/auth/discord', (req, res) => {
  if (!config.discord.clientId || !config.discord.clientSecret) return res.status(503).send('Discord OAuth is not configured.');
  const current = sessionFromRequest(req);
  const returnTo = safeReturnTo(req.query.return_to);
  const state = createOauthState({ provider: 'discord', sessionUserId: current?.user_id || null, returnTo });
  setStateCookie(res, 'discord', state);
  res.redirect(discordAuthorizeUrl(state));
});

app.get('/auth/discord/callback', async (req, res, next) => {
  try {
    const state = String(req.query.state || '');
    const cookieState = parseCookies(req)[stateCookie('discord')];
    if (!state || !cookieState || state !== cookieState) return res.status(400).send('Invalid Discord OAuth state.');
    const stored = consumeOauthState(state, 'discord');
    clearStateCookie(res, 'discord');
    if (!stored) return res.status(400).send('Discord OAuth state expired or was already used.');
    if (req.query.error) return res.redirect(stored.return_to);
    const code = String(req.query.code || '');
    if (!code) return res.status(400).send('Discord did not return an authorization code.');

    const token = await exchangeDiscordCode(code);
    const profile = await discordUser(token.access_token);
    const member = await discordOauthGuildMember(token.access_token);
    const metadata = {
      role_ids: Array.isArray(member?.roles) ? member.roles.map(String) : [],
      in_guild: Boolean(member),
      roles_checked_at: Date.now()
    };
    const avatarUrl = profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=128` : '';
    const userId = linkProviderAccount({
      provider: 'discord', providerUserId: profile.id, currentUserId: stored.session_user_id,
      username: profile.username || '', displayName: profile.global_name || profile.username || '', avatarUrl, metadata
    });
    const session = createAppSession(userId);
    setSessionCookie(res, session.token, session.expiresAt);
    res.redirect(stored.return_to);
  } catch (error) { next(error); }
});

app.get('/auth/roblox', (req, res) => {
  if (!config.roblox.clientId || !config.roblox.clientSecret) return res.status(503).send('Roblox OAuth is not configured.');
  const current = sessionFromRequest(req);
  const returnTo = safeReturnTo(req.query.return_to);
  const { verifier, challenge } = pkcePair();
  const state = createOauthState({ provider: 'roblox', sessionUserId: current?.user_id || null, returnTo, codeVerifier: verifier });
  setStateCookie(res, 'roblox', state);
  res.redirect(robloxAuthorizeUrl(state, challenge));
});

app.get('/auth/roblox/callback', async (req, res, next) => {
  try {
    const state = String(req.query.state || '');
    const cookieState = parseCookies(req)[stateCookie('roblox')];
    if (!state || !cookieState || state !== cookieState) return res.status(400).send('Invalid Roblox OAuth state.');
    const stored = consumeOauthState(state, 'roblox');
    clearStateCookie(res, 'roblox');
    if (!stored) return res.status(400).send('Roblox OAuth state expired or was already used.');
    if (req.query.error) return res.redirect(stored.return_to);
    const code = String(req.query.code || '');
    if (!code) return res.status(400).send('Roblox did not return an authorization code.');

    const token = await exchangeRobloxCode(code, stored.code_verifier);
    const profile = await robloxUserInfo(token.access_token);
    const groupRoles = await robloxGroupRoles(profile.sub);
    const metadata = { group_roles: groupRoles, roles_checked_at: Date.now() };
    const userId = linkProviderAccount({
      provider: 'roblox', providerUserId: profile.sub, currentUserId: stored.session_user_id,
      username: profile.preferred_username || '', displayName: profile.name || profile.nickname || profile.preferred_username || '',
      avatarUrl: profile.picture || '', metadata
    });
    const session = createAppSession(userId);
    setSessionCookie(res, session.token, session.expiresAt);
    res.redirect(stored.return_to);
  } catch (error) { next(error); }
});

app.post('/auth/logout', (req, res) => {
  const session = sessionFromRequest(req);
  revokeAppSession(session?.rawToken);
  res.clearCookie(config.sessionCookie, cookieOptions());
  res.status(204).end();
});

app.post('/api/publish', async (req, res, next) => {
  try {
    const session = sessionFromRequest(req);
    if (!session) return res.status(401).json({ error: 'authentication_required' });
    const authz = await freshAuthorization(session.user_id);
    const user = sessionUserShape(session.user_id, authz);
    if (!user.studio_access) return res.status(403).json({ error: 'discord_link_required' });

    const identityId = String(req.body?.identity_id || '');
    if (!getIdentity(identityId) || !user.allowed_identity_ids.includes(identityId)) {
      return res.status(403).json({ error: 'identity_not_authorized' });
    }

    const routing = validatePublishRouting(identityId, req.body, config);
    if (!routing.ok) return res.status(403).json({ error: routing.error });

    // Webhook execution is the next backend phase. Until webhook credentials
    // are configured, return the server-validated routing decision so the
    // frontend/integration can be exercised without weakening authorization.
    res.status(501).json({
      error: 'publishing_not_configured',
      identity_id: identityId,
      channel_id: routing.channel_id,
      pings: routing.pings.map((ping) => ({ key: ping.key, id: ping.id, label: ping.label })),
      ping_everyone: routing.ping_everyone,
      allowed_mentions: routing.allowed_mentions
    });
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  const status = error.code === 'ACCOUNT_ALREADY_LINKED' || error.code === 'PROVIDER_ALREADY_LINKED' ? 409 : 500;
  res.status(status).json({ error: error.code || 'internal_error', message: config.nodeEnv === 'development' ? error.message : undefined });
});

app.listen(config.port, () => {
  console.log(`Communications Studio API listening on :${config.port}`);
  for (const warning of validateRuntimeConfig()) console.warn(`CONFIG: ${warning}`);
});
