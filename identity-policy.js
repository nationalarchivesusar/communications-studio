"use strict";

/* Production identity catalog + access gate. Preview exposes the full catalog;
 * authenticated sessions use only the backend-provided identity list. */
const STUDIO_PREVIEW_IDENTITIES = Object.freeze([
  { id:'white_house', category:'White House', label:'The White House', displayName:'The White House', avatarInitials:'WH', avatarColor:'#16365d', pingLabel:'@White House Ping' },
  { id:'eop', category:'White House', label:'Executive Office of the President', displayName:'Executive Office of the President', avatarInitials:'EOP', avatarColor:'#16365d', pingLabel:'@White House Ping' },
  { id:'ovp', category:'White House', label:'Office of the Vice President', displayName:'Office of the Vice President', avatarInitials:'OVP', avatarColor:'#244b70', pingLabel:'@Executive Ping' },
  { id:'whmo', category:'White House', label:'White House Military Office', displayName:'White House Military Office', avatarInitials:'WHMO', avatarColor:'#384552', pingLabel:'@White House Ping' },
  { id:'doj', category:'Department of Justice', label:'Department of Justice', displayName:'United States Department of Justice', avatarInitials:'DOJ', avatarColor:'#1f4d3e', pingLabel:'@Executive Ping' },
  { id:'fbi', category:'Department of Justice', label:'Federal Bureau of Investigation', displayName:'Federal Bureau of Investigation', avatarInitials:'FBI', avatarColor:'#294b63', pingLabel:'@Executive Ping' },
  { id:'usms', category:'Department of Justice', label:'United States Marshals Service', displayName:'United States Marshals Service', avatarInitials:'USMS', avatarColor:'#4a3b26', pingLabel:'@Executive Ping' },
  { id:'mpd', category:'Department of Justice', label:'Metropolitan Police Department', displayName:'Metropolitan Police Department', avatarInitials:'MPD', avatarColor:'#324a67', pingLabel:'@Executive Ping' },
  { id:'dhs', category:'Department of Homeland Security', label:'Department of Homeland Security', displayName:'United States Department of Homeland Security', avatarInitials:'DHS', avatarColor:'#1d4e5f', pingLabel:'@Executive Ping' },
  { id:'usss', category:'Department of Homeland Security', label:'United States Secret Service', displayName:'United States Secret Service', avatarInitials:'USSS', avatarColor:'#263b50', pingLabel:'@Executive Ping' },
  { id:'fps', category:'Department of Homeland Security', label:'Federal Protective Service', displayName:'Federal Protective Service', avatarInitials:'FPS', avatarColor:'#40505c', pingLabel:'@Executive Ping' },
  { id:'hsi', category:'Department of Homeland Security', label:'Homeland Security Investigations', displayName:'Homeland Security Investigations', avatarInitials:'HSI', avatarColor:'#224c58', pingLabel:'@Executive Ping' },
  { id:'dhs_oig', category:'Department of Homeland Security', label:'DHS Office of Inspector General', displayName:'DHS Office of Inspector General', avatarInitials:'OIG', avatarColor:'#4a565c', pingLabel:'@Executive Ping' },
  { id:'dcfems', category:'Department of Homeland Security', label:'District of Columbia Fire and EMS', displayName:'District of Columbia Fire and EMS', avatarInitials:'FEMS', avatarColor:'#7a2d2d', pingLabel:'@Executive Ping' },
  { id:'uscg', category:'Department of Homeland Security', label:'United States Coast Guard', displayName:'United States Coast Guard', avatarInitials:'USCG', avatarColor:'#234b6e', pingLabel:'@Executive Ping' },
  { id:'dos', category:'Department of State', label:'Department of State', displayName:'United States Department of State', avatarInitials:'DOS', avatarColor:'#1a4480', pingLabel:'@Executive Ping' },
  { id:'dss', category:'Department of State', label:'Diplomatic Security Service', displayName:'Diplomatic Security Service', avatarInitials:'DSS', avatarColor:'#24476b', pingLabel:'@Executive Ping' },
  { id:'dod', category:'Department of Defense', label:'Department of Defense', displayName:'United States Department of Defense', avatarInitials:'DOD', avatarColor:'#394b35', pingLabel:'@Military Ping' },
  { id:'us_military', category:'Department of Defense', label:'United States Military', displayName:'United States Military', avatarInitials:'USM', avatarColor:'#41483a', pingLabel:'@Military Ping' },
  { id:'dcng', category:'Department of Defense', label:'District of Columbia National Guard', displayName:'District of Columbia National Guard', avatarInitials:'DCNG', avatarColor:'#4a523a', pingLabel:'@Military Ping' },
  { id:'army', category:'Department of Defense', label:'United States Army', displayName:'United States Army', avatarInitials:'USA', avatarColor:'#2f3b2f', pingLabel:'@Military Ping' },
  { id:'navy', category:'Department of Defense', label:'United States Navy', displayName:'United States Navy', avatarInitials:'USN', avatarColor:'#263d5a', pingLabel:'@Military Ping' },
  { id:'air_force', category:'Department of Defense', label:'United States Air Force', displayName:'United States Air Force', avatarInitials:'USAF', avatarColor:'#315b77', pingLabel:'@Military Ping' },
  { id:'marine_corps', category:'Department of Defense', label:'United States Marine Corps', displayName:'United States Marine Corps', avatarInitials:'USMC', avatarColor:'#6a3030', pingLabel:'@Military Ping' },
  { id:'socom', category:'Department of Defense', label:'United States Special Operations Command', displayName:'United States Special Operations Command', avatarInitials:'SOCOM', avatarColor:'#3c4435', pingLabel:'@Military Ping' },
  { id:'dia', category:'Department of Defense', label:'Defense Intelligence Agency', displayName:'Defense Intelligence Agency', avatarInitials:'DIA', avatarColor:'#374756', pingLabel:'@Military Ping' },
  { id:'nsa', category:'Department of Defense', label:'National Security Agency', displayName:'National Security Agency', avatarInitials:'NSA', avatarColor:'#384a55', pingLabel:'@Military Ping' },
  { id:'pfpa', category:'Department of Defense', label:'Pentagon Force Protection Agency', displayName:'Pentagon Force Protection Agency', avatarInitials:'PFPA', avatarColor:'#435052', pingLabel:'@Military Ping' },
  { id:'dcis', category:'Department of Defense', label:'Defense Criminal Investigative Service', displayName:'Defense Criminal Investigative Service', avatarInitials:'DCIS', avatarColor:'#3e4c55', pingLabel:'@Military Ping' },
  { id:'dod_oig', category:'Department of Defense', label:'Department of Defense Office of Inspector General', displayName:'Department of Defense Office of Inspector General', avatarInitials:'OIG', avatarColor:'#4c5051', pingLabel:'@Military Ping' },
  { id:'odni', category:'Intelligence Community', label:'Office of the Director of National Intelligence', displayName:'Office of the Director of National Intelligence', avatarInitials:'ODNI', avatarColor:'#343e53', pingLabel:'@Executive Ping' },
  { id:'cia', category:'Intelligence Community', label:'Central Intelligence Agency', displayName:'Central Intelligence Agency', avatarInitials:'CIA', avatarColor:'#414141', pingLabel:'@Executive Ping' },
  { id:'house', category:'Congress', label:'United States House of Representatives', displayName:'United States House of Representatives', avatarInitials:'HOUSE', avatarColor:'#274c77', pingLabel:'@Legislative Ping' },
  { id:'senate', category:'Congress', label:'United States Senate', displayName:'United States Senate', avatarInitials:'SEN', avatarColor:'#315b45', pingLabel:'@Legislative Ping' },
  { id:'uscp', category:'Congress', label:'United States Capitol Police', displayName:'United States Capitol Police', avatarInitials:'USCP', avatarColor:'#24455f', pingLabel:'@Legislative Ping' },
  { id:'uscp_oig', category:'Congress', label:'United States Capitol Police — Office of Inspector General', displayName:'United States Capitol Police Office of Inspector General', avatarInitials:'OIG', avatarColor:'#35495b', pingLabel:'@Legislative Ping' },
  { id:'judiciary', category:'Judiciary', label:'United States Courts / Federal Judiciary', displayName:'United States Courts', avatarInitials:'USC', avatarColor:'#3b4f63', pingLabel:'@Judicial Ping' },
  { id:'supreme_court', category:'Judiciary', label:'Supreme Court of the United States', displayName:'Supreme Court of the United States', avatarInitials:'SCOTUS', avatarColor:'#4d443a', pingLabel:'@Judicial Ping' },
  { id:'fec', category:'Independent', label:'Federal Election Commission', displayName:'Federal Election Commission', avatarInitials:'FEC', avatarColor:'#344e73', pingLabel:'@Federal Ping' },
  { id:'nara', category:'Independent', label:'National Archives and Records Administration', displayName:'National Archives and Records Administration', avatarUrl:'https://raw.githubusercontent.com/nationalarchivesusar/us-code/main/assets/images/nara.png', avatarInitials:'NARA', avatarColor:'#8b1e2d', pingLabel:'@Federal Ping' }
]);

