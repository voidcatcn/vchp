<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { computed } from "vue";
import {
  SliderRange,
  SliderRoot,
  SliderThumb,
  SliderTrack,
} from "reka-ui";
import { cn } from "@/lib/utils";

/**
 * shadcn 风格滑条（单值）。
 * reka-ui 的 SliderRoot 以数组承载多滑块，这里收敛为单 number 模型，
 * 与原生 input[type=range] 的 v-model 用法对齐，替换成本最低。
 */
const props = withDefaults(
  defineProps<{
    modelValue: number;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    class?: HTMLAttributes["class"];
  }>(),
  { min: 0, max: 100, step: 1, disabled: false },
);

const emit = defineEmits<{ "update:modelValue": [value: number] }>();

const model = computed<number[]>({
  get: () => [props.modelValue],
  set: (value) => emit("update:modelValue", value[0] ?? props.min),
});
</script>

<template>
  <SliderRoot
    v-model="model"
    :min="min"
    :max="max"
    :step="step"
    :disabled="disabled"
    :class="
      cn(
        'relative flex w-full touch-none select-none items-center data-[disabled]:opacity-50',
        props.class,
      )
    "
  >
    <SliderTrack
      class="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted"
    >
      <SliderRange class="absolute h-full bg-primary" />
    </SliderTrack>
    <SliderThumb
      class="block size-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    />
  </SliderRoot>
</template>
