"use strict";

/*
 * Unified production sign-in UI.
 *
 * The primary control is deliberately a normal hyperlink rather than a
 * JavaScript-only button. This keeps sign-in usable even if an unrelated
 * delegated click handler fails elsewhere in the builder.
 */
function studioAuthHref(provider, flow = "") {
  if (!CONFIG.apiBase) return "#";
  const path = provider === "roblox" ? CONFIG.robloxAuthPath : CONFIG.discordAuthPath;
  const returnUrl = new URL(`${location.origin}${location.pathname}`);
  if (flow) returnUrl.searchParams.set("auth_flow", flow);
  return `${CONFIG.apiBase.replace(/\/$/, "")}${path}?return_to=${encodeURIComponent(returnUrl.toString())}`;
}

function renderLogin() {
  const hasDiscord = Boolean(session?.discord || session?.user?.discord);
  const provider = hasDiscord ? "roblox" : "discord";
  const href = studioAuthHref(provider, hasDiscord ? "" : "discord");

  app.innerHTML = `
    <main class="login-shell federal-login">
      <header class="federal-masthead">
        <div class="masthead-inner">
          <div class="masthead-kicker">United States of America</div>
          <div class="masthead-title">Communications Studio</div>
          <div class="masthead-agency">National Archives and Records Administration</div>
        </div>
      </header>

      <section class="login-content">
        <div class="login-intro">
          <div class="section-kicker">Government Communications</div>
          <h1>Communications Studio</h1>
          <p>Create, edit, and preview Discord Components V2 announcements for official USAR communications.</p>
          <p class="login-secondary">Sign in to access the Studio and your authorized publishing identities.</p>

          <div class="login-information">
            <div><strong>Builder</strong><span>Compose Containers, Sections, Text Displays, media, files, buttons, and select menus.</span></div>
            <div><strong>Preview</strong><span>View the announcement as it will appear in Discord while you edit it.</span></div>
            <div><strong>Drafts</strong><span>Work in progress is saved locally in this browser.</span></div>
          </div>
        </div>

        <aside class="login-panel-wrap">
          <div class="login-panel">
            <div class="section-kicker">Access Communications Studio</div>
            <h2>Sign in</h2>
            <p class="lede">Sign in to continue.</p>

            <a class="auth-button" href="${esc(href)}" style="position:relative;z-index:10;pointer-events:auto;text-decoration:none;cursor:pointer">
              <span class="auth-icon">${icon("external")}</span>
              <span class="auth-copy">Sign In</span>
            </a>

            ${CONFIG.enablePreviewAccess ? `
              <div class="auth-divider"><span>Frontend preview</span></div>
              <button class="auth-button preview" data-action="auth-preview">
                <span class="auth-icon">${icon("message")}</span>
                <span class="auth-copy">Open Builder Preview<small>No publishing access</small></span>
              </button>
            ` : ""}

            <div class="auth-note">Secure sign-in is handled through the Communications Studio backend.</div>
          </div>
        </aside>
      </section>

      <footer class="login-footer">Maintained by the National Archives and Records Administration · ${esc(CONFIG.guildName)}</footer>
    </main>`;
}
