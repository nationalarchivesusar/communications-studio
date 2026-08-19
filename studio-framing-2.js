"use strict";

/* Identity-specific framing defaults layered on top of studio-framing.js.
 * Headquarters / mailing addresses are keyed by the canonical publishing
 * identity so switching offices refreshes the managed header automatically.
 */

const STUDIO_IDENTITY_ADDRESSES = Object.freeze({
  white_house: ["1600 Pennsylvania Avenue NW", "Washington, DC 20500"],
  eop: ["Eisenhower Executive Office Building", "1650 Pennsylvania Avenue NW, Washington, DC 20504"],
  ovp: ["Eisenhower Executive Office Building", "1650 Pennsylvania Avenue NW, Washington, DC 20504"],
  whmo: ["The White House", "1600 Pennsylvania Avenue NW, Washington, DC 20500"],

  doj: ["950 Pennsylvania Avenue NW", "Washington, DC 20530-0001"],
  fbi: ["935 Pennsylvania Avenue NW", "Washington, DC 20535-0001"],
  usms: ["1215 S. Clark Street", "Arlington, VA 22202"],
  mpd: ["441 4th Street NW", "Washington, DC 20001"],

  dhs: ["2707 Martin Luther King Jr Avenue SE", "Washington, DC 20528"],
  usss: ["245 Murray Lane SW, Building T-5", "Washington, DC 20223"],
  fps: ["2707 Martin Luther King Jr Avenue SE", "Washington, DC 20528"],
  hsi: ["500 12th Street SW", "Washington, DC 20536"],
  dhs_oig: ["245 Murray Lane SW", "Washington, DC 20528-0305"],
  dcfems: ["2000 14th Street NW, 5th Floor", "Washington, DC 20009"],
  uscg: ["2703 Martin Luther King Jr Avenue SE", "Washington, DC 20593"],

  dos: ["2201 C Street NW", "Washington, DC 20520"],
  dss: ["2201 C Street NW", "Washington, DC 20520"],

  dod: ["1400 Defense Pentagon", "Washington, DC 20301-1400"],
  us_military: ["The Pentagon", "Washington, DC 20301"],
  dcng: ["2001 East Capitol Street SE", "Washington, DC 20003"],
  army: ["101 Army Pentagon", "Washington, DC 20310-0101"],
  navy: ["1000 Navy Pentagon", "Washington, DC 20350-1000"],
  air_force: ["1670 Air Force Pentagon", "Washington, DC 20330-1670"],
  marine_corps: ["3000 Marine Corps Pentagon", "Washington, DC 20350-3000"],
  socom: ["7701 Tampa Point Boulevard", "MacDill AFB, FL 33621-5323"],
  dia: ["200 MacDill Boulevard", "Joint Base Anacostia-Bolling, DC 20340-5100"],
  nsa: ["9800 Savage Road", "Fort George G. Meade, MD 20755"],
  pfpa: ["9000 Defense Pentagon", "Washington, DC 20301-9000"],
  dcis: ["4800 Mark Center Drive", "Alexandria, VA 22350"],
  dod_oig: ["4800 Mark Center Drive", "Alexandria, VA 22350-1500"],

  odni: ["1500 Tysons McLean Drive", "McLean, VA 22102"],
  cia: ["Office of Public Affairs", "Washington, DC 20505"],

  house: ["U.S. Capitol", "Washington, DC 20515"],
  senate: ["U.S. Capitol", "Washington, DC 20510"],
  uscp: ["119 D Street NE", "Washington, DC 20510"],
  uscp_oig: ["119 D Street NE", "Washington, DC 20510"],

  judiciary: ["One Columbus Circle NE", "Washington, DC 20544"],
  supreme_court: ["One First Street NE", "Washington, DC 20543"],

  fec: ["1050 First Street NE", "Washington, DC 20463"],
  nara: ["700 Pennsylvania Avenue NW", "Washington, DC 20408-0001"]
});

