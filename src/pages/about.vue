<script setup lang="ts">
import type { Component } from "vue";
import { computed, h, onMounted, ref } from "vue";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bell, Cookie } from "@lucide/vue";
import { useCookieConsent } from "@/composables/useCookieConsent";
import {
  useBannerSettings,
  BANNER_METAS,
} from "@/composables/useBannerSettings";
import { useHintSettings } from "@/composables/useHintSettings";
import { useThemePreset, type ThemePreset } from "@/composables/useThemePreset";
import { useSeo } from "@/composables/useSeo";

useSeo({
  title: "设置",
  description: "VoidCat 的站点设置：主题外观、提示横幅与 Cookie 偏好，全部本地保存。",
  path: "/about",
});

// lucide 已移除品牌图标，GitHub 用内联 SVG 保留品牌识别度（与 contact.vue 一致）
const GithubIcon: Component = {
  name: "GithubIcon",
  render() {
    return h(
      "svg",
      {
        viewBox: "0 0 24 24",
        fill: "currentColor",
        class: "size-4",
        "aria-hidden": "true",
      },
      [
        h("path", {
          d: "M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.11-.76.41-1.27.74-1.56-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.69.42.36.79 1.07.79 2.16 0 1.56-.01 2.82-.01 3.2 0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z",
        }),
      ],
    );
  },
};

// Cookie 配置入口：主动打开全局 Cookie 选择弹窗（单例共享状态）
const { openDialog } = useCookieConsent();

// 主题预设切换：Rice（默认）/ Endfield（终末地风格），与明暗模式正交
const { preset: themePreset, setPreset: setThemePreset } = useThemePreset();

// 提示与横幅：全站开关 + 按横幅单独启停（issue #253）
const { prefs: bannerPrefs, setMaster, setEnabled } = useBannerSettings();
// 工具说明提示：全量开关 + 恢复已关闭的单条提示（issue #253）
const { prefs: hintPrefs, setEnabled: setHintsEnabled, restoreDismissed: restoreHints } =
  useHintSettings();
const hasDismissedHints = computed(() => Object.keys(hintPrefs.value.dismissed).length > 0);

/** 主题预设选项：名称 + 一句话描述 + 色板预览（固定色值，不随当前主题变化） */
const themeOptions: { id: ThemePreset; name: string; desc: string; swatches: string[] }[] = [
  {
    id: "rice",
    name: "Rice",
    desc: "默认主题 · 米白纸张",
    swatches: ["#fbfbfa", "#e8e7e2", "#1f1f1f"],
  },
  {
    id: "endfield",
    name: "Endfield",
    desc: "终末地 · 工业纸墨",
    swatches: ["#f4f4f2", "#fffa00", "#161616"],
  },
];

// Cloudflare 官网
const cloudflareUrl = "https://www.cloudflare.com";

// 页面加载用时（ms）：null 表示尚未采集到或浏览器不支持
const loadDuration = ref<number | null>(null);
// 浏览器实际协商的 HTTP 协议版本（已映射为用户可读的 HTTP/2、HTTP/3 形式）
const httpProtocol = ref("");
// 首字节延迟 TTFB（ms）：从发起请求到收到第一个响应字节的耗时
const ttfb = ref<number | null>(null);

/**
 * 把 PerformanceResourceTiming.nextHopProtocol 的原始值（如 "h2" / "h3" /
 * "http/2+quic/43"）映射为对用户友好的 HTTP/2、HTTP/3 字符串。
 * 识别不到时返回原始字符串的大写形式，避免展示乱码。
 */
function formatProtocol(raw: string): string {
  if (!raw) return "";
  if (raw === "h3" || raw.startsWith("h3-")) return "HTTP/3";
  if (raw === "h2" || raw === "http/2") return "HTTP/2";
  if (raw === "http/1.1") return "HTTP/1.1";
  return raw.toUpperCase();
}

