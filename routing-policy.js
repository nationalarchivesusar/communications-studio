"use strict";

/* Discord publication routing. The backend is authoritative in production;
 * these same IDs are used by Builder Preview so the UI mirrors production. */
const STUDIO_DISCORD_CHANNELS = Object.freeze({
  white_house: { key: "white_house", id: "899467464826556427", label: "#white-house" },
  executive: { key: "executive", id: "886076674792390707", label: "#executive-branch" },
  legislative: { key: "legislative", id: "886077286414172171", label: "#legislative-branch" },
  judicial: { key: "judicial", id: "886077834911678464", label: "#judicial-branch" }
});

const STUDIO_DISCORD_PINGS = Object.freeze({
  executive: { key: "executive", id: "937155572342587392", label: "@Executive Ping" },
  white_house: { key: "white_house", id: "1156347407899041812", label: "@White House Ping" },
  legislative: { key: "legislative", id: "1156346015234924615", label: "@Legislative Ping" },
  judicial: { key: "judicial", id: "1156346227286360236", label: "@Judicial Ping" }
});

const STUDIO_ALL_CHANNEL_KEYS = ["white_house", "executive", "legislative", "judicial"];
const STUDIO_ALL_PING_KEYS = ["executive", "white_house", "legislative", "judicial"];
const STUDIO_WHITE_HOUSE_IDS = new Set(["white_house", "eop", "whmo"]);
const STUDIO_LEGISLATIVE_IDS = new Set(["house", "senate", "uscp", "uscp_oig"]);
const STUDIO_JUDICIAL_IDS = new Set(["judiciary", "supreme_court"]);

function studioRoutingForId(id) {
  if (id === "fec") return { channelKeys: [...STUDIO_ALL_CHANNEL_KEYS], pingKeys: [...STUDIO_ALL_PING_KEYS], allowEveryone: true };
  if (id === "nara") return { channelKeys: [...STUDIO_ALL_CHANNEL_KEYS], pingKeys: [...STUDIO_ALL_PING_KEYS], allowEveryone: false };
  if (STUDIO_WHITE_HOUSE_IDS.has(id)) return { channelKeys: ["white_house"], pingKeys: ["white_house"], allowEveryone: false };
  if (id === "ovp") return { channelKeys: ["white_house"], pingKeys: ["executive"], allowEveryone: false };
  if (STUDIO_LEGISLATIVE_IDS.has(id)) return { channelKeys: ["legislative"], pingKeys: ["legislative"], allowEveryone: false };
  if (STUDIO_JUDICIAL_IDS.has(id)) return { channelKeys: ["judicial"], pingKeys: ["judicial"], allowEveryone: false };
  return { channelKeys: ["executive"], pingKeys: ["executive"], allowEveryone: false };
}

function studioPreviewRouting(id) {
  const policy = studioRoutingForId(id);
  return {
    channels: policy.channelKeys.map((key) => ({ ...STUDIO_DISCORD_CHANNELS[key] })),
    ping_options: policy.pingKeys.map((key) => ({ ...STUDIO_DISCORD_PINGS[key] })),
    allow_everyone: policy.allowEveryone
  };
}

function normalizeRoutedIdentity(raw) {
  const base = normalizeIdentityForClient(raw);
  if (!base) return null;
  const previewRouting = studioPreviewRouting(base.id);
  const channels = Array.isArray(raw?.channels) && raw.channels.length ? raw.channels : previewRouting.channels;
  const pingOptions = Array.isArray(raw?.ping_options) ? raw.ping_options : previewRouting.ping_options;
  return {
    ...base,
    channels: channels.map((item) => ({ key: String(item.key || ""), id: String(item.id || ""), label: item.label || `#${item.key || "channel"}` })).filter((item) => item.id),
    pingOptions: pingOptions.map((item) => ({ key: String(item.key || ""), id: String(item.id || ""), label: item.label || `@${item.key || "Ping"}` })).filter((item) => item.id),
    allowEveryone: raw?.allow_everyone !== undefined ? Boolean(raw.allow_everyone) : previewRouting.allow_everyone,
    pingRoleId: String(pingOptions[0]?.id || "")
  };
}

