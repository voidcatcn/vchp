/// <reference types="vitest" />
import { execSync } from "node:child_process";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import VueRouter from "vue-router/vite";
import htmlMinifier from "vite-plugin-html-minifier-terser";
import { compression } from "vite-plugin-compression2";
import { generateSitemap } from "./vite-plugin-sitemap.ts";
import { prerenderPosts } from "./vite-plugin-prerender-posts.ts";
import { linksData } from "./vite-plugin-links.ts";
import { rankingsData } from "./vite-plugin-rankings.ts";
import { siteConfig } from "./vite-plugin-site-config.ts";
import { contactData } from "./vite-plugin-contact-data.ts";
import { banners } from "./vite-plugin-banners.ts";
import { integrations } from "./vite-plugin-integrations.ts";
import { generateRssFeed } from "./vite-plugin-rss.ts";
import { defineConfig, type Plugin } from "vitest/config";

/**
 * 读取当前构建对应的 git 提交 ID（短哈希）。
 * 构建环境（本地 / CI）理应存在 git，读取失败时回退为 "unknown"，
 * 保证构建不因 git 缺失而中断。
 */
function getGitCommitId(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}
/**
 * 把 entry 入口的同步 CSS 内联到 HTML <style>，从关键路径移除额外网络请求。
 * 适用范围：HTML 中以 <link rel="stylesheet" href="/assets/xxx.css"> 形式引用的
 * 同步 CSS（即 entry CSS）。异步 chunk 的 CSS 由其 JS 动态加载，仍走外链。
 */
function inlineEntryCss(): Plugin {
  return {
    name: "inline-entry-css",
    enforce: "post",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        const linkRe =
          /<link\s+[^>]*rel=["']stylesheet["'][^>]*?>/g;
        return html.replace(linkRe, (tag) => {
          const hrefMatch = tag.match(/href=["']([^"']+)["']/);
          if (!hrefMatch) return tag;
          // HTML 里是 /assets/xxx.css，bundle key 是 assets/xxx.css
          const href = hrefMatch[1].replace(/^\//, "");
          for (const [name, asset] of Object.entries(ctx.bundle)) {
            if (
              asset.type === "asset" &&
              name === href &&
              name.endsWith(".css")
            ) {
              const css = String(asset.source);
              // 已内联 → 从 bundle 移除，避免重复资源
              delete ctx.bundle[name];
              return `<style>${css}</style>`;
            }
          }
          return tag;
        });
      },
    },
  };
}

export default defineConfig({
  plugins: [
    linksData(),
    rankingsData(),
    siteConfig(),
    contactData(),
    banners(),
    integrations(),
    VueRouter({
      routesFolder: "src/pages",
      dts: "src/route-map.d.ts",
    }),
    vue(),
    tailwindcss(),
    // 内联 entry CSS 到 HTML（必须早于 htmlMinifier，避免被它二次压缩耗 CPU）
    inlineEntryCss(),
    htmlMinifier({
      collapseWhitespace: true,
      removeComments: true,
      removeRedundantAttributes: true,
      removeEmptyAttributes: true,
      removeAttributeQuotes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      useShortDoctype: true,
      minifyCSS: true,
      minifyJS: true,
      collapseBooleanAttributes: true,
      sortAttributes: true,
      sortClassName: true,
      ignoreCustomFragments: [/<%[\s\S]*?%>/, /\{\{[\s\S]*?\}\}/],
    }),
    compression({
      algorithms: ["gzip", "brotliCompress"],
      // include 补充 wasm：@jsquash 编解码器为按需加载的大体积 wasm，
      // brotli/gzip 预压缩副本对传输体积收益显著（issue #249）
      include: [/\.(js|mjs|css|html|svg|wasm|json|txt|xml)$/i],
      threshold: 1024,
      exclude: [/\.(br|gz|webp|woff2?)$/i],
      deleteOriginalAssets: false,
    }),
    generateSitemap(),
    prerenderPosts(),
    generateRssFeed(),
  ],

  define: {
    // 构建时注入 git 提交 ID，about 页展示当前版本来源
    __GIT_COMMIT_ID__: JSON.stringify(getGitCommitId()),
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // pandoc-wasm 的 exports 只暴露包根，转换工具需要绕过浏览器入口（它会打包 58MB wasm），
      // 直接导入环境无关的 core.js，由运行时从 CDN 拉取 wasm 二进制
      "pandoc-wasm/core": fileURLToPath(
        new URL("./node_modules/pandoc-wasm/src/core.js", import.meta.url),
      ),
    },
  },

  optimizeDeps: {
    include: [
      "vue",
      "reka-ui",
      "clsx",
      "tailwind-merge",
      "class-variance-authority",
      "@noble/ciphers/webcrypto.js",
      "@noble/ciphers/aes.js",
      "@ffmpeg/ffmpeg",
      "@ffmpeg/util",
    ],
  },


  build: {
    target: "esnext",
    minify: "esbuild",
    cssCodeSplit: true,
    // 压缩阶段丢弃 console/debugger（与原 terser drop_console 等价）
    esbuild: {
      drop: ["console", "debugger"],
    },
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
    cssMinify: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name].[hash].js",
        chunkFileNames: "assets/[name].[hash].js",
        assetFileNames: "assets/[name].[hash].[ext]",
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // 顺序敏感：从最具体到最通用，避免子串误匹配
            if (id.includes("reka-ui")) return "reka";
            if (id.includes("@vueuse/core")) return "vueuse";
            if (id.includes("shiki") || id.includes("@shikijs")) {
              // shiki 细粒度打包：核心/引擎合并为一个 chunk；
              // 各语言/主题由动态 import 自然拆分为独立 chunk
              if (id.includes("/langs/") || id.includes("/themes/")) return undefined;
              return "shiki";
            }
            if (id.includes("markdown-it")) return "md";
          // @peculiar（x509 asn1 库）只被证书工具使用：拆出懒加载 chunk，
          // vendor 体积显著下降，仅访问证书页时才下载（issue：速度优化）
          if (
            id.includes("@peculiar") ||
            id.includes("tsyringe") ||
            id.includes("reflect-metadata")
          )
            return "cert-libs";
            if (id.includes("@noble/ciphers")) return "crypto";
            if (id.includes("unhead")) return "unhead";
            if (id.includes("@lucide")) return "lucide";
            if (id.includes("yaml")) return "md";
            // 匹配 vue / @vue/* 路径（但不匹配 vueuse、reka-ui）
            if (/[\\/]node_modules[\\/](@vue[\\/]|vue[\\/]|vue$|vue@)/.test(id)) return "vue";
            return "vendor";
          }
        },
      },
    },
  },

  // Vitest 配置：单源与构建共用。
  // include 覆盖全部 tests/，由 CLI 路径参数（test:unit / test:component /
  // test:build）决定实际跑哪些子目录；不带参数时 `pnpm test` 跑全部。
  test: {
    // Argon2 / ML-KEM 等加密运算在低配机器上可能超过默认 5s，放宽到 30s
    testTimeout: 30_000,
    environment: "happy-dom",
    globals: true,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    css: false,
    clearMocks: true,
  },
});
