<script setup lang="ts">
import type { SelectRootProps } from "reka-ui";
import { SelectRoot } from "reka-ui";

// 单选模型（string / number 均可，reka 按 item.value 类型回传）
const model = defineModel<string | number>();

const props = defineProps<SelectRootProps>();
</script>

<template>
  <SelectRoot v-model="model" v-bind="$attrs">
    <slot />
  </SelectRoot>
</template>
