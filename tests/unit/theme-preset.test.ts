/**
 * 主题预设（useThemePreset）单元测试。
 *
 * 关注：Apple 系统默认值、显式选择的持久化、<html> class 同步。
 * 注意：composable 是模块级单例，测试间通过 setPreset 重置回 Rice。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ENDFIELD_CLASS,
  LIQUID_GLASS_CLASS,
  THEME_PRESET_KEY,
  VOID_CLASS,
  getInitialThemePreset,
  isAppleSystem,
  useThemePreset,
} from "@/composables/useThemePreset";

const CLASSES = [LIQUID_GLASS_CLASS, ENDFIELD_CLASS, VOID_CLASS] as const;

beforeEach(() => {
  const { setPreset } = useThemePreset();
  setPreset("rice");
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useThemePreset", () => {
  it("非 Apple 系统默认预设为 Rice，且 <html> 不带其它主题 class", () => {
    const { preset } = useThemePreset();
    expect(preset.value).toBe("rice");
    for (const className of CLASSES) {
      expect(document.documentElement.classList.contains(className)).toBe(false);
    }
  });

  it.each([
    ["liquid-glass", LIQUID_GLASS_CLASS],
    ["void", VOID_CLASS],
    ["endfield", ENDFIELD_CLASS],
  ] as const)("setPreset('%s')：持久化并只保留对应 class", (presetId, className) => {
    const { preset, setPreset } = useThemePreset();
    setPreset(presetId);
    expect(preset.value).toBe(presetId);
    expect(localStorage.getItem(THEME_PRESET_KEY)).toBe(presetId);
    expect(document.documentElement.classList.contains(className)).toBe(true);
    for (const otherClass of CLASSES.filter((item) => item !== className)) {
      expect(document.documentElement.classList.contains(otherClass)).toBe(false);
    }
  });

  it("setPreset('rice')：清除全部非基础主题 class", () => {
    const { preset, setPreset } = useThemePreset();
    setPreset("void");
    setPreset("rice");
    expect(preset.value).toBe("rice");
    expect(localStorage.getItem(THEME_PRESET_KEY)).toBe("rice");
    for (const className of CLASSES) {
      expect(document.documentElement.classList.contains(className)).toBe(false);
    }
  });

  it.each(["rice", "liquid-glass", "endfield", "void"] as const)(
    "getInitialThemePreset：localStorage 存 %s 时原样返回",
    (savedPreset) => {
      localStorage.setItem(THEME_PRESET_KEY, savedPreset);
      expect(getInitialThemePreset()).toBe(savedPreset);
    },
  );
});

describe("Apple 系统默认主题", () => {
  it("识别 macOS、iPhone 与 iPadOS 桌面 UA", () => {
    expect(
      isAppleSystem(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) AppleWebKit/605.1.15",
        "MacIntel",
        0,
      ),
    ).toBe(true);
    expect(
      isAppleSystem(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15",
        "iPhone",
        5,
      ),
    ).toBe(true);
    expect(
      isAppleSystem(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15",
        "MacIntel",
        5,
      ),
    ).toBe(true);
  });

  it("不把 Windows / Android 识别为 Apple 系统", () => {
    expect(
      isAppleSystem(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Win32",
        0,
      ),
    ).toBe(false);
    expect(
      isAppleSystem(
        "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36",
        "Linux armv8l",
        5,
      ),
    ).toBe(false);
  });

  it("Apple 系统未保存选择时默认液态玻璃", () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15",
      platform: "iPhone",
      maxTouchPoints: 5,
    });
    expect(getInitialThemePreset()).toBe("liquid-glass");
  });

  it("Apple 系统显式选择 Rice 时不会被默认值覆盖", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) AppleWebKit/605.1.15",
      platform: "MacIntel",
      maxTouchPoints: 0,
    });
    localStorage.setItem(THEME_PRESET_KEY, "rice");
    expect(getInitialThemePreset()).toBe("rice");
  });

  it("非 Apple 系统未保存选择时默认 Rice", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      platform: "Win32",
      maxTouchPoints: 0,
    });
    expect(getInitialThemePreset()).toBe("rice");
  });

  it("非法 localStorage 值回退当前系统的默认预设", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) AppleWebKit/605.1.15",
      platform: "MacIntel",
      maxTouchPoints: 0,
    });
    localStorage.setItem(THEME_PRESET_KEY, "whatever");
    expect(getInitialThemePreset()).toBe("liquid-glass");
  });
});
