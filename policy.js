"use strict";

/*
 * Communications Studio publishing policy layer.
 *
 * Loaded after the core builder and before boot. This keeps the generic
 * Components V2 renderer reusable while enforcing the rules of this specific
 * publishing tool: one Container, managed publishing identities, managed
 * pings, no File components, and link-only buttons.
 */

const PUBLISHING_IDENTITIES = Object.freeze([
  { id: "white_house", label: "The White House", displayName: "The White House", avatarUrl: "", avatarInitials: "WH", avatarColor: "#16365d", pingLabel: "@White House Ping", pingRoleId: "" },
  { id: "doj", label: "Department of Justice", displayName: "United States Department of Justice", avatarUrl: "", avatarInitials: "DOJ", avatarColor: "#1f4d3e", pingLabel: "@Executive Ping", pingRoleId: "" },
  { id: "dos", label: "Department of State", displayName: "United States Department of State", avatarUrl: "", avatarInitials: "DOS", avatarColor: "#1a4480", pingLabel: "@Executive Ping", pingRoleId: "" },
  { id: "usss", label: "United States Secret Service", displayName: "United States Secret Service", avatarUrl: "", avatarInitials: "USSS", avatarColor: "#263b50", pingLabel: "@Executive Ping", pingRoleId: "" },
  { id: "usms", label: "United States Marshals Service", displayName: "United States Marshals Service", avatarUrl: "", avatarInitials: "USMS", avatarColor: "#4a3b26", pingLabel: "@Executive Ping", pingRoleId: "" },
  { id: "house", label: "House of Representatives", displayName: "United States House of Representatives", avatarUrl: "", avatarInitials: "HR", avatarColor: "#274c77", pingLabel: "@Legislative Ping", pingRoleId: "" },
  { id: "senate", label: "United States Senate", displayName: "United States Senate", avatarUrl: "", avatarInitials: "S", avatarColor: "#315b45", pingLabel: "@Legislative Ping", pingRoleId: "" },
  { id: "dod", label: "Department of Defense", displayName: "United States Department of Defense", avatarUrl: "", avatarInitials: "DOD", avatarColor: "#394b35", pingLabel: "@Executive Ping", pingRoleId: "" },
  { id: "army", label: "Department of the Army", displayName: "United States Army", avatarUrl: "", avatarInitials: "USA", avatarColor: "#2f3b2f", pingLabel: "@Military Ping", pingRoleId: "" },
  { id: "uscp", label: "United States Capitol Police", displayName: "United States Capitol Police", avatarUrl: "", avatarInitials: "USCP", avatarColor: "#24455f", pingLabel: "@Legislative Ping", pingRoleId: "" },
  { id: "mpd", label: "Metropolitan Police Department", displayName: "Metropolitan Police Department", avatarUrl: "", avatarInitials: "MPD", avatarColor: "#324a67", pingLabel: "@Public Safety Ping", pingRoleId: "" },
  { id: "nara", label: "National Archives and Records Administration", displayName: "National Archives and Records Administration", avatarUrl: "https://raw.githubusercontent.com/nationalarchivesusar/us-code/main/assets/images/nara.png", avatarInitials: "NARA", avatarColor: "#8b1e2d", pingLabel: "@Executive Ping", pingRoleId: "" }
]);

function availablePublishingIdentities() {
  const allowed = session?.user?.allowed_identity_ids;
  if (Array.isArray(allowed) && allowed.length) {
    const filtered = PUBLISHING_IDENTITIES.filter((identity) => allowed.includes(identity.id));
    if (filtered.length) return filtered;
  }
  return PUBLISHING_IDENTITIES;
}

function identityById(id) {
  return PUBLISHING_IDENTITIES.find((identity) => identity.id === id) || null;
}

function currentPublishingIdentity() {
  const available = availablePublishingIdentities();
  return identityById(state?.message?.identityId) || available[0] || PUBLISHING_IDENTITIES[0];
}

function inferIdentityId(message = {}) {
  if (identityById(message.identityId)) return message.identityId;
  const oldName = String(message.displayName || message.username || "").trim().toLowerCase();
  if (oldName) {
    const match = PUBLISHING_IDENTITIES.find((identity) =>
      identity.displayName.toLowerCase() === oldName || identity.label.toLowerCase() === oldName
    );
    if (match) return match.id;
  }
  return availablePublishingIdentities()[0]?.id || "white_house";
}

function previewTimestamp() {
  try {
    return `Today at ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date())}`;
  } catch {
    return "Today";
  }
}

function makeLinkButton(label = "View document", url = "https://example.com") {
  return { id: uid("btn"), label, style: 5, url, customId: "", disabled: false, emoji: "" };
}

function makeActionRow() {
  return {
    id: uid("row"),
    kind: "actionRow",
    mode: "buttons",
    buttons: [makeLinkButton()],
    select: makeSelect(3)
  };
}

function makeContainer() {
  return {
    id: uid("ctr"),
    kind: "container",
    accentEnabled: true,
    accentColor: "#1f64cc",
    spoiler: false,
    children: [
      makeText("# Official Communication\n-# United States of America Roblox"),
      makeSeparator(),
      makeText("Compose your announcement using **Discord Components V2**. Select any component in the structure panel or directly in the preview to edit it.")
    ]
  };
}

