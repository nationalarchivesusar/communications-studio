"use strict";
  function fromDiscordComponent(raw) {
    if (!raw || typeof raw !== "object") return null;
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
    if (raw.type === 13) {
      return { id: uid("file"), kind: "file", filename: String(raw.file?.url || "attachment://document.pdf").replace(/^attachment:\/\//, ""), spoiler: Boolean(raw.spoiler), sizeLabel: "Attachment" };
    }
    if (raw.type === 1) {
      const children = raw.components || [];
      const selectRaw = children.find((item) => [3, 5, 6, 7, 8].includes(Number(item.type)));
      const row = makeActionRow();
      if (selectRaw) {
        row.mode = "select";
        row.select = fromDiscordSelect(selectRaw);
      } else {
        row.mode = "buttons";
        row.buttons = children.filter((item) => item.type === 2).slice(0, 5).map(fromDiscordButton);
      }
      return row;
    }
    return null;
  }

  function fromDiscordSelect(raw) {
    const menu = makeSelect(raw?.type || 3);
    menu.type = Number(raw?.type) || 3;
    menu.customId = raw?.custom_id || "";
    menu.placeholder = raw?.placeholder || "";
    menu.minValues = Number(raw?.min_values ?? 1);
    menu.maxValues = Number(raw?.max_values ?? 1);
    menu.disabled = Boolean(raw?.disabled);
    menu.channelTypes = Array.isArray(raw?.channel_types) ? raw.channel_types.map(Number) : [];
    if (menu.type === 3) {
      menu.options = (raw?.options || []).slice(0, 25).map((option) => ({
        id: uid("opt"),
        label: option.label || "",
        value: option.value || "",
        description: option.description || "",
        emoji: option.emoji?.name || "",
        default: Boolean(option.default)
      }));
    }
    return menu;
  }

  function fromDiscordAccessory(raw) {
    if (!raw || raw.type === 11) return { kind: "thumbnail", url: raw?.media?.url || "", description: raw?.description || "", spoiler: Boolean(raw?.spoiler) };
    if (raw.type === 2) return Object.assign({ kind: "button" }, fromDiscordButton(raw));
    return { kind: "thumbnail", url: "", description: "", spoiler: false };
  }

  function fromDiscordButton(raw) {
    return {
      id: uid("btn"),
      label: raw.label || "Button",
      style: Number(raw.style) || 2,
      url: raw.url || "",
      customId: raw.custom_id || "",
      disabled: Boolean(raw.disabled),
      emoji: raw.emoji?.name || ""
    };
  }

  function bindValue(path, value, inputType) {
    const target = selectedEntity();
    let cast = value;
    if (inputType === "checkbox") cast = Boolean(value);
    if (path === "component.spacing") cast = Number(value);
    if (path.startsWith("message.")) state.message[path.slice(8)] = cast;
    else if (path.startsWith("container.")) {
      const container = selection.kind === "container" ? getContainer(selection.containerId) : getContainer(selection.containerId);
      if (container) container[path.slice(10)] = cast;
    } else if (path === "actionRow.select.disabled" && target?.kind === "actionRow") target.select.disabled = Boolean(cast);
    else if (path.startsWith("component.") && target) target[path.slice(10)] = cast;
    else if (path.startsWith("accessory.") && target?.kind === "section") target.accessory[path.slice(10)] = cast;
  }

  function addComponent(containerId, kind) {
    const container = getContainer(containerId);
    if (!container) return;
    const factories = { text: makeText, section: makeSection, separator: makeSeparator, gallery: makeGallery, file: makeFile, actionRow: makeActionRow };
    const component = factories[kind]?.();
    if (!component) return;
    mutate(() => container.children.push(component), { render: "all" });
    selection = { kind: "component", containerId, componentId: component.id };
    modal = null;
    renderStudio();
  }

  function removeContainer(containerId) {
    const index = state.containers.findIndex((container) => container.id === containerId);
    if (index < 0) return;
    mutate(() => state.containers.splice(index, 1), { render: "all" });
    selection = { kind: "message" };
    renderStudio();
  }

  function removeComponent(containerId, componentId) {
    const container = getContainer(containerId);
    const index = container?.children.findIndex((component) => component.id === componentId) ?? -1;
    if (!container || index < 0) return;
    mutate(() => container.children.splice(index, 1), { render: "all" });
    selection = { kind: "container", containerId };
    renderStudio();
  }

  function duplicateContainer(containerId) {
    const index = state.containers.findIndex((container) => container.id === containerId);
    if (index < 0) return;
    const copy = clone(state.containers[index]);
    rekeyContainer(copy);
    mutate(() => state.containers.splice(index + 1, 0, copy), { render: "all" });
    selection = { kind: "container", containerId: copy.id };
    renderStudio();
  }

  function rekeyContainer(container) {
    container.id = uid("ctr");
    container.children.forEach((child) => {
      child.id = uid("cmp");
      if (child.kind === "gallery") child.items.forEach((item) => item.id = uid("media"));
      if (child.kind === "actionRow") {
        child.buttons.forEach((button) => button.id = uid("btn"));
        if (child.select) {
          child.select.id = uid("select");
          child.select.options?.forEach((option) => option.id = uid("opt"));
        }
      }
    });
  }

  function applyMarkdownAction(button) {
    const id = button.dataset.componentId;
    const editor = document.querySelector(`[data-text-editor="${CSS.escape(id)}"]`);
    const component = getComponent(selection.containerId, id);
    if (!editor || !component) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = editor.value.slice(start, end);
    let next;
    let newStart;
    let newEnd;
    if (button.dataset.action === "markdown-wrap") {
      const before = button.dataset.before || "";
      const after = button.dataset.after || "";
      next = editor.value.slice(0, start) + before + (selected || "text") + after + editor.value.slice(end);
      newStart = start + before.length;
      newEnd = newStart + (selected || "text").length;
    } else {
      const prefix = button.dataset.prefix || "";
      const lineStart = editor.value.lastIndexOf("\n", start - 1) + 1;
      next = editor.value.slice(0, lineStart) + prefix + editor.value.slice(lineStart);
      newStart = start + prefix.length;
      newEnd = end + prefix.length;
    }
    recordUndo();
    component.content = next;
    editor.value = next;
    editor.focus();
    editor.setSelectionRange(newStart, newEnd);
    saveDraftSoon();
    renderPreviewOnly();
    renderValidationOnly();
  }

  function applyImport() {
    const input = document.getElementById("importInput");
    if (!input) return;
    try {
      const parsed = JSON.parse(input.value);
      const incoming = parsed.schema === SCHEMA || Array.isArray(parsed.containers) ? normalizeState(parsed) : fromDiscordPayload(parsed);
      recordUndo();
      state = incoming;
      selection = { kind: "message" };
      modal = null;
      saveDraftSoon();
      renderStudio();
      toast("Imported into the editable builder.", "success");
    } catch (error) {
      toast(`Import failed: ${error.message}`, "error");
    }
  }

