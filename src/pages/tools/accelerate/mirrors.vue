<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input/Input.vue";
import CopyButton from "@/components/CopyButton.vue";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Globe,
  LibraryBig,
  Loader2,
  RefreshCcw,
  Search,
} from "@lucide/vue";
import ToolLayout from "@/components/ToolLayout.vue";
import { accelerateData } from "virtual:accelerate-data";
import {
  buildNodeDownloadUrl,
  detectPlatform,
  pickLatestLts,
  pickNodeFile,
  parseMirrorStatus,
  type MirrorSyncStatus,
  type NodeDist,
} from "@/lib/tools/accelerate";
import { useSeo } from "@/composables/useSeo";

useSeo({
  title: "开源镜像",
  description: "教育网联合镜像站实时列表、同步状态与 Node.js 最新 LTS 自动选版下载。",
  path: "/tools/accelerate/mirrors",
});

// ---------- Node.js 版本助手（自动选适合版本） ----------
interface NodeState {
  status: "idle" | "loading" | "ok" | "error";
  error: string;
  dist: NodeDist | null;
  file: string | null;
}

const nodeState = ref<NodeState>({ status: "idle", error: "", dist: null, file: null });
const nodeUrl = ref("");
const platform = detectPlatform();
const platformLabel = {
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
}[platform.os];

async function fetchNodeLts() {
  nodeState.value = { status: "loading", error: "", dist: null, file: null };
  try {
    const res = await fetch(accelerateData.nodejs.indexJson);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const dists = (await res.json()) as NodeDist[];
    const dist = pickLatestLts(dists);
    if (!dist) throw new Error("未找到 LTS 版本");
    const file = pickNodeFile(dist, platform);
    nodeState.value = { status: "ok", error: "", dist, file };
    if (file) {
      nodeUrl.value = buildNodeDownloadUrl(
        accelerateData.nodejs.mirrorDist,
        dist,
        file,
      );
    }
  } catch (err) {
    nodeState.value = {
      status: "error",
      error: err instanceof Error ? err.message : "获取失败",
      dist: null,
      file: null,
    };
  }
}

// ---------- 实时镜像列表（MirrorZ 协议） ----------
interface MirrorEntry {
  cname: string;
  url: string;
  desc: string;
  size: string;
  status: MirrorSyncStatus;
}

const mirrors = ref<MirrorEntry[]>([]);
const mirrorsState = ref<"idle" | "loading" | "ok" | "error">("idle");
const query = ref("");

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return mirrors.value;
  return mirrors.value.filter(
    (m) => m.cname.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q),
  );
});

