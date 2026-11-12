/**
 * 联系方式密文生成脚本（离线一次性工具）
 *
 * 用途：用"人机验证答案"作为 AES 密钥，加密多个联系方式（邮箱、微信等），
 *       生成 config/contact.toml（前端构建期解析）。
 * 用法：node scripts/encrypt-contacts.mjs [答案]
 *   例：node scripts/encrypt-contacts.mjs 2
 *
 * 密钥规则：答案字符串按 UTF-8 编码后右侧补 0 到 16 字节（AES-128）。
 * 安全性依赖"答案本身是秘密"，padding 规则公开不影响安全。
 *
 * 待加密的明文在下方 SECRETS 中配置，生成后请删除明文。
 */
import { gcm } from "@noble/ciphers/webcrypto.js";
import { randomBytes } from "@noble/ciphers/utils.js";
import { writeFileSync } from "node:fs";

const answer = process.argv[2] ?? "2";

// 联系项清单：
// - type 为预设（默认 label/icon 由 contact.vue 的 ICON_MAP 提供）
// - secret 为明文 → 加密写入 [[secrets]]（构建期解析）
// - value/url 为明文 → 直接写入 [[public]]（公开联系）
// 脚本里的明文仅用于生成密文，TOML 中不含 secret 项的明文。
const ITEMS = [
  { type: "email", name: "email", secret: "ZWj1154142014@hotmail.com" },
  { type: "wechat", name: "wechat", secret: "AliZhouSZ" },
  { type: "github", value: "VoidCat", url: "https://github.com/voidcatcn" },
];

// 答案字符串 → 16 字节 AES-128 密钥（右侧补 0）
const answerBytes = Buffer.from(answer, "utf8");
const key = new Uint8Array(16);
key.set(answerBytes.subarray(0, 16));

// 加密联系项：独立 nonce 加密（label/icon 随后一并写入 TOML）
const encrypted = {};
for (const item of ITEMS) {
  if (!item.secret) continue;
  const nonce = randomBytes(12);
  const cipher = gcm(key, nonce);
  const ciphertext = await cipher.encrypt(Buffer.from(item.secret, "utf8"));
  encrypted[item.name] = {
    type: item.type,
    name: item.name,
    ciphertext: Buffer.from(ciphertext).toString("base64"),
    nonce: Buffer.from(nonce).toString("base64"),
  };
}

const output = {
  // 人机验证题目
  question: "1 + 1 等于几？",
  // 加密联系项（base64 密文 + label/icon）
  secrets: encrypted,
  // 期望答案（仅供此处记录，前端不应包含明文答案）
  _answer: answer,
};

// 生成 config/contact.toml（TOML 字符串转义：双引号与反斜杠）
const tomlStr = (v) => '"' + String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
const toml =
  "# ============================================================\n" +
  "# 联系方式配置（密文由 scripts/encrypt-contacts.mjs 生成）\n" +
  "# ------------------------------------------------------------\n" +
  "# 用法：node scripts/encrypt-contacts.mjs <人机验证答案>\n" +
  "#\n" +
  "# [[public]]  非加密联系：type（预设）+ value（复制）/ url（跳转）\n" +
  "# [[secrets]] 加密联系：name + type（预设）+ ciphertext + nonce\n" +
  "# label/icon 预设解析见 vite-plugin-contact-data（contact-presets）\n" +
  "# ============================================================\n\n" +
  "# 人机验证题目（展示给访客，用于解密加密联系）\n" +
  "question = " + tomlStr(output.question) + "\n\n" +
  ITEMS.filter((item) => item.value || item.url)
    .map((item) => {
      const lines = [
        "[[public]]",
        "type = " + tomlStr(item.type),
      ];
      if (item.value) lines.push("value = " + tomlStr(item.value));
      if (item.url) lines.push("url = " + tomlStr(item.url));
      return lines.join("\n") + "\n";
    })
    .join("\n") +
  "\n" +
  ITEMS.filter((item) => item.secret)
    .map((item) => {
      const e = encrypted[item.name];
      return [
        "[[secrets]]",
        "type = " + tomlStr(item.type),
        "name = " + tomlStr(item.name),
        "ciphertext = " + tomlStr(e.ciphertext),
        "nonce = " + tomlStr(e.nonce),
      ].join("\n") + "\n";
    })
    .join("\n");

writeFileSync("config/contact.toml", toml, "utf-8");
console.log("✓ 已生成 config/contact.toml");
