"use strict";
  function handleInput(event) {
    const el = event.target;
    let touched = false;
    if (el.dataset.bind) {
      const value = el.type === "checkbox" ? el.checked : el.value;
      bindValue(el.dataset.bind, value, el.type);
      touched = true;
    }
    const component = selectedEntity();
    if (el.dataset.sectionTextIndex !== undefined && component?.kind === "section") {
      component.texts[Number(el.dataset.sectionTextIndex)] = el.value;
      touched = true;
    }
    if (el.dataset.accessoryField && component?.kind === "section") {
      component.accessory[el.dataset.accessoryField] = el.type === "checkbox" ? el.checked : (el.dataset.accessoryField === "style" ? Number(el.value) : el.value);
      touched = true;
    }
    if (el.dataset.galleryField && component?.kind === "gallery") {
      const item = component.items.find((entry) => entry.id === el.dataset.itemId);
      if (item) {
        item[el.dataset.galleryField] = el.type === "checkbox" ? el.checked : el.value;
        touched = true;
      }
    }
    if (el.dataset.buttonField && component?.kind === "actionRow") {
      const button = component.buttons.find((entry) => entry.id === el.dataset.buttonId);
      if (button) {
        button[el.dataset.buttonField] = el.type === "checkbox" ? el.checked : (el.dataset.buttonField === "style" ? Number(el.value) : el.value);
        touched = true;
      }
    }
    if (el.dataset.selectField && component?.kind === "actionRow" && component.select) {
      const key = el.dataset.selectField;
      component.select[key] = ["type", "minValues", "maxValues"].includes(key) ? Number(el.value) : (el.type === "checkbox" ? el.checked : el.value);
      touched = true;
    }
    if (el.dataset.optionField && component?.kind === "actionRow" && component.select) {
      const option = component.select.options.find((entry) => entry.id === el.dataset.optionId);
      if (option) {
        option[el.dataset.optionField] = el.type === "checkbox" ? el.checked : el.value;
        touched = true;
      }
    }
    if (touched) {
      saveDraftSoon();
      renderPreviewOnly();
      renderValidationOnly();
      renderStructureStatsOnly();
    }
  }

  function handleChange(event) {
    const el = event.target;
    const component = selectedEntity();
    if (el.matches("[data-bind], [data-accessory-field], [data-gallery-field], [data-button-field], [data-select-field], [data-option-field]")) {
      if (el.dataset.bind) bindValue(el.dataset.bind, el.type === "checkbox" ? el.checked : el.value, el.type);
      if (el.dataset.accessoryField && component?.kind === "section") component.accessory[el.dataset.accessoryField] = el.type === "checkbox" ? el.checked : (el.dataset.accessoryField === "style" ? Number(el.value) : el.value);
      if (el.dataset.galleryField && component?.kind === "gallery") {
        const item = component.items.find((entry) => entry.id === el.dataset.itemId);
        if (item) item[el.dataset.galleryField] = el.type === "checkbox" ? el.checked : el.value;
      }
      if (el.dataset.buttonField && component?.kind === "actionRow") {
        const button = component.buttons.find((entry) => entry.id === el.dataset.buttonId);
        if (button) button[el.dataset.buttonField] = el.type === "checkbox" ? el.checked : (el.dataset.buttonField === "style" ? Number(el.value) : el.value);
      }
      if (el.dataset.selectField && component?.kind === "actionRow" && component.select) {
        const key = el.dataset.selectField;
        component.select[key] = ["type", "minValues", "maxValues"].includes(key) ? Number(el.value) : (el.type === "checkbox" ? el.checked : el.value);
      }
      if (el.dataset.optionField && component?.kind === "actionRow" && component.select) {
        const option = component.select.options.find((entry) => entry.id === el.dataset.optionId);
        if (option) option[el.dataset.optionField] = el.type === "checkbox" ? el.checked : el.value;
      }
      saveDraftSoon();
      renderStudio();
    }
    if (el.dataset.action === "action-row-mode" && component?.kind === "actionRow") {
      component.mode = el.value === "select" ? "select" : "buttons";
      component.select ||= makeSelect(3);
      if (!component.buttons?.length) component.buttons = makeActionRow().buttons;
      saveDraftSoon();
      renderStudio();
    }
    if (el.dataset.action === "section-accessory-kind" && component?.kind === "section") {
      component.accessory = el.value === "button"
        ? { kind: "button", label: "Learn more", style: 5, url: "https://example.com", customId: "", disabled: false, emoji: "" }
        : { kind: "thumbnail", url: "", description: "", spoiler: false };
      saveDraftSoon();
      renderStudio();
    }
  }

  function handleFocusIn(event) {
    const el = event.target;
    if (!el.matches("[data-bind], [data-section-text-index], [data-accessory-field], [data-gallery-field], [data-button-field], [data-select-field], [data-option-field], [data-action='section-accessory-kind'], [data-action='action-row-mode']")) return;
    if (el.dataset.undoCaptured) return;
    recordUndo();
    el.dataset.undoCaptured = "1";
  }

  function handleFocusOut(event) {
    if (event.target?.dataset) delete event.target.dataset.undoCaptured;
  }

  function handleDragStart(event) {
    const component = event.target.closest("[data-drag-component]");
    const container = event.target.closest("[data-drag-container]");
    if (component) {
      dragState = { type: "component", id: component.dataset.dragComponent, parent: component.dataset.dragParent };
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", dragState.id);
    } else if (container) {
      dragState = { type: "container", id: container.dataset.dragContainer };
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", dragState.id);
    }
  }

  function handleDragOver(event) {
    if (!dragState) return;
    const target = dragState.type === "component" ? event.target.closest("[data-drag-component]") : event.target.closest("[data-drag-container]");
    if (!target) return;
    if (dragState.type === "component" && target.dataset.dragParent !== dragState.parent) return;
    event.preventDefault();
    target.classList.add("drag-over");
  }

  function handleDragLeave(event) {
    event.target.closest(".tree-item")?.classList.remove("drag-over");
  }

  function handleDrop(event) {
    if (!dragState) return;
    event.preventDefault();
    document.querySelectorAll(".drag-over").forEach((node) => node.classList.remove("drag-over"));
    if (dragState.type === "component") {
      const target = event.target.closest("[data-drag-component]");
      if (!target || target.dataset.dragParent !== dragState.parent) return;
      const container = getContainer(dragState.parent);
      const from = container.children.findIndex((component) => component.id === dragState.id);
      const to = container.children.findIndex((component) => component.id === target.dataset.dragComponent);
      if (from >= 0 && to >= 0 && from !== to) {
        recordUndo();
        const [item] = container.children.splice(from, 1);
        container.children.splice(to, 0, item);
        saveDraftSoon();
        renderStudio();
      }
    } else {
      const target = event.target.closest("[data-drag-container]");
      if (!target) return;
      const from = state.containers.findIndex((container) => container.id === dragState.id);
      const to = state.containers.findIndex((container) => container.id === target.dataset.dragContainer);
      if (from >= 0 && to >= 0 && from !== to) {
        recordUndo();
        const [item] = state.containers.splice(from, 1);
        state.containers.splice(to, 0, item);
        saveDraftSoon();
        renderStudio();
      }
    }
    dragState = null;
  }

