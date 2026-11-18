import { describe, expect, it } from "vitest";
import {
  buildGithubUrl,
  buildNodeDownloadUrl,
  buildSourceforgeUrl,
  detectPlatform,
  extractOwnerRepo,
  matchReleaseAssets,
  parseMirrorStatus,
  pickLatestLts,
  pickNodeFile,
} from "@/lib/tools/accelerate";

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

describe("平台检测与 Release 资产匹配", () => {
  it("UA 检测平台", () => {
    expect(detectPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toEqual({
      os: "windows",
      arch: "x64",
    });
    expect(detectPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 14; arm64)")).toEqual({
      os: "macos",
      arch: "arm64",
    });
    expect(detectPlatform("Mozilla/5.0 (X11; Linux x86_64)")).toEqual({
      os: "linux",
      arch: "x64",
    });
  });

  it("Release 资产按平台排序：recommended 置顶", () => {
    const assets = [
      { name: "app-linux.tar.gz", size: 1, browser_download_url: "" },
      { name: "app-win-x64.zip", size: 2, browser_download_url: "" },
      { name: "app-mac.dmg", size: 3, browser_download_url: "" },
    ];
    const m = matchReleaseAssets(assets, detectPlatform("Windows NT x64"));
    expect(m[0].recommended).toBe(true);
    expect(m[0].asset.name).toBe("app-win-x64.zip");
    expect(m[1].plausible).toBe(false);
  });

  it("owner/repo 提取", () => {
    expect(extractOwnerRepo("vuejs/core")).toBe("vuejs/core");
    expect(extractOwnerRepo("https://github.com/vuejs/core/releases")).toBe("vuejs/core");
    expect(extractOwnerRepo("https://api.github.com/repos/vuejs/core")).toBe("vuejs/core");
  });
});

describe("Node.js LTS 自动选版", () => {
  const dists = [
    { version: "v23.1.0", lts: false, date: "2024-11-01", files: [] },
    {
      version: "v22.11.0",
      lts: "Jod",
      date: "2024-10-30",
      files: ["win-x64-zip", "osx-arm64-pkg", "linux-x64-tarxz", "linux-arm64-tarxz", "src"],
    },
  ];

  it("取最新 LTS（跳过非 LTS 的更新版本）", () => {
    const dist = pickLatestLts(dists);
    expect(dist?.version).toBe("v22.11.0");
  });

  it("按平台拼安装包文件名", () => {
    const dist = pickLatestLts(dists)!;
    expect(pickNodeFile(dist, detectPlatform("Windows x64"))).toBe("node-v22.11.0-win-x64.zip");
    expect(pickNodeFile(dist, detectPlatform("Macintosh; Intel Mac OS X; arm64"))).toBe("node-v22.11.0-osx-arm64.pkg");
    expect(pickNodeFile(dist, detectPlatform("Linux x86_64"))).toBe(
      "node-v22.11.0-linux-x64.tar.xz",
    );
  });

  it("镜像下载链接拼接", () => {
    const dist = pickLatestLts(dists)!;
    expect(
      buildNodeDownloadUrl(
        "https://mirrors.cernet.edu.cn/nodejs-release/dist/",
        dist,
        "node-v22.11.0-win-x64.zip",
      ),
    ).toBe("https://mirrors.cernet.edu.cn/nodejs-release/dist/v22.11.0/node-v22.11.0-win-x64.zip");
  });
});

describe("MirrorZ 同步状态解析", () => {
  it("S 更新时间戳 + X 错误时间戳", () => {
    // 更新 1795000000，错误 1794000000（早于更新）→ 正常
    expect(parseMirrorStatus("S1795000000X1794000000")).toBe("ok");
    // 错误晚于更新 → error
    expect(parseMirrorStatus("S1794000000X1795000000")).toBe("error");
    expect(parseMirrorStatus(undefined)).toBe("unknown");
    expect(parseMirrorStatus("garbage")).toBe("unknown");
  });
});