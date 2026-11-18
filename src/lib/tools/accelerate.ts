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

/** 在剥离协议后的字符串里定位 github 域起点，未找到返回 -1 */
function githubHostIndex(s: string): number {
  let index = -1;
  for (const host of GITHUB_HOSTS) {
    const at = s.indexOf(host);
    if (at !== -1 && (index === -1 || at < index)) index = at;
  }
  return index;
}

/**
 * GitHub 加速链接：channel.base + 完整目标 URL。
 * 输入支持完整 URL、裸路径（user/repo/...），已加速链接自动还原后重拼。
 */
export function buildGithubUrl(input: string, channelBase: string): string | null {
  const bare = stripPrefix(input);
  if (!bare) return null;
  const at = githubHostIndex(bare);
  const target =
    at !== -1
      ? `https://${bare.slice(at)}`
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
