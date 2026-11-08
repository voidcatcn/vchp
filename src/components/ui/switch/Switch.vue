<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { SwitchRoot, SwitchThumb } from "reka-ui";
import { cn } from "@/lib/utils";

/**
 * shadcn 风格开关。
 * 注意：reka-ui 的 SwitchRoot 使用 modelValue（而非 radix 的 checked），
 * 这里对外保持 checked / update:checked 语义，与设置页调用方解耦。
 */
const props = defineProps<{
  checked: boolean;
  disabled?: boolean;
  class?: HTMLAttributes["class"];
}>();

const emit = defineEmits<{ "update:checked": [value: boolean] }>();
</script>

<template>
  <SwitchRoot
    :model-value="checked"
    :disabled="disabled"
    :class="
      cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-input dark:bg-input/60',
        props.class,
      )
    "
    @update:model-value="emit('update:checked', $event === true)"
  >
    <SwitchThumb
      class="pointer-events-none block size-4 rounded-full bg-background shadow-lg ring-1 ring-border transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5"
    />
  </SwitchRoot>
</template>
