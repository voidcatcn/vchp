/**
 * 浏览器内 IDE 的虚拟文件系统辅助。
 *
 * 文件只保存在 localStorage，不依赖远端服务；路径统一使用 `/`，
 * 文件树与语言识别保持为纯函数，方便单元测试与后续扩展。
 */
export interface VirtualFile {
  path: string;
  content: string;
}

export interface FileTreeRow {
  kind: "folder" | "file";
  name: string;
  path: string;
  depth: number;
}

export const IDE_STORAGE_KEY = "tools:online-ide:files:v1";

export const DEFAULT_IDE_FILES: readonly VirtualFile[] = [
  {
    path: "README.md",
    content: `# 在线 IDE

这是 VoidCat 的浏览器内代码工作区。

- 左侧可以新建、导入与下载文件
- 编辑器内核来自 Monaco（VS Code / VSCodium 同源）
- 内容自动保存到当前浏览器 localStorage，不会上传
- 支持 TypeScript、JavaScript、JSON、CSS、HTML、Markdown 等常用语言

> 试试编辑 \`src/main.ts\`，再新建一个自己的文件喵～
`,
  },
  {
    path: "src/main.ts",
    content: `type Greeting = {
  name: string;
  language: string;
};

export function greet({ name, language }: Greeting): string {
  return \`你好，\${name}！正在使用 \${language}。\`;
}

console.log(greet({ name: "VoidCat", language: "TypeScript" }));
`,
  },
  {
    path: "src/style.css",
    content: `:root {
  color-scheme: light dark;
  font-family: "Noto Sans SC", system-ui, sans-serif;
}

body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
}
`,
  },
  {
    path: "package.json",
    content: `{
  "name": "voidcat-online-ide",
  "private": true,
  "version": "0.1.0",
  "type": "module"
}
`,
  },
];

/** 统一 Windows / 网络风格分隔符，并拒绝目录穿越。 */
export function normalizeVirtualPath(value: string): string | null {
  const segments = value
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .filter((segment) => segment && segment !== ".");

  if (!segments.length) return null;
  if (segments.some((segment) => segment === ".." || segment.includes("\0"))) {
    return null;
  }

  return segments.join("/");
}

/** 将文件扩展名映射到 Monaco 的语言 ID。 */
export function languageFromPath(path: string): string {
  const name = path.split("/").pop()?.toLowerCase() ?? "";
  if (name === "dockerfile") return "dockerfile";
  if (name === "makefile") return "makefile";

  const extension = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  const languages: Record<string, string> = {
    ".c": "c",
    ".cc": "cpp",
    ".cpp": "cpp",
    ".cs": "csharp",
    ".css": "css",
    ".go": "go",
    ".h": "c",
    ".hpp": "cpp",
    ".htm": "html",
    ".html": "html",
    ".java": "java",
    ".js": "javascript",
    ".json": "json",
    ".jsx": "javascript",
    ".less": "less",
    ".md": "markdown",
    ".mdx": "mdx",
    ".mjs": "javascript",
    ".php": "php",
    ".py": "python",
    ".rb": "ruby",
    ".rs": "rust",
    ".scss": "scss",
    ".sh": "shell",
    ".sql": "sql",
    ".toml": "ini",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".vue": "html",
    ".xml": "xml",
    ".yaml": "yaml",
    ".yml": "yaml",
  };

  return languages[extension] ?? "plaintext";
}

interface MutableFolderNode {
  name: string;
  path: string;
  folders: Map<string, MutableFolderNode>;
  files: Map<string, string>;
}

/** 生成按文件夹优先排序的扁平树行，供无障碍按钮列表直接渲染。 */
export function buildFileTreeRows(paths: string[]): FileTreeRow[] {
  const root: MutableFolderNode = {
    name: "",
    path: "",
    folders: new Map(),
    files: new Map(),
  };

  for (const path of paths) {
    const normalized = normalizeVirtualPath(path);
    if (!normalized) continue;

    const segments = normalized.split("/");
    let folder = root;
    for (const segment of segments.slice(0, -1)) {
      const folderPath = folder.path ? `${folder.path}/${segment}` : segment;
      let child = folder.folders.get(segment);
      if (!child) {
        child = {
          name: segment,
          path: folderPath,
          folders: new Map(),
          files: new Map(),
        };
        folder.folders.set(segment, child);
      }
      folder = child;
    }

    const fileName = segments.at(-1)!;
    folder.files.set(fileName, normalized);
  }

  const rows: FileTreeRow[] = [];
  const compare = (a: string, b: string) => a.localeCompare(b, "zh-CN");

  function visit(folder: MutableFolderNode, depth: number) {
    for (const child of [...folder.folders.values()].sort((a, b) =>
      compare(a.name, b.name),
    )) {
      rows.push({
        kind: "folder",
        name: child.name,
        path: child.path,
        depth,
      });
      visit(child, depth + 1);
    }

    for (const [name, path] of [...folder.files.entries()].sort(([a], [b]) =>
      compare(a, b),
    )) {
      rows.push({ kind: "file", name, path, depth });
    }
  }

  visit(root, 0);
  return rows;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
