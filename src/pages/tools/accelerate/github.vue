<script setup lang="ts">
import { computed, ref } from "vue";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CopyButton from "@/components/CopyButton.vue";
import Input from "@/components/ui/input/Input.vue";
import { Download, ExternalLink, Loader2, Search, Zap } from "@lucide/vue";
import ToolLayout from "@/components/ToolLayout.vue";
import { accelerateData } from "virtual:accelerate-data";
import {
  buildGithubUrl,
  detectPlatform,
  extractOwnerRepo,
  matchReleaseAssets,
  type PlatformMatch,
} from "@/lib/tools/accelerate";
import { useSeo } from "@/composables/useSeo";

useSeo({
  title: "GitHub 加速",
  description:
    "Release / Raw / Gist 链接一键拼接加速渠道；输入 owner/repo 解析最新 Release 并自动标记当前平台安装包。",
  path: "/tools/accelerate/github",
});

const channel = ref(accelerateData.github[0]?.base ?? "");
const input = ref("");

// ---------- 链接拼接（原功能） ----------
const accelerated = computed(() => buildGithubUrl(input.value, channel.value) ?? "");
const urlValid = computed(
  () => input.value.trim() !== "" && /(github\.com|raw\.githubusercontent|gist|codeload)/i.test(input.value),
);

// ---------- Release 解析（owner/repo） ----------
interface ReleaseAsset {
  name: string;
  size: number;
  browser_download_url: string;
}

const releaseRepo = computed(() => extractOwnerRepo(input.value));
const showRelease = computed(
  () =>
    releaseRepo.value !== null &&
    !/(github\.com|raw\.githubusercontent|gist|codeload)/i.test(input.value),
);

const releaseState = ref<"idle" | "loading" | "ok" | "error">("idle");
const releaseError = ref("");
const releaseTag = ref("");
const releaseDate = ref("");
const assets = ref<PlatformMatch[]>([]);
const userPlatform = detectPlatform();
const platformLabel = `${{ windows: "Windows", macos: "macOS", linux: "Linux" }[userPlatform.os]} / ${userPlatform.arch}`;

async function fetchRelease() {
  if (!releaseRepo.value) return;
  releaseState.value = "loading";
  releaseError.value = "";
  try {
    const api = `${channel.value}https://api.github.com/repos/${releaseRepo.value}/releases/latest`;
    const res = await fetch(api);
    if (!res.ok) {
      throw new Error(res.status === 404 ? "该仓库没有 Release" : `HTTP ${res.status}`);
    }
    const data = (await res.json()) as {
      tag_name: string;
      published_at?: string;
      assets?: ReleaseAsset[];
    };
    releaseTag.value = data.tag_name;
    releaseDate.value = (data.published_at ?? "").slice(0, 10);
    assets.value = matchReleaseAssets(data.assets ?? [], userPlatform);
    releaseState.value = "ok";
  } catch (err) {
    releaseError.value = err instanceof Error ? err.message : "解析失败";
    releaseState.value = "error";
  }
}

function assetUrl(asset: ReleaseAsset): string {
  return `${channel.value}${asset.browser_download_url}`;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}
</script>

<template>
  <ToolLayout
    title="GitHub 加速"
    back-to="/tools/accelerate"
    back-label="返回加速工具"
    description="粘贴链接直接拼接加速渠道；输入 owner/repo 可解析最新 Release 并自动标记当前平台安装包喵～"
  >
    <div class="flex w-full max-w-2xl flex-col gap-4">
      <!-- 渠道选择 -->
      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-medium">加速渠道</span>
        <Select v-model="channel">
          <SelectTrigger aria-label="加速渠道">
            <SelectValue placeholder="请选择" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="ch in accelerateData.github" :key="ch.base" :value="ch.base">
              {{ ch.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </label>

      <!-- 输入 -->
      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-medium">GitHub 链接或 owner/repo</span>
        <Input
          v-model="input"
          placeholder="owner/repo 或 https://github.com/... / raw.githubusercontent.com/..."
          spellcheck="false"
        />
      </label>

      <!-- Release 解析（owner/repo 模式） -->
      <div v-if="showRelease" class="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <div class="flex items-center justify-between gap-2">
          <span class="text-sm font-medium">解析 Release：{{ releaseRepo }}</span>
          <Button size="sm" :disabled="releaseState === 'loading'" @click="fetchRelease">
            <Loader2 v-if="releaseState === 'loading'" class="size-4 animate-spin" />
            <Search v-else class="size-4" />
            解析
          </Button>
        </div>

        <template v-if="releaseState === 'ok'">
          <p class="text-xs text-muted-foreground">
            {{ releaseTag }}（发布于 {{ releaseDate || "未知日期" }}）— 当前平台
            {{ platformLabel }} 的安装包已置顶
          </p>
          <ul class="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
            <li
              v-for="m in assets"
              :key="m.asset.browser_download_url"
              class="flex items-center gap-2 rounded-lg border border-border p-2"
              :class="m.recommended ? 'border-primary/50 bg-primary/5' : ''"
            >
              <Download class="size-4 shrink-0 text-muted-foreground" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-xs font-medium">
                  {{ m.asset.name }}
                  <span
                    v-if="m.recommended"
                    class="ml-1 rounded bg-primary/10 px-1 py-0.5 text-[10px] text-primary"
                  >
                    适合 {{ platformLabel }}
                  </span>
                </p>
                <p class="text-xs text-muted-foreground">{{ formatSize(m.asset.size) }}</p>
              </div>
              <CopyButton :text="assetUrl(m.asset)" />
              <Button as-child variant="ghost" size="icon">
                <a :href="assetUrl(m.asset)" target="_blank" rel="noopener noreferrer" aria-label="下载">
                  <ExternalLink class="size-4" />
                </a>
              </Button>
            </li>
          </ul>
          <p class="text-xs text-muted-foreground">
            下载链接由当前渠道
            {{ channel }} 代理生成
          </p>
        </template>

        <p v-else-if="releaseState === 'error'" class="text-xs text-destructive">
          解析失败：{{ releaseError }}
        </p>
      </div>

      <!-- 链接拼接（URL 模式） -->
      <div v-if="urlValid" class="flex flex-col gap-2">
        <span class="text-sm font-medium">加速链接</span>
        <textarea
          :value="accelerated"
          rows="3"
          readonly
          aria-label="GitHub 加速结果"
          class="w-full resize-y rounded-lg border border-border bg-muted px-3 py-2 font-mono text-xs leading-relaxed outline-none"
        />
        <div class="flex flex-wrap items-center gap-2">
          <CopyButton :text="accelerated" />
          <Button as-child variant="outline">
            <a :href="accelerated" target="_blank" rel="noopener noreferrer">
              <ExternalLink class="size-4" />
              新窗口打开
            </a>
          </Button>
        </div>
      </div>

      <!-- 说明 -->
      <div
        class="flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground"
      >
        <Zap class="mt-0.5 size-4 shrink-0" />
        <span>
          Release 解析经当前渠道代理 GitHub API（无后端，全程浏览器直连）；
          支持 github.com / raw / gist / api / codeload 链接拼接，已加速链接自动还原重拼。
        </span>
      </div>
    </div>
  </ToolLayout>
</template>