availablePublishingIdentities = function availablePublishingIdentitiesRouted() {
  if (isBuilderPreviewSession()) {
    return STUDIO_PREVIEW_IDENTITIES.map((identity) => normalizeRoutedIdentity({ ...identity, ...studioPreviewRouting(identity.id), ping_enabled: true })).filter(Boolean);
  }
  const serverIdentities = session?.user?.publishing_identities;
  if (!Array.isArray(serverIdentities)) return [];
  return serverIdentities.map(normalizeRoutedIdentity).filter(Boolean);
};

identityById = function identityByIdRouted(id) {
  return availablePublishingIdentities().find((identity) => identity.id === id) || null;
};

currentPublishingIdentity = function currentPublishingIdentityRouted() {
  const identities = availablePublishingIdentities();
  return identities.find((identity) => identity.id === state?.message?.identityId) || identities[0] || null;
};

inferIdentityId = function inferIdentityIdRouted(message = {}) {
  const identities = availablePublishingIdentities();
  if (identities.some((identity) => identity.id === message.identityId)) return message.identityId;
  const oldName = String(message.displayName || message.username || "").trim().toLowerCase();
  const byName = identities.find((identity) => identity.displayName.toLowerCase() === oldName || identity.label.toLowerCase() === oldName);
  return byName?.id || identities[0]?.id || "";
};

function normalizeMessageRouting(message, identity) {
  if (!message || !identity) return;
  const allowedChannels = identity.channels || [];
  if (!allowedChannels.some((channel) => channel.id === String(message.channelId || ""))) {
    message.channelId = allowedChannels[0]?.id || "";
  }

  let pingKeys = Array.isArray(message.pingKeys) ? message.pingKeys.map(String) : [];
  if (!pingKeys.length && message.sendPing && identity.pingOptions?.[0]) pingKeys = [identity.pingOptions[0].key];
  const allowedPingKeys = new Set((identity.pingOptions || []).map((ping) => ping.key));
  message.pingKeys = [...new Set(pingKeys.filter((key) => allowedPingKeys.has(key)))];
  message.pingEveryone = Boolean(message.pingEveryone && identity.allowEveryone);
  message.sendPing = message.pingKeys.length > 0 || message.pingEveryone;
}

const defaultStateBeforeRouting = defaultState;
defaultState = function defaultStateRouted() {
  const value = defaultStateBeforeRouting();
  const identity = availablePublishingIdentities().find((item) => item.id === value.message.identityId) || availablePublishingIdentities()[0] || null;
  value.message.channelId = identity?.channels?.[0]?.id || "";
  value.message.pingKeys = [];
  value.message.pingEveryone = false;
  value.message.sendPing = false;
  return value;
};

const normalizeStateBeforeRouting = normalizeState;
normalizeState = function normalizeStateRouted(candidate) {
  const value = normalizeStateBeforeRouting(candidate);
  const identity = availablePublishingIdentities().find((item) => item.id === value.message.identityId) || availablePublishingIdentities()[0] || null;
  if (identity && value.message.identityId !== identity.id) value.message.identityId = identity.id;
  normalizeMessageRouting(value.message, identity);
  return value;
};

function renderRoutingToggle(label, help, checked, attrs) {
  return `<div class="toggle-line routing-toggle"><div class="toggle-copy"><strong>${esc(label)}</strong><span>${esc(help)}</span></div><label class="switch"><input type="checkbox" ${checked ? "checked" : ""} ${attrs}><span class="switch-slider"></span></label></div>`;
}

