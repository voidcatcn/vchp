/**
 * Vite 插件：加速工具配置（config/accelerate.toml，单一数据源）。
 *
 * 客户端：virtual:accelerate-data 供加速工具页消费（GitHub 渠道、
 * SourceForge 前缀、镜像目录入口与常见镜像快捷列表）
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseToml } from "smol-toml";
import type { Plugin } from "vite";

const ACCELERATE_FILE = resolve("config/accelerate.toml");

export interface GithubChannel {
  label: string;
  base: string;
}

export interface MirrorShortcut {
  name: string;
  path: string;
}

export interface AccelerateData {
  github: GithubChannel[];
  sourceforge: { base: string };
  mirrors: { app: string; shortcut: MirrorShortcut[] };
}

/** 解析并校验 accelerate.toml（构建期快速失败） */
export function parseAccelerateToml(raw: string): AccelerateData {
  const doc = parseToml(raw) as Record<string, unknown>;
  const githubRaw = doc.github;
  if (!Array.isArray(githubRaw) || githubRaw.length === 0) {
    throw new Error("accelerate.toml 必须至少定义一个 [[github]] 渠道");
  }
  const github = githubRaw.map((entry) => {
    const e = entry as Record<string, unknown>;
    const label = e.label;
    const base = e.base;
    if (typeof label !== "string" || !/^https?:\/\/.+\/$/.test(String(base))) {
      throw new Error("accelerate.toml 的 [[github]] 需要 label 与以 / 结尾的 base 地址");
    }
    return { label, base: String(base) };
  });
  const sourceforgeRaw = doc.sourceforge as Record<string, unknown> | undefined;
  const sourceforgeBase = String(sourceforgeRaw?.base ?? "");
  if (!/^https?:\/\/.+\/$/.test(sourceforgeBase)) {
    throw new Error("accelerate.toml 的 [sourceforge] base 必须是以 / 结尾的 http(s) 地址");
  }
  const mirrorsRaw = (doc.mirrors ?? {}) as Record<string, unknown>;
  const app = String(mirrorsRaw.app ?? "");
  if (!/^https?:\/\//.test(app)) {
    throw new Error("accelerate.toml 的 [mirrors] app 必须是 http(s) 地址");
  }
  const shortcutRaw = Array.isArray(mirrorsRaw.shortcut) ? mirrorsRaw.shortcut : [];
  const shortcut = shortcutRaw.map((entry) => {
    const e = entry as Record<string, unknown>;
    const name = String(e.name ?? "");
    const path = String(e.path ?? "");
    if (!name || !path.startsWith("/")) {
      throw new Error("accelerate.toml 的 [[mirrors.shortcut]] 需要 name 与以 / 开头的 path");
    }
    return { name, path };
  });
  return { github, sourceforge: { base: sourceforgeBase }, mirrors: { app, shortcut } };
}

export function loadAccelerateData(): AccelerateData {
  return parseAccelerateToml(readFileSync(ACCELERATE_FILE, "utf-8"));
}

export function accelerateData(): Plugin {
  const config = loadAccelerateData();
  return {
    name: "accelerate-data",
    enforce: "pre",
    resolveId(id) {
      if (id === "virtual:accelerate-data") return "\0virtual:accelerate-data";
    },
    load(id) {
      if (id !== "\0virtual:accelerate-data") return;
      return `export const accelerateData = ${JSON.stringify(config)};`;
    },
  };
}
