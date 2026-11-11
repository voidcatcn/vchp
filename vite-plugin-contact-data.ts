/**
 * Vite 插件：联系方式配置（config/contact.toml，单一数据源）。
 *
 * 两种联系形态：
 * - [[public]]  非加密联系：直接展示（value 复制卡片 / url 跳转卡片），
 *               自定义 label 与 icon
 * - [[secrets]] 加密联系：人机验证后展示/复制，密文由
 *               scripts/encrypt-contacts.mjs 生成
 * 客户端经 virtual:contact-data 消费；源码不含明文密文项的答案与密钥。
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseToml } from "smol-toml";
import type { Plugin } from "vite";

/** 联系方式配置文件（单一数据源） */
const CONTACT_FILE = resolve("config/contact.toml");

export interface ContactPublicItem {
  /** 展示名称 */
  label: string;
  /** lucide 图标名（github 为内联品牌图标） */
  icon: string;
  /** 复制型：直接展示并复制的明文（与 url 二选一） */
  value?: string;
  /** 跳转型：外链地址（与 value 二选一） */
  url?: string;
}

export interface ContactSecretItem {
  /** 解密键（revealed 状态记录的键） */
  name: string;
  /** 展示名称 */
  label: string;
  /** lucide 图标名 */
  icon: string;
  /** AES-128-GCM 密文（base64） */
  ciphertext: string;
  /** nonce（base64） */
  nonce: string;
}

export interface ContactData {
  /** 人机验证题目 */
  question: string;
  /** 非加密联系 */
  public: ContactPublicItem[];
  /** 加密联系 */
  secrets: ContactSecretItem[];
}

/** 解析并校验 contact.toml（构建期快速失败，不静默吞格式问题） */
export function parseContactToml(raw: string): ContactData {
  const doc = parseToml(raw) as Record<string, unknown>;
  const question = doc.question;
  if (typeof question !== "string" || question.trim() === "") {
    throw new Error("contact.toml 的 question 必填且不能为空");
  }

  const publicItems: ContactPublicItem[] = [];
  const rawPublic = doc.public;
  if (rawPublic !== undefined) {
    if (!Array.isArray(rawPublic)) {
      throw new Error("contact.toml 需要 [[public]] 数组表");
    }
    for (const [index, raw] of rawPublic.entries()) {
      const label = raw.label;
      if (typeof label !== "string" || label.trim() === "") {
        throw new Error(`contact.toml public[${index}].label 必填且不能为空`);
      }
      const icon = raw.icon;
      if (typeof icon !== "string" || icon.trim() === "") {
        throw new Error(`contact.toml public[${index}].icon 必填且不能为空`);
      }
      const hasValue = typeof raw.value === "string" && raw.value.trim() !== "";
      const hasUrl = typeof raw.url === "string" && raw.url.trim() !== "";
      // value 与 url 可同时存在：卡片点击跳转并展示明文
      const item: ContactPublicItem = { label: label.trim(), icon: icon.trim() };
      if (hasValue) item.value = (raw.value as string).trim();
      if (hasUrl) item.url = (raw.url as string).trim();
      publicItems.push(item);
    }
  }

  const secretItems: ContactSecretItem[] = [];
  const rawSecrets = doc.secrets;
  if (rawSecrets !== undefined) {
    if (!Array.isArray(rawSecrets)) {
      throw new Error("contact.toml 需要 [[secrets]] 数组表");
    }
    for (const [index, item] of rawSecrets.entries()) {
      const record = item as Record<string, unknown>;
      const name = record.name;
      if (typeof name !== "string" || name.trim() === "") {
        throw new Error(`contact.toml secrets[${index}].name 必填且不能为空`);
      }
      const label = record.label;
      if (typeof label !== "string" || label.trim() === "") {
        throw new Error(`contact.toml secrets[${index}].label 必填且不能为空`);
      }
      const icon = record.icon;
      if (typeof icon !== "string" || icon.trim() === "") {
        throw new Error(`contact.toml secrets[${index}].icon 必填且不能为空`);
      }
      const ciphertext = record.ciphertext;
      const nonce = record.nonce;
      if (typeof ciphertext !== "string" || ciphertext.trim() === "") {
        throw new Error(`contact.toml secrets[${index}].ciphertext 必填`);
      }
      if (typeof nonce !== "string" || nonce.trim() === "") {
        throw new Error(`contact.toml secrets[${index}].nonce 必填`);
      }
      secretItems.push({
        name: name.trim(),
        label: label.trim(),
        icon: icon.trim(),
        ciphertext,
        nonce,
      });
    }
  }

  if (publicItems.length === 0 && secretItems.length === 0) {
    throw new Error("contact.toml 至少需要一个 [[public]] 或 [[secrets]] 联系项");
  }
  return { question, public: publicItems, secrets: secretItems };
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
