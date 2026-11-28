import { describe, expect, it } from "vitest";
import {
  buildFileTreeRows,
  DEFAULT_IDE_FILES,
  formatFileSize,
  languageFromPath,
  normalizeVirtualPath,
} from "@/lib/development/ide";

describe("在线 IDE 文件系统辅助", () => {
  it("统一路径分隔符并过滤空段", () => {
    expect(normalizeVirtualPath(" /src\\\\components//App.vue ")).toBe(
      "src/components/App.vue",
    );
    expect(normalizeVirtualPath("./src/main.ts")).toBe("src/main.ts");
    expect(normalizeVirtualPath("../secret.txt")).toBeNull();
    expect(normalizeVirtualPath("   ")).toBeNull();
  });

  it("根据扩展名识别 Monaco 语言", () => {
    expect(languageFromPath("src/main.ts")).toBe("typescript");
    expect(languageFromPath("package.json")).toBe("json");
    expect(languageFromPath("styles.scss")).toBe("scss");
    expect(languageFromPath("README.md")).toBe("markdown");
    expect(languageFromPath("Dockerfile")).toBe("dockerfile");
    expect(languageFromPath("LICENSE")).toBe("plaintext");
  });

  it("生成文件夹优先、带深度的扁平文件树", () => {
    expect(buildFileTreeRows(["README.md", "src/main.ts", "src/lib/a.ts"])).toEqual([
      { kind: "folder", name: "src", path: "src", depth: 0 },
      { kind: "folder", name: "lib", path: "src/lib", depth: 1 },
      { kind: "file", name: "a.ts", path: "src/lib/a.ts", depth: 2 },
      { kind: "file", name: "main.ts", path: "src/main.ts", depth: 1 },
      { kind: "file", name: "README.md", path: "README.md", depth: 0 },
    ]);
  });

  it("提供可直接打开的示例工作区与容量格式化", () => {
    expect(DEFAULT_IDE_FILES.some((file) => file.path === "README.md")).toBe(true);
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(2 * 1024 * 1024)).toBe("2.0 MB");
  });
});
