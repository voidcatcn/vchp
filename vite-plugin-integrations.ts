/**
 * Vite 插件：第三方集成配置（config/integrations.toml，单一数据源）。
 *
 * 统计脚本（umami / clarity）按 Cookie 同意注入；
 * giscus 评论基于 GitHub Discussions。
 * 客户端经 virtual:integrations 消费。
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseToml } from "smol-toml";
import type { Plugin } from "vite";

/** 集成配置文件（单一数据源） */
const INTEGRATIONS_FILE = resolve("config/integrations.toml");

export interface IntegrationsConfig {
  umami: { script: string; websiteId: string };
  clarity: { script: string };
  giscus: {
    repo: string;
    repoId: string;
    category: string;
    categoryId: string;
    mapping: string;
    lang: string;
  };
}

/** 解析并校验 integrations.toml（构建期快速失败，不静默吞格式问题） */
export function parseIntegrationsToml(raw: string): IntegrationsConfig {
  const doc = parseToml(raw) as Record<string, Record<string, unknown>>;

  const umami = doc.umami as Record<string, unknown> | undefined;
  if (!umami || typeof umami.script !== "string" || typeof umami.websiteId !== "string") {
    throw new Error("integrations.toml 的 [umami] 需要 script 与 websiteId");
  }
  const clarity = doc.clarity as Record<string, unknown> | undefined;
  if (!clarity || typeof clarity.script !== "string") {
    throw new Error("integrations.toml 的 [clarity] 需要 script");
  }
  const giscus = doc.giscus as Record<string, unknown> | undefined;
  if (!giscus) throw new Error("integrations.toml 的 [giscus] 必填");
  for (const key of ["repo", "repoId", "category", "categoryId", "mapping", "lang"]) {
    if (typeof giscus[key] !== "string" || (giscus[key] as string).trim() === "") {
      throw new Error(`integrations.toml 的 [giscus].${key} 必填`);
    }
  }
  return {
    umami: { script: umami.script, websiteId: umami.websiteId },
    clarity: { script: clarity.script },
    giscus: {
      repo: giscus.repo as string,
      repoId: giscus.repoId as string,
      category: giscus.category as string,
      categoryId: giscus.categoryId as string,
      mapping: giscus.mapping as string,
      lang: giscus.lang as string,
    },
  };
}

/** 读取并解析集成配置（构建/dev/测试按需调用，始终与数据源一致） */
export function loadIntegrations(): IntegrationsConfig {
  return parseIntegrationsToml(readFileSync(INTEGRATIONS_FILE, "utf-8"));
}

export function integrations(): Plugin {
  return {
    name: "integrations-config",
    enforce: "pre",

    resolveId(id) {
      if (id === "virtual:integrations") return "\0virtual:integrations";
    },

    load(id) {
      if (id !== "\0virtual:integrations") return;
      return `export const integrations = ${JSON.stringify(loadIntegrations())};`;
    },
  };
}
