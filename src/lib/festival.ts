/**
 * 节日彩蛋横幅（config/banners.toml 单一数据源）。
 *
 * 每个横幅两种触发方式二选一：
 * 1. 日期命中：固定日期范围（MM-DD，每年重复）或农历标记
 *    （中秋由香港天文台农历 API 动态判断当日是否农历八月十五）；
 * 2. URL 携带对应 egg 参数（任意日期均可手动触发）。
 *
 * 命中后给 <html> 添加对应 CLASS，由 index.css 呈现节日主题。
 * 日期范围 / 农历标记 / egg 参数 / CSS class 均在 config/banners.toml
 * 配置，新增横幅只需追加一个 [[banners]] 条目。
 */
import { banners, type BannerConfig } from "virtual:banners";

/** 全部横幅配置（config/banners.toml 单一数据源） */
export const bannerConfigs: readonly BannerConfig[] = banners;

/** 按标识取横幅配置（缺失时构建期即应发现，运行时兜底抛错） */
function bannerById(id: string): BannerConfig {
  const banner = bannerConfigs.find((b) => b.id === id);
  if (!banner) throw new Error(`config/banners.toml 缺少 id 为 ${id} 的横幅配置`);
  return banner;
}

/** 通用：MM-DD 日期窗口判断（每年重复，含首尾） */
function isDateInWindow(now: Date, start: string, end: string): boolean {
  const md = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return md >= start && md <= end;
}

/* ===== 劳动节 ===== */

const laborBanner = bannerById("labor-day");

/** 彩蛋参数值：?egg=<labor-day.egg> */
export const LABOR_DAY_EGG = laborBanner.egg;

/** 命中劳动节彩蛋时添加到 <html> 的 class */
export const LABOR_DAY_CLASS = laborBanner.cssClass;

/** 日期是否处于劳动节假期（banners.toml 配置的日期窗口）。 */
export function isLaborDay(now: Date = new Date()): boolean {
  return isDateInWindow(now, laborBanner.start!, laborBanner.end!);
}

/** 是否命中劳动节彩蛋：日期命中或 URL 参数二选一。 */
export function isLaborDayActive(
  search: string = typeof window === "undefined" ? "" : window.location.search,
  now: Date = new Date(),
): boolean {
  return (
    isLaborDay(now) ||
    new URLSearchParams(search).get("egg") === LABOR_DAY_EGG
  );
}

/** 按命中状态给 <html> 添加/移除劳动节彩蛋 class（幂等）。 */
export function applyLaborDayClass(
  active: boolean = isLaborDayActive(),
): void {
  document.documentElement.classList.toggle(LABOR_DAY_CLASS, active);
}

/* ===== 国庆 ===== */

const nationalBanner = bannerById("national-day");

/** 彩蛋参数值：?egg=<national-day.egg> */
export const NATIONAL_DAY_EGG = nationalBanner.egg;

/** 命中国庆彩蛋时添加到 <html> 的 class */
export const NATIONAL_DAY_CLASS = nationalBanner.cssClass;

/** 日期是否处于国庆假期（banners.toml 配置的日期窗口）。 */
export function isNationalDay(now: Date = new Date()): boolean {
  return isDateInWindow(now, nationalBanner.start!, nationalBanner.end!);
}

/** 是否命中国庆彩蛋：日期命中或 URL 参数二选一。 */
export function isNationalDayActive(
  search: string = typeof window === "undefined" ? "" : window.location.search,
  now: Date = new Date(),
): boolean {
  return (
    isNationalDay(now) ||
    new URLSearchParams(search).get("egg") === NATIONAL_DAY_EGG
  );
}

/** 按命中状态给 <html> 添加/移除国庆彩蛋 class（幂等）。 */
export function applyNationalDayClass(
  active: boolean = isNationalDayActive(),
): void {
  document.documentElement.classList.toggle(NATIONAL_DAY_CLASS, active);
}

/* ===== 中秋（农历转换采用香港天文台公开数据）===== */

const midAutumnBanner = bannerById("mid-autumn");

/** 彩蛋参数值：?egg=<mid-autumn.egg> */
export const MID_AUTUMN_EGG = midAutumnBanner.egg;

/** 命中秋彩蛋时添加到 <html> 的 class */
export const MID_AUTUMN_CLASS = midAutumnBanner.cssClass;

/** 香港天文台农历日期 API（banners.toml 配置） */
export const HKO_LUNAR_API = midAutumnBanner.api!;

/** 香港天文台开放数据 API 文档（数据来源标注链接） */
export const HKO_LUNAR_API_DOC =
  "https://data.gov.hk/sc-data/dataset/hk-hko-rss-gregorian-lunar-calendar-conversion-table/resource/de65991e-b9cc-4c7d-8290-8511a04b1d54";

/** HKO API 响应体 */
export interface LunarDateData {
  LunarYear: string;
  LunarDate: string;
}

/** 农历日期是否为中秋节（banners.toml 配置的农历标记，闰月不算）。 */
export function isMidAutumnLunarDate(lunarDate: string): boolean {
  return lunarDate === midAutumnBanner.lunar;
}

/** 是否命中 URL 参数 egg=<mid-autumn.egg>（同步判断，无需请求 API）。 */
export function isMidAutumnParamActive(
  search: string = typeof window === "undefined" ? "" : window.location.search,
): boolean {
  return new URLSearchParams(search).get("egg") === MID_AUTUMN_EGG;
}

/** 把 Date 格式化为 HKO API 要求的 YYYY-MM-DD。 */
export function formatApiDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 请求香港天文台农历 API，返回当日农历数据。
 * 网络/解析失败时返回 null（静默降级，不触发彩蛋）。
 * fetcher 参数便于单元测试注入 mock。
 */
export async function fetchLunarDate(
  now: Date = new Date(),
  fetcher: typeof fetch = fetch,
): Promise<LunarDateData | null> {
  try {
    const res = await fetcher(`${HKO_LUNAR_API}?date=${formatApiDate(now)}`, {
      // 第三方 API 加超时兜底，避免长时间挂起
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as LunarDateData;
    if (typeof data?.LunarDate !== "string") return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * 是否命中秋彩蛋：URL 参数 egg=<mid-autumn.egg>（短路，不发请求），
 * 否则请求香港天文台 API 判断当日是否为配置的农历标记。
 */
export async function isMidAutumnActive(
  search: string = typeof window === "undefined" ? "" : window.location.search,
  now: Date = new Date(),
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  if (isMidAutumnParamActive(search)) return true;
  const data = await fetchLunarDate(now, fetcher);
  return data ? isMidAutumnLunarDate(data.LunarDate) : false;
}

/** 按命中状态给 <html> 添加/移除中秋彩蛋 class（幂等）。 */
export function applyMidAutumnClass(active: boolean): void {
  document.documentElement.classList.toggle(MID_AUTUMN_CLASS, active);
}
