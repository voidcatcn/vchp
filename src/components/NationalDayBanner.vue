<script setup lang="ts">
// 国庆彩蛋横幅：仅当日期命中国庆或 ?egg=cn_birthday 时由 App.vue 渲染。
// 红金渐变胶囊 + 旗帜图标，浅深色主题下均清晰可读。
import { Cake, X } from "@lucide/vue";
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <div
    role="status"
    class="mt-6 flex items-center gap-2 rounded-full bg-linear-to-r from-red-600 via-amber-400 to-red-600 px-4 py-1.5 text-sm font-medium text-white shadow-md shadow-red-600/30 ring-1 ring-amber-300/60"
  >
    <Cake class="size-4" aria-hidden="true" />
    <span>国庆快乐</span>
  
    <button
      type="button"
      class="-mr-1 rounded-full p-0.5 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      aria-label="关闭横幅"
      @click="emit('close')"
    >
      <X class="size-3.5" aria-hidden="true" />
    </button>
  </div>
</template>