renderMessageInspector = function renderMessageInspectorRouted() {
  const identity = currentPublishingIdentity();
  const identities = availablePublishingIdentities();
  if (!identity) return `<h2 class="inspector-heading">Announcement</h2><div class="validation-box"><strong>No publishing identities</strong>Your connected accounts do not currently authorize an identity.</div>`;
  normalizeMessageRouting(state.message, identity);
  const discord = session?.user?.discord;
  const roblox = session?.user?.roblox;

  const channelControl = identity.channels.length === 1
    ? `<div class="managed-setting">${esc(identity.channels[0].label)}</div>`
    : `<select class="select-input" data-routing-channel>${identity.channels.map((channel) => `<option value="${channel.id}" ${state.message.channelId === channel.id ? "selected" : ""}>${esc(channel.label)}</option>`).join("")}</select>`;

  const pingControls = (identity.pingOptions || []).map((ping) => renderRoutingToggle(
    `Send ${ping.label}`,
    "Include this approved notification role with the announcement.",
    state.message.pingKeys.includes(ping.key),
    `data-routing-ping="${esc(ping.key)}"`
  )).join("");
  const everyoneControl = identity.allowEveryone
    ? renderRoutingToggle("Send @everyone", "FEC is authorized to notify everyone in the selected channel.", Boolean(state.message.pingEveryone), "data-routing-everyone")
    : "";

  return `<h2 class="inspector-heading">Announcement</h2><div class="inspector-type">Publishing identity</div>
    ${field("Publish as", `<select class="select-input" data-bind="message.identityId">${groupedIdentityOptions(identities, identity.id)}</select>`, isBuilderPreviewSession() ? "Preview mode shows the complete catalog." : "Only identities authorized for your connected accounts are shown.")}
    <div class="managed-identity-card" style="--identity-color:${esc(identity.avatarColor)}"><div class="managed-avatar">${identity.avatarUrl ? `<img src="${esc(identity.avatarUrl)}" alt="">` : esc(identity.avatarInitials)}</div><div class="managed-identity-copy"><strong>${esc(identity.displayName)}</strong><span>Display name, avatar, timestamp, APP badge, channels, and mention policy are managed by Communications Studio.</span></div></div>
    ${field("Publish to", channelControl, identity.channels.length === 1 ? "This identity has one approved publication channel." : "This cross-government identity may publish to any approved branch channel.")}
    <div class="field-group"><div class="field-label">Notifications</div><div class="routing-ping-list">${pingControls || '<div class="managed-setting">No notification role</div>'}${everyoneControl}</div><div class="field-help">Leave every option off to publish silently. Arbitrary role mentions are not permitted.</div></div>
    ${!isBuilderPreviewSession() ? `<div class="linked-accounts"><strong>Connected accounts</strong><span>Discord: ${discord ? esc(discord.display_name || discord.username || "Connected") : "Not connected"} · Roblox: ${roblox ? esc(roblox.username || roblox.display_name || "Connected") : "Not connected"}</span>${!roblox ? '<button class="add-inline-btn" data-action="auth-roblox">Connect Roblox</button>' : ""}</div>` : ""}
    <div class="inspector-card"><div class="inspector-card-head"><strong>Draft storage</strong></div><div class="field-help">The builder automatically saves editable announcement content to this browser. Authentication credentials are never stored in the draft.</div><button class="add-inline-btn" data-action="confirm-reset" style="margin-top:10px">Start a fresh announcement</button></div>`;
};

renderDiscordPreview = function renderDiscordPreviewRouted() {
  const identity = currentPublishingIdentity();
  if (!identity) return `<div class="discord-frame" data-theme="${state.preview.theme}"><div class="discord-empty">No authorized publishing identity.</div></div>`;
  normalizeMessageRouting(state.message, identity);
  const avatar = identity.avatarUrl
    ? `<img src="${esc(identity.avatarUrl)}" alt="" onerror="this.style.display='none';this.parentElement.textContent='${esc(identity.avatarInitials)}'">`
    : esc(identity.avatarInitials);
  const selectedPings = (identity.pingOptions || []).filter((ping) => state.message.pingKeys.includes(ping.key));
  const mentions = [
    ...(state.message.pingEveryone ? ["@everyone"] : []),
    ...selectedPings.map((ping) => ping.label)
  ];
  const ping = mentions.length
    ? `<div class="identity-ping-preview"><div class="dc-markdown"><p>${mentions.map((label) => `<span class="dc-mention">${esc(label)}</span>`).join(" ")}</p></div></div>`
    : "";
  const container = state.containers[0];
  return `<div class="discord-frame ${state.preview.device === "mobile" ? "mobile" : ""}" data-theme="${state.preview.theme}">
    <div class="discord-message">
      <div class="dc-avatar" style="background:${esc(identity.avatarColor)}">${avatar}</div>
      <div class="dc-message-main">
        <div class="dc-author-line"><span class="dc-author">${esc(identity.displayName)}</span><span class="dc-app-badge">APP</span><span class="dc-timestamp">${esc(previewTimestamp())}</span></div>
        <div class="dc-components">${ping}${container ? renderDiscordContainer(container) : ""}</div>
      </div>
    </div>
  </div>`;
};

