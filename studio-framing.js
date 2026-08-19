"use strict";

/*
 * Managed Communications Studio framing.
 *
 * Every published Container is wrapped with a Studio-owned Text Display
 * header and footer. The header carries the office/address/CC line, while the
 * footer carries the Roblox identity and office position. They are generated
 * at render/export time so they cannot be deleted or reordered as ordinary
 * builder children.
 */

const STUDIO_MAX_USER_PINGS = 25;
let studioMemberSearchResults = [];
let studioMemberSearchTimer = null;
let studioMemberSearchSequence = 0;

function studioCleanLine(value, max = 256) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim().slice(0, max);
}

function studioUserPings() {
  return Array.isArray(state?.message?.userPings) ? state.message.userPings : [];
}

function studioRolePings(identity) {
  return (identity?.pingOptions || []).filter((ping) => (state?.message?.pingKeys || []).includes(ping.key));
}

function studioHasNotifications(identity = currentPublishingIdentity()) {
  return Boolean(state?.message?.pingEveryone || studioRolePings(identity).length || studioUserPings().length);
}

function studioSyncPingFlag(identity = currentPublishingIdentity()) {
  if (!state?.message) return;
  state.message.sendPing = studioHasNotifications(identity);
}

function studioRobloxUsername() {
  return studioCleanLine(session?.user?.roblox?.username || session?.roblox?.username || "Roblox username", 100);
}

function studioRoleplayName() {
  return studioCleanLine(state?.message?.roleplayName || "", 100);
}

function studioPosition(identity = currentPublishingIdentity()) {
  return studioCleanLine(identity?.position || identity?.label || "Authorized Publisher", 160);
}

function studioOfficeEmoji(identity = currentPublishingIdentity()) {
  return studioCleanLine(identity?.officeEmoji || identity?.office_emoji || `:${identity?.avatarInitials || "USAR"}:`, 64);
}

function studioHeaderTitle(identity = currentPublishingIdentity()) {
  return studioCleanLine(state?.message?.headerTitle || identity?.label || "Official Communication", 256);
}

function studioAddressLine1() {
  return studioCleanLine(state?.message?.addressLine1 || "", 256);
}

function studioAddressLine2() {
  return studioCleanLine(state?.message?.addressLine2 || "", 256);
}

function studioMentionPreviewItems(identity = currentPublishingIdentity()) {
  const items = [];
  if (state?.message?.pingEveryone) items.push({ id: "everyone", label: "@everyone" });
  for (const ping of studioRolePings(identity)) items.push({ id: `role:${ping.id}`, label: ping.label });
  for (const user of studioUserPings()) items.push({ id: `user:${user.id}`, label: `@${user.display_name || user.username || "user"}` });
  return items;
}

function studioHeaderPayloadText(identity = currentPublishingIdentity()) {
  const lines = [
    `# ${studioHeaderTitle(identity)}`,
    studioAddressLine1(),
    studioAddressLine2()
  ];
  const mentions = [
    ...(state?.message?.pingEveryone ? ["@everyone"] : []),
    ...studioRolePings(identity).map((ping) => `<@&${ping.id}>`),
    ...studioUserPings().map((user) => `<@${user.id}>`)
  ];
  if (mentions.length) lines.push(`-# cc: ${mentions.join(" ")}`);
  return lines.join("\n");
}

function studioFooterPayloadText(identity = currentPublishingIdentity()) {
  const roleplay = studioRoleplayName();
  const roblox = studioRobloxUsername();
  const lines = [];
  if (roleplay) {
    lines.push(`*${roleplay}*`);
    if (roblox && roblox.toLowerCase() !== roleplay.toLowerCase()) lines.push(`-# ${roblox}`);
  } else {
    lines.push(`*${roblox}*`);
  }
  lines.push(`-# ${studioOfficeEmoji(identity)} ${studioPosition(identity)}`);
  return lines.join("\n");
}

