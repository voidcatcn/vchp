<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Globe, LibraryBig } from "@lucide/vue";
import ToolLayout from "@/components/ToolLayout.vue";
import { accelerateData } from "virtual:accelerate-data";
import { useSeo } from "@/composables/useSeo";

useSeo({
  title: "开源镜像",
  description: "教育网联合镜像站目录入口与常用镜像快捷导航，查镜像不迷路。",
  path: "/tools/accelerate/mirrors",
});
</script>

<template>
  <ToolLayout
    title="开源镜像"
    back-to="/tools/accelerate"
    back-label="返回加速工具"
    description="教育网联合镜像站目录入口与常用镜像快捷导航喵～"
  >
    <div class="flex w-full max-w-2xl flex-col gap-4">
      <!-- 官方目录入口 -->
      <Button as-child size="lg">
        <a :href="accelerateData.mirrors.app" target="_blank" rel="noopener noreferrer">
          <LibraryBig class="size-4" />
          打开镜像站目录
        </a>
      </Button>

      <!-- 常见镜像快捷入口 -->
      <div class="flex flex-col gap-2">
        <span class="text-sm font-medium">常用镜像</span>
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
      </div>
    </div>
  </ToolLayout>
</template>