toDiscordPayload = function toDiscordPayloadRouted() {
  const identity = currentPublishingIdentity();
  const container = state.containers[0];
  if (!identity) return { flags: 32768, components: [], allowed_mentions: { parse: [] } };
  normalizeMessageRouting(state.message, identity);
  const selectedPings = (identity.pingOptions || []).filter((ping) => state.message.pingKeys.includes(ping.key));
  const mentionTokens = [
    ...(state.message.pingEveryone ? ["@everyone"] : []),
    ...selectedPings.map((ping) => `<@&${ping.id}>`)
  ];
  const components = [];
  if (mentionTokens.length) components.push({ type: 10, content: mentionTokens.join(" ") });
  if (container) {
    const result = { type: 17, components: container.children.map(toDiscordComponent).filter(Boolean) };
    if (container.accentEnabled) result.accent_color = accentToInt(container.accentColor);
    if (container.spoiler) result.spoiler = true;
    components.push(result);
  }
  const payload = {
    flags: 32768,
    components,
    allowed_mentions: {
      parse: state.message.pingEveryone ? ["everyone"] : [],
      roles: selectedPings.map((ping) => ping.id)
    },
    username: identity.displayName
  };
  if (identity.avatarUrl) payload.avatar_url = identity.avatarUrl;
  return payload;
};

const validateStateBeforeRouting = validateState;
validateState = function validateStateRouted() {
  const issues = validateStateBeforeRouting();
  const identity = currentPublishingIdentity();
  if (!identity) return [...issues, { level: "error", text: "No authorized publishing identity is selected." }];
  normalizeMessageRouting(state.message, identity);
  if (!identity.channels.some((channel) => channel.id === state.message.channelId)) issues.push({ level: "error", text: "The selected publication channel is not authorized for this identity." });
  if (state.message.pingEveryone && !identity.allowEveryone) issues.push({ level: "error", text: "This identity is not authorized to use @everyone." });
  return issues;
};

app.addEventListener("change", (event) => {
  const target = event.target;
  if (!state || !target) return;
  const identityChange = target.dataset?.bind === "message.identityId";
  const channelChange = target.hasAttribute?.("data-routing-channel");
  const pingChange = target.hasAttribute?.("data-routing-ping");
  const everyoneChange = target.hasAttribute?.("data-routing-everyone");
  if (!identityChange && !channelChange && !pingChange && !everyoneChange) return;

  recordUndo();
  if (identityChange) {
    state.message.identityId = target.value;
    const identity = availablePublishingIdentities().find((item) => item.id === target.value) || null;
    state.message.channelId = identity?.channels?.[0]?.id || "";
    state.message.pingKeys = [];
    state.message.pingEveryone = false;
    state.message.sendPing = false;
  } else if (channelChange) {
    state.message.channelId = target.value;
  } else if (pingChange) {
    const key = String(target.dataset.routingPing || "");
    const set = new Set(Array.isArray(state.message.pingKeys) ? state.message.pingKeys : []);
    if (target.checked) set.add(key); else set.delete(key);
    state.message.pingKeys = [...set];
    state.message.sendPing = state.message.pingKeys.length > 0 || Boolean(state.message.pingEveryone);
  } else if (everyoneChange) {
    state.message.pingEveryone = Boolean(target.checked);
    state.message.sendPing = state.message.pingKeys.length > 0 || state.message.pingEveryone;
  }
  saveDraftSoon();
  renderStudio();
  event.stopImmediatePropagation();
});
