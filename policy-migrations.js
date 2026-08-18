"use strict";

/* Remove presentation artifacts and unsupported components from older local drafts. */
(() => {
  const normalizeWithPolicy = window.normalizeState;
  if (typeof normalizeWithPolicy !== "function") return;

  window.normalizeState = function normalizeStateWithMigrations(candidate) {
    const normalized = normalizeWithPolicy(candidate);
    const container = normalized?.containers?.[0];
    if (!container) return normalized;

    container.children = (container.children || []).filter((component) => {
      if (!component || component.kind === "file") return false;
      if (component.kind !== "text") return true;
      const text = String(component.content || "").replace(/[•—–-]/g, " ").replace(/\s+/g, " ").trim();
      return !/draft preview.*not yet published/i.test(text);
    });

    return normalized;
  };
})();