const STUDIO_DEFAULT_BODY_TEXT = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
const STUDIO_LEGACY_OFFICIAL_BLOCK = "# Official Communication\n-# United States of America • Communications Studio";
const STUDIO_LEGACY_COMPOSE_BLOCK = "Compose your announcement using **Discord Components V2**. Select any component in the structure panel or directly in the preview to edit it.";

function studioIdentityAddress(identity = currentPublishingIdentity()) {
  const pair = STUDIO_IDENTITY_ADDRESSES[String(identity?.id || "")] || ["", ""];
  return { line1: pair[0], line2: pair[1] };
}

function studioIdentityDefaultPosition(identity = currentPublishingIdentity()) {
  return studioCleanLine(identity?.position || identity?.label || "Authorized Publisher", 160);
}

function studioApplyIdentityDefaults(message, identity, { force = false } = {}) {
  if (!message || !identity) return;
  const address = studioIdentityAddress(identity);
  const title = studioCleanLine(identity.label || identity.displayName || "Official Communication", 256);
  const position = studioIdentityDefaultPosition(identity);

  if (force || !studioCleanLine(message.headerTitle || "")) message.headerTitle = title;
  if (force || !studioCleanLine(message.addressLine1 || "")) message.addressLine1 = address.line1;
  if (force || !studioCleanLine(message.addressLine2 || "")) message.addressLine2 = address.line2;
  if (force || !studioCleanLine(message.position || "")) message.position = position;
}

function studioMigrateLegacyDefaultBody(value) {
  const container = value?.containers?.[0];
  if (!container || !Array.isArray(container.children)) return;

  if (container.children[0]?.kind === "text" && container.children[0]?.content === STUDIO_LEGACY_OFFICIAL_BLOCK) {
    container.children.shift();
    if (container.children[0]?.kind === "separator") container.children.shift();
  }

  for (const component of container.children) {
    if (component?.kind === "text" && component.content === STUDIO_LEGACY_COMPOSE_BLOCK) {
      component.content = STUDIO_DEFAULT_BODY_TEXT;
    }
  }
}

/* New containers start with content, not a second pseudo-header. */
makeContainer = function makeContainerWithStudioBody() {
  return {
    id: uid("ctr"),
    kind: "container",
    accentEnabled: true,
    accentColor: "#1f64cc",
    spoiler: false,
    children: [
      makeText(STUDIO_DEFAULT_BODY_TEXT),
      makeSeparator(),
      makeText("-# Draft preview • Not yet published")
    ]
  };
};

/* Position is editable draft data; the office emoji remains identity-owned. */
studioPosition = function studioPositionEditable(identity = currentPublishingIdentity()) {
  return studioCleanLine(state?.message?.position || studioIdentityDefaultPosition(identity), 160);
};

