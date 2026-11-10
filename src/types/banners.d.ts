/**
 * `virtual:banners` 虚拟模块的类型声明。
 *
 * 该模块由 vite-plugin-banners 在构建/测试时按需生成
 * （内容来自 config/banners.toml），不存在实体文件，
 * 此处为 vue-tsc / 编辑器提供类型。
 */
declare module "virtual:banners" {
  export interface BannerConfig {
    /** 横幅标识（设置页开关 / 关闭记忆的键） */
    id: string;
    /** URL 参数（?egg=<egg> 任意日期手动触发） */
    egg: string;
    /** 命中时添加到 <html> 的 class */
    cssClass: string;
    /** 展示文案 */
    name: string;
    /** 固定日期范围：MM-DD（每年重复）；与 lunar 二选一 */
    start?: string;
    end?: string;
    /** 农历标记（如 "八月十五"）：由天文台 API 动态判断 */
    lunar?: string;
    /** 农历 API 地址（lunar 型） */
    api?: string;
  }

  export const banners: BannerConfig[];
}
