/**
 * 主题预设（composable）：Rice / Liquid Glass / Endfield / Void。
 *
 * - 与明暗模式（App.vue 的 theme: dark/light）正交：每套预设都支持明/暗
 * - 选择记忆到 localStorage（theme-preset），刷新后保持
 * - 未保存过选择时：Apple 系统默认液态玻璃，其余系统默认 Rice
 * - 预设通过 <html> 上的 theme-* class 呈现，由 index.css 定义
 * - 与 index.html 首屏内联脚本保持同步（后者负责首屏前防闪烁）
 */
import { ref } from "vue";

/** 主题预设 */
export type ThemePreset = "rice" | "liquid-glass" | "endfield" | "void";

/** 保存主题预设的 localStorage key */
export const THEME_PRESET_KEY = "theme-preset";

/** 各非基础预设添加到 <html> 的 class */
export const LIQUID_GLASS_CLASS = "theme-liquid-glass";
export const ENDFIELD_CLASS = "theme-endfield";
export const VOID_CLASS = "theme-void";

const PRESET_CLASSES = [LIQUID_GLASS_CLASS, ENDFIELD_CLASS, VOID_CLASS] as const;
const PRESET_CLASS: Partial<Record<ThemePreset, string>> = {
  "liquid-glass": LIQUID_GLASS_CLASS,
  endfield: ENDFIELD_CLASS,
  void: VOID_CLASS,
};

/** 判断是否为已支持的主题预设 */
function isThemePreset(value: string | null): value is ThemePreset {
  return (
    value === "rice" ||
    value === "liquid-glass" ||
    value === "endfield" ||
    value === "void"
  );
}

/**
 * 判断是否为 Apple 系统（macOS / iOS / iPadOS）。
 *
 * iPadOS 13+ 请求桌面站点时 UA 会伪装成 macOS，因此还需结合
 * MacIntel 平台与多点触控能力识别。
 */
export function isAppleSystem(
  userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent,
  platform = typeof navigator === "undefined" ? "" : navigator.platform,
  maxTouchPoints = typeof navigator === "undefined" ? 0 : navigator.maxTouchPoints,
): boolean {
  return (
    /iPad|iPhone|iPod|Macintosh|Mac OS X/.test(userAgent) ||
    (platform === "MacIntel" && maxTouchPoints > 1)
  );
}

/** 无保存选择时的默认预设：Apple 系统为液态玻璃，其余为 Rice */
export function getDefaultThemePreset(): ThemePreset {
  return isAppleSystem() ? "liquid-glass" : "rice";
}

/** 读取已保存的预设；无保存或值非法时使用当前系统的默认预设 */
export function getInitialThemePreset(): ThemePreset {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(THEME_PRESET_KEY);
  } catch {
    // 隐私模式等场景下存储不可用时，仍按系统默认主题启动
  }
  return isThemePreset(saved) ? saved : getDefaultThemePreset();
}

/** 按预设给 <html> 添加对应 class，并清除其它预设 class（幂等） */
export function applyThemePreset(preset: ThemePreset): void {
  const html = document.documentElement;
  for (const className of PRESET_CLASSES) {
    html.classList.toggle(className, PRESET_CLASS[preset] === className);
  }
}

/**
 * 主题预设状态管理（单例共享，跨组件/页面同步）。
 *
 * @returns preset 当前预设；setPreset 切换并持久化
 */
const preset = ref<ThemePreset>(getInitialThemePreset());
applyThemePreset(preset.value);

export function useThemePreset() {
  function setPreset(next: ThemePreset) {
    preset.value = next;
    applyThemePreset(next);
    localStorage.setItem(THEME_PRESET_KEY, next);
  }

  return { preset, setPreset };
}
