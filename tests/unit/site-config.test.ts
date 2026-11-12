/**
 * 站点配置解析（vite-plugin-site-config）单元测试。
 */
import { describe, expect, it } from "vitest";
import { parseSiteToml } from "../../vite-plugin-site-config";

describe("parseSiteToml", () => {
  it("解析完整配置", () => {
    const config = parseSiteToml(`
name = "Test"
title = "Test - 首页"
description = "测试描述"
url = "https://test.example"
ogImage = "https://test.example/og.webp"
repoUrl = "https://github.com/owner/repo"
`);
    expect(config).toEqual({
      name: "Test",
      title: "Test - 首页",
      description: "测试描述",
      url: "https://test.example",
      ogImage: "https://test.example/og.webp",
      repoUrl: "https://github.com/owner/repo",
    });
  });

  it("title 缺省回退站点名，可选字段缺省为空串", () => {
    const config = parseSiteToml('name = "Only"\nurl = "https://x.example"');
    expect(config.title).toBe("Only");
    expect(config.description).toBe("");
    expect(config.ogImage).toBe("");
    expect(config.repoUrl).toBe("");
  });

  it("缺少 name 抛错", () => {
    expect(() => parseSiteToml('url = "https://x.example"')).toThrow(/name/);
  });

  it("url 非 http(s) 抛错", () => {
    expect(() => parseSiteToml('name = "X"\nurl = "ftp://x"')).toThrow(/url/);
  });
});