function defaultState() {
  return {
    schema: SCHEMA,
    version: 1,
    message: {
      identityId: availablePublishingIdentities()[0]?.id || "white_house",
      sendPing: false
    },
    preview: {
      theme: "dark",
      device: "desktop"
    },
    containers: [makeContainer()],
    updatedAt: Date.now()
  };
}

function sanitizeLinkButton(button = {}) {
  return {
    id: button.id || uid("btn"),
    label: String(button.label || "Link"),
    style: 5,
    url: String(button.url || ""),
    customId: "",
    disabled: false,
    emoji: String(button.emoji || "")
  };
}

function normalizeChild(child) {
  if (!child || typeof child !== "object") return null;
  child.id ||= uid("cmp");
  if (child.kind === "file") return null;
  if (child.kind === "section") {
    child.texts = Array.isArray(child.texts) && child.texts.length ? child.texts.slice(0, 3) : [""];
    child.accessory ||= { kind: "thumbnail", url: "", description: "", spoiler: false };
    if (child.accessory.kind === "button") {
      child.accessory = Object.assign({ kind: "button" }, sanitizeLinkButton(child.accessory));
    } else {
      child.accessory = {
        kind: "thumbnail",
        url: String(child.accessory.url || ""),
        description: String(child.accessory.description || ""),
        spoiler: Boolean(child.accessory.spoiler)
      };
    }
  } else if (child.kind === "gallery") {
    child.items = Array.isArray(child.items) ? child.items.slice(0, 10) : [];
    child.items.forEach((item) => {
      item.id ||= uid("media");
      item.url = String(item.url || "");
      item.description = String(item.description || "");
      item.spoiler = Boolean(item.spoiler);
    });
  } else if (child.kind === "actionRow") {
    child.mode = child.mode === "select" ? "select" : "buttons";
    child.buttons = Array.isArray(child.buttons) ? child.buttons.slice(0, 5).map(sanitizeLinkButton) : [];
    if (!child.buttons.length) child.buttons = [makeLinkButton("Link", "")];
    child.select = Object.assign(makeSelect(child.select?.type || 3), child.select || {});
    child.select.id ||= uid("select");
    child.select.type = [3, 5, 6, 7, 8].includes(Number(child.select.type)) ? Number(child.select.type) : 3;
    child.select.options = Array.isArray(child.select.options) ? child.select.options.slice(0, 25) : [];
    child.select.options.forEach((option) => option.id ||= uid("opt"));
    child.select.channelTypes = Array.isArray(child.select.channelTypes) ? child.select.channelTypes : [];
  }
  return child;
}

function normalizeState(candidate) {
  const base = defaultState();
  if (!candidate || typeof candidate !== "object") return base;

  const incomingMessage = candidate.message || {};
  const incomingContainers = Array.isArray(candidate.containers) ? candidate.containers : [];
  const sourceContainer = incomingContainers[0] || makeContainer();
  const flattenedChildren = incomingContainers.flatMap((container) => Array.isArray(container?.children) ? container.children : []);
  const children = (flattenedChildren.length ? flattenedChildren : sourceContainer.children || [])
    .map(normalizeChild)
    .filter(Boolean);

  const container = {
    id: sourceContainer.id || uid("ctr"),
    kind: "container",
    accentEnabled: sourceContainer.accentEnabled !== false,
    accentColor: sourceContainer.accentColor || "#1f64cc",
    spoiler: Boolean(sourceContainer.spoiler),
    children
  };

  return {
    schema: SCHEMA,
    version: 1,
    message: {
      identityId: inferIdentityId(incomingMessage),
      sendPing: Boolean(incomingMessage.sendPing)
    },
    preview: Object.assign({}, base.preview, candidate.preview || {}),
    containers: [container],
    updatedAt: Number(candidate.updatedAt) || Date.now()
  };
}

function componentName(component) {
  const names = {
    text: "Text Display",
    section: "Section",
    separator: "Separator",
    gallery: "Media Gallery",
    actionRow: "Action Row"
  };
  return names[component?.kind] || "Component";
}

