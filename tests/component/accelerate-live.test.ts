import { describe, expect, it, vi, afterEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "vue-router/auto-routes";
import GithubAcceleratePage from "@/pages/tools/accelerate/github.vue";
import MirrorsPage from "@/pages/tools/accelerate/mirrors.vue";
import { detectPlatform } from "@/lib/tools/accelerate";

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
  await new Promise((r) => setTimeout(r, 300));
  for (let i = 0; i < 5; i++) {
    await nextTick();
    await flushPromises();
  }
}

const originalFetch = globalThis.fetch;

describe("/tools/accelerate/github Release 解析", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("owner/repo 输入后解析 Release 并置顶当前平台资产", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      expect(url.startsWith("https://gh.meali.top/https://api.github.com/repos/")).toBe(
        true,
      );
      return new Response(
        JSON.stringify({
          tag_name: "v1.2.3",
          published_at: "2026-01-01T00:00:00Z",
          assets: [
            {
              name: "app-linux.tar.gz",
              size: 1024,
              browser_download_url:
                "https://github.com/u/r/releases/download/v1.2.3/app-linux.tar.gz",
            },
            {
              name: "app-win-x64.zip",
              size: 2048,
              browser_download_url:
                "https://github.com/u/r/releases/download/v1.2.3/app-win-x64.zip",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const wrapper = await mountAt(GithubAcceleratePage, "/tools/accelerate/github");
    await settle();
    await wrapper.find("input").setValue("user/repo");
    await settle();

    const parseBtn = wrapper.findAll("button").find((b) => b.text().includes("解析"))!;
    await parseBtn.trigger("click");
    await settle();

    expect(wrapper.text()).toContain("v1.2.3");
    const list = wrapper.findAll("li");
    expect(list.length).toBe(2);
    // 推荐置顶：当前平台资产在第一个（CI runner 与本地平台可能不同）
    const pf = detectPlatform();
    const expectName = pf.os === "linux" ? "app-linux.tar.gz" : "app-win-x64.zip";
    expect(list[0].text()).toContain(expectName);
    // 下载链接由渠道代理拼接
    const link = list[0].find("a");
    expect(link?.attributes("href")).toContain(`/${expectName}`);
  });

  it("Release 404 显示错误提示", async () => {
    globalThis.fetch = vi.fn(
      async () => new Response("", { status: 404 }),
    ) as typeof fetch;
    const wrapper = await mountAt(GithubAcceleratePage, "/tools/accelerate/github");
    await settle();
    await wrapper.find("input").setValue("user/empty");
    await settle();
    await wrapper
      .findAll("button")
      .find((b) => b.text().includes("解析"))!
      .trigger("click");
    await settle();
    expect(wrapper.text()).toContain("该仓库没有 Release");
  });
});

describe("/tools/accelerate/mirrors 实时列表与 Node LTS", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("实时拉取镜像列表并渲染", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain("mirrorz.json");
      return new Response(
        JSON.stringify({
          site: { abbr: "LZUOSS" },
          mirrors: [
            {
              cname: "Node.js",
              url: "/nodejs-release",
              desc: "Node",
              size: "10G",
              status: "S100",
            },
            { cname: "PyPI", url: "/pypi", desc: "PyPI", size: "1T", status: "S200X300" },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const wrapper = await mountAt(MirrorsPage, "/tools/accelerate/mirrors");
    await settle();
    expect(wrapper.text()).toContain("共 2 个镜像");
    expect(wrapper.text()).toContain("PyPI");
  });

  it("Node LTS：取最新 LTS 并按平台生成镜像下载链接", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe("https://nodejs.org/dist/index.json");
      return new Response(
        JSON.stringify([
          { version: "v23.0.0", lts: false, date: "2024-11-01", files: [] },
          {
            version: "v22.11.0",
            lts: "Jod",
            date: "2024-10-30",
            files: ["win-x64-zip", "osx-arm64-pkg", "linux-x64-tarxz"],
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const wrapper = await mountAt(MirrorsPage, "/tools/accelerate/mirrors");
    await settle();
    const pf2 = detectPlatform();
    await wrapper
      .findAll("button")
      .find((b) => b.text().includes("获取最新 LTS"))!
      .trigger("click");
    await settle();

    expect(wrapper.text()).toContain("22.11.0");
    const out = wrapper.find('textarea[aria-label="Node.js 镜像下载链接"]');
    const nodeFile =
      pf2.os === "linux" ? "node-v22.11.0-linux-x64.tar.xz" : "node-v22.11.0-win-x64.zip";
    expect((out.element as HTMLTextAreaElement).value).toBe(
      `https://mirrors.cernet.edu.cn/nodejs-release/dist/v22.11.0/${nodeFile}`,
    );
  });
});
