"use strict";
  "use strict";

  const CONFIG = Object.assign({
    apiBase: "",
    discordAuthPath: "/auth/discord",
    robloxAuthPath: "/auth/roblox",
    sessionPath: "/auth/session",
    logoutPath: "/auth/logout",
    enablePreviewAccess: true,
    guildName: "United States of America"
  }, window.COMMUNICATIONS_STUDIO_CONFIG || {});

  const APP_KEY = "usar-communications-studio:v1:draft";
  const SESSION_KEY = "usar-communications-studio:v1:preview-session";
  const THEME_KEY = "usar-communications-studio:v1:ui";
  const SCHEMA = "usar.communications-studio/v1";
  const MAX_COMPONENTS = 40;

  const app = document.getElementById("app");
  let state = null;
  let selection = { kind: "message" };
  let session = null;
  let activeMobilePanel = "preview";
  let modal = null;
  let saveTimer = null;
  let saveState = "saved";
  let undoStack = [];
  let redoStack = [];
  let dragState = null;

  const uid = (prefix = "c") => `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const esc = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const icon = (name) => {
    const icons = {
      message: '<svg viewBox="0 0 24 24"><path d="M4 5.5h16v11H8l-4 3v-14Z"/></svg>',
      container: '<svg viewBox="0 0 24 24"><rect x="3.5" y="4" width="17" height="16" rx="3"/><path d="M7.5 8h9M7.5 12h7M7.5 16h5"/></svg>',
      text: '<svg viewBox="0 0 24 24"><path d="M5 6h14M8 10h8M8 14h8M8 18h5"/></svg>',
      section: '<svg viewBox="0 0 24 24"><rect x="3.5" y="4" width="17" height="16" rx="2.5"/><path d="M7 8h7M7 12h7M7 16h5"/><rect x="16" y="8" width="2" height="7" rx="1"/></svg>',
      separator: '<svg viewBox="0 0 24 24"><path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4"/></svg>',
      gallery: '<svg viewBox="0 0 24 24"><rect x="3.5" y="4" width="17" height="16" rx="2.5"/><circle cx="9" cy="9" r="1.5"/><path d="m5.5 17 4.5-4 2.5 2 2.5-2.5 3.5 4.5"/></svg>',
      file: '<svg viewBox="0 0 24 24"><path d="M7 3.5h7l4 4V20H7z"/><path d="M14 3.5V8h4M9.5 12h5M9.5 15h5"/></svg>',
      buttons: '<svg viewBox="0 0 24 24"><rect x="3.5" y="7" width="17" height="10" rx="3"/><path d="M8 12h8"/></svg>',
      plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
      trash: '<svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V4h6v3M8 10v7M12 10v7M16 10v7M6.5 7l1 13h9l1-13"/></svg>',
      copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>',
      download: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 20h14"/></svg>',
      upload: '<svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5M5 20h14"/></svg>',
      undo: '<svg viewBox="0 0 24 24"><path d="M9 7 4 12l5 5M5 12h8a6 6 0 1 1 0 12" transform="translate(0 -6)"/></svg>',
      redo: '<svg viewBox="0 0 24 24"><path d="m15 7 5 5-5 5M19 12h-8a6 6 0 1 0 0 12" transform="translate(0 -6)"/></svg>',
      logout: '<svg viewBox="0 0 24 24"><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9"/></svg>',
      external: '<svg viewBox="0 0 24 24"><path d="M14 5h5v5M19 5l-8 8M18 13v6H5V6h6"/></svg>',
      chevron: '<svg viewBox="0 0 24 24"><path d="m8 10 4 4 4-4"/></svg>',
      warning: '<svg viewBox="0 0 24 24"><path d="M12 3 2.5 20h19zM12 9v5M12 17h.01"/></svg>'
    };
    return icons[name] || icons.text;
  };

  function makeText(content = "Write your announcement here.") {
    return { id: uid("txt"), kind: "text", content };
  }

  function makeSection() {
    return {
      id: uid("sec"),
      kind: "section",
      texts: ["## Section heading", "Add supporting information here."],
      accessory: {
        kind: "thumbnail",
        url: "",
        description: "",
        spoiler: false
      }
    };
  }

  function makeSeparator() {
    return { id: uid("sep"), kind: "separator", divider: true, spacing: 1 };
  }

  function makeGallery() {
    return {
      id: uid("gal"),
      kind: "gallery",
      items: [{ id: uid("media"), url: "", description: "", spoiler: false }]
    };
  }

  function makeFile() {
    return { id: uid("file"), kind: "file", filename: "document.pdf", spoiler: false, sizeLabel: "Attachment" };
  }

  function makeSelect(type = 3) {
    return {
      id: uid("select"),
      type: Number(type) || 3,
      customId: `select_${uid("action").slice(-8)}`,
      placeholder: "Choose an option",
      minValues: 1,
      maxValues: 1,
      disabled: false,
      channelTypes: [],
      options: [
        { id: uid("opt"), label: "First option", value: "first", description: "", emoji: "", default: false },
        { id: uid("opt"), label: "Second option", value: "second", description: "", emoji: "", default: false }
      ]
    };
  }

  function makeActionRow() {
    return {
      id: uid("row"),
      kind: "actionRow",
      mode: "buttons",
      buttons: [{
        id: uid("btn"),
        label: "View document",
        style: 5,
        url: "https://example.com",
        customId: "",
        disabled: false,
        emoji: ""
      }],
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
        makeText("# Official Communication\n-# United States of America • Communications Studio"),
        makeSeparator(),
        makeText("Compose your announcement using **Discord Components V2**. Select any component in the structure panel or directly in the preview to edit it."),
        makeSeparator(),
        makeText("-# Draft preview • Not yet published")
      ]
    };
  }

  function defaultState() {
    return {
      schema: SCHEMA,
      version: 1,
      message: {
        displayName: "USAR Communications",
        avatarUrl: "",
        showAppBadge: true,
        timestamp: "Today at 5:50 PM",
        allowedMentions: "none"
      },
      preview: {
        theme: "dark",
        device: "desktop"
      },
      containers: [makeContainer()],
      updatedAt: Date.now()
    };
  }

  function normalizeState(candidate) {
    const base = defaultState();
    if (!candidate || typeof candidate !== "object") return base;
    if (!Array.isArray(candidate.containers)) return base;
    candidate.schema = SCHEMA;
    candidate.version = 1;
    candidate.message = Object.assign(base.message, candidate.message || {});
    candidate.preview = Object.assign(base.preview, candidate.preview || {});
    candidate.containers.forEach((container) => {
      container.kind = "container";
      container.id ||= uid("ctr");
      container.accentEnabled = container.accentEnabled !== false;
      container.accentColor ||= "#1f64cc";
      container.spoiler = Boolean(container.spoiler);
      container.children = Array.isArray(container.children) ? container.children : [];
      container.children.forEach(normalizeChild);
    });
    return candidate;
  }

  function normalizeChild(child) {
    child.id ||= uid("cmp");
    if (child.kind === "section") {
      child.texts = Array.isArray(child.texts) && child.texts.length ? child.texts.slice(0, 3) : [""];
      child.accessory ||= { kind: "thumbnail", url: "", description: "", spoiler: false };
    } else if (child.kind === "gallery") {
      child.items = Array.isArray(child.items) ? child.items.slice(0, 10) : [];
      child.items.forEach((item) => item.id ||= uid("media"));
    } else if (child.kind === "actionRow") {
      child.mode = child.mode === "select" ? "select" : "buttons";
      child.buttons = Array.isArray(child.buttons) ? child.buttons.slice(0, 5) : [];
      child.buttons.forEach((button) => button.id ||= uid("btn"));
      child.select = Object.assign(makeSelect(child.select?.type || 3), child.select || {});
      child.select.id ||= uid("select");
      child.select.type = [3, 5, 6, 7, 8].includes(Number(child.select.type)) ? Number(child.select.type) : 3;
      child.select.options = Array.isArray(child.select.options) ? child.select.options.slice(0, 25) : [];
      child.select.options.forEach((option) => option.id ||= uid("opt"));
      child.select.channelTypes = Array.isArray(child.select.channelTypes) ? child.select.channelTypes : [];
    }
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(APP_KEY);
      return raw ? normalizeState(JSON.parse(raw)) : defaultState();
    } catch {
      return defaultState();
    }
  }

  function saveDraftSoon() {
    saveState = "saving";
    updateSaveIndicator();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        state.updatedAt = Date.now();
        localStorage.setItem(APP_KEY, JSON.stringify(state));
        saveState = "saved";
        updateSaveIndicator();
      } catch (error) {
        saveState = "error";
        updateSaveIndicator();
        toast("Could not save this draft in your browser.", "error");
        console.error(error);
      }
    }, 260);
  }

  function updateSaveIndicator() {
    const node = document.querySelector("[data-save-state]");
    if (!node) return;
    const label = saveState === "saving" ? "Saving locally…" : saveState === "error" ? "Save failed" : "Saved locally";
    node.innerHTML = `<span class="save-dot ${saveState === "saving" ? "saving" : ""}"></span>${label}`;
  }

  function recordUndo() {
    undoStack.push(clone(state));
    if (undoStack.length > 50) undoStack.shift();
    redoStack = [];
  }

  function mutate(mutator, options = {}) {
    const { history = true, render = "all" } = options;
    if (history) recordUndo();
    mutator(state);
    saveDraftSoon();
    if (render === "all") renderStudio();
    else if (render === "preview") {
      renderPreviewOnly();
      renderValidationOnly();
      renderStructureStatsOnly();
    }
  }

  function undo() {
    if (!undoStack.length) return;
    redoStack.push(clone(state));
    state = normalizeState(undoStack.pop());
    saveDraftSoon();
    renderStudio();
  }

  function redo() {
    if (!redoStack.length) return;
    undoStack.push(clone(state));
    state = normalizeState(redoStack.pop());
    saveDraftSoon();
    renderStudio();
  }

  function getContainer(id) {
    return state.containers.find((container) => container.id === id) || null;
  }

  function getComponent(containerId, componentId) {
    return getContainer(containerId)?.children.find((component) => component.id === componentId) || null;
  }

  function selectedEntity() {
    if (selection.kind === "message") return state.message;
    if (selection.kind === "container") return getContainer(selection.containerId);
    if (selection.kind === "component") return getComponent(selection.containerId, selection.componentId);
    return state.message;
  }

  function ensureSelection() {
    if (selection.kind === "container" && !getContainer(selection.containerId)) selection = { kind: "message" };
    if (selection.kind === "component" && !getComponent(selection.containerId, selection.componentId)) selection = { kind: "message" };
  }

  function componentName(component) {
    const names = {
      text: "Text Display",
      section: "Section",
      separator: "Separator",
      gallery: "Media Gallery",
      file: "File",
      actionRow: "Action Row"
    };
    return names[component?.kind] || "Component";
  }

  function selectTypeName(type) {
    return ({ 3: "String Select", 5: "User Select", 6: "Role Select", 7: "Mentionable Select", 8: "Channel Select" })[Number(type)] || "Select";
  }

  function componentSummary(component) {
    if (!component) return "";
    switch (component.kind) {
      case "text": return component.content.replace(/[#*_`>\-|]/g, "").trim().split("\n")[0] || "Empty text";
      case "section": return component.texts?.[0]?.replace(/[#*_`>\-|]/g, "").trim() || "Text + accessory";
      case "separator": return `${component.divider ? "Divider" : "Spacing only"} • ${component.spacing === 2 ? "Large" : "Small"}`;
      case "gallery": return `${component.items?.length || 0} media item${component.items?.length === 1 ? "" : "s"}`;
      case "file": return component.filename || "Attachment";
      case "actionRow": return component.mode === "select" ? `${selectTypeName(component.select?.type)} menu` : `${component.buttons?.length || 0} button${component.buttons?.length === 1 ? "" : "s"}`;
      default: return "";
    }
  }

  function countComponents() {
    let total = 0;
    for (const container of state.containers) {
      total += 1;
      for (const component of container.children) {
        total += 1;
        if (component.kind === "section") {
          total += component.texts.length;
          if (component.accessory) total += 1;
        } else if (component.kind === "actionRow") {
          total += component.mode === "select" ? 1 : component.buttons.length;
        }
      }
    }
    return total;
  }

  function totalTextCharacters() {
    let total = 0;
    for (const container of state.containers) {
      for (const component of container.children) {
        if (component.kind === "text") total += component.content.length;
        if (component.kind === "section") total += component.texts.reduce((sum, text) => sum + text.length, 0);
      }
    }
    return total;
  }

  function validateState() {
    const issues = [];
    const customIds = [];
    const count = countComponents();
    if (!state.containers.length) issues.push({ level: "error", text: "Add at least one Container before exporting." });
    if (count > MAX_COMPONENTS) issues.push({ level: "error", text: `${count} components are present; Discord allows at most ${MAX_COMPONENTS} total components per message.` });
    for (const [containerIndex, container] of state.containers.entries()) {
      if (!container.children.length) issues.push({ level: "warn", text: `Container ${containerIndex + 1} is empty.` });
      for (const component of container.children) {
        if (component.kind === "section") {
          if (component.texts.length < 1 || component.texts.length > 3) issues.push({ level: "error", text: "A Section must contain 1–3 Text Display children." });
          if (component.accessory?.kind === "thumbnail" && !component.accessory.url) issues.push({ level: "warn", text: "A Section thumbnail has no media URL yet." });
          if (component.accessory?.kind === "button") {
            if (component.accessory.style === 5 && !component.accessory.url) issues.push({ level: "error", text: "A link-style Section button needs a URL." });
            if (component.accessory.style !== 5) customIds.push({ id: component.accessory.customId, label: component.accessory.label || "Section button" });
          }
        }
        if (component.kind === "gallery") {
          if (component.items.length < 1 || component.items.length > 10) issues.push({ level: "error", text: "A Media Gallery must contain 1–10 items." });
          if (component.items.some((item) => !item.url)) issues.push({ level: "warn", text: "A Media Gallery item has no media URL yet." });
        }
        if (component.kind === "file" && !component.filename.trim()) issues.push({ level: "error", text: "A File component needs an attachment filename." });
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
                for (const option of menu.options) {
                  if (!option.label || !option.value) issues.push({ level: "error", text: "Every String Select option needs both a label and value." });
                }
              }
            }
          } else {
            if (component.buttons.length < 1 || component.buttons.length > 5) issues.push({ level: "error", text: "An Action Row must contain 1–5 buttons or one select menu." });
            for (const button of component.buttons) {
              if (!button.label && button.style !== 6) issues.push({ level: "error", text: "Buttons need a label." });
              if (button.style === 5 && !button.url) issues.push({ level: "error", text: `Link button “${button.label || "Untitled"}” needs a URL.` });
              if (button.style !== 5 && button.style !== 6) customIds.push({ id: button.customId, label: button.label || "Button" });
            }
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
      if (seen.has(entry.id)) issues.push({ level: "error", text: `custom_id “${entry.id}” is duplicated. Interactive component IDs must be unique within a message.` });
      seen.add(entry.id);
    }
    return issues;
  }

  function hasErrors() {
    return validateState().some((issue) => issue.level === "error");
  }

