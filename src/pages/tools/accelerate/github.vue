<script setup lang="ts">
import { computed, ref } from "vue";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CopyButton from "@/components/CopyButton.vue";
import Input from "@/components/ui/input/Input.vue";
import { ExternalLink, Zap } from "@lucide/vue";
import ToolLayout from "@/components/ToolLayout.vue";
import { accelerateData } from "virtual:accelerate-data";
import { buildGithubUrl } from "@/lib/tools/accelerate";
import { useSeo } from "@/composables/useSeo";

useSeo({
  title: "GitHub 加速",
  description: "Release / Raw / Gist 等链接一键拼接加速渠道，默认与备选渠道可切换。",
  path: "/tools/accelerate/github",
});

const channel = ref(accelerateData.github[0]?.base ?? "");
const input = ref("");

const accelerated = computed(() => buildGithubUrl(input.value, channel.value) ?? "");
const valid = computed(() => input.value.trim() !== "" && accelerated.value !== "");
</script>

<template>
  <ToolLayout
    title="GitHub 加速"
    back-to="/tools/accelerate"
    back-label="返回加速工具"
    description="粘贴 GitHub 链接（Release / Raw / Gist 均可），选择渠道生成加速下载链接喵～"
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
            <SelectItem
              v-for="ch in accelerateData.github"
              :key="ch.base"
              :value="ch.base"
            >
              {{ ch.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </label>

      <!-- 输入 -->
      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-medium">GitHub 链接或路径</span>
        <Input
          v-model="input"
          placeholder="https://github.com/owner/repo/releases/download/v1.0/file.zip 或 owner/repo"
          spellcheck="false"
        />
      </label>

      <!-- 输出 -->
      <div v-if="valid" class="flex flex-col gap-2">
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
          支持 github.com / raw.githubusercontent.com / gist / api / codeload 链接或
          owner/repo 裸路径；粘贴已加速链接会自动还原后按当前渠道重拼。
        </span>
      </div>
    </div>
  </ToolLayout>
</template>
