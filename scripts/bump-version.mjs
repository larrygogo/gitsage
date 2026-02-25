#!/usr/bin/env node

/**
 * 版本号同步脚本
 * 用法: node scripts/bump-version.mjs <version>
 * 示例: node scripts/bump-version.mjs 0.2.0
 *
 * 同时更新:
 *   - package.json
 *   - src-tauri/tauri.conf.json
 *   - src-tauri/Cargo.toml
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const version = process.argv[2];
if (!version) {
  console.error("用法: node scripts/bump-version.mjs <version>");
  console.error("示例: node scripts/bump-version.mjs 0.2.0");
  process.exit(1);
}

// 简单校验 semver 格式
if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
  console.error(`无效的版本号: ${version}`);
  console.error("请使用 semver 格式，例如: 0.2.0 或 1.0.0-beta.1");
  process.exit(1);
}

// 1. package.json
const pkgPath = resolve(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
const oldVersion = pkg.version;
pkg.version = version;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`  package.json: ${oldVersion} → ${version}`);

// 2. src-tauri/tauri.conf.json
const tauriConfPath = resolve(root, "src-tauri/tauri.conf.json");
const tauriConf = JSON.parse(readFileSync(tauriConfPath, "utf-8"));
tauriConf.version = version;
writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + "\n");
console.log(`  tauri.conf.json: ${oldVersion} → ${version}`);

// 3. src-tauri/Cargo.toml — 只替换 [package] 下的第一个 version
const cargoPath = resolve(root, "src-tauri/Cargo.toml");
let cargo = readFileSync(cargoPath, "utf-8");
cargo = cargo.replace(
  /^(version\s*=\s*)"[^"]*"/m,
  `$1"${version}"`,
);
writeFileSync(cargoPath, cargo);
console.log(`  Cargo.toml: ${oldVersion} → ${version}`);

console.log(`\n版本已更新为 ${version}`);
