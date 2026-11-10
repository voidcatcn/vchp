/**
 * Vite 插件：联系方式密文配置（config/contact.toml，单一数据源）。
 *
 * 密文由 scripts/encrypt-contacts.mjs 生成后写入该 TOML；
 * 客户端经 virtual:contact-data 消费（问题 + 各联系项密文），
 * 源码不含明文与密钥。
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseToml } from "smol-toml";
import type { Plugin } from "vite";

/** 联系方式配置文件（单一数据源） */
const CONTACT_FILE = resolve("config/contact.toml");

export interface ContactSecret {
  ciphertext: string;
  nonce: string;
}

export interface ContactData {
  /** 人机验证题目 */
  question: string;
  /** 各联系项密文：name → 密文 + nonce */
  secrets: Record<string, ContactSecret>;
}

/** 解析并校验 contact.toml（构建期快速失败，不静默吞格式问题） */
export function parseContactToml(raw: string): ContactData {
  const doc = parseToml(raw) as Record<string, unknown>;
  const question = doc.question;
  if (typeof question !== "string" || question.trim() === "") {
    throw new Error("contact.toml 的 question 必填且不能为空");
  }
  const rawSecrets = doc.secrets;
  if (!Array.isArray(rawSecrets) || rawSecrets.length === 0) {
    throw new Error("contact.toml 需要 [[secrets]] 数组表（至少一项）");
  }
  const secrets: Record<string, ContactSecret> = {};
  for (const [index, item] of rawSecrets.entries()) {
    const record = item as Record<string, unknown>;
    const name = record.name;
    if (typeof name !== "string" || name.trim() === "") {
      throw new Error(`contact.toml secrets[${index}].name 必填且不能为空`);
    }
    const { ciphertext, nonce } = record;
    if (typeof ciphertext !== "string" || ciphertext.trim() === "") {
      throw new Error(`contact.toml secrets[${index}].ciphertext 必填`);
    }
    if (typeof nonce !== "string" || nonce.trim() === "") {
      throw new Error(`contact.toml secrets[${index}].nonce 必填`);
    }
    secrets[name] = { ciphertext, nonce };
  }
  return { question, secrets };
}

/** 读取并解析联系方式配置（构建/dev/测试按需调用） */
export function loadContactData(): ContactData {
  return parseContactToml(readFileSync(CONTACT_FILE, "utf-8"));
}

export function contactData(): Plugin {
  return {
    name: "contact-data",
    enforce: "pre",

    resolveId(id) {
      if (id === "virtual:contact-data") return "\0virtual:contact-data";
    },

    load(id) {
      if (id !== "\0virtual:contact-data") return;
      return `export const contactData = ${JSON.stringify(loadContactData())};`;
    },
  };
}
