"use strict";
  function renderLogin() {
    app.innerHTML = `
      <main class="login-shell">
        <section class="login-hero">
          <div class="login-brand">
            <div class="brand-lockup">
              <div class="brand-mark">US</div>
              <div>
                <div class="brand-kicker">Government Communications</div>
                <div class="brand-name">Communications Studio</div>
              </div>
            </div>
          </div>
          <div class="login-copy">
            <h1>Official communications, built with precision.</h1>
            <p>Compose responsive Discord Components V2 announcements in a purpose-built government publishing workspace. Identity and publishing permissions will be derived from your connected accounts.</p>
            <div class="login-points">
              <div class="login-point"><strong>Discord-native</strong>Build against the current Components V2 message structure.</div>
              <div class="login-point"><strong>Live preview</strong>See the announcement update while you compose it.</div>
              <div class="login-point"><strong>Local autosave</strong>Your in-progress builder state survives refreshes on this device.</div>
            </div>
          </div>
          <div class="login-footer">Maintained by the National Archives and Records Administration • ${esc(CONFIG.guildName)}</div>
        </section>
        <aside class="login-panel-wrap">
          <div class="login-panel">
            <h2>Sign in</h2>
            <p class="lede">Connect an official account to enter Communications Studio. The backend will use these identities to resolve Discord roles and Roblox membership.</p>
            <button class="auth-button discord" data-action="auth-discord">
              <span class="auth-icon">${discordLogo()}</span>
              <span class="auth-copy">Continue with Discord<small>Server roles and publishing permissions</small></span>
            </button>
            <button class="auth-button roblox" data-action="auth-roblox">
              <span class="auth-icon">${robloxLogo()}</span>
              <span class="auth-copy">Continue with Roblox<small>Optional linked game identity</small></span>
            </button>
            ${CONFIG.enablePreviewAccess ? `
              <div class="auth-divider">Frontend preview</div>
              <button class="auth-button preview" data-action="auth-preview">
                <span class="auth-icon">${icon("message")}</span>
                <span class="auth-copy">Open Builder Preview<small>No publishing access • browser-local session</small></span>
              </button>
            ` : ""}
            <div class="auth-note">For production, sign-in persistence should be handled by the backend with rotating server-side sessions. Provider access and refresh tokens should never be stored in this page or in localStorage.</div>
          </div>
        </aside>
      </main>`;
  }

  function discordLogo() {
    return '<svg viewBox="0 0 24 24"><path d="M19.3 5.3A16.3 16.3 0 0 0 15.3 4l-.5 1a14.3 14.3 0 0 0-5.6 0l-.5-1a16 16 0 0 0-4 1.3C2.1 9.1 1.4 12.8 1.7 16.4a16.5 16.5 0 0 0 5 2.5l1.2-1.7-1.8-.9.4-.3c3.5 1.6 7.5 1.6 11 0l.5.3-1.8.9 1.2 1.7a16.4 16.4 0 0 0 5-2.5c.4-4.2-.7-7.8-3.1-11.1ZM8.6 14.5c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2 1 2 2.2-.9 2.2-2 2.2Zm6.8 0c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2 1 2 2.2-.9 2.2-2 2.2Z"/></svg>';
  }

  function robloxLogo() {
    return '<svg viewBox="0 0 24 24"><path d="m5.7 2 16.3 3.7L18.3 22 2 18.3 5.7 2Zm4.2 7.2-1.1 4.9 5.3 1.2 1.1-4.9-5.3-1.2Z"/></svg>';
  }

  function renderStudio() {
    ensureSelection();
    app.innerHTML = `
      <div class="studio-shell">
        ${renderTopbar()}
        ${renderMobileTabs()}
        <main class="studio-grid">
          ${renderStructurePanel()}
          ${renderPreviewPanel()}
          ${renderInspectorPanel()}
        </main>
      </div>
      <div class="toast-stack" id="toastStack"></div>
      ${modal ? renderModal() : ""}`;
    updateSaveIndicator();
  }

  function renderTopbar() {
    const who = session?.displayName || "Preview User";
    const subtitle = session?.provider ? `${session.provider} session` : "Frontend preview";
    return `
      <header class="topbar">
        <div class="brand-mark">US</div>
        <div class="topbar-title"><strong>Communications Studio</strong><span>${esc(CONFIG.guildName)}</span></div>
        <div class="topbar-separator"></div>
        <div class="save-state" data-save-state><span class="save-dot"></span>Saved locally</div>
        <div class="topbar-spacer"></div>
        <div class="top-actions">
          <button class="icon-btn" data-action="undo" title="Undo" ${undoStack.length ? "" : "disabled"}>${icon("undo")}</button>
          <button class="icon-btn" data-action="redo" title="Redo" ${redoStack.length ? "" : "disabled"}>${icon("redo")}</button>
          <button class="toolbar-btn" data-action="import"><span>${icon("upload")}</span><span class="label">Import</span></button>
          <button class="toolbar-btn primary" data-action="export"><span>${icon("download")}</span><span class="label">Export JSON</span></button>
          <div class="user-chip">
            <div class="user-avatar">${esc(initials(who))}</div>
            <div class="user-copy"><strong>${esc(who)}</strong><span>${esc(subtitle)}</span></div>
            <button class="icon-btn" data-action="logout" title="Sign out">${icon("logout")}</button>
          </div>
        </div>
      </header>`;
  }

  function renderMobileTabs() {
    return `<nav class="mobile-tabs" aria-label="Studio panels">
      ${["structure", "preview", "inspector"].map((panel) => `<button data-action="mobile-panel" data-panel="${panel}" class="${activeMobilePanel === panel ? "active" : ""}">${panel === "inspector" ? "Properties" : panel}</button>`).join("")}
    </nav>`;
  }

  function renderStructurePanel() {
    const count = countComponents();
    return `
      <aside class="panel structure-panel ${activeMobilePanel === "structure" ? "mobile-active" : ""}">
        <div class="panel-header"><span class="panel-title">Structure</span><span class="panel-subtitle">Drag to reorder</span></div>
        <div class="panel-body structure-scroll">
          <div class="structure-toolbar">
            <button class="add-container-btn" data-action="add-container">+ Add Container</button>
            <div class="structure-stat" id="structureStat"><strong>${count}/${MAX_COMPONENTS}</strong><span>components</span></div>
          </div>
          ${renderMessageTree()}
        </div>
      </aside>`;
  }

  function renderMessageTree() {
    const messageSelected = selection.kind === "message";
    return `
      <div class="tree-root">
        <button class="tree-item ${messageSelected ? "selected" : ""}" data-select-kind="message">
          <span class="tree-icon">${icon("message")}</span>
          <span class="tree-copy"><strong>Message</strong><span>${esc(state.message.displayName)} • Components V2</span></span>
        </button>
      </div>
      ${state.containers.length ? state.containers.map((container, index) => renderContainerTree(container, index)).join("") : '<div class="empty-state">No containers yet.<br>Add one to begin composing your announcement.</div>'}`;
  }