function studioHeaderPreviewHtml(identity = currentPublishingIdentity()) {
  const mentions = studioMentionPreviewItems(identity);
  const cc = mentions.length
    ? `<div class="dc-subtext managed-cc">cc: ${mentions.map((item) => `<span class="dc-mention">${esc(item.label)}</span>`).join(" ")}</div>`
    : "";
  return `<div class="dc-component managed-framing managed-header">
    <div class="dc-markdown">
      <h1>${esc(studioHeaderTitle(identity))}</h1>
      <p>${esc(studioAddressLine1() || "Address line 1")}</p>
      <p>${esc(studioAddressLine2() || "Address line 2")}</p>
      ${cc}
    </div>
  </div>`;
}

function studioFooterPreviewHtml(identity = currentPublishingIdentity()) {
  return `<div class="dc-component managed-framing managed-footer">${renderDiscordMarkdown(studioFooterPayloadText(identity))}</div>`;
}

function studioManagedComponentCount() {
  return state?.containers?.[0] ? 2 : 0;
}

const studioDefaultStateBeforeFraming = defaultState;
defaultState = function defaultStateWithManagedFraming() {
  const value = studioDefaultStateBeforeFraming();
  const identity = availablePublishingIdentities().find((item) => item.id === value.message.identityId) || availablePublishingIdentities()[0] || null;
  value.message.headerTitle = identity?.label || "Official Communication";
  value.message.addressLine1 = "";
  value.message.addressLine2 = "";
  value.message.roleplayName = "";
  value.message.userPings = [];
  value.preview.theme = "dark";
  value.preview.device = "desktop";
  return value;
};

const studioNormalizeStateBeforeFraming = normalizeState;
normalizeState = function normalizeStateWithManagedFraming(candidate) {
  const value = studioNormalizeStateBeforeFraming(candidate);
  const incoming = candidate?.message || {};
  const identity = availablePublishingIdentities().find((item) => item.id === value.message.identityId) || availablePublishingIdentities()[0] || null;
  value.message.headerTitle = studioCleanLine(
    incoming.headerTitle !== undefined ? incoming.headerTitle : (value.message.headerTitle || identity?.label || "Official Communication"),
    256
  );
  value.message.addressLine1 = studioCleanLine(incoming.addressLine1 ?? value.message.addressLine1 ?? "", 256);
  value.message.addressLine2 = studioCleanLine(incoming.addressLine2 ?? value.message.addressLine2 ?? "", 256);
  value.message.roleplayName = studioCleanLine(incoming.roleplayName ?? value.message.roleplayName ?? "", 100);
  const seen = new Set();
  value.message.userPings = (Array.isArray(incoming.userPings) ? incoming.userPings : [])
    .map((user) => ({
      id: String(user?.id || ""),
      username: studioCleanLine(user?.username || "", 100),
      display_name: studioCleanLine(user?.display_name || user?.displayName || user?.username || "Discord User", 100)
    }))
    .filter((user) => /^\d{5,25}$/.test(user.id) && !seen.has(user.id) && seen.add(user.id))
    .slice(0, STUDIO_MAX_USER_PINGS);
  value.preview.theme = "dark";
  value.preview.device = "desktop";
  value.message.sendPing = Boolean(value.message.pingEveryone || value.message.pingKeys?.length || value.message.userPings.length);
  return value;
};

const studioCountComponentsBeforeFraming = countComponents;
countComponents = function countComponentsWithManagedFraming() {
  const base = studioCountComponentsBeforeFraming();
  const externalPingComponent = state?.message?.sendPing ? 1 : 0;
  return Math.max(0, base - externalPingComponent) + studioManagedComponentCount();
};

const studioTotalTextCharactersBeforeFraming = totalTextCharacters;
totalTextCharacters = function totalTextCharactersWithManagedFraming() {
  return studioTotalTextCharactersBeforeFraming()
    + studioHeaderPayloadText().length
    + studioFooterPayloadText().length;
};

renderStructurePanel = function renderStructurePanelWithoutCounters() {
  return `
    <aside class="panel structure-panel ${activeMobilePanel === "structure" ? "mobile-active" : ""}">
      <div class="panel-header"><span class="panel-title">Structure</span><span class="panel-subtitle">Drag body components to reorder</span></div>
      <div class="panel-body structure-scroll">
        ${renderMessageTree()}
      </div>
    </aside>`;
};

