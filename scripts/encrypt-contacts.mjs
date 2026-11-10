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

// 待加密的联系方式明文（生成后删除此处的明文）
const SECRETS = {
  email: "ZWj1154142014@hotmail.com",
  wechat: "AliZhouSZ",
};

// 答案字符串 → 16 字节 AES-128 密钥（右侧补 0）
const answerBytes = Buffer.from(answer, "utf8");
const key = new Uint8Array(16);
key.set(answerBytes.subarray(0, 16));

// 每个联系项独立 nonce 加密
const secrets = {};
for (const [name, plaintext] of Object.entries(SECRETS)) {
  const nonce = randomBytes(12);
  const cipher = gcm(key, nonce);
  const ciphertext = await cipher.encrypt(Buffer.from(plaintext, "utf8"));
  secrets[name] = {
    ciphertext: Buffer.from(ciphertext).toString("base64"),
    nonce: Buffer.from(nonce).toString("base64"),
  };
}

const output = {
  // 人机验证题目
  question: "1 + 1 等于几？",
  // 各联系项密文（base64）
  secrets,
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
  "# 修改 question 或重新生成密文后重新构建即可生效。\n" +
  "# ============================================================\n\n" +
  "# 人机验证题目（展示给访客）\n" +
  "question = " + tomlStr(output.question) + "\n\n" +
  Object.entries(secrets)
    .map(
      ([name, secret]) =>
        "[[secrets]]\n" +
        'name = "' + name + '"\n' +
        "ciphertext = " + tomlStr(secret.ciphertext) + "\n" +
        "nonce = " + tomlStr(secret.nonce) + "\n"
    )
    .join("\n");

writeFileSync("config/contact.toml", toml, "utf-8");
console.log("✓ 已生成 config/contact.toml");
