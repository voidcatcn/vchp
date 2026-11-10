/**
 * Vite 插件：节日彩蛋横幅配置（config/banners.toml，单一数据源）。
 *
 * 每个横幅：id / egg 参数 / CSS class / 展示文案 / 日期范围或农历标记。
 * 客户端经 virtual:banners 消费，festival.ts 据此判断显隐；
 * 设置页的横幅开关与关闭记忆按横幅 id 记录。
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseToml } from "smol-toml";
import type { Plugin } from "vite";

/** 横幅配置文件（单一数据源） */
const BANNERS_FILE = resolve("config/banners.toml");

export interface BannerConfig {
  /** 横幅标识（设置页开关 / 关闭记忆的键） */
  id: string;
  /** URL 参数（?egg=<egg> 任意日期手动触发） */
  egg: string;
  /** 命中时添加到 <html> 的 class（index.css 呈现主题） */
  cssClass: string;
  /** 展示文案 */
  name: string;
  /** 固定日期范围：MM-DD（每年重复）；与 lunar 二选一 */
  start?: string;
  end?: string;
  /** 农历标记（如 "八月十五"）：由天文台 API 动态判断 */
  lunar?: string;
  /** 农历 API 地址（lunar 型必填） */
  api?: string;
}

/** 解析并校验 banners.toml（构建期快速失败，不静默吞格式问题） */
export function parseBannersToml(raw: string): BannerConfig[] {
  const doc = parseToml(raw) as Record<string, unknown>;
  const list = doc.banners;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("banners.toml 需要 [[banners]] 数组表（至少一项）");
  }
  const ids = new Set<string>();
  return list.map((item, index) => {
    const record = item as Record<string, unknown>;
    const id = record.id;
    if (typeof id !== "string" || id.trim() === "") {
      throw new Error(`banners[${index}].id 必填且不能为空`);
    }
    if (ids.has(id)) throw new Error(`banners[${index}].id 重复: ${id}`);
    ids.add(id);
    const egg = record.egg;
    if (typeof egg !== "string" || egg.trim() === "") {
      throw new Error(`banners[${index}].egg 必填且不能为空`);
    }
    const cssClass = record.cssClass;
    if (typeof cssClass !== "string" || cssClass.trim() === "") {
      throw new Error(`banners[${index}].cssClass 必填且不能为空`);
    }
    const name = record.name;
    if (typeof name !== "string" || name.trim() === "") {
      throw new Error(`banners[${index}].name 必填且不能为空`);
    }
    const hasRange =
      typeof record.start === "string" &&
      typeof record.end === "string" &&
      record.start.trim() !== "" &&
      record.end.trim() !== "";
    const isLunar = record.lunar === true || (typeof record.lunar === "string" && record.lunar.trim() !== "");
    if (!hasRange && !isLunar) {
      throw new Error(
        `banners[${index}]（${id}）需要日期范围（start + end，MM-DD）或 lunar 标记（天文台 API 动态判断）`,
      );
    }
    const banner: BannerConfig = {
      id,
      egg,
      cssClass,
      name,
    };
    if (hasRange) {
      banner.start = (record.start as string).trim();
      banner.end = (record.end as string).trim();
    }
    if (typeof record.lunar === "string" && record.lunar.trim() !== "") {
      banner.lunar = record.lunar.trim();
      const api = record.api;
      if (typeof api !== "string" || api.trim() === "") {
        throw new Error(`banners[${index}]（${id}）为农历型，api（天文台地址）必填`);
      }
      banner.api = api.trim();
    }
    return banner;
  });
}

/** 读取并解析横幅配置（构建/dev/测试按需调用，始终与数据源一致） */
export function loadBanners(): BannerConfig[] {
  return parseBannersToml(readFileSync(BANNERS_FILE, "utf-8"));
}

export function banners(): Plugin {
  return {
    name: "banners-config",
    enforce: "pre",

    resolveId(id) {
      if (id === "virtual:banners") return "\0virtual:banners";
    },

    load(id) {
      if (id !== "\0virtual:banners") return;
      return `export const banners = ${JSON.stringify(loadBanners())};`;
    },
  };
}
