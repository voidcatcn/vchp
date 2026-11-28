import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "vue-router/auto-routes";
import ToolsIndexPage from "@/pages/tools/index.vue";
import DevelopmentIndexPage from "@/pages/tools/development/index.vue";
import OnlineIdePage from "@/pages/tools/development/ide.vue";

vi.mock("@/lib/development/monaco", () => ({
  loadMonaco: () => new Promise(() => {}),
}));

async function mountAt(component: unknown, initialRoute: string) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(initialRoute);
  await router.isReady();
  return mount(component as never, {
    global: { plugins: [router] },
    attachTo: document.body,
  });
}

beforeEach(() => {
  localStorage.clear();
});

describe("开发工具分组", () => {
  it("工具总览展示开发分组入口", async () => {
    const wrapper = await mountAt(ToolsIndexPage, "/tools");
    expect(wrapper.find('a[href="/tools/development"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("开发");
  });

  it("开发分组展示在线 IDE 工具", async () => {
    const wrapper = await mountAt(DevelopmentIndexPage, "/tools/development");
    expect(wrapper.find('a[href="/tools/development/ide"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("在线 IDE");
    expect(wrapper.text()).toContain("Monaco");
  });

  it("在线 IDE 渲染虚拟文件管理器与示例文件", async () => {
    const wrapper = await mountAt(OnlineIdePage, "/tools/development/ide");
    await flushPromises();

    expect(wrapper.text()).toContain("资源管理器");
    expect(wrapper.text()).toContain("README.md");
    expect(wrapper.text()).toContain("src");
    expect(wrapper.text()).toContain("main.ts");
    expect(wrapper.text()).toContain("正在加载 Monaco Editor");
    expect(wrapper.find('button[aria-label="新建文件"]').exists()).toBe(true);
    expect(wrapper.find('button[aria-label="导入文本文件"]').exists()).toBe(true);
  });

  it("可以新建文件并切换为当前文件", async () => {
    const wrapper = await mountAt(OnlineIdePage, "/tools/development/ide");
    await flushPromises();

    await wrapper.find('button[aria-label="新建文件"]').trigger("click");
    await nextTick();
    const input = wrapper.find('input[placeholder="src/new-file.ts"]');
    await input.setValue("src/demo.ts");
    await wrapper.find('button[aria-label="创建文件"]').trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("demo.ts");
    expect(wrapper.find('button[aria-current="page"]').text()).toContain("demo.ts");
  });
});
