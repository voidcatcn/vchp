<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { Check } from "@lucide/vue";
import {
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
} from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<{
  value: string | number;
  disabled?: boolean;
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <SelectItem
    :value="props.value"
    :disabled="props.disabled"
    :class="
      cn(
        'relative flex w-full cursor-default select-none items-center rounded-lg py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        props.class,
      )
    "
  >
    <SelectItemText as-child>
      <slot />
    </SelectItemText>
    <span
      class="absolute right-2 flex size-3.5 items-center justify-center"
      aria-hidden="true"
    >
      <SelectItemIndicator>
        <Check class="size-4" />
      </SelectItemIndicator>
    </span>
  </SelectItem>
</template>
