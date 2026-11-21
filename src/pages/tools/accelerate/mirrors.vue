<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input/Input.vue";
import CopyButton from "@/components/CopyButton.vue";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  detectPlatform,
  fetchLatestRelease,
  parseMirrorStatus,
  formatRelativeTime,
  mirrorSyncDate,
  parseSemver,
  type MirrorEntry,
} from "@/lib/tools/accelerate";
import { useSeo } from "@/composables/useSeo";

useSeo({
  title: "开源镜像",
  description: "教育网联合镜像站实时列表、同步状态与常见发行版自动选最新版本下载。",
  path: "/tools/accelerate/mirrors",
});

const platform = detectPlatform();
const platformLabel = {
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
}[platform.os];

// ---------- 自动选版（发行可切换：Node.js / Go / …） ----------
const distro = ref(accelerateData.distros[0]?.id ?? "");
const distroState = ref<"idle" | "loading" | "ok" | "error">("idle");
const distroError = ref("");
const distroVersion = ref("");
const distroNote = ref("");
const distroUrl = ref("");
const semver = computed(() => parseSemver(distroVersion.value));

async function fetchLatest() {
  const provider = accelerateData.distros.find((d) => d.id === distro.value);
  if (!provider) return;
  distroState.value = "loading";
  distroError.value = "";
  try {
    const result = await fetchLatestRelease(provider, platform);
    distroVersion.value = result.version;
    distroNote.value = result.note;
    distroUrl.value = result.url;
    distroState.value = "ok";
  } catch (err) {
    distroError.value = err instanceof Error ? err.message : "获取失败";
    distroState.value = "error";
  }
}

// ---------- 实时镜像列表（MirrorZ 多源聚合） ----------

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

function parseMirrorzDoc(doc: unknown, out: Map<string, MirrorEntry>) {
  const mirrors = (doc as { mirrors?: Record<string, unknown>[] }).mirrors ?? [];
  for (const m of mirrors) {
    const cname = String(m.cname ?? "");
    const url = String(m.url ?? "");
    if (!cname || !url) continue;
    // 多源按 url 去重，先到先得
    if (out.has(url)) continue;
    out.set(url, {
      cname,
      url,
      desc: String(m.desc ?? ""),
      size: String(m.size ?? ""),
      status: parseMirrorStatus(m.status as string | undefined),
      syncedAt: mirrorSyncDate(m.status as string | undefined),
    });
  }
}

async function fetchMirrors() {
  mirrorsState.value = "loading";
  const merged = new Map<string, MirrorEntry>();
  const results = await Promise.allSettled(
    accelerateData.mirrorSources.map((source) =>
      fetch(source.url).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }),
    ),
  );
  let okCount = 0;
  for (const r of results) {
    if (r.status === "fulfilled") {
      parseMirrorzDoc(r.value, merged);
      okCount++;
    }
  }
  mirrors.value = [...merged.values()];
  mirrorsState.value = okCount > 0 && mirrors.value.length ? "ok" : "error";
}

onMounted(fetchMirrors);
</script>

<template>
  <ToolLayout
    title="开源镜像"
    back-to="/tools/accelerate"
    back-label="返回加速工具"
    description="教育网联合镜像站实时列表、同步状态与常见发行版自动选最新版本下载喵～"
  >
    <div class="flex w-full max-w-2xl flex-col gap-6">
      <!-- 自动选版助手（发行可切换） -->
      <section class="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-medium">自动选最新版本</h2>
          <Button size="sm" :disabled="distroState === 'loading'" @click="fetchLatest">
            <Loader2 v-if="distroState === 'loading'" class="size-4 animate-spin" />
            <RefreshCcw v-else class="size-4" />
            {{ distroState === "ok" ? "重新获取" : "获取最新版本" }}
          </Button>
        </div>

        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-medium">发行</span>
          <Select v-model="distro">
            <SelectTrigger aria-label="选择发行">
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="d in accelerateData.distros" :key="d.id" :value="d.id">
                {{ d.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </label>

        <div v-if="distroState === 'ok'" class="flex flex-col gap-2">
          <p class="text-xs text-muted-foreground">
            {{ distroVersion }}（{{ distroNote }}）— 已按 {{ platformLabel }} /
            {{ platform.arch }} 自动选择
            <span v-if="semver" class="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
              v{{ semver.major }}.{{ semver.minor }}.{{ semver.patch }}
            </span>
            <span
              v-if="semver"
              class="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary"
            >
              v{{ semver.major }}.{{ semver.minor }}.{{ semver.patch }}<template v-if="semver.prerelease">-{{ semver.prerelease }}</template>
            </span>
          </p>
          <textarea
            :value="distroUrl"
            rows="2"
            readonly
            aria-label="镜像下载链接"
            class="w-full resize-y rounded-lg border border-border bg-muted px-3 py-2 font-mono text-xs leading-relaxed outline-none"
          />
          <div class="flex flex-wrap items-center gap-2">
            <CopyButton :text="distroUrl" />
            <Button as-child variant="outline" size="sm">
              <a :href="distroUrl" target="_blank" rel="noopener noreferrer" download>
                <Download class="size-4" />
                镜像下载
              </a>
            </Button>
          </div>
        </div>

        <p v-else-if="distroState === 'error'" class="text-xs text-destructive">
          获取失败：{{ distroError }}
        </p>
      </section>

      <!-- 实时镜像列表 -->
      <section class="flex flex-col gap-3">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-medium">镜像列表（实时）</h2>
          <Button
            size="sm"
            variant="outline"
            :disabled="mirrorsState === 'loading'"
            @click="fetchMirrors"
          >
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
          <div class="flex max-h-[28rem] flex-col gap-2 overflow-y-auto pr-1">
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
              <RefreshCcw
                v-else-if="m.status === 'syncing'"
                class="size-4 shrink-0 animate-spin text-sky-500"
                aria-label="同步中"
              />
              <AlertTriangle
                v-else-if="m.status === 'error'"
                class="size-4 shrink-0 text-destructive"
                aria-label="同步异常"
              />
              <div class="min-w-0 flex-1">
                <div class="flex items-baseline gap-2">
                  <span class="truncate text-sm font-medium">{{ m.cname }}</span>
                  <span v-if="m.size" class="shrink-0 text-xs text-muted-foreground">
                    {{ m.size }}
                  <span v-if="m.syncedAt" class="shrink-0 text-xs text-muted-foreground/70">
                    同步于 {{ formatRelativeTime(m.syncedAt) }}
                  </span>
                  <span v-if="m.syncedAt" class="shrink-0 text-xs text-muted-foreground/70">
                    同步于 {{ formatRelativeTime(m.syncedAt) }}
                  </span>
                  </span>
                </div>
                <p v-if="m.desc" class="truncate text-xs text-muted-foreground">
                  {{ m.desc }}
                </p>
              </div>
              <Globe class="size-4 shrink-0 text-muted-foreground/60" />
            </a>
          </div>
        </div>

        <p v-else-if="mirrorsState === 'loading'" class="text-xs text-muted-foreground">
          正在获取镜像列表…
        </p>

        <!-- 拉取失败回退：目录入口 + 静态快捷 -->
        <template v-else-if="mirrorsState === 'error'">
          <Button as-child size="lg">
            <a
              :href="accelerateData.mirrors.app"
              target="_blank"
              rel="noopener noreferrer"
            >
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
