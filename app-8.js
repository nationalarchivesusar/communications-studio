"use strict";
  function renderImportModal() {
    return `<div class="modal-backdrop" data-action="modal-backdrop"><div class="modal" role="dialog" aria-modal="true"><div class="modal-header"><h2>Import JSON</h2><button class="modal-close" data-action="modal-close">×</button></div><div class="modal-body"><p class="field-help" style="font-size:10px;margin:0 0 10px">Paste either a Communications Studio editable export or a Discord Components V2 payload. Supported V2 components will be converted into editable builder state.</p><textarea class="code-output" id="importInput" placeholder='{"flags":32768,"components":[…]}'></textarea></div><div class="modal-footer"><button class="btn" data-action="modal-close">Cancel</button><button class="btn primary" data-action="apply-import">Import</button></div></div></div>`;
  }

  function renderResetModal() {
    return `<div class="modal-backdrop" data-action="modal-backdrop"><div class="modal narrow" role="dialog" aria-modal="true"><div class="modal-header"><h2>Start over?</h2><button class="modal-close" data-action="modal-close">×</button></div><div class="modal-body"><p style="font-size:12px;line-height:1.6;color:#5f6c7d;margin:0">This replaces the current locally saved draft with a fresh Components V2 message.</p></div><div class="modal-footer"><button class="btn" data-action="modal-close">Cancel</button><button class="btn danger" data-action="apply-reset">Reset builder</button></div></div></div>`;
  }

  function renderPreviewOnly() {
    const node = document.getElementById("previewContent");
    if (node) node.innerHTML = renderDiscordPreview();
  }

  function renderValidationOnly() {
    const node = document.getElementById("validationBox");
    if (node) node.innerHTML = renderValidation();
  }

  function renderStructureStatsOnly() {
    const node = document.getElementById("structureStat");
    if (node) node.innerHTML = `<strong>${countComponents()}/${MAX_COMPONENTS}</strong><span>components</span>`;
  }

  function accentToInt(hex) {
    const clean = String(hex || "").replace("#", "");
    return /^[0-9a-fA-F]{6}$/.test(clean) ? parseInt(clean, 16) : 0;
  }

  function intToHex(value) {
    return `#${Math.max(0, Math.min(0xffffff, Number(value) || 0)).toString(16).padStart(6, "0")}`;
  }

  function toDiscordPayload() {
    const payload = {
      flags: 32768,
      components: state.containers.map((container) => {
        const result = {
          type: 17,
          components: container.children.map(toDiscordComponent).filter(Boolean)
        };
        if (container.accentEnabled) result.accent_color = accentToInt(container.accentColor);
        if (container.spoiler) result.spoiler = true;
        return result;
      }),
      allowed_mentions: allowedMentionsPayload(state.message.allowedMentions)
    };
    if (state.message.displayName?.trim()) payload.username = state.message.displayName.trim();
    if (state.message.avatarUrl?.trim()) payload.avatar_url = state.message.avatarUrl.trim();
    return payload;
  }

  function allowedMentionsPayload(policy) {
    if (policy === "all") return { parse: ["users", "roles", "everyone"] };
    if (policy === "roles") return { parse: ["roles"] };
    return { parse: [] };
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
    if (component.kind === "file") {
      return { type: 13, file: { url: `attachment://${component.filename}` }, ...(component.spoiler ? { spoiler: true } : {}) };
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

  function toDiscordSelect(menu) {
    const type = [3, 5, 6, 7, 8].includes(Number(menu?.type)) ? Number(menu.type) : 3;
    const data = {
      type,
      custom_id: menu?.customId || "",
      min_values: Number(menu?.minValues ?? 1),
      max_values: Number(menu?.maxValues ?? 1)
    };
    if (menu?.placeholder) data.placeholder = menu.placeholder;
    if (menu?.disabled) data.disabled = true;
    if (type === 3) {
      data.options = (menu?.options || []).slice(0, 25).map((option) => {
        const result = { label: option.label || "Option", value: option.value || "option" };
        if (option.description) result.description = option.description;
        if (option.emoji) result.emoji = { name: option.emoji };
        if (option.default) result.default = true;
        return result;
      });
    }
    if (type === 8 && menu?.channelTypes?.length) data.channel_types = menu.channelTypes.map(Number).filter(Number.isInteger);
    return data;
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
      style: Number(button.style) || 2,
      label: button.label || "Button"
    };
    if (button.disabled) data.disabled = true;
    if (button.emoji) data.emoji = { name: button.emoji };
    if (data.style === 5) data.url = button.url || "";
    else data.custom_id = button.customId || `action_${button.id || uid("btn")}`;
    return data;
  }

  function fromDiscordPayload(payload) {
    if (!payload || !Array.isArray(payload.components)) throw new Error("No components array found.");
    const containers = [];
    let loose = [];
    const flushLoose = () => {
      if (!loose.length) return;
      containers.push({ id: uid("ctr"), kind: "container", accentEnabled: false, accentColor: "#1f64cc", spoiler: false, children: loose });
      loose = [];
    };
    for (const raw of payload.components) {
      if (raw.type === 17) {
        flushLoose();
        containers.push({
          id: uid("ctr"), kind: "container",
          accentEnabled: raw.accent_color !== undefined && raw.accent_color !== null,
          accentColor: intToHex(raw.accent_color || 0),
          spoiler: Boolean(raw.spoiler),
          children: (raw.components || []).map(fromDiscordComponent).filter(Boolean)
        });
      } else {
        const converted = fromDiscordComponent(raw);
        if (converted) loose.push(converted);
      }
    }
    flushLoose();
    const imported = defaultState();
    imported.containers = containers;
    imported.message.displayName = payload.username || payload._studio?.display_name || imported.message.displayName;
    imported.message.avatarUrl = payload.avatar_url || payload._studio?.avatar_url || "";
    const parse = payload.allowed_mentions?.parse || [];
    imported.message.allowedMentions = parse.includes("everyone") || (parse.includes("users") && parse.includes("roles")) ? "all" : parse.includes("roles") ? "roles" : (payload._studio?.allowed_mentions_policy || "none");
    return normalizeState(imported);
  }

