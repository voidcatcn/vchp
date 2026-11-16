<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { ChevronDown } from "@lucide/vue";
import { SelectIcon, SelectTrigger } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<{
  class?: HTMLAttributes["class"];
  /** 无障碍名称（同时便于测试定位） */
  ariaLabel?: string;
}>();
</script>

<template>
  <SelectTrigger
    :aria-label="ariaLabel"
    :class="
      cn(
        'flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-ring/50 focus:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 [&>span]:min-w-0 [&>span]:truncate',
        props.class,
      )
    "
  >
    <slot />
    <SelectIcon as-child>
      <ChevronDown class="size-4 opacity-50" />
    </SelectIcon>
  </SelectTrigger>
</template>