function isBuilderPreviewSession() { return session?.provider === 'Browser preview'; }
function normalizeIdentityForClient(raw) {
  if (!raw) return null;
  return { id:raw.id, category:raw.category || 'Other', label:raw.label || raw.display_name || raw.id,
    displayName:raw.display_name || raw.displayName || raw.label || raw.id,
    avatarUrl:raw.avatar_url || raw.avatarUrl || '', avatarInitials:raw.avatar_initials || raw.avatarInitials || initials(raw.label || raw.id),
    avatarColor:raw.avatar_color || raw.avatarColor || '#16365d', pingLabel:raw.ping_label || raw.pingLabel || '@Ping',
    pingRoleId:raw.ping_enabled === false ? '' : 'server-managed' };
}
function availablePublishingIdentities() {
  if (isBuilderPreviewSession()) return STUDIO_PREVIEW_IDENTITIES.map((item) => normalizeIdentityForClient({ ...item, ping_enabled:true }));
  const serverIdentities = session?.user?.publishing_identities;
  if (Array.isArray(serverIdentities)) return serverIdentities.map(normalizeIdentityForClient).filter(Boolean);
  const allowed = session?.user?.allowed_identity_ids;
  if (Array.isArray(allowed)) return STUDIO_PREVIEW_IDENTITIES.filter((identity) => allowed.includes(identity.id)).map((item) => normalizeIdentityForClient({ ...item, ping_enabled:true }));
  return [];
}
function identityById(id) { return availablePublishingIdentities().find((identity) => identity.id === id) || null; }
function currentPublishingIdentity() { const available=availablePublishingIdentities(); return available.find((identity) => identity.id === state?.message?.identityId) || available[0] || null; }
function inferIdentityId(message={}) { const available=availablePublishingIdentities(); if (available.some((i)=>i.id===message.identityId)) return message.identityId; const oldName=String(message.displayName||message.username||'').trim().toLowerCase(); const byName=available.find((i)=>i.displayName.toLowerCase()===oldName||i.label.toLowerCase()===oldName); return byName?.id || available[0]?.id || ''; }
function groupedIdentityOptions(identities, selectedId) { const groups=new Map(); for(const identity of identities){ if(!groups.has(identity.category)) groups.set(identity.category,[]); groups.get(identity.category).push(identity); } return [...groups.entries()].map(([category,items])=>`<optgroup label="${esc(category)}">${items.map((item)=>`<option value="${item.id}" ${selectedId===item.id?'selected':''}>${esc(item.label)}</option>`).join('')}</optgroup>`).join(''); }

