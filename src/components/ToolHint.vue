<script setup lang="ts">
import type { Component } from "vue";
import { Info } from "@lucide/vue";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * 工具页统一说明提示（可关闭）。
 *
 * 基于 Alert 的 hint-id 机制：右上角有关闭按钮，关闭后永久记忆，
 * 设置页「工具说明提示」开关可一键恢复。新页面的说明提示必须使用
 * 本组件（或带 hint-id 的 Alert），不要手写说明 div——否则会丢失
 * 关闭按钮与设置联动。
 *
 * 用法：
 *   <ToolHint hint-id="github-accelerate">
 *     说明文字……
 *   </ToolHint>
 */
const props = defineProps<{
  /** 关闭记忆标识（唯一，按页面-功能命名） */
  hintId: string;
  /** 说明图标，默认 Info */
  icon?: Component;
  class?: string;
}>();
</script>

<template>
  <Alert :hint-id="props.hintId" :class="props.class">
    <component :is="props.icon ?? Info" class="size-4" />
    <AlertDescription class="text-xs leading-relaxed">
      <slot />
    </AlertDescription>
  </Alert>
</template>
