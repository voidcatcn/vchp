/**
 * 联系方式类型预设（常见联系渠道的默认 label + icon）。
 *
 * contact.toml 的条目通过 type 引用预设：type 提供默认 label/icon，
 * 条目可再以 label/icon 字段覆盖（自定义可选，预设开箱即用）。
 * icon 值需在 contact.vue 的 ICON_MAP 注册表中存在。
 */
export interface ContactPreset {
  /** 预设类型的默认展示名称 */
  label: string;
  /** 预设类型的默认图标名（lucide 或内联品牌图标） */
  icon: string;
}

/** 常见联系渠道预设（按字母序） */
export const CONTACT_PRESETS: Record<string, ContactPreset> = {
  bilibili: { label: "哔哩哔哩", icon: "tv" },
  blog: { label: "博客", icon: "link" },
  discord: { label: "Discord", icon: "message-circle" },
  email: { label: "Email", icon: "mail" },
  github: { label: "GitHub", icon: "github" },
  instagram: { label: "Instagram", icon: "camera" },
  mastodon: { label: "Mastodon", icon: "at-sign" },
  phone: { label: "电话", icon: "phone" },
  qq: { label: "QQ", icon: "message-circle" },
  reddit: { label: "Reddit", icon: "message-square" },
  rss: { label: "RSS", icon: "rss" },
  telegram: { label: "Telegram", icon: "send" },
  website: { label: "网站", icon: "globe" },
  wechat: { label: "微信", icon: "message-circle" },
  x: { label: "X / Twitter", icon: "at-sign" },
  youtube: { label: "YouTube", icon: "play" },
};
