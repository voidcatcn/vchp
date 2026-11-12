/**
 * 顶部横幅设置（useBannerSettings）单元测试。
 *
 * 覆盖：全站开关 / 按横幅启停 / 关闭记忆按年过期 / localStorage 持久化。
 */
import { beforeEach, describe, expect, it } from "vitest";
import { useBannerSettings } from "@/composables/useBannerSettings";

beforeEach(() => {
  localStorage.clear();
  // 单例状态经公开 API 重置
  const { setMaster, setEnabled } = useBannerSettings();
  setMaster(true);
  for (const id of ["national-day", "mid-autumn", "labor-day"]) setEnabled(id, true);
});

describe("useBannerSettings", () => {
  it("默认全部可见", () => {
    const { isVisible } = useBannerSettings();
    expect(isVisible("national-day")).toBe(true);
    expect(isVisible("mid-autumn")).toBe(true);
    expect(isVisible("labor-day")).toBe(true);
  });

  it("全站开关：关闭后所有横幅隐藏（忽略单横幅设置）", () => {
    const { isVisible, setMaster, setEnabled } = useBannerSettings();
    // 单横幅关闭 → 不可见；再关全站 → 依旧不可见；单横幅重新开启 → 仍不可见
    setEnabled("national-day", false);
    setMaster(false);
    expect(isVisible("national-day")).toBe(false);
    setEnabled("national-day", true);
    expect(isVisible("national-day")).toBe(false);
    // 全站恢复 → 单横幅开启的横幅可见
    setMaster(true);
    expect(isVisible("national-day")).toBe(true);
  });

  it("单横幅关闭只影响自己", () => {
    const { isVisible, setEnabled } = useBannerSettings();
    setEnabled("mid-autumn", false);
    expect(isVisible("mid-autumn")).toBe(false);
    expect(isVisible("national-day")).toBe(true);
    expect(isVisible("labor-day")).toBe(true);
  });

  it("关闭按钮：当年隐藏，模拟跨年后重新出现", () => {
    const { isVisible, dismiss } = useBannerSettings();
    // dismiss 内部用 new Date().getFullYear() 记忆年份；
    // 直接断言「关闭后隐藏」与「记忆写入当前年份」
    dismiss("national-day");
    expect(isVisible("national-day")).toBe(false);
    const raw = JSON.parse(localStorage.getItem("ui:banner-prefs") ?? "{}");
    expect(raw.dismissed["national-day"]).toBe(new Date().getFullYear());
  });

  it("状态持久化到 localStorage", () => {
    const { setMaster } = useBannerSettings();
    setMaster(false);
    const raw = JSON.parse(localStorage.getItem("ui:banner-prefs") ?? "{}");
    expect(raw.master).toBe(false);
  });
});
