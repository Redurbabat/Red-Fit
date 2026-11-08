/**
 * Native toolchain manifest contract. This file has no runtime dependencies.
 * Versions are intentionally pinned to validated stable release families
 * (Capacitor 8.6.0, Tauri CLI 2.12.4; 2026-11-08).
 */
export const NATIVE_PACKAGES = [
  { name: "@capacitor/core", version: "8.6.0", section: "dependencies" },
  { name: "@capacitor/ios", version: "8.6.0", section: "dependencies" },
  { name: "@capacitor/android", version: "8.6.0", section: "dependencies" },
  { name: "@capacitor/cli", version: "8.6.0", section: "devDependencies" },
  { name: "@tauri-apps/cli", version: "2.12.4", section: "devDependencies" },
];

export function bootstrapCommands() {
  return [
    ["install", "--save-exact", "--no-audit", "--no-fund",
      ...NATIVE_PACKAGES.filter((entry) => entry.section === "dependencies")
        .map(({ name, version }) => `${name}@${version}`)],
    ["install", "--save-dev", "--save-exact", "--no-audit", "--no-fund",
      ...NATIVE_PACKAGES.filter((entry) => entry.section === "devDependencies")
        .map(({ name, version }) => `${name}@${version}`)],
  ];
}

/**
 * Verify both declarations AND resolved entries. A package.json-only edit
 * breaks npm ci, and a lockfile-only edit is not a valid native setup.
 */
export function inspectNativeLock(manifest, lock) {
  const errors = [];
  if (!manifest || typeof manifest !== "object" ||
      !lock || typeof lock !== "object" ||
      lock.lockfileVersion !== 3 || !lock.packages?.[""]) {
    return ["package.json or npm package-lock.json (v3) is missing/invalid"];
  }
  const root = lock.packages[""];
  for (const { name, version, section } of NATIVE_PACKAGES) {
    const declared = manifest[section]?.[name];
    if (declared !== version) {
      errors.push(`package.json ${section}.${name}: expected exact ${version}, got ${declared ?? "missing"}`);
    }
    const rootVersion = root[section]?.[name];
    if (rootVersion !== version) {
      errors.push(`package-lock.json root ${section}.${name}: expected exact ${version}, got ${rootVersion ?? "missing"}`);
    }
    const resolved = lock.packages[`node_modules/${name}`]?.version;
    if (resolved !== version) {
      errors.push(`package-lock.json node_modules/${name}: expected ${version}, got ${resolved ?? "missing"}`);
    }
    const wrongSection = section === "dependencies" ? "devDependencies" : "dependencies";
    if (manifest[wrongSection]?.[name] != null || root[wrongSection]?.[name] != null) {
      errors.push(`${name} belongs in ${section} only`);
    }
  }
  if (manifest.name !== root.name) errors.push("package.json and lockfile project names differ");
  if (manifest.version !== root.version) errors.push("package.json and lockfile project versions differ");
  return errors;
}

export function existingNativeVersionConflicts(manifest) {
  const errors = [];
  for (const { name, version, section } of NATIVE_PACKAGES) {
    const existing = manifest.dependencies?.[name] ?? manifest.devDependencies?.[name];
    if (existing != null && existing !== version) {
      errors.push(`${name} is already declared as ${existing}; review the change before installing ${version}`);
    }
    const wrongSection = section === "dependencies" ? "devDependencies" : "dependencies";
    if (manifest[wrongSection]?.[name] != null) {
      errors.push(`${name} must move from ${wrongSection} to ${section} by an explicit review`);
    }
  }
  return errors;
}
