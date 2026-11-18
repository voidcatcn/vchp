import { describe, expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "vue-router/auto-routes";
import GithubAcceleratePage from "@/pages/tools/accelerate/github.vue";

async function mountAt(component: unknown, initialRoute: string) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(initialRoute);
  await router.isReady();
  return mount(component as never, {
    global: { plugins: [router] },
    attachTo: document.body,
  });
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 300));
  for (let i = 0; i < 5; i++) {
    await nextTick();
    await flushPromises();
  }
}

describe("/tools/accelerate/github 页面交互", () => {
  it("输入 Release 链接后按默认渠道生成加速链接", async () => {
    const wrapper = await mountAt(GithubAcceleratePage, "/tools/accelerate/github");
    await settle();

    const input = wrapper.find("input");
    await input.setValue("https://github.com/u/r/releases/download/v1/f.zip");
    await settle();

    const out = wrapper.find('textarea[aria-label="GitHub 加速结果"]');
    expect(out.exists()).toBe(true);
    expect(
      (out.element as HTMLTextAreaElement).value.startsWith("https://gh.meali.top/https://github.com/"),
    ).toBe(true);

    // 新窗口打开链接与输出一致
    const open = wrapper.findAll("a").find((a) => a.text().includes("新窗口打开"));
    expect(open?.attributes("href")).toBe(
      "https://gh.meali.top/https://github.com/u/r/releases/download/v1/f.zip",
    );
  });

  it("无关输入不展示结果区", async () => {
    const wrapper = await mountAt(GithubAcceleratePage, "/tools/accelerate/github");
    await settle();
    await wrapper.find("input").setValue("https://example.com/nope");
    await settle();
    expect(wrapper.find('textarea[aria-label="GitHub 加速结果"]').exists()).toBe(false);
  });
});