function renderMessageInspector() {
  const identity=currentPublishingIdentity(), identities=availablePublishingIdentities();
  if(!identity) return `<h2 class="inspector-heading">Announcement</h2><div class="validation-box"><strong>No publishing identities</strong>Your connected accounts do not currently authorize an identity.</div>`;
  const discord=session?.user?.discord, roblox=session?.user?.roblox;
  return `<h2 class="inspector-heading">Announcement</h2><div class="inspector-type">Publishing identity</div>
    ${field('Publish as', `<select class="select-input" data-bind="message.identityId">${groupedIdentityOptions(identities, identity.id)}</select>`, isBuilderPreviewSession()?'Preview mode shows the complete catalog.':'Only identities authorized for your connected accounts are shown.')}
    <div class="managed-identity-card" style="--identity-color:${esc(identity.avatarColor)}"><div class="managed-avatar">${identity.avatarUrl?`<img src="${esc(identity.avatarUrl)}" alt="">`:esc(identity.avatarInitials)}</div><div class="managed-identity-copy"><strong>${esc(identity.displayName)}</strong><span>Display name, avatar, timestamp, APP badge, and mention policy are managed by Communications Studio.</span></div></div>
    ${toggleField(`Send ${identity.pingLabel}`, 'The publishing backend resolves the approved Discord role. Free-form mentions are not permitted.', state.message.sendPing, 'message.sendPing')}
    ${!isBuilderPreviewSession()?`<div class="linked-accounts"><strong>Connected accounts</strong><span>Discord: ${discord?esc(discord.display_name||discord.username||'Connected'):'Not connected'} · Roblox: ${roblox?esc(roblox.username||roblox.display_name||'Connected'):'Not connected'}</span>${!roblox?'<button class="add-inline-btn" data-action="auth-roblox">Connect Roblox</button>':''}</div>`:''}
    <div class="inspector-card"><div class="inspector-card-head"><strong>Draft storage</strong></div><div class="field-help">The builder automatically saves editable announcement content to this browser. Authentication credentials are never stored in the draft.</div><button class="add-inline-btn" data-action="confirm-reset" style="margin-top:10px">Start a fresh announcement</button></div>`;
}

