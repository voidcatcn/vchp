/**
 * 路由 chunk 预取（导航悬停 / 空闲预热）。
 *
 * 页面组件按路由懒加载（构建期为每个页面独立 chunk，约 5-18KB）：
 * - 导航悬停 / 聚焦时预取目标 chunk → 页面切换零加载等待
 * - 空闲时（requestIdleCallback，4s 超时兜底）预热全部路由 chunk，
 *   首屏渲染不受影响，后续导航全部即时
 */
import type { RouteRecordRaw } from "vue-router";
import { routes } from "vue-router/auto-routes";

const warmed = new Set<string>();

/** 从路由记录取懒加载器（eager 页面为组件对象，无 loader，跳过） */
function routeLoader(record: RouteRecordRaw): (() => Promise<unknown>) | null {
  const loader = record.components?.default;
  return typeof loader === "function" ? (loader as () => Promise<unknown>) : null;
}

function loadByPath(path: string): void {
  if (warmed.has(path)) return;
  warmed.add(path);
  const stack: RouteRecordRaw[] = [...routes];
  while (stack.length) {
    const record = stack.pop()!;
    if (record.path === path) {
      const loader = routeLoader(record);
      if (loader) void loader();
      return;
    }
    if (record.children) stack.push(...record.children);
  }
}

export function useRoutePrefetch() {
  return {
    /** 导航悬停 / 聚焦时预取目标路由 chunk（幂等） */
    prefetchRoute: loadByPath,
  };
}

/** 空闲时预热全部路由 chunk（首屏渲染完成后后台静默进行） */
export function warmAllRouteChunks(): void {
  const warm = () => {
    const walk = (records: RouteRecordRaw[]) => {
      for (const record of records) {
        const loader = routeLoader(record);
        if (loader) void loader();
        if (record.children) walk(record.children);
      }
    };
    walk(routes);
  };
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(warm, { timeout: 4000 });
  } else {
    setTimeout(warm, 2000);
  }
}
