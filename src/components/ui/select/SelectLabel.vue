<script setup lang="ts">
import { SelectLabel } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<{ class?: import("vue").HTMLAttributes["class"] }>();
</script>

<template>
  <SelectLabel :class="cn('px-2 py-1.5 text-xs font-medium text-muted-foreground', props.class)">
    <slot />
  </SelectLabel>
</template>
