import { defineConfigWithVueTs, vueTsConfigs } from "@vue/eslint-config-typescript";
import pluginVue from "eslint-plugin-vue";
import skipFormatting from "@vue/eslint-config-prettier/skip-formatting";

export default defineConfigWithVueTs(
  {
    name: "app/files-to-lint",
    files: ["**/*.{ts,mts,tsx,vue}"],
  },
  {
    name: "app/files-to-ignore",
    ignores: [
      "dist/**",
      "node_modules/**",
      "src/generated/**",
      "scripts/*.mjs",
      ".wrangler/**",
      "public/**",
      // vendored 第三方 polyfill：不重写上游代码
      "src/lib/network/reflect-metadata.ts",
    ],
  },
  pluginVue.configs["flat/recommended"],
  vueTsConfigs.recommended,
  skipFormatting,
  {
    name: "app/custom-rules",
    rules: {
      "vue/multi-word-component-names": "off",
      // 博客正文由 markdown-it 本地渲染，内容可信
      "vue/no-v-html": "off",
      // shadcn 惯例：class/ariaLabel 等 props 由调用方传入，无需默认值
      "vue/require-default-prop": "off",
      // omit 解构惯例：const { class: _, ...rest } = props
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
);