renderMessageTree = function renderMessageTreeManaged() {
  const messageSelected = selection.kind === "message";
  const identity = currentPublishingIdentity();
  const container = state.containers[0];
  return `
    <div class="tree-root">
      <button class="tree-item ${messageSelected ? "selected" : ""}" data-select-kind="message">
        <span class="tree-icon">${icon("message")}</span>
        <span class="tree-copy"><strong>Announcement</strong><span>${esc(identity?.label || "Publishing identity")}</span></span>
      </button>
    </div>
    ${container ? renderContainerTree(container, 0) : ""}`;
};

renderContainerTree = function renderContainerTreeManaged(container) {
  const selected = selection.kind === "container" && selection.containerId === container.id;
  return `<div class="tree-container" data-container-wrap="${container.id}">
    <div class="tree-container-head single-container-head">
      <button class="tree-item ${selected ? "selected" : ""}" data-select-kind="container" data-container-id="${container.id}">
        <span class="tree-icon">${icon("container")}</span>
        <span class="tree-copy"><strong>Container</strong><span>Required announcement frame</span></span>
      </button>
    </div>
    <div class="tree-children">
      <div class="tree-item managed-tree-item"><span class="tree-icon">${icon("text")}</span><span class="tree-copy"><strong>Header</strong><span>Managed title, address, and CC</span></span><span class="managed-lock">Managed</span></div>
      ${container.children.map((component) => renderComponentTree(container.id, component)).join("")}
      <div class="tree-item managed-tree-item"><span class="tree-icon">${icon("text")}</span><span class="tree-copy"><strong>Footer</strong><span>Managed publisher signature</span></span><span class="managed-lock">Managed</span></div>
    </div>
    <div class="add-component-wrap"><button class="add-component-btn" data-action="open-picker" data-container-id="${container.id}">+ Add component</button></div>
  </div>`;
};

renderPreviewPanel = function renderPreviewPanelDefaultOnly() {
  state.preview.theme = "dark";
  state.preview.device = "desktop";
  return `
    <section class="panel preview-panel ${activeMobilePanel === "preview" ? "mobile-active" : ""}">
      <div class="preview-toolbar">
        <span class="panel-title">Live Discord Preview</span>
        <span class="preview-meta">Default Discord appearance</span>
      </div>
      <div class="preview-stage"><div><div id="previewContent">${renderDiscordPreview()}</div></div></div>
    </section>`;
};

renderDiscordContainer = function renderDiscordContainerManaged(container) {
  const isSelected = selection.kind === "container" && selection.containerId === container.id;
  const spoilerClass = container.spoiler ? "dc-spoiler-container" : "";
  const identity = currentPublishingIdentity();
  return `<div class="dc-container ${container.accentEnabled ? "has-accent" : ""} ${isSelected ? "selected-preview" : ""} ${spoilerClass}" style="--accent:${esc(container.accentColor)}" data-preview-kind="container" data-preview-container="${container.id}">
    <div class="dc-container-inner">
      ${studioHeaderPreviewHtml(identity)}
      ${container.children.map((component) => renderDiscordComponent(container.id, component)).join("")}
      ${studioFooterPreviewHtml(identity)}
    </div>
    ${container.spoiler ? '<div class="dc-spoiler-overlay" data-action="reveal-container">SPOILER</div>' : ""}
  </div>`;
};

renderDiscordPreview = function renderDiscordPreviewManaged() {
  const identity = currentPublishingIdentity();
  if (!identity) return '<div class="discord-frame" data-theme="dark"><div class="discord-empty">No authorized publishing identity.</div></div>';
  normalizeMessageRouting(state.message, identity);
  studioSyncPingFlag(identity);
  const avatar = identity.avatarUrl
    ? `<img src="${esc(identity.avatarUrl)}" alt="" onerror="this.style.display='none';this.parentElement.textContent='${esc(identity.avatarInitials)}'">`
    : esc(identity.avatarInitials);
  const container = state.containers[0];
  return `<div class="discord-frame" data-theme="dark">
    <div class="discord-message">
      <div class="dc-avatar" style="background:${esc(identity.avatarColor)}">${avatar}</div>
      <div class="dc-message-main">
        <div class="dc-author-line"><span class="dc-author">${esc(identity.displayName)}</span><span class="dc-app-badge">APP</span><span class="dc-timestamp">${esc(previewTimestamp())}</span></div>
        <div class="dc-components">${container ? renderDiscordContainer(container) : ""}</div>
      </div>
    </div>
  </div>`;
};