function componentSummary(component) {
  if (!component) return "";
  switch (component.kind) {
    case "text": return component.content.replace(/[#*_`>\-|]/g, "").trim().split("\n")[0] || "Empty text";
    case "section": return component.texts?.[0]?.replace(/[#*_`>\-|]/g, "").trim() || "Text + accessory";
    case "separator": return `${component.divider ? "Divider" : "Spacing only"} • ${component.spacing === 2 ? "Large" : "Small"}`;
    case "gallery": return `${component.items?.length || 0} media item${component.items?.length === 1 ? "" : "s"}`;
    case "actionRow": return component.mode === "select" ? `${selectTypeName(component.select?.type)} menu` : `${component.buttons?.length || 0} link${component.buttons?.length === 1 ? "" : "s"}`;
    default: return "";
  }
}

function countComponents() {
  const container = state?.containers?.[0];
  let total = container ? 1 : 0;
  if (state?.message?.sendPing) total += 1;
  for (const component of container?.children || []) {
    total += 1;
    if (component.kind === "section") {
      total += component.texts.length;
      if (component.accessory) total += 1;
    } else if (component.kind === "actionRow") {
      total += component.mode === "select" ? 1 : component.buttons.length;
    }
  }
  return total;
}

function validateState() {
  const issues = [];
  const customIds = [];
  const count = countComponents();
  const container = state?.containers?.[0];
  const identity = currentPublishingIdentity();

  if (!container) issues.push({ level: "error", text: "This announcement needs its required Container." });
  if (state.containers.length !== 1) issues.push({ level: "error", text: "Communications Studio permits exactly one Container per announcement." });
  if (count > MAX_COMPONENTS) issues.push({ level: "error", text: `${count} components are present; Discord allows at most ${MAX_COMPONENTS} total components per message.` });
  if (state.message.sendPing && !identity.pingRoleId) issues.push({ level: "warn", text: `${identity.pingLabel} will be resolved by the publishing backend when role IDs are configured.` });

  if (container && !container.children.length) issues.push({ level: "warn", text: "The Container is empty." });
  for (const component of container?.children || []) {
    if (component.kind === "file") issues.push({ level: "error", text: "File components are not permitted in Communications Studio." });
    if (component.kind === "section") {
      if (component.texts.length < 1 || component.texts.length > 3) issues.push({ level: "error", text: "A Section must contain 1–3 Text Display children." });
      if (component.accessory?.kind === "thumbnail" && !component.accessory.url) issues.push({ level: "warn", text: "A Section thumbnail has no media URL yet." });
      if (component.accessory?.kind === "button") {
        if (!component.accessory.url) issues.push({ level: "error", text: "A Section link button needs a URL." });
        if (component.accessory.style !== 5) issues.push({ level: "error", text: "Only link buttons are permitted." });
      }
    }
    if (component.kind === "gallery") {
      if (component.items.length < 1 || component.items.length > 10) issues.push({ level: "error", text: "A Media Gallery must contain 1–10 items." });
      if (component.items.some((item) => !item.url)) issues.push({ level: "warn", text: "A Media Gallery item has no media URL yet." });
      if (component.items.some((item) => /^attachment:\/\//i.test(item.url))) issues.push({ level: "error", text: "Attachment-backed gallery media is not permitted; use a public HTTPS media URL." });
    }
    if (component.kind === "actionRow") {
      if (component.mode === "select") {
        const menu = component.select;
        if (!menu) issues.push({ level: "error", text: "A select Action Row needs one select menu." });
        else {
          customIds.push({ id: menu.customId, label: selectTypeName(menu.type) });
          if (Number(menu.minValues) < 0 || Number(menu.minValues) > 25) issues.push({ level: "error", text: "Select min_values must be between 0 and 25." });
          if (Number(menu.maxValues) < 1 || Number(menu.maxValues) > 25 || Number(menu.maxValues) < Number(menu.minValues)) issues.push({ level: "error", text: "Select max_values must be 1–25 and not less than min_values." });
          if (Number(menu.type) === 3) {
            if (!menu.options.length || menu.options.length > 25) issues.push({ level: "error", text: "A String Select must contain 1–25 options." });
            for (const option of menu.options) if (!option.label || !option.value) issues.push({ level: "error", text: "Every String Select option needs both a label and value." });
          }
        }
      } else {
        if (component.buttons.length < 1 || component.buttons.length > 5) issues.push({ level: "error", text: "An Action Row must contain 1–5 link buttons or one select menu." });
        for (const button of component.buttons) {
          if (!button.label) issues.push({ level: "error", text: "Link buttons need a label." });
          if (button.style !== 5) issues.push({ level: "error", text: "Only link buttons are permitted." });
          if (!button.url) issues.push({ level: "error", text: `Link button “${button.label || "Untitled"}” needs a URL.` });
        }
      }
    }
  }

  for (const entry of customIds) {
    if (!entry.id) issues.push({ level: "error", text: `Interactive component “${entry.label}” needs a custom_id before publishing.` });
    else if (entry.id.length > 100) issues.push({ level: "error", text: `custom_id for “${entry.label}” exceeds Discord’s 100-character limit.` });
  }
  const seen = new Set();
  for (const entry of customIds.filter((entry) => entry.id)) {
    if (seen.has(entry.id)) issues.push({ level: "error", text: `custom_id “${entry.id}” is duplicated.` });
    seen.add(entry.id);
  }
  return issues;
}

function renderStructurePanel() {
  const count = countComponents();
  return `
    <aside class="panel structure-panel ${activeMobilePanel === "structure" ? "mobile-active" : ""}">
      <div class="panel-header"><span class="panel-title">Structure</span><span class="panel-subtitle">Drag components to reorder</span></div>
      <div class="panel-body structure-scroll">
        <div class="structure-toolbar single-container-toolbar">
          <div class="single-container-note"><strong>1 Container</strong><span>Required for every announcement</span></div>
          <div class="structure-stat" id="structureStat"><strong>${count}/${MAX_COMPONENTS}</strong><span>components</span></div>
        </div>
        ${renderMessageTree()}
      </div>
    </aside>`;
}

function renderMessageTree() {
  const messageSelected = selection.kind === "message";
  const identity = currentPublishingIdentity();
  const container = state.containers[0];
  return `
    <div class="tree-root">
      <button class="tree-item ${messageSelected ? "selected" : ""}" data-select-kind="message">
        <span class="tree-icon">${icon("message")}</span>
        <span class="tree-copy"><strong>Announcement</strong><span>${esc(identity.label)}${state.message.sendPing ? ` • ${esc(identity.pingLabel)}` : ""}</span></span>
      </button>
    </div>
    ${container ? renderContainerTree(container, 0) : ""}`;
}

function renderContainerTree(container) {
  const selected = selection.kind === "container" && selection.containerId === container.id;
  return `<div class="tree-container" data-container-wrap="${container.id}">
    <div class="tree-container-head single-container-head">
      <button class="tree-item ${selected ? "selected" : ""}" data-select-kind="container" data-container-id="${container.id}">
        <span class="tree-icon">${icon("container")}</span>
        <span class="tree-copy"><strong>Container</strong><span>${container.children.length} child component${container.children.length === 1 ? "" : "s"}</span></span>
      </button>
    </div>
    <div class="tree-children">
      ${container.children.map((component) => renderComponentTree(container.id, component)).join("")}
    </div>
    <div class="add-component-wrap"><button class="add-component-btn" data-action="open-picker" data-container-id="${container.id}">+ Add component</button></div>
  </div>`;
}

function renderMessageInspector() {
  const identity = currentPublishingIdentity();
  const identities = availablePublishingIdentities();
  return `
    <h2 class="inspector-heading">Announcement</h2><div class="inspector-type">Publishing identity</div>
    ${field("Publish as", `<select class="select-input" data-bind="message.identityId">${identities.map((item) => `<option value="${item.id}" ${identity.id === item.id ? "selected" : ""}>${esc(item.label)}</option>`).join("")}</select>`, "The backend will limit this list to identities authorized by the user's Discord roles.")}
    <div class="managed-identity-card">
      <div class="managed-avatar" style="--identity-color:${esc(identity.avatarColor)}">${identity.avatarUrl ? `<img src="${esc(identity.avatarUrl)}" alt="">` : esc(identity.avatarInitials)}</div>
      <div class="managed-identity-copy"><strong>${esc(identity.displayName)}</strong><span>Display name, avatar, Discord application badge, and message timestamp are managed automatically.</span></div>
    </div>
    ${toggleField(`Send ${esc(identity.pingLabel)}`, "Notify the preset audience for this publishing identity. No other mass-mention controls are exposed.", Boolean(state.message.sendPing), "message.sendPing")}
    <div class="inspector-card"><div class="inspector-card-head"><strong>Managed publishing settings</strong></div><div class="field-help">Webhook identity and allowed mentions are not editable. The publishing backend will apply the selected office's webhook appearance and whitelist only its configured ping role.</div></div>
    <div class="inspector-card"><div class="inspector-card-head"><strong>Draft storage</strong></div><div class="field-help">The builder automatically saves the editable announcement to this browser.</div><button class="add-inline-btn" data-action="confirm-reset" style="margin-top:10px">Start a fresh announcement</button></div>`;
}

function renderContainerInspector(container) {
  if (!container) return "";
  return `
    <h2 class="inspector-heading">Container</h2><div class="inspector-type">Component type 17 • required</div>
    ${toggleField("Accent bar", "Show Discord's optional color accent.", container.accentEnabled, "container.accentEnabled")}
    <div class="field-group"><div class="field-label">Accent color <small>${esc(container.accentColor)}</small></div><div class="color-field"><div class="color-swatch"><input type="color" value="${esc(container.accentColor)}" data-bind="container.accentColor" data-input-render="preview"></div><input class="text-input" value="${esc(container.accentColor)}" data-bind="container.accentColor" data-input-render="preview" pattern="#[0-9A-Fa-f]{6}"></div></div>
    ${toggleField("Spoiler", "Blur the full container until it is revealed in Discord.", container.spoiler, "container.spoiler")}
    <div class="inspector-card"><div class="inspector-card-head"><strong>Container contents</strong></div><div class="field-help">${container.children.length} child component${container.children.length === 1 ? "" : "s"}. Communications Studio uses exactly one Container per announcement and does not permit File components.</div><button class="add-inline-btn" data-action="open-picker" data-container-id="${container.id}" style="margin-top:10px">+ Add child component</button></div>`;
}

function renderComponentInspector(component) {
  if (!component || component.kind === "file") return "";
  let body = "";
  switch (component.kind) {
    case "text": body = renderTextInspector(component); break;
    case "section": body = renderSectionInspector(component); break;
    case "separator": body = renderSeparatorInspector(component); break;
    case "gallery": body = renderGalleryInspector(component); break;
    case "actionRow": body = renderActionRowInspector(component); break;
  }
  return `<h2 class="inspector-heading">${componentName(component)}</h2><div class="inspector-type">${componentTypeLabel(component.kind)}</div>${body}<div class="danger-zone"><button class="danger-button" data-action="delete-component" data-container-id="${selection.containerId}" data-component-id="${component.id}">Delete this component</button></div>`;
}

function componentTypeLabel(kind) {
  return ({ text: "Component type 10", section: "Component type 9", separator: "Component type 14", gallery: "Component type 12", actionRow: "Component type 1" })[kind] || "Component";
}

function renderSectionInspector(component) {
  const accessory = component.accessory || { kind: "thumbnail" };
  return `
    <div class="field-group"><div class="field-label">Text Displays <small>${component.texts.length}/3</small></div><div class="inline-list">
      ${component.texts.map((text, index) => `<div class="inspector-card"><div class="inspector-card-head"><strong>Text ${index + 1}</strong>${component.texts.length > 1 ? `<button class="mini-action danger" data-action="section-remove-text" data-index="${index}">${icon("trash")}</button>` : ""}</div><textarea class="text-area" style="min-height:86px" data-section-text-index="${index}" data-input-render="preview">${esc(text)}</textarea></div>`).join("")}
      ${component.texts.length < 3 ? '<button class="add-inline-btn" data-action="section-add-text">+ Add Text Display</button>' : ""}
    </div></div>
    ${field("Accessory", `<select class="select-input" data-action="section-accessory-kind"><option value="thumbnail" ${accessory.kind === "thumbnail" ? "selected" : ""}>Thumbnail</option><option value="button" ${accessory.kind === "button" ? "selected" : ""}>Link button</option></select>`)}
    ${accessory.kind === "thumbnail" ? renderThumbnailAccessoryInspector(accessory) : renderButtonAccessoryInspector(accessory)}`;
}

function renderButtonAccessoryInspector(accessory) {
  return `${field("Label", `<input class="text-input" maxlength="80" value="${esc(accessory.label || "Link")}" data-accessory-field="label" data-input-render="preview">`)}
    ${field("URL", `<input class="text-input" value="${esc(accessory.url || "")}" placeholder="https://…" data-accessory-field="url" data-input-render="preview">`)}
    ${field("Emoji", `<input class="text-input" maxlength="8" value="${esc(accessory.emoji || "")}" data-accessory-field="emoji" data-input-render="preview">`)}
    <div class="field-help">Section buttons are always Discord Link buttons. Interactive custom_id buttons are not available.</div>`;
}

function renderGalleryInspector(component) {
  return `<div class="field-group"><div class="field-label">Gallery items <small>${component.items.length}/10</small></div><div class="inline-list">
    ${component.items.map((item, index) => `<div class="inspector-card"><div class="inspector-card-head"><strong>Media ${index + 1}</strong>${component.items.length > 1 ? `<button class="mini-action danger" data-action="gallery-remove" data-item-id="${item.id}">${icon("trash")}</button>` : ""}</div>
      <input class="text-input" placeholder="https://…" value="${esc(item.url)}" data-gallery-field="url" data-item-id="${item.id}" data-input-render="preview">
      <input class="text-input" style="margin-top:7px" placeholder="Alt text (optional)" maxlength="1024" value="${esc(item.description)}" data-gallery-field="description" data-item-id="${item.id}" data-input-render="preview">
      <div class="toggle-line" style="margin-top:7px"><div class="toggle-copy"><strong>Spoiler</strong></div><label class="switch"><input type="checkbox" ${item.spoiler ? "checked" : ""} data-gallery-field="spoiler" data-item-id="${item.id}"><span class="switch-slider"></span></label></div>
    </div>`).join("")}
    ${component.items.length < 10 ? '<button class="add-inline-btn" data-action="gallery-add">+ Add media item</button>' : ""}
  </div></div><div class="field-help">Use public HTTPS media URLs. Attachment-backed media is intentionally disabled.</div>`;
}

function renderActionRowInspector(component) {
  const mode = component.mode === "select" ? "select" : "buttons";
  return `${field("Row contents", `<select class="select-input" data-action="action-row-mode"><option value="buttons" ${mode === "buttons" ? "selected" : ""}>Link buttons — up to 5</option><option value="select" ${mode === "select" ? "selected" : ""}>Select menu — exactly 1</option></select>`, "Buttons in Communications Studio are restricted to URL Link buttons.")}
    ${mode === "select" ? renderSelectEditor(component.select) : `<div class="field-group"><div class="field-label">Link buttons <small>${component.buttons.length}/5</small></div><div class="inline-list">
      ${component.buttons.map((button, index) => renderButtonEditor(button, index, component.buttons.length)).join("")}
      ${component.buttons.length < 5 ? '<button class="add-inline-btn" data-action="button-add">+ Add link button</button>' : ""}
    </div></div>`}`;
}

function renderButtonEditor(button, index, total) {
  return `<div class="inspector-card"><div class="inspector-card-head"><strong>Link ${index + 1}</strong>${total > 1 ? `<button class="mini-action danger" data-action="button-remove" data-button-id="${button.id}">${icon("trash")}</button>` : ""}</div>
    <input class="text-input" maxlength="80" placeholder="Button label" value="${esc(button.label)}" data-button-field="label" data-button-id="${button.id}" data-input-render="preview">
    <input class="text-input" style="margin-top:7px" placeholder="https://…" value="${esc(button.url || "")}" data-button-field="url" data-button-id="${button.id}" data-input-render="preview">
    <input class="text-input" style="margin-top:7px" maxlength="8" placeholder="Emoji (optional)" value="${esc(button.emoji || "")}" data-button-field="emoji" data-button-id="${button.id}" data-input-render="preview">
  </div>`;
}

function buttonStyleSelect() {
  return `<div class="managed-setting">Link</div>`;
}

function renderPickerModal() {
  const choices = [
    ["text", "Text Display", "Markdown-formatted text content."],
    ["section", "Section", "1–3 text blocks beside a thumbnail or link button."],
    ["separator", "Separator", "Vertical spacing with an optional divider."],
    ["gallery", "Media Gallery", "A responsive gallery containing 1–10 URL-based media items."],
    ["actionRow", "Action Row", "Up to five URL Link buttons, or one select menu."]
  ];
  return `<div class="modal-backdrop" data-action="modal-backdrop"><div class="modal narrow" role="dialog" aria-modal="true"><div class="modal-header"><h2>Add a component</h2><button class="modal-close" data-action="modal-close">×</button></div><div class="modal-body"><div class="picker-grid">${choices.map(([kind,name,desc]) => `<button class="picker-item" data-action="picker-add" data-kind="${kind}" data-container-id="${modal.containerId}"><span class="picker-icon">${icon(kind === "actionRow" ? "buttons" : kind)}</span><strong>${name}</strong><span>${desc}</span></button>`).join("")}</div></div></div></div>`;
}

function renderDiscordPreview() {
  const identity = currentPublishingIdentity();
  const avatar = identity.avatarUrl
    ? `<img src="${esc(identity.avatarUrl)}" alt="" onerror="this.style.display='none';this.parentElement.textContent='${esc(identity.avatarInitials)}'">`
    : esc(identity.avatarInitials);
  const ping = state.message.sendPing
    ? `<div class="identity-ping-preview"><div class="dc-markdown"><p><span class="dc-mention">${esc(identity.pingLabel)}</span></p></div></div>`
    : "";
  const container = state.containers[0];
  return `<div class="discord-frame ${state.preview.device === "mobile" ? "mobile" : ""}" data-theme="${state.preview.theme}">
    <div class="discord-message">
      <div class="dc-avatar" style="background:${esc(identity.avatarColor)}">${avatar}</div>
      <div class="dc-message-main">
        <div class="dc-author-line">
          <span class="dc-author">${esc(identity.displayName)}</span>
          <span class="dc-app-badge">APP</span>
          <span class="dc-timestamp">${esc(previewTimestamp())}</span>
        </div>
        <div class="dc-components">
          ${ping}
          ${container ? renderDiscordContainer(container) : ""}
        </div>
      </div>
    </div>
  </div>`;
}

function renderDiscordComponent(containerId, component) {
  const selected = selection.kind === "component" && selection.componentId === component.id;
  const attrs = `class="dc-component preview-selectable ${selected ? "preview-selected" : ""}" data-preview-kind="component" data-preview-container="${containerId}" data-preview-component="${component.id}"`;
  switch (component.kind) {
    case "text": return `<div ${attrs}>${renderDiscordMarkdown(component.content)}</div>`;
    case "section": return `<div ${attrs}><div class="dc-section"><div class="dc-section-content">${component.texts.map((text) => renderDiscordMarkdown(text)).join("")}</div>${renderAccessory(component.accessory)}</div></div>`;
    case "separator": return `<div ${attrs}><div class="dc-separator ${component.spacing === 2 ? "large" : "small"}">${component.divider ? '<div class="dc-separator-line"></div>' : ""}</div></div>`;
    case "gallery": return `<div ${attrs}>${renderGallery(component)}</div>`;
    case "actionRow": return `<div ${attrs}><div class="dc-action-row">${component.mode === "select" ? renderSelect(component.select) : component.buttons.map((button) => renderButton(Object.assign({}, button, { style: 5 }))).join("")}</div></div>`;
    default: return "";
  }
}

function renderPreviewPanel() {
  return `
    <section class="panel preview-panel ${activeMobilePanel === "preview" ? "mobile-active" : ""}">
      <div class="preview-toolbar">
        <span class="panel-title">Live Discord Preview</span>
        <span class="preview-meta">Components V2</span>
        <div class="segmented">
          <button class="${state.preview.theme === "dark" ? "active" : ""}" data-action="preview-theme" data-theme="dark">Dark</button>
          <button class="${state.preview.theme === "light" ? "active" : ""}" data-action="preview-theme" data-theme="light">Light</button>
        </div>
        <div class="segmented">
          <button class="${state.preview.device === "desktop" ? "active" : ""}" data-action="preview-device" data-device="desktop">Desktop</button>
          <button class="${state.preview.device === "mobile" ? "active" : ""}" data-action="preview-device" data-device="mobile">Mobile</button>
        </div>
      </div>
      <div class="preview-stage"><div id="previewContent">${renderDiscordPreview()}</div></div>
    </section>`;
}

function toDiscordPayload() {
  const identity = currentPublishingIdentity();
  const container = state.containers[0];
  const components = [];
  const pingRoleId = state.message.sendPing ? String(identity.pingRoleId || "").trim() : "";
  if (pingRoleId) components.push({ type: 10, content: `<@&${pingRoleId}>` });
  if (container) {
    const result = {
      type: 17,
      components: container.children.map(toDiscordComponent).filter(Boolean)
    };
    if (container.accentEnabled) result.accent_color = accentToInt(container.accentColor);
    if (container.spoiler) result.spoiler = true;
    components.push(result);
  }
  const payload = {
    flags: 32768,
    components,
    allowed_mentions: pingRoleId ? { parse: [], roles: [pingRoleId] } : { parse: [] },
    username: identity.displayName
  };
  if (identity.avatarUrl) payload.avatar_url = identity.avatarUrl;
  return payload;
}

function toDiscordComponent(component) {
  if (component.kind === "text") return { type: 10, content: component.content };
  if (component.kind === "separator") return { type: 14, divider: component.divider, spacing: Number(component.spacing) || 1 };
  if (component.kind === "section") {
    return {
      type: 9,
      components: component.texts.slice(0, 3).map((content) => ({ type: 10, content })),
      accessory: toDiscordAccessory(component.accessory)
    };
  }
  if (component.kind === "gallery") {
    return {
      type: 12,
      items: component.items.slice(0, 10).map((item) => {
        const data = { media: { url: item.url } };
        if (item.description) data.description = item.description;
        if (item.spoiler) data.spoiler = true;
        return data;
      })
    };
  }
  if (component.kind === "actionRow") {
    return {
      type: 1,
      components: component.mode === "select"
        ? [toDiscordSelect(component.select)]
        : component.buttons.slice(0, 5).map(toDiscordButton)
    };
  }
  return null;
}

function toDiscordAccessory(accessory) {
  if (!accessory || accessory.kind === "thumbnail") {
    const data = { type: 11, media: { url: accessory?.url || "" } };
    if (accessory?.description) data.description = accessory.description;
    if (accessory?.spoiler) data.spoiler = true;
    return data;
  }
  return toDiscordButton(accessory);
}

function toDiscordButton(button) {
  const data = {
    type: 2,
    style: 5,
    label: button.label || "Link",
    url: button.url || ""
  };
  if (button.emoji) data.emoji = { name: button.emoji };
  return data;
}

function fromDiscordPayload(payload) {
  if (!payload || !Array.isArray(payload.components)) throw new Error("No components array found.");
  let firstContainer = null;
  const looseChildren = [];
  let sendPing = false;

  for (const raw of payload.components) {
    if (raw?.type === 10 && /^<@&\d+>$/.test(String(raw.content || "").trim())) {
      sendPing = true;
      continue;
    }
    if (raw?.type === 17) {
      if (!firstContainer) firstContainer = raw;
      else looseChildren.push(...(raw.components || []).map(fromDiscordComponent).filter(Boolean));
      continue;
    }
    const converted = fromDiscordComponent(raw);
    if (converted) looseChildren.push(converted);
  }

  const imported = defaultState();
  imported.message.identityId = inferIdentityId({ displayName: payload.username || payload._studio?.display_name || "" });
  imported.message.sendPing = sendPing;
  const source = firstContainer || {};
  imported.containers = [{
    id: uid("ctr"),
    kind: "container",
    accentEnabled: source.accent_color !== undefined && source.accent_color !== null,
    accentColor: intToHex(source.accent_color || 0),
    spoiler: Boolean(source.spoiler),
    children: [...(source.components || []).map(fromDiscordComponent).filter(Boolean), ...looseChildren]
  }];
  return normalizeState(imported);
}

function fromDiscordComponent(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.type === 13) return null;
  if (raw.type === 10) return makeText(raw.content || "");
  if (raw.type === 14) return { id: uid("sep"), kind: "separator", divider: raw.divider !== false, spacing: Number(raw.spacing) === 2 ? 2 : 1 };
  if (raw.type === 9) {
    return {
      id: uid("sec"), kind: "section",
      texts: (raw.components || []).filter((item) => item.type === 10).slice(0, 3).map((item) => item.content || ""),
      accessory: fromDiscordAccessory(raw.accessory)
    };
  }
  if (raw.type === 12) {
    return { id: uid("gal"), kind: "gallery", items: (raw.items || []).slice(0, 10).map((item) => ({ id: uid("media"), url: item.media?.url || "", description: item.description || "", spoiler: Boolean(item.spoiler) })) };
  }
  if (raw.type === 1) {
    const children = raw.components || [];
    const selectRaw = children.find((item) => [3, 5, 6, 7, 8].includes(Number(item.type)));
    if (selectRaw) {
      const row = makeActionRow();
      row.mode = "select";
      row.select = fromDiscordSelect(selectRaw);
      return row;
    }
    const links = children.filter((item) => item.type === 2 && Number(item.style) === 5).slice(0, 5).map(fromDiscordButton);
    if (!links.length) return null;
    const row = makeActionRow();
    row.mode = "buttons";
    row.buttons = links;
    return row;
  }
  return null;
}

function fromDiscordAccessory(raw) {
  if (!raw || raw.type === 11) return { kind: "thumbnail", url: raw?.media?.url || "", description: raw?.description || "", spoiler: Boolean(raw?.spoiler) };
  if (raw.type === 2 && Number(raw.style) === 5) return Object.assign({ kind: "button" }, fromDiscordButton(raw));
  return { kind: "thumbnail", url: "", description: "", spoiler: false };
}

function fromDiscordButton(raw) {
  return {
    id: uid("btn"),
    label: raw.label || "Link",
    style: 5,
    url: raw.url || "",
    customId: "",
    disabled: false,
    emoji: raw.emoji?.name || ""
  };
}

function addComponent(containerId, kind) {
  if (kind === "file") return;
  const container = getContainer(containerId);
  if (!container) return;
  const factories = { text: makeText, section: makeSection, separator: makeSeparator, gallery: makeGallery, actionRow: makeActionRow };
  const component = factories[kind]?.();
  if (!component) return;
  mutate(() => container.children.push(component), { render: "all" });
  selection = { kind: "component", containerId, componentId: component.id };
  modal = null;
  renderStudio();
}

function removeContainer() {
  toast("Every announcement must contain exactly one Container.", "warn");
}

function duplicateContainer() {
  toast("Communications Studio permits one Container per announcement.", "warn");
}

function handleClick(event) {
  const target = event.target.closest("button, [data-preview-kind], [data-action]");
  if (!target) return;

  if (target.dataset.selectKind) {
    if (target.dataset.selectKind === "message") selection = { kind: "message" };
    if (target.dataset.selectKind === "container") selection = { kind: "container", containerId: target.dataset.containerId };
    if (target.dataset.selectKind === "component") selection = { kind: "component", containerId: target.dataset.containerId, componentId: target.dataset.componentId };
    renderStudio();
    return;
  }
  if (target.dataset.previewKind === "container") {
    selection = { kind: "container", containerId: target.dataset.previewContainer };
    renderStudio();
    return;
  }
  if (target.dataset.previewKind === "component") {
    selection = { kind: "component", containerId: target.dataset.previewContainer, componentId: target.dataset.previewComponent };
    renderStudio();
    return;
  }

  const action = target.dataset.action;
  if (!action) return;
  switch (action) {
    case "auth-discord": auth("discord"); break;
    case "auth-roblox": auth("roblox"); break;
    case "auth-preview": createPreviewSession(); break;
    case "logout": logout(); break;
    case "undo": undo(); break;
    case "redo": redo(); break;
    case "add-container": toast("Only one Container is permitted.", "warn"); break;
    case "duplicate-container": toast("Only one Container is permitted.", "warn"); break;
    case "delete-container": toast("The announcement Container cannot be removed.", "warn"); break;
    case "open-picker": modal = { type: "picker", containerId: target.dataset.containerId }; renderStudio(); break;
    case "picker-add": addComponent(target.dataset.containerId, target.dataset.kind); break;
    case "delete-component": removeComponent(target.dataset.containerId, target.dataset.componentId); break;
    case "preview-theme": {
      mutate((s) => s.preview.theme = target.dataset.theme, { history: false });
      try { localStorage.setItem(THEME_KEY, JSON.stringify({ previewTheme: target.dataset.theme })); } catch { /* no-op */ }
      break;
    }
    case "preview-device": mutate((s) => s.preview.device = target.dataset.device, { history: false }); break;
    case "mobile-panel": activeMobilePanel = target.dataset.panel; renderStudio(); break;
    case "modal-close": modal = null; renderStudio(); break;
    case "modal-backdrop": if (event.target === target) { modal = null; renderStudio(); } break;
    case "export": modal = { type: "export", mode: "discord" }; renderStudio(); break;
    case "import": modal = { type: "import" }; renderStudio(); break;
    case "export-mode": modal.mode = target.dataset.mode; renderStudio(); break;
    case "copy-export": {
      const output = document.getElementById("exportOutput");
      navigator.clipboard?.writeText(output?.value || "").then(() => toast("JSON copied to clipboard.", "success")).catch(() => toast("Clipboard access was blocked.", "warn"));
      break;
    }
    case "download-export": downloadJson(); break;
    case "apply-import": applyImport(); break;
    case "confirm-reset": modal = { type: "confirm-reset" }; renderStudio(); break;
    case "apply-reset": {
      recordUndo();
      state = defaultState();
      selection = { kind: "message" };
      modal = null;
      saveDraftSoon();
      renderStudio();
      toast("Started a fresh announcement.", "success");
      break;
    }
    case "section-add-text": mutate(() => { const c = selectedEntity(); if (c?.kind === "section" && c.texts.length < 3) c.texts.push("New text display"); }); break;
    case "section-remove-text": mutate(() => { const c = selectedEntity(); if (c?.kind === "section" && c.texts.length > 1) c.texts.splice(Number(target.dataset.index), 1); }); break;
    case "gallery-add": mutate(() => { const c = selectedEntity(); if (c?.kind === "gallery" && c.items.length < 10) c.items.push({ id: uid("media"), url: "", description: "", spoiler: false }); }); break;
    case "gallery-remove": mutate(() => { const c = selectedEntity(); if (c?.kind === "gallery" && c.items.length > 1) c.items = c.items.filter((item) => item.id !== target.dataset.itemId); }); break;
    case "button-add": mutate(() => { const c = selectedEntity(); if (c?.kind === "actionRow" && c.buttons.length < 5) c.buttons.push(makeLinkButton("Link", "")); }); break;
    case "button-remove": mutate(() => { const c = selectedEntity(); if (c?.kind === "actionRow" && c.buttons.length > 1) c.buttons = c.buttons.filter((button) => button.id !== target.dataset.buttonId); }); break;
    case "select-option-add": mutate(() => { const c = selectedEntity(); if (c?.kind === "actionRow" && c.select?.type === 3 && c.select.options.length < 25) c.select.options.push({ id: uid("opt"), label: `Option ${c.select.options.length + 1}`, value: `option_${c.select.options.length + 1}`, description: "", emoji: "", default: false }); }); break;
    case "select-option-remove": mutate(() => { const c = selectedEntity(); if (c?.kind === "actionRow" && c.select?.options?.length > 1) c.select.options = c.select.options.filter((option) => option.id !== target.dataset.optionId); }); break;
    case "markdown-wrap":
    case "markdown-prefix": applyMarkdownAction(target); break;
    case "reveal-spoiler": target.classList.toggle("revealed"); event.stopPropagation(); break;
    case "reveal-container": target.remove(); target.parentElement?.classList.remove("dc-spoiler-container"); event.stopPropagation(); break;
    default: break;
  }
}
