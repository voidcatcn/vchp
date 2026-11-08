/**
 * 顶部提示横幅（节日彩蛋等）的显示策略（issue #253）。
 *
 * - 横幅自带关闭按钮：关闭后记忆到当年，跨年节日自动重新出现
 * - 设置页可按横幅单独关闭，也可用全站开关一键关闭全部提示
 * - 状态持久化到 localStorage（ui:banner-prefs），单例共享保证
 *   App.vue 与设置页读写同一份响应式数据
 */
import { ref } from "vue";

/** 横幅标识：对应 App.vue 中可出现的各个顶部横幅 */
export type BannerId = "national-day" | "mid-autumn" | "labor-day";

/** 设置页展示用的横幅元信息 */
export interface BannerMeta {
  id: BannerId;
  name: string;
  description: string;
}

export const BANNER_METAS: BannerMeta[] = [
  { id: "national-day", name: "国庆彩蛋", description: "10.1-10.7 顶部红金横幅" },
  { id: "mid-autumn", name: "中秋彩蛋", description: "农历八月十五顶部金色横幅" },
  { id: "labor-day", name: "劳动节彩蛋", description: "5.1-5.5 顶部红橙横幅" },
];

interface BannerPrefs {
  /** 全站提示开关：关闭后所有横幅不显示 */
  master: boolean;
  /** 设置页里按横幅单独关闭：bannerId → true */
  disabled: Partial<Record<BannerId, boolean>>;
  /** 横幅上的关闭记忆：bannerId → 关闭时年份（跨年自动重新出现） */
  dismissed: Partial<Record<BannerId, number>>;
}

const STORAGE_KEY = "ui:banner-prefs";

const DEFAULT_PREFS: BannerPrefs = { master: true, disabled: {}, dismissed: {} };

function load(): BannerPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<BannerPrefs>;
    return {
      master: parsed.master ?? DEFAULT_PREFS.master,
      disabled: parsed.disabled ?? {},
      dismissed: parsed.dismissed ?? {},
    };
  } catch {
    // 隐私模式 / 损坏数据：回退默认
    return { ...DEFAULT_PREFS };
  }
}

/** 单例响应式状态：App.vue 与设置页共享同一份 */
const prefs = ref<BannerPrefs>(load());

function save(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs.value));
  } catch {
    // localStorage 不可用时静默忽略，仅本次会话内生效
  }
}

/** 当前年份（关闭记忆按年过期，跨年节日重新出现） */
function currentYear(): number {
  return new Date().getFullYear();
}

/**
 * 横幅是否可见：命中节日 + 全站开启 + 未在设置页关闭 + 今年未手动关闭。
 */
export function useBannerSettings() {
  function isVisible(id: BannerId): boolean {
    return (
      prefs.value.master &&
      !prefs.value.disabled[id] &&
      prefs.value.dismissed[id] !== currentYear()
    );
  }

  /** 横幅上的关闭按钮：记入当年已读，跨年自动重置 */
  function dismiss(id: BannerId): void {
    prefs.value.dismissed[id] = currentYear();
    save();
  }

  /** 全站提示开关 */
  function setMaster(value: boolean): void {
    prefs.value.master = value;
    save();
  }

  /** 设置页按横幅启停 */
  function setEnabled(id: BannerId, value: boolean): void {
    if (value) delete prefs.value.disabled[id];
    else prefs.value.disabled[id] = true;
    save();
  }

  return { prefs, isVisible, dismiss, setMaster, setEnabled };
}