function toDiscordPayload() {
  const identity=currentPublishingIdentity(), container=state.containers[0];
  if(!identity) return {flags:32768,components:[],allowed_mentions:{parse:[]}};
  const components=[];
  if(container){ const result={type:17,components:container.children.map(toDiscordComponent).filter(Boolean)}; if(container.accentEnabled) result.accent_color=accentToInt(container.accentColor); if(container.spoiler) result.spoiler=true; components.push(result); }
  const payload={flags:32768,components,allowed_mentions:{parse:[]},username:identity.displayName}; if(identity.avatarUrl) payload.avatar_url=identity.avatarUrl; return payload;
}

const renderStudioWithBuilder=window.renderStudio;
window.renderStudio=function renderStudioAuthorized(){
  if(!isBuilderPreviewSession() && session?.user){
    if(session.user.studio_access===false){ app.innerHTML=`<main class="access-gate"><section class="access-gate-card"><div class="section-kicker">Communications Studio</div><h1>Connect Discord to continue</h1><p>Discord is the primary Communications Studio login and is required before publishing identities can be used.</p><div class="access-actions"><button class="btn primary" data-action="auth-discord">Connect Discord</button>${!session.user.roblox?'<button class="btn" data-action="auth-roblox">Connect Roblox</button>':''}<button class="btn" data-action="logout">Sign out</button></div></section></main>`; return; }
    if(!availablePublishingIdentities().length){ app.innerHTML=`<main class="access-gate"><section class="access-gate-card"><div class="section-kicker">Publishing access</div><h1>No authorized publishing identities</h1><p>Your current Discord roles and linked Roblox group roles do not authorize a publishing identity.</p><div class="access-actions">${!session.user.roblox?'<button class="btn primary" data-action="auth-roblox">Connect Roblox</button>':'<button class="btn primary" data-action="auth-roblox">Refresh / relink Roblox</button>'}<button class="btn" data-action="logout">Sign out</button></div></section></main>`; return; }
  }
  renderStudioWithBuilder();
};
