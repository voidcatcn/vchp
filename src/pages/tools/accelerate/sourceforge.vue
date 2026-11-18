<script setup lang="ts">
import { computed, ref } from "vue";
import { Button } from "@/components/ui/button";
import CopyButton from "@/components/CopyButton.vue";
import Input from "@/components/ui/input/Input.vue";
import { ExternalLink, Zap } from "@lucide/vue";
import ToolLayout from "@/components/ToolLayout.vue";
import { accelerateData } from "virtual:accelerate-data";
import { buildSourceforgeUrl } from "@/lib/tools/accelerate";
import { useSeo } from "@/composables/useSeo";

useSeo({
  title: "SourceForge 加速",
  description: "SourceForge 项目文件下载链接换加速前缀，支持完整 URL 或裸路径。",
  path: "/tools/accelerate/sourceforge",
});

const input = ref("");
const accelerated = computed(
  () => buildSourceforgeUrl(input.value, accelerateData.sourceforge.base) ?? "",
);
const valid = computed(() => input.value.trim() !== "" && accelerated.value !== "");
</script>

<template>
  <ToolLayout
    title="SourceForge 加速"
    back-to="/tools/accelerate"
    back-label="返回加速工具"
    description="粘贴 SourceForge 项目文件链接（sourceforge.net/projects/...），生成加速下载链接喵～"
  >
    <div class="flex w-full max-w-2xl flex-col gap-4">
      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-medium">SourceForge 链接或路径</span>
        <Input
          v-model="input"
          placeholder="https://sourceforge.net/projects/7-zip/files/7-Zip/24.09/7z2409-x64.exe/download"
          spellcheck="false"
        />
      </label>

      <div v-if="valid" class="flex flex-col gap-2">
        <span class="text-sm font-medium">加速链接</span>
        <textarea
          :value="accelerated"
          rows="3"
          readonly
          aria-label="SourceForge 加速结果"
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

      <div
        class="flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground"
      >
        <Zap class="mt-0.5 size-4 shrink-0" />
        <span>
          仅支持 /projects/&lt;名&gt;/... 路径；完整 URL 与裸路径均可，粘贴后自动提取。
        </span>
      </div>
    </div>
  </ToolLayout>
</template>
