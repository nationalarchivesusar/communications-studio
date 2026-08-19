"use strict";
  function renderLogin() {
    const hasDiscord = Boolean(session?.discord || session?.user?.discord);
    const hasRoblox = Boolean(session?.roblox || session?.user?.roblox);
    const needsDiscord = !hasDiscord;
    const primaryAction = needsDiscord ? "auth-guided" : "auth-roblox-guided";
    const primaryClass = needsDiscord ? "discord" : "roblox";
    const primaryIcon = needsDiscord ? discordLogo() : robloxLogo();
    const primaryTitle = needsDiscord ? "Continue with Discord" : "Continue with Roblox";
    const primaryDetail = needsDiscord ? "Step 1 of 2 · Verify Discord membership" : "Step 2 of 2 · Link Roblox identity";

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
            <p class="login-secondary">Sign-in verifies both your Discord server membership and your Roblox identity before the editor opens.</p>

            <div class="login-information">
              <div><strong>Builder</strong><span>Compose Containers, Sections, Text Displays, media, files, buttons, and select menus.</span></div>
              <div><strong>Preview</strong><span>View the announcement as it will appear in Discord while you edit it.</span></div>
              <div><strong>Drafts</strong><span>Work in progress is saved locally in this browser.</span></div>
            </div>
          </div>

          <aside class="login-panel-wrap">
            <div class="login-panel">
              <div class="section-kicker">Access Communications Studio</div>
              <h2>${needsDiscord ? "Sign in" : "Finish sign in"}</h2>
              <p class="lede">Both accounts are linked to one Communications Studio session.</p>

              <div class="auth-note"><strong>1. Discord</strong> — ${hasDiscord ? "Connected" : "Required first"}<br><strong>2. Roblox</strong> — ${hasRoblox ? "Connected" : "Required before editor access"}</div>

              <button class="auth-button ${primaryClass}" data-action="${primaryAction}">
                <span class="auth-icon">${primaryIcon}</span>
                <span class="auth-copy">${primaryTitle}<small>${primaryDetail}</small></span>
              </button>

              ${CONFIG.enablePreviewAccess ? `
                <div class="auth-divider"><span>Frontend preview</span></div>
                <button class="auth-button preview" data-action="auth-preview">
                  <span class="auth-icon">${icon("message")}</span>
                  <span class="auth-copy">Open Builder Preview<small>No publishing access</small></span>
                </button>
              ` : ""}

              <div class="auth-note">After Discord succeeds, Communications Studio will automatically continue to Roblox. Provider credentials are handled server-side and are not stored in the browser.</div>
            </div>
          </aside>
        </section>

        <footer class="login-footer">Maintained by the National Archives and Records Administration · ${esc(CONFIG.guildName)}</footer>
      </main>`;
  }
