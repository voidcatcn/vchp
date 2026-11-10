/**
 * Vite 插件：站点基础配置（config/site.toml，单一数据源）。
 *
 * - 客户端：virtual:site-config 供 useSeo / 页面消费（站点名、地址、
 *   OG 兜底图、仓库链接等）
 * - 构建插件：loadSiteConfig() 供 sitemap / RSS 读取站点名与地址
 * - transformIndexHtml：把 index.html 的 %SITE_*% 占位符替换为配置值
 *   （首屏静态标题 / 描述 / OG 标签在 JS 加载前即与配置一致）
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseToml } from "smol-toml";
import type { Plugin } from "vite";

/** 站点配置文件（单一数据源） */
const SITE_FILE = resolve("config/site.toml");

export interface SiteConfig {
  /** 站点名称：标题后缀、og:site_name、RSS 频道名 */
  name: string;
  /** 首屏静态标题（JS 加载前） */
  title: string;
  /** 站点描述 */
  description: string;
  /** 站点根地址 */
  url: string;
  /** OG 兜底图 */
  ogImage: string;
  /** 仓库地址 */
  repoUrl: string;
}

/** 解析并校验 site.toml（构建期快速失败，不静默吞格式问题） */
export function parseSiteToml(raw: string): SiteConfig {
  const doc = parseToml(raw) as Record<string, unknown>;
  const name = doc.name;
  if (typeof name !== "string" || name.trim() === "") {
    throw new Error("site.toml 的 name 必填且不能为空");
  }
  const url = doc.url;
  if (typeof url !== "string" || !/^https?:\/\//.test(url)) {
    throw new Error("site.toml 的 url 必须是 http(s) 地址");
  }
  const title = typeof doc.title === "string" && doc.title.trim() ? doc.title : name;
  const description =
    typeof doc.description === "string" && doc.description.trim() ? doc.description : "";
  const ogImage =
    typeof doc.ogImage === "string" && doc.ogImage.trim() ? doc.ogImage : "";
  const repoUrl =
    typeof doc.repoUrl === "string" && doc.repoUrl.trim() ? doc.repoUrl : "";
  return { name, title, description, url, ogImage, repoUrl };
}

/** 读取并解析站点配置（构建/dev/测试按需调用，始终与数据源一致） */
export function loadSiteConfig(): SiteConfig {
  return parseSiteToml(readFileSync(SITE_FILE, "utf-8"));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function siteConfig(): Plugin {
  const config = loadSiteConfig();

  return {
    name: "site-config",
    enforce: "pre",

    resolveId(id) {
      if (id === "virtual:site-config") return "\0virtual:site-config";
    },

    load(id) {
      if (id !== "\0virtual:site-config") return;
      return `export const siteConfig = ${JSON.stringify(config)};`;
    },

    transformIndexHtml(html) {
      return html
        .replaceAll("%SITE_TITLE%", escapeHtml(config.title))
        .replaceAll("%SITE_NAME%", escapeHtml(config.name))
        .replaceAll(
          "%SITE_DESCRIPTION%",
          escapeHtml(`${config.name} - ${config.description}`),
        )
        .replaceAll("%SITE_OG_DESCRIPTION%", escapeHtml(config.description))
        .replaceAll("%SITE_OG_IMAGE%", escapeHtml(config.ogImage))
        .replaceAll("%SITE_URL%", escapeHtml(config.url));
    },
  };
}
