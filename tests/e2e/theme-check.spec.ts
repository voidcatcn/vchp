import { expect, test } from "./fixtures";
// 预置 cookie 同意状态（统计开启）：避免 Cookie 选择弹窗遮挡交互
// （弹窗自身流程由 tests/e2e/cookie-consent.spec.ts 覆盖）
test.beforeEach(async ({ context }) => {
  await context.addCookies([
    {
      name: "cookie_consent",
      value: encodeURIComponent(
        JSON.stringify({ necessary: true, statistics: { umami: true, clarity: true } }),
      ),
      domain: "127.0.0.1",
      path: "/",
    },
  ]);
});

// 与 playwright.config.ts 的 baseURL 保持一致；之前硬编码 4321 与当前 4173 不符
const BASE = "http://127.0.0.1:4173";

test("浅色模式实查", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("theme", "light"));
  await page.goto(BASE + "/");
  await page.waitForTimeout(800);
  const info = await page.evaluate(() => {
    const html = document.documentElement.className;
    const cs = getComputedStyle(document.documentElement);
    const nav = document.querySelector("nav");
    return {
      htmlClass: html,
      primary: cs.getPropertyValue("--primary").trim(),
      card: cs.getPropertyValue("--card").trim(),
      background: cs.getPropertyValue("--background").trim(),
      navBg: nav ? getComputedStyle(nav).backgroundColor : "no-nav",
    };
  });
  console.log("RESULT:", JSON.stringify(info, null, 2));
  await page.screenshot({ path: "theme-light.png", fullPage: true });
});

test("暗色模式实查", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await page.goto(BASE + "/");
  await page.waitForTimeout(800);
  const info = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return {
      htmlClass: document.documentElement.className,
      primary: cs.getPropertyValue("--primary").trim(),
      card: cs.getPropertyValue("--card").trim(),
    };
  });
  console.log("RESULT:", JSON.stringify(info, null, 2));
  await page.screenshot({ path: "theme-dark.png", fullPage: true });
});

test("Endfield 主题切换：html 带 class，变量为终末地色板", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("theme", "light");
    localStorage.setItem("theme-preset", "endfield");
  });
  await page.goto(BASE + "/about");
  await page.waitForTimeout(800);
  const info = await page.evaluate(() => {
    const html = document.documentElement;
    const cs = getComputedStyle(html);
    return {
      htmlClass: html.className,
      background: cs.getPropertyValue("--background").trim(),
      radius: cs.getPropertyValue("--radius").trim(),
    };
  });
  console.log("ENDFIELD RESULT:", JSON.stringify(info, null, 2));
  expect(info.htmlClass).toContain("theme-endfield");
  expect(info.background).toBe("#f4f4f2");
  expect(info.radius).toBe("0");
  await page.screenshot({ path: "theme-endfield.png", fullPage: true });
});

test("Apple 设备首次访问默认液态玻璃", async ({ page }, testInfo) => {
  await page.addInitScript((simulateApple) => {
    localStorage.removeItem("theme-preset");
    if (!simulateApple) return;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () =>
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15",
    });
    Object.defineProperty(navigator, "platform", {
      configurable: true,
      get: () => "iPhone",
    });
    Object.defineProperty(navigator, "maxTouchPoints", {
      configurable: true,
      get: () => 5,
    });
  }, testInfo.project.name === "desktop-chromium");

  await page.goto(BASE + "/about");
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => {
    const html = document.documentElement;
    const cs = getComputedStyle(html);
    const glass = document.querySelector<HTMLElement>("nav");
    return {
      htmlClass: html.className,
      background: cs.getPropertyValue("--background").trim(),
      primary: cs.getPropertyValue("--primary").trim(),
      bodyImage: getComputedStyle(document.body).backgroundImage,
      glassBackdropFilter: glass ? getComputedStyle(glass).backdropFilter : "",
      glassBoxShadow: glass ? getComputedStyle(glass).boxShadow : "",
    };
  });

  expect(info.htmlClass).toContain("theme-liquid-glass");
  expect(info.background).toBe("oklch(98% .005 95)");
  expect(info.primary).toBe("#0071e3");
  expect(info.bodyImage).toBe("none");
  expect(info.glassBackdropFilter).not.toBe("none");
  expect(info.glassBoxShadow).not.toBe("none");
  await page.screenshot({
    path: "test-results/theme-liquid-glass.png",
    fullPage: true,
  });
});

test("Void 主题：虚空紫与多个微型耀斑生效", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("theme", "light");
    localStorage.setItem("theme-preset", "void");
  });
  await page.goto(BASE + "/about");
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => {
    const html = document.documentElement;
    const cs = getComputedStyle(html);
    const bodyImage = getComputedStyle(document.body).backgroundImage;
    return {
      htmlClass: html.className,
      background: cs.getPropertyValue("--background").trim(),
      primary: cs.getPropertyValue("--primary").trim(),
      radius: cs.getPropertyValue("--radius").trim(),
      bodyImage,
      dotLayers: (bodyImage.match(/radial-gradient/g) ?? []).length,
      appBeforeContent: getComputedStyle(document.querySelector("#app")!, "::before")
        .content,
    };
  });

  expect(info.htmlClass).toContain("theme-void");
  expect(info.background).toBe("#f6f1ff");
  expect(info.primary).toBe("#7c3aed");
  expect(Number.parseFloat(info.radius)).toBe(0.875);
  expect(info.bodyImage).not.toBe("none");
  expect(info.dotLayers).toBeGreaterThanOrEqual(8);
  expect(info.bodyImage).not.toContain("conic-gradient");
  expect(info.appBeforeContent).toBe("none");
  await page.screenshot({
    path: "test-results/theme-void.png",
    fullPage: true,
  });
});

test("新增主题的暗色模式：Liquid Glass 与 Void 色板正交生效", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("theme", "dark");
  });
  await page.goto(BASE + "/about");
  await page.waitForTimeout(500);

  await page.evaluate(() => localStorage.setItem("theme-preset", "liquid-glass"));
  await page.reload();
  await page.waitForTimeout(500);

  const liquidGlass = await page.evaluate(() => {
    const html = document.documentElement;
    const cs = getComputedStyle(html);
    return {
      htmlClass: html.className,
      background: cs.getPropertyValue("--background").trim(),
      primary: cs.getPropertyValue("--primary").trim(),
    };
  });
  expect(liquidGlass.htmlClass).toContain("dark");
  expect(liquidGlass.htmlClass).toContain("theme-liquid-glass");
  expect(liquidGlass.background).toBe("oklch(14.5% 0 0)");
  expect(liquidGlass.primary).toBe("#6db7ff");
  await page.screenshot({
    path: "test-results/theme-liquid-glass-dark.png",
    fullPage: true,
  });

  await page.evaluate(() => localStorage.setItem("theme-preset", "void"));
  await page.reload();
  await page.waitForTimeout(500);
  const voidTheme = await page.evaluate(() => {
    const html = document.documentElement;
    const cs = getComputedStyle(html);
    return {
      htmlClass: html.className,
      background: cs.getPropertyValue("--background").trim(),
      primary: cs.getPropertyValue("--primary").trim(),
    };
  });
  expect(voidTheme.htmlClass).toContain("dark");
  expect(voidTheme.htmlClass).toContain("theme-void");
  expect(voidTheme.background).toBe("#090411");
  expect(voidTheme.primary).toBe("#a78bfa");
  await page.screenshot({
    path: "test-results/theme-void-dark.png",
    fullPage: true,
  });
});
