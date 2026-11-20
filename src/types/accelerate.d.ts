/**
 * `virtual:accelerate-data` 虚拟模块的类型声明。
 * 数据源：config/accelerate.toml（由 vite-plugin-accelerate.ts 提供）。
 */
declare module "virtual:accelerate-data" {
  export interface GithubChannel {
    label: string;
    base: string;
  }
  export interface MirrorShortcut {
    name: string;
    path: string;
  }
  export interface DistroProvider {
    id: string;
    label: string;
    api: string;
    mirrorBase: string;
  }
  export interface AccelerateData {
    github: GithubChannel[];
    sourceforge: { base: string };
    mirrors: { app: string; shortcut: MirrorShortcut[] };
    distros: DistroProvider[];
    mirrorSources: { url: string }[];
  }
  export const accelerateData: AccelerateData;
}
