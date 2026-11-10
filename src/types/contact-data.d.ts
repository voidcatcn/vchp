/**
 * `virtual:contact-data` 虚拟模块的类型声明。
 *
 * 该模块由 vite-plugin-contact-data 在构建/测试时按需生成
 * （内容来自 config/contact.toml），不存在实体文件，
 * 此处为 vue-tsc / 编辑器提供类型。
 */
declare module "virtual:contact-data" {
  export interface ContactSecret {
    /** AES-128-GCM 密文（base64） */
    ciphertext: string;
    /** nonce（base64） */
    nonce: string;
  }

  export interface ContactData {
    /** 人机验证题目 */
    question: string;
    /** 各联系项密文：name → 密文 + nonce */
    secrets: Record<string, ContactSecret>;
  }

  export const contactData: ContactData;
}
