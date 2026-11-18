import { test as base } from "@playwright/test";

/**
 * 共享 fixture：e2e 与外部网络解耦。
 *
 * 统计（umami/clarity）、头像 CDN 等外部资源在 CI 网络下偶发挂起，
 * page.goto 的 load 事件会等待它们导致 60s 超时。这里拦截所有非本站
 * 请求：<script> 标签仍会出现在 DOM（cookie-consent 断言不受影响），
 * 只是加载立即失败，goto 可以快速完成。
 */
export const test = base.extend({
  page: async ({ context }, use) => {
    await context.route(/^(?!http:\/\/127\.0\.0\.1:4173)/, (route) => {
      // 图片返回 1x1 透明占位：不触发 @error，避免依赖 img 的断言失效
      //（如友链封面）；其余资源返回空响应，脚本标签仍会出现在 DOM。
      if (route.request().resourceType() === "image") {
        return route.fulfill({
          status: 200,
          contentType: "image/png",
          body: Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
            "base64",
          ),
        });
      }
      return route.fulfill({ status: 200, body: "" });
    });
    const page = await context.newPage();
    await use(page);
  },
});

export { expect } from "@playwright/test";
