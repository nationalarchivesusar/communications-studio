"use strict";

/* Uniform Legal Practice Authority is a Judicial Branch publishing authority
 * with no Roblox group. Production authorization is supplied by the backend;
 * this extension adds the same identity to Browser Preview and supplies its
 * stable vendored seal/address defaults. */
const STUDIO_ULPA_PREVIEW_IDENTITY = Object.freeze({
  id: "ulpa",
  category: "Judiciary",
  label: "Uniform Legal Practice Authority",
  display_name: "Uniform Legal Practice Authority",
  avatar_url: "./assets/identity-logos/ulpa.png",
  avatar_initials: "ULPA",
  avatar_color: "#12365a",
  position: "Uniform Legal Practice Authority",
  office_emoji: ":ULPA:",
  channels: [
    { key: "judicial", id: "886077834911678464", label: "#judicial-branch" }
  ],
  default_channel_id: "886077834911678464",
  ping_options: [
    { key: "judicial", id: "1156346227286360236", label: "@Judicial Ping" }
  ],
  allow_everyone: false
});

const studioAvailablePublishingIdentitiesBeforeUlpa = availablePublishingIdentities;
availablePublishingIdentities = function availablePublishingIdentitiesWithUlpa() {
  const identities = studioAvailablePublishingIdentitiesBeforeUlpa();
  if (!isBuilderPreviewSession() || identities.some((identity) => identity.id === "ulpa")) return identities;
  const ulpa = normalizeRoutedIdentity(STUDIO_ULPA_PREVIEW_IDENTITY);
  return ulpa ? [...identities, ulpa] : identities;
};

const studioIdentityAddressBeforeUlpa = studioIdentityAddress;
studioIdentityAddress = function studioIdentityAddressWithUlpa(identity = currentPublishingIdentity()) {
  if (String(identity?.id || "") === "ulpa") {
    return { line1: "One Columbus Circle NE", line2: "Washington, DC 20544" };
  }
  return studioIdentityAddressBeforeUlpa(identity);
};
