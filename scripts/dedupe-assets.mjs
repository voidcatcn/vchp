/**
 * 构建产物内容级去重：不同引用点生成的相同内容资产只保留一份。
 *
 * 背景：@jsquash AVIF 的主线程 JS 与 pthread worker JS 各自 new URL
 * 引用同一 wasm，rolldown 会输出两份 3.4MB 副本（部署配额浪费，
 * 首次 AVIF 转换可能重复下载）。按内容哈希分组后保留一份，
 * 并把 dist 内所有文本引用重写到保留文件，其余副本连同其预压缩
 * 变体（.gz/.br）一并删除。
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, rmSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const assetsDir = "dist/assets";

const files = readdirSync(assetsDir).map((name) => ({
  name,
  path: join(assetsDir, name),
  size: statSync(join(assetsDir, name)).size,
}));

// 按内容哈希分组（仅原始文件，预压缩变体跟随主文件处理）
const groups = new Map();
for (const f of files) {
  if (/\.(gz|br)$/i.test(f.name)) continue;
  const hash = createHash("sha256").update(readFileSync(f.path)).digest("hex");
  const list = groups.get(hash) ?? [];
  list.push(f);
  groups.set(hash, list);
}

// 文本文件引用重写：所有 .js/.css/.html/.xml/.json/.txt/.webmanifest/.map
const textCandidates = readdirSync("dist", { recursive: true, withFileTypes: true })
  .filter((d) => d.isFile())
  .map((d) => join(d.parentPath ?? d.path, d.name));

let removed = 0;
let savedBytes = 0;
for (const [, list] of groups) {
  if (list.length < 2) continue;
  // 保留第一个（排序稳定），其余删除并重写引用
  const keep = list[0];
  for (const dup of list.slice(1)) {
    const dupGz = `${dup.path}.gz`;
    const dupBr = `${dup.path}.br`;
    if (statSync(dup.path).size > 1024) savedBytes += dup.size;
    rmSync(dup.path);
    if (readdirSync(assetsDir).includes(`${dup.name}.gz`)) rmSync(dupGz);
    if (readdirSync(assetsDir).includes(`${dup.name}.br`)) rmSync(dupBr);
    removed++;
    // 重写引用：替换为保留文件名
    for (const target of textCandidates) {
      try {
        const content = readFileSync(target, "utf8");
        if (content.includes(dup.name)) {
          writeFileSync(target, content.replaceAll(dup.name, keep.name));
        }
      } catch {
        // 二进制文件跳过
      }
    }
  }
}

if (removed > 0) {
  console.log(
    `[dedupe-assets] 移除 ${removed} 个重复资产，节省 ${(savedBytes / 1024 / 1024).toFixed(1)} MB`,
  );
} else {
  console.log("[dedupe-assets] 无重复资产");
}