async function fetchMirrors() {
  mirrorsState.value = "loading";
  try {
    const res = await fetch(accelerateData.mirrorList.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const doc = (await res.json()) as {
      mirrors?: { cname?: string; url?: string; desc?: string; size?: string; status?: string }[];
    };
    mirrors.value = (doc.mirrors ?? [])
      .filter((m) => m.url && m.cname)
      .map((m) => ({
        cname: m.cname as string,
        url: m.url as string,
        desc: m.desc ?? "",
        size: m.size ?? "",
        status: parseMirrorStatus(m.status),
      }));
    mirrorsState.value = mirrors.value.length ? "ok" : "error";
  } catch {
    mirrorsState.value = "error";
  }
}

onMounted(fetchMirrors);
</script>

<template>
  <ToolLayout
    title="开源镜像"
    back-to="/tools/accelerate"
    back-label="返回加速工具"
    description="教育网联合镜像站实时列表、同步状态与 Node.js 最新 LTS 自动选版下载喵～"
  >
    <div class="flex w-full max-w-2xl flex-col gap-6">
      <!-- Node.js 版本助手 -->
      <section class="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-medium">Node.js 版本助手</h2>
          <Button size="sm" :disabled="nodeState.status === 'loading'" @click="fetchNodeLts">
            <Loader2 v-if="nodeState.status === 'loading'" class="size-4 animate-spin" />
            <RefreshCcw v-else class="size-4" />
            {{ nodeState.status === "ok" ? "重新获取" : "获取最新 LTS" }}
          </Button>
        </div>

        <div v-if="nodeState.status === 'ok' && nodeState.dist" class="flex flex-col gap-2">
          <p class="text-xs text-muted-foreground">
            {{ nodeState.dist.lts }}（{{ nodeState.dist.version.replace(/^v/, "") }}，发布于
            {{ nodeState.dist.date }}）— 已按 {{ platformLabel }} / {{ platform.arch }} 自动选择
          </p>
          <template v-if="nodeUrl">
            <textarea
              :value="nodeUrl"
              rows="2"
              readonly
              aria-label="Node.js 镜像下载链接"
              class="w-full resize-y rounded-lg border border-border bg-muted px-3 py-2 font-mono text-xs leading-relaxed outline-none"
            />
            <div class="flex flex-wrap items-center gap-2">
              <CopyButton :text="nodeUrl" />
              <Button as-child variant="outline" size="sm">
                <a :href="nodeUrl" target="_blank" rel="noopener noreferrer">
                  <Download class="size-4" />
                  镜像下载
                </a>
              </Button>
            </div>
          </template>
          <p v-else class="text-xs text-muted-foreground">未匹配到当前平台安装包，请到目录手动选择。</p>
        </div>

        <p v-else-if="nodeState.status === 'error'" class="text-xs text-destructive">
          获取失败：{{ nodeState.error }}
        </p>
      </section>

      <!-- 实时镜像列表 -->
      <section class="flex flex-col gap-3">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-medium">镜像列表（实时）</h2>
          <Button size="sm" variant="outline" :disabled="mirrorsState === 'loading'" @click="fetchMirrors">
            <Loader2 v-if="mirrorsState === 'loading'" class="size-4 animate-spin" />
            <RefreshCcw v-else class="size-4" />
            刷新
          </Button>
        </div>

        <div class="flex items-center gap-2">
          <Search class="size-4 shrink-0 text-muted-foreground" />
          <Input v-model="query" placeholder="搜索镜像名称或描述…" />
        </div>

        <div v-if="mirrorsState === 'ok'" class="flex flex-col gap-2">
          <p class="text-xs text-muted-foreground">共 {{ filtered.length }} 个镜像</p>
          <a
            v-for="m in filtered"
            :key="m.url"
            :href="`https://mirrors.cernet.edu.cn${m.url}`"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/50 hover:bg-card/80"
          >
            <CheckCircle2
              v-if="m.status === 'ok'"
              class="size-4 shrink-0 text-emerald-500"
              aria-label="同步正常"
            />
            <AlertTriangle
              v-else-if="m.status === 'error'"
              class="size-4 shrink-0 text-destructive"
              aria-label="同步异常"
            />
            <div class="min-w-0 flex-1">
              <div class="flex items-baseline gap-2">
                <span class="truncate text-sm font-medium">{{ m.cname }}</span>
                <span v-if="m.size" class="shrink-0 text-xs text-muted-foreground">{{ m.size }}</span>
              </div>
              <p v-if="m.desc" class="truncate text-xs text-muted-foreground">{{ m.desc }}</p>
            </div>
            <Globe class="size-4 shrink-0 text-muted-foreground/60" />
          </a>
        </div>

        <p v-else-if="mirrorsState === 'loading'" class="text-xs text-muted-foreground">
          正在获取镜像列表…
        </p>

        <!-- 拉取失败回退：目录入口 + 静态快捷 -->
        <template v-else-if="mirrorsState === 'error'">
          <Button as-child size="lg">
            <a :href="accelerateData.mirrors.app" target="_blank" rel="noopener noreferrer">
              <LibraryBig class="size-4" />
              打开镜像站目录
            </a>
          </Button>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <a
              v-for="m in accelerateData.mirrors.shortcut"
              :key="m.path"
              :href="`https://mirrors.cernet.edu.cn${m.path}`"
              target="_blank"
              rel="noopener noreferrer"
              class="group flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm transition-colors hover:border-primary/50 hover:bg-card/80"
            >
              <Globe
                class="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
              />
              <span class="truncate">{{ m.name }}</span>
            </a>
          </div>
        </template>
      </section>
    </div>
  </ToolLayout>
</template>
