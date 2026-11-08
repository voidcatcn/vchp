/**
 * 工具说明提示设置（useHintSettings）单元测试（issue #253）。
 */
import { beforeEach, describe, expect, it } from "vitest";
import { useHintSettings } from "@/composables/useHintSettings";

beforeEach(() => {
  localStorage.clear();
  // 单例状态经公开 API 重置（开启 + 清空关闭记忆）
  const { setEnabled, restoreDismissed } = useHintSettings();
  setEnabled(true);
  restoreDismissed();
});

describe("useHintSettings", () => {
  it("默认全部提示可见", () => {
    const { isHintVisible } = useHintSettings();
    expect(isHintVisible("asymmetric-key-usage")).toBe(true);
    expect(isHintVisible("wheel-usage")).toBe(true);
  });

  it("提示右上角关闭后：该条隐藏，其它提示不受影响", () => {
    const { isHintVisible, dismissHint } = useHintSettings();
    dismissHint("asymmetric-key-usage");
    expect(isHintVisible("asymmetric-key-usage")).toBe(false);
    expect(isHintVisible("wheel-usage")).toBe(true);
  });

  it("设置页开关：关闭后所有提示隐藏，开启后未单独关闭的恢复", () => {
    const { isHintVisible, setEnabled, dismissHint } = useHintSettings();
    dismissHint("asymmetric-key-usage");
    setEnabled(false);
    expect(isHintVisible("asymmetric-key-usage")).toBe(false);
    expect(isHintVisible("wheel-usage")).toBe(false);
    setEnabled(true);
    // 单独关闭过的提示仍然隐藏
    expect(isHintVisible("asymmetric-key-usage")).toBe(false);
    expect(isHintVisible("wheel-usage")).toBe(true);
  });

  it("恢复已关闭的提示：清空关闭记忆", () => {
    const { isHintVisible, dismissHint, restoreDismissed } = useHintSettings();
    dismissHint("asymmetric-key-usage");
    dismissHint("wheel-usage");
    restoreDismissed();
    expect(isHintVisible("asymmetric-key-usage")).toBe(true);
    expect(isHintVisible("wheel-usage")).toBe(true);
  });

  it("状态持久化到 localStorage", () => {
    const { dismissHint } = useHintSettings();
    dismissHint("asymmetric-key-usage");
    const raw = JSON.parse(localStorage.getItem("ui:hint-prefs") ?? "{}");
    expect(raw.dismissed["asymmetric-key-usage"]).toBe(true);
  });
});
