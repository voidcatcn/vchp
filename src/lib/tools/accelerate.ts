/**
 * 加速链接纯函数：GitHub / SourceForge 渠道拼接与输入规整。
 *
 * 设计：加速服务（gh-proxy 系）接受「前缀 + 完整目标 URL」；
 * 输入既可以是完整 URL，也可以是裸路径，粘贴已加速链接时自动还原。
 */

/** GitHub 及其常见资源域：从输入中定位域名起点用于截取 */
const GITHUB_HOSTS = [
  "github.com",
  "raw.githubusercontent.com",
  "gist.githubusercontent.com",
  "api.github.com",
  "codeload.github.com",
  "objects.githubusercontent.com",
] as const;

const SOURCEFORGE_HOST = "sourceforge.net";

/** 剥离协议，得到可用于域名定位的字符串 */
function stripPrefix(input: string): string {
  return input.trim().replace(/^https?:\/\//i, "");
}

/** 在剥离协议后的字符串里定位最早的 github 域，返回起点与命中域 */
function findGithubHost(s: string): { at: number; host: string } | null {
  let best: { at: number; host: string } | null = null;
  for (const host of GITHUB_HOSTS) {
    const at = s.indexOf(host);
    if (at !== -1 && (best === null || at < best.at)) best = { at, host };
  }
  return best;
}

/**
 * GitHub 加速链接：channel.base + 完整目标 URL。
 * 输入支持完整 URL、裸路径（user/repo/...），已加速链接自动还原后重拼。
 */
export function buildGithubUrl(input: string, channelBase: string): string | null {
  const bare = stripPrefix(input);
  if (!bare) return null;
  const hit = findGithubHost(bare);
  const target = hit
    ? `https://${bare.slice(hit.at)}`
    : /^[\w-]+\/[\w.-]+/.test(bare)
      ? `https://github.com/${bare}`
      : null;
  return target ? `${channelBase}${target}` : null;
}

/**
 * SourceForge 加速链接：base + sourceforge 路径。
 * 输入支持完整 URL 与裸路径（projects/...）。
 */
export function buildSourceforgeUrl(input: string, base: string): string | null {
  let s = input.trim();
  if (!s) return null;
  s = s.replace(/^https?:\/\//i, "");
  const at = s.indexOf(SOURCEFORGE_HOST);
  const path =
    at !== -1 ? s.slice(at + SOURCEFORGE_HOST.length) : s.startsWith("/") ? s : `/${s}`;
  if (!/^\/projects\/[\w.-]+/.test(path)) return null;
  return `${base}${path.replace(/^\/+/, "")}`;
}

// ============================================================
// 平台检测与 Release 资产匹配（浏览器端无后端）
// ============================================================

export interface PlatformInfo {
  os: "windows" | "macos" | "linux";
  arch: "x64" | "arm64";
}

/** 由 UA 检测当前平台（检测失败回退 windows/x64） */
export function detectPlatform(ua: string = navigator.userAgent): PlatformInfo {
  const os = /windows|win32/i.test(ua)
    ? "windows"
    : /mac os|darwin|macintosh/i.test(ua)
      ? "macos"
      : "linux";
  const arch = /arm|aarch/i.test(ua) ? "arm64" : "x64";
  return { os, arch };
}

/** Release 资产（GitHub API 精简字段） */
export interface ReleaseAsset {
  name: string;
  size: number;
  browser_download_url: string;
}

export interface PlatformMatch {
  asset: ReleaseAsset;
  /** 适合当前平台：OS 与架构都命中 */
  recommended: boolean;
  /** OS 命中但架构不确定（通用安装包） */
  plausible: boolean;
}

const OS_KEYWORDS: Record<PlatformInfo["os"], RegExp> = {
  windows: /win|\.exe$|\.msi$/i,
  macos: /mac|darwin|osx|\.dmg$|\.pkg$/i,
  linux: /linux|\.appimage$|\.tar\.(gz|xz|bz2)$/i,
};

const ARCH_KEYWORDS: Record<PlatformInfo["arch"], RegExp> = {
  x64: /x64|x86_64|amd64|(?<!a)64bit/i,
  arm64: /arm64|aarch64/i,
};

/**
 * 给 Release 资产标记平台适配度：
 * recommended（OS+架构命中）> plausible（OS 命中或通用包）> 其他。
 */
export function matchReleaseAssets(
  assets: ReleaseAsset[],
  platform: PlatformInfo,
): PlatformMatch[] {
  const osRe = OS_KEYWORDS[platform.os];
  const archRe = ARCH_KEYWORDS[platform.arch];
  const otherOs = Object.entries(OS_KEYWORDS)
    .filter(([os]) => os !== platform.os)
    .map(([, re]) => re);

  return assets
    .map((asset) => {
      const isOtherOs = otherOs.some((re) => re.test(asset.name));
      const osHit = osRe.test(asset.name);
      const archHit = archRe.test(asset.name);
      const noArch = !/x64|x86_64|amd64|arm64|aarch64|32\b/i.test(asset.name);
      const recommended = osHit && (archHit || noArch);
      const plausible =
        osHit || (!isOtherOs && noArch && !/\.(sha256|sig|txt|json)$/i.test(asset.name));
      return { asset, recommended, plausible: plausible && !recommended };
    })
    .sort((a, b) => {
      const rank = (m: PlatformMatch) => (m.recommended ? 0 : m.plausible ? 1 : 2);
      return rank(a) - rank(b);
    });
}

/** 从输入中提取 owner/repo（剥离 URL / releases 尾巴） */
export function extractOwnerRepo(input: string): string | null {
  let s = input.trim();
  if (!s) return null;
  const hit = findGithubHost(stripPrefix(s));
  if (hit) {
    s = stripPrefix(s)
      .slice(hit.at + hit.host.length)
      .replace(/^\/+/, "")
      .replace(/^api\//, "repos/")
      .replace(/^repos\//, "");
  }
  const m = s.match(/^([\w.-]+)\/([\w.-]+)/);
  return m ? `${m[1]}/${m[2]}` : null;
}

// ============================================================
// Node.js 版本助手（nodejs.org index.json + 镜像路径）
// ============================================================

export interface NodeDist {
  version: string;
  lts: false | string;
  date: string;
  files: string[];
}

/**
 * 从 dist/index.json 选取最新 LTS 行。
 * index.json 按时间倒序，首个 lts 非空即为最新 LTS。
 */
export function pickLatestLts(dists: NodeDist[]): NodeDist | null {
  return dists.find((d) => d.lts) ?? null;
}

/** 平台 → dist 文件名关键词（nodejs.org files 命名） */
const NODE_FILES: Record<PlatformInfo["os"], Record<PlatformInfo["arch"], RegExp>> = {
  windows: { x64: /win-x64-zip$/, arm64: /win-arm64-zip$/ },
  macos: { x64: /osx-x64-pkg$/, arm64: /osx-arm64-pkg$/ },
  linux: { x64: /linux-x64-tarxz$/, arm64: /linux-arm64-tarxz$/ },
};

/**
 * 为 LTS 行选择当前平台的安装包文件名。
 * files 元素形如 win-x64-zip / osx-arm64-pkg / linux-x64-tarxz，无匹配返回 null。
 */
export function pickNodeFile(dist: NodeDist, platform: PlatformInfo): string | null {
  const re = NODE_FILES[platform.os][platform.arch];
  const hit = dist.files.find((f) => re.test(f));
  const m = hit?.match(/^(.+)-(zip|pkg|tarxz)$/);
  if (!m) return null;
  const ext = m[2] === "tarxz" ? "tar.xz" : m[2];
  return `node-${dist.version}-${m[1]}.${ext}`;
}

/**
 * 生成 Node.js 镜像下载链接（cernet nodejs-release 路径）。
 * distUrl 传入官方或镜像的 dist 前缀。
 */
export function buildNodeDownloadUrl(
  distUrl: string,
  dist: NodeDist,
  file: string,
): string {
  return `${distUrl}v${dist.version.replace(/^v/, "")}/${file}`;
}

// ============================================================
// MirrorZ 同步状态解析
// ============================================================

export type MirrorSyncStatus = "ok" | "syncing" | "pending" | "error" | "unknown";

/** 实时镜像列表条目（由 MirrorZ mirrors[] 规整而来） */
export interface MirrorEntry {
  cname: string;
  url: string;
  desc: string;
  size: string;
  status: MirrorSyncStatus;
}

/**
 * 解析 MirrorZ status：首字母即最近状态标记。
 * S=成功 X=下次同步（非错误！）Y=同步中 D=等待 F=失败 N=新镜像。
 * 例如 "S1794976642X1795063042"（成功，附下次同步时间）→ ok。
 */
export function parseMirrorStatus(status: string | undefined): MirrorSyncStatus {
  const first = status?.[0];
  switch (first) {
    case "S":
    case "N":
      return "ok";
    case "Y":
      return "syncing";
    case "D":
      return "pending";
    case "F":
      return "error";
    default:
      return "unknown";
  }
}

// ============================================================
// 自动选版 provider：Node.js / Go（官方 JSON，CORS 开放）
// ============================================================

export interface DistroProvider {
  id: string;
  label: string;
  api: string;
  mirrorBase: string;
}

/** Go 官方 dl JSON 元素（files.filename 为完整下载文件名） */
export interface GoRelease {
  version: string;
  stable: boolean;
  files: { filename: string; os: string; arch: string; kind: string }[];
}

const GO_OS: Record<PlatformInfo["os"], string> = {
  windows: "windows",
  macos: "darwin",
  linux: "linux",
};

/**
 * Go：取最新 stable 版本中匹配当前平台的 archive 文件名。
 * windows 优先 zip（msi 为 installer 不取），macos 取 pkg。
 */
export function pickGoFile(release: GoRelease, platform: PlatformInfo): string | null {
  const os = GO_OS[platform.os];
  // Go 官方文件名用 amd64/arm64 命名（x64 → amd64）
  const arch = platform.arch === "x64" ? "amd64" : "arm64";
  // windows 优先 zip 安装包；macos 优先 pkg；linux 用 tar 归档
  const kinds =
    platform.os === "windows"
      ? ["archive", "installer"]
      : platform.os === "macos"
        ? ["installer", "archive"]
        : ["archive"];
  for (const kind of kinds) {
    const hit = release.files.find(
      (f) => f.os === os && f.arch === arch && f.kind === kind,
    );
    if (hit) return hit.filename;
  }
  return null;
}

/** Go 镜像下载链接：golang 镜像根路径直接拼文件名 */
export function buildGoDownloadUrl(mirrorBase: string, file: string): string {
  return `${mirrorBase}${file}`;
}
// ============================================================
// 发行获取分发器（页面薄壳，逻辑集中此处便于测试）
// ============================================================

export interface DistroResult {
  /** 展示用版本号（如 v22.11.0 / go1.23.4） */
  version: string;
  /** 当前平台安装包文件名 */
  file: string;
  /** 镜像下载链接 */
  url: string;
  /** 附加说明（LTS 代号 / stable 等） */
  note: string;
}

/**
 * 拉取发行最新版本并生成镜像下载链接。
 * - nodejs：index.json 首个 lts 行；版本路径 v{ver}/
 * - go：dl json 首 stable 项；golang 镜像根直接拼文件名
 */
export async function fetchLatestRelease(
  provider: DistroProvider,
  platform: PlatformInfo,
): Promise<DistroResult> {
  const res = await fetch(provider.api);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (provider.id === "nodejs") {
    const dists = (await res.json()) as NodeDist[];
    const dist = pickLatestLts(dists);
    if (!dist) throw new Error("未找到 LTS 版本");
    const file = pickNodeFile(dist, platform);
    if (!file) throw new Error("未匹配到当前平台安装包");
    return {
      version: dist.version,
      file,
      url: buildNodeDownloadUrl(provider.mirrorBase, dist, file),
      note: `${dist.lts} LTS`,
    };
  }
  if (provider.id === "go") {
    const releases = (await res.json()) as GoRelease[];
    const release = releases.find((r) => r.stable) ?? releases[0];
    const file = pickGoFile(release, platform);
    if (!file) throw new Error("未匹配到当前平台安装包");
    return {
      version: release.version,
      file,
      url: buildGoDownloadUrl(provider.mirrorBase, file),
      note: "stable",
    };
  }
  throw new Error(`不支持的发行：${provider.id}`);
}