/* Smaller managed header: custom office emoji + editable office/title. */
studioHeaderPayloadText = function studioHeaderPayloadTextWithIdentityEmoji(identity = currentPublishingIdentity()) {
  const lines = [
    `## ${studioOfficeEmoji(identity)} | ${studioHeaderTitle(identity)}`,
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
};

studioHeaderPreviewHtml = function studioHeaderPreviewHtmlWithIdentityEmoji(identity = currentPublishingIdentity()) {
  const mentions = studioMentionPreviewItems(identity);
  const cc = mentions.length
    ? `<div class="dc-subtext managed-cc">cc: ${mentions.map((item) => `<span class="dc-mention">${esc(item.label)}</span>`).join(" ")}</div>`
    : "";
  return `<div class="dc-component managed-framing managed-header">
    <div class="dc-markdown">
      <h2>${renderInline(`${studioOfficeEmoji(identity)} | ${studioHeaderTitle(identity)}`)}</h2>
      <p>${esc(studioAddressLine1() || "Address line 1")}</p>
      <p>${esc(studioAddressLine2() || "Address line 2")}</p>
      ${cc}
    </div>
  </div>`;
};

const studioDefaultStateBeforeAgencyDefaults = defaultState;
defaultState = function defaultStateWithAgencyDefaults() {
  const value = studioDefaultStateBeforeAgencyDefaults();
  const identities = availablePublishingIdentities();
  const identity = identities.find((item) => item.id === value.message.identityId) || identities[0] || null;
  studioApplyIdentityDefaults(value.message, identity, { force: true });
  studioMigrateLegacyDefaultBody(value);
  return value;
};

const studioNormalizeStateBeforeAgencyDefaults = normalizeState;
normalizeState = function normalizeStateWithAgencyDefaults(candidate) {
  const value = studioNormalizeStateBeforeAgencyDefaults(candidate);
  const identities = availablePublishingIdentities();
  const identity = identities.find((item) => item.id === value.message.identityId) || identities[0] || null;
  studioApplyIdentityDefaults(value.message, identity);
  studioMigrateLegacyDefaultBody(value);
  return value;
};

renderMessageInspector = function renderMessageInspectorAgencyDefaults() {
  const identity = currentPublishingIdentity();
  const identities = availablePublishingIdentities();
  if (!identity) return `<h2 class="inspector-heading">Announcement</h2><div class="validation-box"><strong>No publishing identities</strong>Your connected accounts do not currently authorize an identity.</div>`;
  normalizeMessageRouting(state.message, identity);
  studioSyncPingFlag(identity);
  studioApplyIdentityDefaults(state.message, identity);

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
    ${field("Office / title", `<input class="text-input" maxlength="256" value="${esc(state.message.headerTitle || "")}" placeholder="Office or department title" data-bind="message.headerTitle" data-input-render="preview">`, "The selected office emoji is added automatically and cannot be changed here.")}
    ${field("Address line 1", `<input class="text-input" maxlength="256" value="${esc(state.message.addressLine1 || "")}" data-bind="message.addressLine1" data-input-render="preview">`, "Defaults to the selected office's headquarters or official mailing address.")}
    ${field("Address line 2", `<input class="text-input" maxlength="256" value="${esc(state.message.addressLine2 || "")}" data-bind="message.addressLine2" data-input-render="preview">`)}

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
    ${field("Position", `<input class="text-input" maxlength="160" value="${esc(state.message.position || studioIdentityDefaultPosition(identity))}" placeholder="Official position or office" data-bind="message.position" data-input-render="preview">`, "Editable for this announcement. The office emoji is fixed by the selected publishing identity.")}
    <div class="managed-footer-summary"><strong>${esc(robloxName)}</strong><span>${renderInline(studioOfficeEmoji(identity))} ${esc(studioPosition(identity))}</span></div>

    ${!isBuilderPreviewSession() ? `<div class="linked-accounts"><strong>Connected accounts</strong><span>Discord: ${discord ? esc(discord.display_name || discord.username || "Connected") : "Not connected"} · Roblox: ${roblox ? esc(roblox.username || roblox.display_name || "Connected") : "Not connected"}</span></div>` : ""}
    <div class="inspector-card"><div class="inspector-card-head"><strong>Draft storage</strong></div><div class="field-help">The builder automatically saves editable announcement content to this browser. Authentication credentials are never stored in the draft.</div><button class="add-inline-btn" data-action="confirm-reset" style="margin-top:10px">Start a fresh announcement</button></div>`;
};

/* routing-policy.js owns identity selection in the bubbling change handler and
 * stops propagation. Schedule framing defaults from capture phase so routing
 * can first record undo + change the identity, then we refresh its framing. */
app.addEventListener("change", (event) => {
  const target = event.target;
  if (!target || target.dataset?.bind !== "message.identityId") return;
  const selectedId = String(target.value || "");
  queueMicrotask(() => {
    if (!state?.message || state.message.identityId !== selectedId) return;
    const identity = availablePublishingIdentities().find((item) => item.id === selectedId) || null;
    if (!identity) return;
    studioApplyIdentityDefaults(state.message, identity, { force: true });
    saveDraftSoon();
    renderStudio();
  });
}, true);
