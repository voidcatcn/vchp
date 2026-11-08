<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { X } from "@lucide/vue";
import { useHintSettings } from "@/composables/useHintSettings";
import { cn } from "@/lib/utils";
import type { AlertVariants } from ".";
import { alertVariants } from "."

const props = defineProps<{
  class?: HTMLAttributes["class"];
  variant?: AlertVariants["variant"];
  /**
   * 说明提示标识（issue #253）：传入后该 Alert 成为可关闭的说明提示——
   * 右上角出现关闭按钮，关闭后永久记忆；设置页「工具说明提示」
   * 开关可一键隐藏全部提示。不带 hint-id 的 Alert 行为不变。
   */
  hintId?: string;
}>();

const { isHintVisible, dismissHint } = useHintSettings();
</script>

<!--
  模板根节点：无 hintId 时始终渲染（普通 Alert）；
  带 hintId 时受提示设置控制（开关 / 关闭记忆）。
-->
<template>
  <div
    v-if="!hintId || isHintVisible(hintId)"
    data-slot="alert"
    :class="
      cn(
        alertVariants({ variant }),
        hintId && '[&_[data-slot=alert-description]]:pr-6',
        props.class,
      )
    "
    role="alert"
  >
    <slot />
    <button
      v-if="hintId"
      type="button"
      class="absolute top-1.5 right-1.5 rounded-md p-0.5 text-muted-foreground/60 opacity-70 transition-[opacity,background-color] hover:bg-muted hover:text-foreground hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      :aria-label="'关闭提示'"
      @click="dismissHint(hintId)"
    >
      <X class="size-3.5" aria-hidden="true" />
    </button>
  </div>
</template>
