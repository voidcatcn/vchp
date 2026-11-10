/**
 * `virtual:integrations` 虚拟模块的类型声明。
 *
 * 该模块由 vite-plugin-integrations 在构建/测试时按需生成
 * （内容来自 config/integrations.toml），不存在实体文件，
 * 此处为 vue-tsc / 编辑器提供类型。
 */
declare module "virtual:integrations" {
  export interface IntegrationsConfig {
    umami: { script: string; websiteId: string };
    clarity: { script: string };
    giscus: {
      repo: `${string}/${string}`;
      repoId: string;
      category: string;
      categoryId: string;
      mapping: 'pathname' | 'url' | 'title' | 'og:title' | 'specific' | 'number';
      lang: string;
    };
  }

  export const integrations: IntegrationsConfig;
}
