/**
 * 联系方式配置解析（vite-plugin-contact-data）单元测试。
 * 覆盖：[[public]] 的 value/url 形态与预设解析、[[secrets]] 的 type 预设。
 */
import { describe, expect, it } from "vitest";
import { parseContactToml } from "../../vite-plugin-contact-data";

describe("parseContactToml", () => {
  it("解析完整配置：public 跳转卡 + 复制卡 + secrets 加密项", () => {
    const data = parseContactToml(`
question = "1 + 1 等于几？"

[[public]]
label = "GitHub"
icon = "github"
value = "VoidCat"
url = "https://github.com/owner/repo"

[[public]]
label = "邮箱"
icon = "mail"
value = "me@example.com"

[[secrets]]
name = "wechat"
label = "微信"
icon = "message-circle"
ciphertext = "CT"
nonce = "NN"
`);
    expect(data.question).toBe("1 + 1 等于几？");
    expect(data.public).toHaveLength(2);
    // value 与 url 可同时存在（卡片点击跳转并展示明文）
    expect(data.public[0]).toEqual({
      label: "GitHub",
      icon: "github",
      value: "VoidCat",
      url: "https://github.com/owner/repo",
    });
    expect(data.secrets[0].name).toBe("wechat");
  });

  it("type 预设提供默认 label/icon", () => {
    const data = parseContactToml(`
question = "Q"

[[secrets]]
type = "email"
name = "email"
ciphertext = "CT"
nonce = "NN"

[[public]]
type = "github"
url = "https://github.com/owner"
`);
    expect(data.secrets[0]).toMatchObject({ label: "Email", icon: "mail" });
    expect(data.public[0]).toMatchObject({ label: "GitHub", icon: "github" });
  });

  it("显式 label/icon 覆盖 type 预设", () => {
    const data = parseContactToml(`
question = "Q"

[[secrets]]
type = "email"
name = "email"
label = "邮箱（自定义）"
icon = "at-sign"
ciphertext = "CT"
nonce = "NN"
`);
    expect(data.secrets[0].label).toBe("邮箱（自定义）");
    expect(data.secrets[0].icon).toBe("at-sign");
  });

  it("type 拼写错误报错并列出可用预设", () => {
    expect(() =>
      parseContactToml(`
question = "Q"

[[secrets]]
type = "emial"
name = "email"
ciphertext = "CT"
nonce = "NN"
`),
    ).toThrow(/type 未知/);
  });

  it("public 缺 value 与 url 时抛错", () => {
    expect(() =>
      parseContactToml(`
question = "Q"

[[public]]
label = "孤儿卡"
icon = "link"
`),
    ).toThrow(/value（复制卡片）或 url（跳转卡片）|需要 value/);
  });

  it("无任何联系项抛错", () => {
    expect(() => parseContactToml('question = "Q"')).toThrow(/至少需要一个/);
  });
});
