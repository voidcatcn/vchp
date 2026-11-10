/**
 * 第三方集成配置解析（vite-plugin-integrations）单元测试。
 */
import { describe, expect, it } from "vitest";
import { parseIntegrationsToml } from "../../vite-plugin-integrations";

describe("parseIntegrationsToml", () => {
  it("解析完整配置：umami / clarity / giscus", () => {
    const config = parseIntegrationsToml(`
[umami]
script = "https://umi.meali.top/script.js"
websiteId = "test-id"

[clarity]
script = "https://www.clarity.ms/tag/test"

[giscus]
repo = "owner/repo"
repoId = "R_test"
category = "Announcements"
categoryId = "DIC_test"
mapping = "pathname"
lang = "zh-CN"
`);
    expect(config.umami).toEqual({
      script: "https://umi.meali.top/script.js",
      websiteId: "test-id",
    });
    expect(config.clarity.script).toBe("https://www.clarity.ms/tag/test");
    expect(config.giscus.repo).toBe("owner/repo");
    expect(config.giscus.mapping).toBe("pathname");
  });

  it("缺少 [umami] 抛错", () => {
    expect(() => parseIntegrationsToml("[clarity]\nscript = \"x\"")).toThrow(/umami/);
  });

  it("giscus 缺少必填键抛错", () => {
    expect(() =>
      parseIntegrationsToml(
        "[umami]\nscript = \"s\"\nwebsiteId = \"w\"\n\n[clarity]\nscript = \"c\"\n\n[giscus]\nrepo = \"owner/repo\"",
      ),
    ).toThrow(/repoId/);
  });
});
