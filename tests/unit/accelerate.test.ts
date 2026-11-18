import { describe, expect, it } from "vitest";
import { buildGithubUrl, buildSourceforgeUrl } from "@/lib/tools/accelerate";

describe("GitHub 加速链接拼接", () => {
  it("完整 URL：前缀 + 目标 URL", () => {
    expect(
      buildGithubUrl(
        "https://github.com/user/repo/releases/download/v1.0/file.zip",
        "https://gh.meali.top/",
      ),
    ).toBe("https://gh.meali.top/https://github.com/user/repo/releases/download/v1.0/file.zip");
  });

  it("裸路径：补 github.com 前缀", () => {
    expect(buildGithubUrl("user/repo", "https://v4.gh-proxy.org/")).toBe(
      "https://v4.gh-proxy.org/https://github.com/user/repo",
    );
  });

  it("Raw / Gist / API / codeload 域均支持", () => {
    for (const host of [
      "raw.githubusercontent.com/user/repo/main/a.txt",
      "gist.githubusercontent.com/u/1/raw/a.txt",
      "api.github.com/repos/u/r",
      "codeload.github.com/u/r/zip/refs/heads/main",
    ]) {
      expect(buildGithubUrl(host, "https://gh.meali.top/")).toBe(
        `https://gh.meali.top/https://${host}`,
      );
    }
  });

  it("已加速链接粘贴回来自动还原重拼", () => {
    expect(
      buildGithubUrl(
        "https://v4.gh-proxy.org/https://github.com/u/r",
        "https://gh.meali.top/",
      ),
    ).toBe("https://gh.meali.top/https://github.com/u/r");
  });

  it("无关输入返回 null", () => {
    expect(buildGithubUrl("", "https://gh.meali.top/")).toBeNull();
    expect(buildGithubUrl("https://example.com/a", "https://gh.meali.top/")).toBeNull();
  });
});

describe("SourceForge 加速链接拼接", () => {
  it("完整 URL：提取 sourceforge.net 后路径", () => {
    expect(
      buildSourceforgeUrl(
        "https://sourceforge.net/projects/7-zip/files/7z.exe/download",
        "https://v4.gh-proxy.org/sourceforge/",
      ),
    ).toBe("https://v4.gh-proxy.org/sourceforge/projects/7-zip/files/7z.exe/download");
  });

  it("裸路径：自动补 projects 前缀结构", () => {
    expect(buildSourceforgeUrl("/projects/7-zip/files/7z.exe", "https://v4.gh-proxy.org/sourceforge/")).toBe(
      "https://v4.gh-proxy.org/sourceforge/projects/7-zip/files/7z.exe",
    );
  });

  it("非 projects 路径返回 null", () => {
    expect(buildSourceforgeUrl("https://sourceforge.net/about", "https://v4.gh-proxy.org/sourceforge/")).toBeNull();
  });
});
