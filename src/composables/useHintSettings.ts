/**
 * 工具页说明提示（ToolHint）的显示策略（issue #253）。
 *
 * - 各工具页的说明类 Alert 带唯一 hintId（Alert 组件的 hint-id 属性）
 * - 提示右上角有关闭按钮：关闭后永久记忆（设置页可一键恢复）
 * - 设置页「工具说明提示」开关：一键隐藏/显示全部提示
 * - 状态持久化到 localStorage（ui:hint-prefs），单例共享
 */
import { ref } from "vue";

interface HintPrefs {
  /** 设置页「工具说明提示」开关：关闭后所有说明提示隐藏 */
  enabled: boolean;
  /** 单条提示的关闭记忆：hintId → 已关闭 */
  dismissed: Record<string, boolean>;
}

const STORAGE_KEY = "ui:hint-prefs";

const DEFAULT_PREFS: HintPrefs = { enabled: true, dismissed: {} };

function load(): HintPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<HintPrefs>;
    return {
      enabled: parsed.enabled ?? DEFAULT_PREFS.enabled,
      dismissed: parsed.dismissed ?? {},
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

/** 单例响应式状态：所有工具页与设置页共享同一份 */
const prefs = ref<HintPrefs>(load());

function save(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs.value));
  } catch {
    // localStorage 不可用时静默忽略，仅本次会话内生效
  }
}

export function useHintSettings() {
  /** 提示是否可见：开关开启且未被单独关闭 */
  function isHintVisible(id: string): boolean {
    return prefs.value.enabled && !prefs.value.dismissed[id];
  }

  /** 提示右上角的关闭按钮：永久记忆 */
  function dismissHint(id: string): void {
    prefs.value.dismissed[id] = true;
    save();
  }

  /** 设置页「工具说明提示」开关 */
  function setEnabled(value: boolean): void {
    prefs.value.enabled = value;
    save();
  }

  /** 恢复所有已关闭的提示（设置页按钮） */
  function restoreDismissed(): void {
    prefs.value.dismissed = {};
    save();
  }

  return { prefs, isHintVisible, dismissHint, setEnabled, restoreDismissed };
}
