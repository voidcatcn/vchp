/**
 * `virtual:contact-data` 虚拟模块的类型声明。
 *
 * 该模块由 vite-plugin-contact-data 在构建/测试时按需生成
 * （内容来自 config/contact.toml），不存在实体文件，
 * 此处为 vue-tsc / 编辑器提供类型。
 */
declare module "virtual:contact-data" {
  /** 非加密联系：直接展示 */
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

  /** 加密联系：人机验证后展示/复制 */
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

  export const contactData: ContactData;
}
