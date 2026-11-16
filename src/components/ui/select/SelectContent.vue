<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import {
  SelectContent,
  SelectPortal,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectViewport,
} from "reka-ui";
import { cn } from "@/lib/utils";

const props = withDefaults(
  defineProps<{
    position?: "item-aligned" | "popper";
    class?: HTMLAttributes["class"];
  }>(),
  { position: "popper" },
);
</script>

<template>
  <SelectPortal>
    <SelectContent
      :position="position"
      :class="
        cn(
          'relative z-50 max-h-[min(24rem,var(--reka-select-content-available-height))] min-w-[8rem] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          props.class,
        )
      "
    >
      <SelectScrollUpButton
        class="flex cursor-default items-center justify-center py-1"
      >
        ↑
      </SelectScrollUpButton>
      <SelectViewport
        class="p-1 focus:outline-none"
      >
        <slot />
      </SelectViewport>
      <SelectScrollDownButton
        class="flex cursor-default items-center justify-center py-1"
      >
        ↓
      </SelectScrollDownButton>
    </SelectContent>
  </SelectPortal>
</template>