function studioMemberSelectionHtml() {
  const users = studioUserPings();
  if (!users.length) return '<div class="member-selection-empty">No individual users selected.</div>';
  return `<div class="member-selection-list">${users.map((user) => `<div class="member-chip"><span><strong>${esc(user.display_name || user.username)}</strong><small>@${esc(user.username || "user")}</small></span><button type="button" data-user-ping-remove="${esc(user.id)}" title="Remove user">×</button></div>`).join("")}</div>`;
}

function studioMemberSearchResultHtml() {
  if (!studioMemberSearchResults.length) return "";
  const selected = new Set(studioUserPings().map((user) => user.id));
  return studioMemberSearchResults.map((user) => `<button type="button" class="member-search-result" data-user-ping-add="${esc(user.id)}" ${selected.has(user.id) ? "disabled" : ""}>
    <span><strong>${esc(user.display_name || user.username)}</strong><small>@${esc(user.username || "user")}</small></span><span>${selected.has(user.id) ? "Added" : "Add"}</span>
  </button>`).join("");
}

function studioUpdateMemberSearchResults(message = "") {
  const node = document.getElementById("memberSearchResults");
  if (!node) return;
  if (message) {
    node.innerHTML = `<div class="member-search-status">${esc(message)}</div>`;
    return;
  }
  node.innerHTML = studioMemberSearchResultHtml();
}

