/**
 * Vite 插件：联系方式配置（config/contact.toml，单一数据源）。
 *
 * 两种联系形态：
 * - [[public]]  非加密联系：直接展示（value 复制卡片 / url 跳转卡片，
 *               可同时存在：卡片点击跳转并展示明文）
 * - [[secrets]] 加密联系：人机验证后展示/复制，密文由
 *               scripts/encrypt-contacts.mjs 生成
 *
 * label/icon 支持 type 预设（常见联系渠道的默认值，见
 * src/lib/contact-presets.ts）与显式覆盖（自定义优先）。
 * 客户端经 virtual:contact-data 消费；源码不含密文项的答案与密钥。
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseToml } from "smol-toml";
import { CONTACT_PRESETS } from "./src/lib/contact-presets";
import type { Plugin } from "vite";

/** 联系方式配置文件（单一数据源） */
const CONTACT_FILE = resolve("config/contact.toml");

export interface ContactPublicItem {
  /** 展示名称（type 预设或显式覆盖） */
  label: string;
  /** 图标名（type 预设或显式覆盖） */
  icon: string;
  /** 复制型：直接展示并复制的明文（与 url 可同时存在） */
  value?: string;
  /** 跳转型：外链地址（与 value 可同时存在） */
  url?: string;
}

export interface ContactSecretItem {
  /** 解密键（revealed 状态记录的键） */
  name: string;
  /** 展示名称（type 预设或显式覆盖） */
  label: string;
  /** 图标名（type 预设或显式覆盖） */
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

/**
 * label/icon 解析：显式覆盖优先，否则取 type 预设；两者皆无时抛错。
 * type 拼写错误会在构建期报错并列出可用预设（快速失败）。
 */
function resolveLabelIcon(
  record: Record<string, unknown>,
  index: string,
): { label: string; icon: string } {
  const type = typeof record.type === "string" ? record.type.trim() : "";
  const preset = type !== "" ? CONTACT_PRESETS[type] : undefined;
  if (type !== "" && !preset) {
    throw new Error(
      `contact.toml ${index} 的 type 未知: ${type}（可用: ${Object.keys(CONTACT_PRESETS).join(", ")}）`,
    );
  }
  const label =
    typeof record.label === "string" && record.label.trim() !== ""
      ? record.label.trim()
      : preset?.label;
  const icon =
    typeof record.icon === "string" && record.icon.trim() !== ""
      ? record.icon.trim()
      : preset?.icon;
  if (!label || !icon) {
    throw new Error(
      `contact.toml ${index} 需要 type（预设）或 label + icon（自定义）`,
    );
  }
  return { label, icon };
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
      // label/icon：显式覆盖优先，否则按 type 预设
      const { label, icon } = resolveLabelIcon(raw, `public[${index}]`);
      const hasValue = typeof raw.value === "string" && raw.value.trim() !== "";
      const hasUrl = typeof raw.url === "string" && raw.url.trim() !== "";
      if (!hasValue && !hasUrl) {
        throw new Error(
          `contact.toml public[${index}]（${label}）需要 value（复制卡片）或 url（跳转卡片）`,
        );
      }
      // value 与 url 可同时存在：卡片点击跳转并展示明文
      const item: ContactPublicItem = { label, icon };
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
    for (const [index, raw] of rawSecrets.entries()) {
      const name = raw.name;
      if (typeof name !== "string" || name.trim() === "") {
        throw new Error(`contact.toml secrets[${index}].name 必填且不能为空`);
      }
      // label/icon：显式覆盖优先，否则按 type 预设
      const { label, icon } = resolveLabelIcon(raw, `secrets[${index}]`);
      const ciphertext = raw.ciphertext;
      const nonce = raw.nonce;
      if (typeof ciphertext !== "string" || ciphertext.trim() === "") {
        throw new Error(`contact.toml secrets[${index}].ciphertext 必填`);
      }
      if (typeof nonce !== "string" || nonce.trim() === "") {
        throw new Error(`contact.toml secrets[${index}].nonce 必填`);
      }
      secretItems.push({
        name: name.trim(),
        label,
        icon,
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
