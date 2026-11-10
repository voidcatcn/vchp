/**
 * `virtual:site-config` 虚拟模块的类型声明。
 *
 * 该模块由 vite-plugin-site-config 在构建/测试时按需生成
 * （内容来自 config/site.toml），不存在实体文件，
 * 此处为 vue-tsc / 编辑器提供类型。
 */
declare module "virtual:site-config" {
  export interface SiteConfig {
    /** 站点名称：标题后缀、og:site_name、RSS 频道名 */
    name: string;
    /** 首屏静态标题 */
    title: string;
    /** 站点描述 */
    description: string;
    /** 站点根地址 */
    url: string;
    /** OG 兜底图 */
    ogImage: string;
    /** 仓库地址 */
    repoUrl: string;
  }

  export const siteConfig: SiteConfig;
}