async function studioSearchMembers(query) {
  const clean = studioCleanLine(query, 100);
  const sequence = ++studioMemberSearchSequence;
  if (clean.length < 2) {
    studioMemberSearchResults = [];
    studioUpdateMemberSearchResults(clean ? "Type at least 2 characters." : "");
    return;
  }
  if (!CONFIG.apiBase || isBuilderPreviewSession()) {
    studioMemberSearchResults = [];
    studioUpdateMemberSearchResults("Member search is available after signing in.");
    return;
  }
  studioUpdateMemberSearchResults("Searching…");
  try {
    const url = `${CONFIG.apiBase.replace(/\/$/, "")}/api/members/search?q=${encodeURIComponent(clean)}`;
    const response = await fetch(url, { credentials: "include", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (sequence !== studioMemberSearchSequence) return;
    studioMemberSearchResults = Array.isArray(data?.members) ? data.members : [];
    studioUpdateMemberSearchResults(studioMemberSearchResults.length ? "" : "No matching server members.");
  } catch (error) {
    if (sequence !== studioMemberSearchSequence) return;
    studioMemberSearchResults = [];
    studioUpdateMemberSearchResults("Could not search server members.");
    console.error(error);
  }
}

renderMessageInspector = function renderMessageInspectorManaged() {
  const identity = currentPublishingIdentity();
  const identities = availablePublishingIdentities();
  if (!identity) return `<h2 class="inspector-heading">Announcement</h2><div class="validation-box"><strong>No publishing identities</strong>Your connected accounts do not currently authorize an identity.</div>`;
  normalizeMessageRouting(state.message, identity);
  studioSyncPingFlag(identity);
  const discord = session?.user?.discord;
  const roblox = session?.user?.roblox;
  const channelControl = identity.channels.length === 1
    ? `<div class="managed-setting">${esc(identity.channels[0].label)}</div>`
    : `<select class="select-input" data-routing-channel>${identity.channels.map((channel) => `<option value="${channel.id}" ${state.message.channelId === channel.id ? "selected" : ""}>${esc(channel.label)}</option>`).join("")}</select>`;
  const pingControls = (identity.pingOptions || []).map((ping) => renderRoutingToggle(
    `Send ${ping.label}`,
    "Include this approved notification role in the header CC line.",
    state.message.pingKeys.includes(ping.key),
    `data-routing-ping="${esc(ping.key)}"`
  )).join("");
  const everyoneControl = identity.allowEveryone
    ? renderRoutingToggle("Send @everyone", "Include @everyone in the header CC line.", Boolean(state.message.pingEveryone), "data-routing-everyone")
    : "";
  const robloxName = roblox?.username || roblox?.display_name || "Roblox username";

  return `<h2 class="inspector-heading">Announcement</h2><div class="inspector-type">Publishing identity</div>
    ${field("Publish as", `<select class="select-input" data-bind="message.identityId">${groupedIdentityOptions(identities, identity.id)}</select>`, isBuilderPreviewSession() ? "Preview mode shows the complete catalog." : "Only identities authorized for your connected accounts are shown.")}
    <div class="managed-identity-card" style="--identity-color:${esc(identity.avatarColor)}"><div class="managed-avatar">${identity.avatarUrl ? `<img src="${esc(identity.avatarUrl)}" alt="">` : esc(identity.avatarInitials)}</div><div class="managed-identity-copy"><strong>${esc(identity.displayName)}</strong>${identity.position ? `<span>${esc(identity.position)}</span>` : ""}</div></div>
    ${field("Publish to", channelControl, identity.channels.length === 1 ? "This identity has one approved publication channel." : "This identity may publish to any approved branch channel.")}

    <div class="inspector-section-title">Required header</div>
    ${field("Title", `<input class="text-input" maxlength="256" value="${esc(state.message.headerTitle || "")}" placeholder="Office of the Secretary of State" data-bind="message.headerTitle" data-input-render="preview">`)}
    ${field("Address line 1", `<input class="text-input" maxlength="256" value="${esc(state.message.addressLine1 || "")}" placeholder="Harry S. Truman Building, Department of State" data-bind="message.addressLine1" data-input-render="preview">`)}
    ${field("Address line 2", `<input class="text-input" maxlength="256" value="${esc(state.message.addressLine2 || "")}" placeholder="2201 C St NW, Washington, DC 20520, USA" data-bind="message.addressLine2" data-input-render="preview">`)}

    <div class="inspector-section-title">CC / notifications</div>
    <div class="field-group"><div class="field-label">Role notifications</div><div class="routing-ping-list">${pingControls || '<div class="managed-setting">No approved role notification</div>'}${everyoneControl}</div></div>
    <div class="field-group">
      <div class="field-label">Individual users <small>${studioUserPings().length}/${STUDIO_MAX_USER_PINGS}</small></div>
      ${studioMemberSelectionHtml()}
      <input class="text-input member-search-input" autocomplete="off" placeholder="Search server nickname or Discord username" data-user-search ${isBuilderPreviewSession() ? "disabled" : ""}>
      <div class="member-search-results" id="memberSearchResults"></div>
      <div class="field-help">Selected users are written into the header as real Discord mentions and whitelisted by user ID when published.</div>
    </div>

    <div class="inspector-section-title">Required footer</div>
    ${field("Roleplay name", `<input class="text-input" maxlength="100" value="${esc(state.message.roleplayName || "")}" placeholder="Optional — e.g. Raymond L. Weston" data-bind="message.roleplayName" data-input-render="preview">`, "Optional. If blank, your Roblox username becomes the italicized signature name.")}
    <div class="managed-footer-summary"><strong>${esc(robloxName)}</strong><span>${esc(studioOfficeEmoji(identity))} ${esc(studioPosition(identity))}</span></div>

    ${!isBuilderPreviewSession() ? `<div class="linked-accounts"><strong>Connected accounts</strong><span>Discord: ${discord ? esc(discord.display_name || discord.username || "Connected") : "Not connected"} · Roblox: ${roblox ? esc(roblox.username || roblox.display_name || "Connected") : "Not connected"}</span></div>` : ""}
    <div class="inspector-card"><div class="inspector-card-head"><strong>Draft storage</strong></div><div class="field-help">The builder automatically saves editable announcement content to this browser. Authentication credentials are never stored in the draft.</div><button class="add-inline-btn" data-action="confirm-reset" style="margin-top:10px">Start a fresh announcement</button></div>`;
};

renderValidation = function renderValidationCountersOnly() {
  const issues = validateState();
  const errors = issues.filter((issue) => issue.level === "error");
  const top = errors[0] || issues[0] || null;
  const metrics = `<div class="studio-metrics"><div><strong>${countComponents()}</strong><span>components</span></div><div><strong>${totalTextCharacters().toLocaleString()}</strong><span>characters</span></div></div>`;
  if (!top) return metrics;
  return `${metrics}<div class="validation-box"><strong>${errors.length ? `${errors.length} blocking issue${errors.length === 1 ? "" : "s"}` : "Builder note"}</strong>${esc(top.text)}${issues.length > 1 ? ` <span title="${esc(issues.slice(1).map((issue) => issue.text).join(" • "))}">(+${issues.length - 1} more)</span>` : ""}</div>`;
};

const studioValidateStateBeforeFraming = validateState;
validateState = function validateStateWithManagedFraming() {
  const issues = studioValidateStateBeforeFraming();
  if (!studioHeaderTitle()) issues.push({ level: "error", text: "The required header needs a title." });
  if (!studioAddressLine1()) issues.push({ level: "error", text: "The required header needs address line 1." });
  if (!studioAddressLine2()) issues.push({ level: "error", text: "The required header needs address line 2." });
  if (studioUserPings().length > STUDIO_MAX_USER_PINGS) issues.push({ level: "error", text: `No more than ${STUDIO_MAX_USER_PINGS} individual user mentions may be selected.` });
  return issues;
};

toDiscordPayload = function toDiscordPayloadManaged() {
  const identity = currentPublishingIdentity();
  const container = state.containers[0];
  if (!identity) return { flags: 32768, components: [], allowed_mentions: { parse: [] } };
  normalizeMessageRouting(state.message, identity);
  studioSyncPingFlag(identity);
  const selectedPings = studioRolePings(identity);
  const userIds = studioUserPings().map((user) => user.id);
  const components = [];
  if (container) {
    const children = [
      { type: 10, content: studioHeaderPayloadText(identity) },
      ...container.children.map(toDiscordComponent).filter(Boolean),
      { type: 10, content: studioFooterPayloadText(identity) }
    ];
    const result = { type: 17, components: children };
    if (container.accentEnabled) result.accent_color = accentToInt(container.accentColor);
    if (container.spoiler) result.spoiler = true;
    components.push(result);
  }
  const allowedMentions = {};
  if (state.message.pingEveryone) allowedMentions.parse = ["everyone"];
  if (selectedPings.length) allowedMentions.roles = selectedPings.map((ping) => ping.id);
  if (userIds.length) allowedMentions.users = userIds;
  if (!Object.keys(allowedMentions).length) allowedMentions.parse = [];
  const payload = {
    flags: 32768,
    components,
    allowed_mentions: allowedMentions,
    username: identity.displayName,
    _studio: {
      identity_id: identity.id,
      channel_id: state.message.channelId,
      ping_keys: [...(state.message.pingKeys || [])],
      ping_everyone: Boolean(state.message.pingEveryone),
      user_ping_ids: userIds
    }
  };
  if (identity.avatarUrl) payload.avatar_url = identity.avatarUrl;
  return payload;
};

app.addEventListener("input", (event) => {
  const target = event.target;
  if (!target?.hasAttribute?.("data-user-search")) return;
  clearTimeout(studioMemberSearchTimer);
  studioMemberSearchTimer = setTimeout(() => studioSearchMembers(target.value), 240);
});

app.addEventListener("click", (event) => {
  const add = event.target.closest?.("[data-user-ping-add]");
  const remove = event.target.closest?.("[data-user-ping-remove]");
  if (!add && !remove) return;
  event.preventDefault();
  if (add) {
    const id = String(add.dataset.userPingAdd || "");
    const user = studioMemberSearchResults.find((item) => String(item.id) === id);
    if (!user || studioUserPings().some((item) => item.id === id)) return;
    if (studioUserPings().length >= STUDIO_MAX_USER_PINGS) {
      toast(`You can select up to ${STUDIO_MAX_USER_PINGS} individual users.`, "warn");
      return;
    }
    recordUndo();
    state.message.userPings.push({ id, username: user.username || "", display_name: user.display_name || user.username || "Discord User" });
    studioSyncPingFlag();
    saveDraftSoon();
    renderStudio();
    return;
  }
  if (remove) {
    const id = String(remove.dataset.userPingRemove || "");
    recordUndo();
    state.message.userPings = studioUserPings().filter((user) => user.id !== id);
    studioSyncPingFlag();
    saveDraftSoon();
    renderStudio();
  }
});