onMounted(() => {
  // 老浏览器兜底：performance.getEntriesByType 可能不存在
  if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") {
    return;
  }

  // 入口文档的 navigation 条目 = 当前页主文档的协商结果，语义最准
  const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  const nav = navEntries[0];
  if (nav) {
    // loadEventEnd 为 0 表示页面还在加载中，此时不展示用时；
    // startTime 在标准里就是 0（相对 time origin），不再额外要求
    if (nav.loadEventEnd > 0) {
      loadDuration.value = Math.round(nav.loadEventEnd - nav.startTime);
    }
    // TTFB：responseStart - requestStart；responseStart 为 0 表示还没收到首字节
    if (nav.responseStart > 0 && nav.requestStart > 0) {
      ttfb.value = Math.round(nav.responseStart - nav.requestStart);
    }
    // nextHopProtocol 字段在导航条目中同样存在，TS 上是 PerformanceResourceTiming 才有
    const proto = (nav as unknown as PerformanceResourceTiming).nextHopProtocol;
    if (proto) {
      httpProtocol.value = formatProtocol(proto);
    }
  }
});

// 本项目 GitHub 仓库地址
const repoUrl = "https://github.com/wumingshiali/wumingshiali.github.io";

// 构建时由 vite.config.ts 注入的 git 提交 ID（短哈希）；git 不可用时为 "unknown"
const buildCommitId = __GIT_COMMIT_ID__;

// 直接赋值，不需要 import
const cfLogo = "https://esaimg.cdn1.vip/i/6ac7a1ece60b8_1791468012.webp";
</script>

