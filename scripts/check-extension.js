import { access, readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile("manifest.json", "utf8"));

assert(manifest.manifest_version === 3, "manifest_version must be 3");
assert(manifest.background?.service_worker, "background service worker is required");
assert(Array.isArray(manifest.content_scripts), "content_scripts must be present");
assert(manifest.options_page, "options_page is required");
assert(
  manifest.action?.default_popup === "popup.html",
  "action popup must point to popup.html"
);
assert(!manifest.permissions.includes("tabs"), "tabs permission should not be requested");
assert(manifest.permissions.includes("storage"), "storage permission is required");

const referencedFiles = [
  manifest.background.service_worker,
  manifest.options_page,
  manifest.action.default_popup,
  ...Object.values(manifest.icons ?? {}),
  ...manifest.content_scripts.flatMap((script) => script.js ?? [])
];

for (const file of referencedFiles) {
  await access(file);
}

for (const requiredDoc of ["README.md", "privacy-policy.md", "store-listing.md", "assets/store-screenshot.svg"]) {
  await access(requiredDoc);
}

const privacyPolicy = await readFile("privacy-policy.md", "utf8");
assert(
  privacyPolicy.includes("content script runs on HTTPS pages") &&
    privacyPolicy.includes("matched locally"),
  "privacy policy must disclose broad HTTPS content script matching"
);

for (const sourceFile of ["src/background.js", "src/content.js", "src/options.js", "src/popup.js"]) {
  const source = await readFile(sourceFile, "utf8");
  assert(!/\bfetch\s*\(/.test(source), `${sourceFile} must not use fetch`);
  assert(!/XMLHttpRequest/.test(source), `${sourceFile} must not use XMLHttpRequest`);
}

console.log("Extension manifest check passed.");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