<template>
  <main class="mt-6 flex w-full flex-col items-center gap-6">
    <h1 class="text-4xl font-medium tracking-tight sm:text-5xl">设置</h1>

    <!-- 外观：主题预设 Rice（默认）/ Endfield（终末地风格）切换 -->
    <section aria-labelledby="appearance-heading" class="w-full max-w-2xl">
      <h2
        id="appearance-heading"
        class="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground"
      >
        外观
      </h2>
      <div
        class="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 dark:bg-input/30"
      >
        <div
          role="radiogroup"
          aria-label="选择主题"
          class="flex flex-wrap justify-center gap-3"
        >
          <button
            v-for="opt in themeOptions"
            :key="opt.id"
            type="button"
            role="radio"
            :aria-checked="themePreset === opt.id"
            :aria-label="`切换到 ${opt.name} 主题`"
            class="group flex w-44 flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors"
            :class="
              themePreset === opt.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-card-foreground hover:bg-muted'
            "
            @click="setThemePreset(opt.id)"
          >
            <!-- 主题色板预览：固定色值，不受当前主题影响 -->
            <span class="flex h-2.5 w-full overflow-hidden rounded-sm border border-border/60" aria-hidden="true">
              <span
                v-for="(c, i) in opt.swatches"
                :key="i"
                class="h-full flex-1"
                :style="{ backgroundColor: c }"
              />
            </span>
            <span class="flex items-center gap-1.5 text-sm font-semibold">
              {{ opt.name }}
              <span
                v-if="themePreset === opt.id"
                class="size-1.5 rounded-full bg-current"
                aria-hidden="true"
              />
            </span>
            <span
              class="text-xs"
              :class="themePreset === opt.id ? 'text-primary-foreground/80' : 'text-muted-foreground'"
            >
              {{ opt.desc }}
            </span>
          </button>
        </div>
      </div>
    </section>

    <!-- 提示与横幅：全站开关 + 节日彩蛋横幅单独启停 -->
    <section aria-labelledby="banner-heading" class="w-full max-w-2xl">
      <h2
        id="banner-heading"
        class="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground"
      >
        提示与横幅
      </h2>
      <div
        class="flex flex-col gap-1 rounded-2xl border border-border bg-card p-4 dark:bg-input/30"
      >
        <label class="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/60">
          <span class="flex flex-col gap-0.5">
            <span class="flex items-center gap-1.5 text-sm font-medium">
              <Bell class="size-4" aria-hidden="true" />
              显示全站提示
            </span>
            <span class="text-xs text-muted-foreground">
              关闭后顶部横幅（节日彩蛋等）全部隐藏
            </span>
          </span>
          <Switch
            :checked="bannerPrefs.master"
            aria-label="显示全站提示"
            @update:checked="setMaster"
          />
        </label>

        <!-- 工具说明提示：全量开关 + 恢复已关闭的单条提示（issue #253） -->
        <label class="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/60">
          <span class="flex flex-col gap-0.5">
            <span class="text-sm font-medium">工具说明提示</span>
            <span class="text-xs text-muted-foreground">
              各工具页的说明与用法提示（如密钥用途说明），也可在提示右上角单独关闭
            </span>
          </span>
          <Switch
            :checked="hintPrefs.enabled"
            aria-label="工具说明提示"
            @update:checked="setHintsEnabled"
          />
        </label>

        <div
          v-if="hasDismissedHints"
          class="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5"
        >
          <span class="text-xs text-muted-foreground">
            已关闭 {{ Object.keys(hintPrefs.dismissed).length }} 条提示
          </span>
          <Button
            variant="outline"
            class="h-7 border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
            @click="restoreHints"
          >
            恢复已关闭的提示
          </Button>
        </div>

        <div class="my-1 h-px bg-border" aria-hidden="true" />

        <label
          v-for="meta in BANNER_METAS"
          :key="meta.id"
          class="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/60"
        >
          <span class="flex flex-col gap-0.5">
            <span class="text-sm font-medium">{{ meta.name }}</span>
            <span class="text-xs text-muted-foreground">{{ meta.description }}</span>
          </span>
          <Switch
            :checked="!bannerPrefs.disabled[meta.id]"
            :disabled="!bannerPrefs.master"
            :aria-label="`${meta.name}横幅开关`"
            @update:checked="(v) => setEnabled(meta.id, v)"
          />
        </label>
      </div>
    </section>

    <!-- 隐私：Cookie 配置入口 -->
    <section aria-labelledby="privacy-heading" class="w-full max-w-2xl">
      <h2
        id="privacy-heading"
        class="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground"
      >
        隐私
      </h2>
      <div
        class="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 dark:bg-input/30"
      >
        <span class="flex flex-col gap-0.5">
          <span class="text-sm font-medium">Cookie 偏好</span>
          <span class="text-xs text-muted-foreground">
            统计类 Cookie 仅在您同意后启用
          </span>
        </span>
        <Button
          variant="outline"
          class="border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
          @click="openDialog"
        >
          <Cookie class="size-4" />
          Cookie 设置
        </Button>
      </div>
    </section>

    <!-- 关于本站：项目信息收纳在设置页底部 -->
    <section aria-labelledby="about-heading" class="w-full max-w-2xl">
      <h2
        id="about-heading"
        class="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground"
      >
        关于本站
      </h2>
      <div
        class="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-4 dark:bg-input/30"
      >
        <!-- 项目仓库：浅色描边款，与联系页按钮风格一致 -->
        <Button
          as="a"
          :href="repoUrl"
          target="_blank"
          rel="noopener noreferrer"
          size="lg"
          class="w-full border-border bg-card text-card-foreground hover:bg-card/80 dark:bg-card dark:text-card-foreground dark:hover:bg-card/80"
        >
          <GithubIcon class="size-4" />
          GitHub 仓库
        </Button>

        <!-- 性能与安全由 Cloudflare 提供 -->
        <a
          :href="cloudflareUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <span>性能与安全由</span>
          <img
            :src="cfLogo"
            alt="Cloudflare"
            class="h-5 w-auto shrink-0"
            decoding="async"
            width="118"
            height="59"
          />
          <span class="font-medium">Cloudflare</span>
          <span>提供</span>
        </a>

        <!-- 当前页传输协议、延迟与加载用时；任一项采不到时显示「无法获取」占位 -->
        <p
          class="text-xs text-muted-foreground tabular-nums"
          aria-label="页面传输与加载信息"
        >
          <template v-if="httpProtocol || ttfb !== null || loadDuration !== null">
            <span>{{ httpProtocol || "HTTP 无法获取" }}</span>
            <span> · </span>
            <span>延迟 {{ ttfb !== null ? `${ttfb} ms` : "无法获取" }}</span>
            <span> · </span>
            <span>加载 {{ loadDuration !== null ? `${loadDuration} ms` : "无法获取" }}</span>
          </template>
          <span v-else>传输信息无法获取</span>
        </p>

        <!-- 当前构建对应的 git 提交：链接到 GitHub commit，便于溯源 -->
        <p
          v-if="buildCommitId && buildCommitId !== 'unknown'"
          class="text-xs text-muted-foreground tabular-nums"
          aria-label="构建版本信息"
        >
          构建
          <a
            :href="`${repoUrl}/commit/${buildCommitId}`"
            target="_blank"
            rel="noopener noreferrer"
            class="underline decoration-dotted underline-offset-4 transition-colors hover:text-foreground"
          >
            <code>{{ buildCommitId }}</code>
          </a>
        </p>
      </div>
    </section>
  </main>
</template>
