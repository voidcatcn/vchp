<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from "vue";
import type * as Monaco from "monaco-editor";
import {
  Check,
  Download,
  FileCode2,
  FilePlus2,
  FolderOpen,
  Loader2,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from "@lucide/vue";
import { Button } from "@/components/ui/button";
import ToolHint from "@/components/ToolHint.vue";
import ToolLayout from "@/components/ToolLayout.vue";
import {
  buildFileTreeRows,
  DEFAULT_IDE_FILES,
  formatFileSize,
  IDE_STORAGE_KEY,
  languageFromPath,
  normalizeVirtualPath,
  type VirtualFile,
} from "@/lib/development/ide";
import { loadMonaco, type MonacoApi } from "@/lib/development/monaco";
import { useSeo } from "@/composables/useSeo";

useSeo({
  title: "在线 IDE",
  description:
    "浏览器内运行的 Monaco 代码编辑器，自带虚拟文件管理器、本地持久化与文件导入下载。",
  path: "/tools/development/ide",
});

const editorHost = ref<HTMLElement | null>(null);
const importInput = ref<HTMLInputElement | null>(null);
const createInput = ref<HTMLInputElement | null>(null);
const files = ref<VirtualFile[]>(cloneDefaultFiles());
const activePath = ref("README.md");
const editorReady = ref(false);
const editorError = ref("");
const cursor = ref({ line: 1, column: 1 });
const statusMessage = ref("");
const isCreating = ref(false);
const newFilePath = ref("");
const createError = ref("");

const editorInstance = shallowRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
let monacoApi: MonacoApi | null = null;
const models = new Map<string, Monaco.editor.ITextModel>();
const viewStates = new Map<string, Monaco.editor.ICodeEditorViewState>();
let themeObserver: MutationObserver | null = null;
let persistTimer: ReturnType<typeof setTimeout> | undefined;
let statusTimer: ReturnType<typeof setTimeout> | undefined;

const treeRows = computed(() => buildFileTreeRows(files.value.map((file) => file.path)));
const activeFile = computed(
  () => files.value.find((file) => file.path === activePath.value) ?? null,
);
const activeLanguage = computed(() =>
  activePath.value ? languageFromPath(activePath.value) : "plaintext",
);
const activeFileSize = computed(() => {
  const bytes = new TextEncoder().encode(activeFile.value?.content ?? "").length;
  return formatFileSize(bytes);
});

function cloneDefaultFiles(): VirtualFile[] {
  return DEFAULT_IDE_FILES.map((file) => ({ ...file }));
}

function readStoredFiles(): VirtualFile[] {
  try {
    const raw = localStorage.getItem(IDE_STORAGE_KEY);
    if (!raw) return cloneDefaultFiles();

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return cloneDefaultFiles();

    const seen = new Set<string>();
    const stored: VirtualFile[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const candidate = item as Partial<VirtualFile>;
      const path = normalizeVirtualPath(candidate.path ?? "");
      if (!path || seen.has(path) || typeof candidate.content !== "string") continue;
      seen.add(path);
      stored.push({ path, content: candidate.content });
    }

    return stored.length ? stored : cloneDefaultFiles();
  } catch {
    return cloneDefaultFiles();
  }
}

function showStatus(message: string) {
  statusMessage.value = message;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    statusMessage.value = "";
  }, 2200);
}

function persistNow() {
  try {
    localStorage.setItem(IDE_STORAGE_KEY, JSON.stringify(files.value));
  } catch {
    showStatus("本地保存失败：浏览器存储空间可能已满");
  }
}

function schedulePersist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persistNow, 320);
}

function getOrCreateModel(file: VirtualFile): Monaco.editor.ITextModel | null {
  if (!monacoApi) return null;

  let model = models.get(file.path);
  if (!model) {
    const createdModel = monacoApi.editor.createModel(
      file.content,
      languageFromPath(file.path),
      monacoApi.Uri.parse(`inmemory://workspace/${file.path}`),
    );
    createdModel.onDidChangeContent(() => {
      const current = files.value.find((item) => item.path === file.path);
      if (current && current.content !== createdModel.getValue()) {
        current.content = createdModel.getValue();
      }
    });
    models.set(file.path, createdModel);
    model = createdModel;
  }
  return model;
}

function activateModel(path: string) {
  const editor = editorInstance.value;
  if (!editor) return;

  const file = files.value.find((item) => item.path === path);
  if (!file) {
    editor.setModel(null);
    return;
  }

  const model = getOrCreateModel(file);
  if (!model) return;

  editor.setModel(model);
  const viewState = viewStates.get(path);
  if (viewState) editor.restoreViewState(viewState);
  editor.focus();
}

function updateMonacoTheme() {
  monacoApi?.editor.setTheme(
    document.documentElement.classList.contains("dark") ? "vs-dark" : "vs",
  );
}

async function initializeEditor() {
  if (!editorHost.value) return;

  try {
    const monaco = await loadMonaco();
    if (!editorHost.value) return;

    monacoApi = monaco;
    updateMonacoTheme();

    const editor = monaco.editor.create(editorHost.value, {
      model: null,
      theme: document.documentElement.classList.contains("dark") ? "vs-dark" : "vs",
      automaticLayout: true,
      ariaLabel: "在线代码编辑器",
      fontFamily:
        '"Maple Mono NF CN", "JetBrains Mono", "Cascadia Code", "SFMono-Regular", Consolas, monospace',
      fontLigatures: true,
      fontSize: 14,
      lineHeight: 22,
      minimap: { enabled: window.matchMedia("(min-width: 1024px)").matches },
      padding: { top: 12, bottom: 12 },
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      tabSize: 2,
      wordWrap: "off",
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: true, indentation: true },
      renderLineHighlight: "all",
      overviewRulerBorder: false,
      fixedOverflowWidgets: true,
    });

    editorInstance.value = editor;
    editor.onDidChangeCursorPosition((event) => {
      cursor.value = {
        line: event.position.lineNumber,
        column: event.position.column,
      };
    });

    editorReady.value = true;
    activateModel(activePath.value);

    themeObserver = new MutationObserver(updateMonacoTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
  } catch {
    editorError.value = "编辑器加载失败，请刷新页面后重试";
  }
}

function selectFile(path: string) {
  activePath.value = path;
}

async function toggleCreateFile() {
  isCreating.value = !isCreating.value;
  createError.value = "";
  newFilePath.value = "";
  if (isCreating.value) {
    await nextTick();
    createInput.value?.focus();
  }
}

async function createFile() {
  const path = normalizeVirtualPath(newFilePath.value);
  if (!path) {
    createError.value = "请输入有效路径，例如 src/new-file.ts";
    return;
  }
  if (files.value.some((file) => file.path === path)) {
    createError.value = "该文件已存在";
    return;
  }

  files.value.push({ path, content: "" });
  activePath.value = path;
  isCreating.value = false;
  newFilePath.value = "";
  createError.value = "";
  showStatus(`已新建 ${path}`);

  await nextTick();
  activateModel(path);
}

function upsertImportedFile(path: string, content: string) {
  const existing = files.value.find((file) => file.path === path);
  if (existing) {
    existing.content = content;
    models.get(path)?.setValue(content);
    return;
  }
  files.value.push({ path, content });
}

async function handleImport(event: Event) {
  const input = event.target as HTMLInputElement;
  const selected = [...(input.files ?? [])];
  if (!selected.length) return;

  let imported = 0;
  for (const selectedFile of selected) {
    if (selectedFile.size > 2 * 1024 * 1024) {
      showStatus(`已跳过 ${selectedFile.name}：文件超过 2 MB`);
      continue;
    }

    const path = normalizeVirtualPath(
      selectedFile.webkitRelativePath || selectedFile.name,
    );
    if (!path) continue;

    upsertImportedFile(path, await selectedFile.text());
    imported += 1;
  }

  input.value = "";
  if (!imported) return;

  activePath.value = files.value.at(-1)?.path ?? activePath.value;
  await nextTick();
  activateModel(activePath.value);
  showStatus(`已导入 ${imported} 个文件`);
}

function downloadActiveFile() {
  const file = activeFile.value;
  if (!file) return;

  const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.path.split("/").pop() || "file.txt";
  anchor.click();
  URL.revokeObjectURL(url);
}

function deleteActiveFile() {
  const path = activePath.value;
  if (!path || !window.confirm(`确定删除 ${path}？`)) return;

  const index = files.value.findIndex((file) => file.path === path);
  if (index < 0) return;

  const model = models.get(path);
  if (model) {
    if (editorInstance.value?.getModel() === model) {
      editorInstance.value.setModel(null);
    }
    model.dispose();
    models.delete(path);
  }
  viewStates.delete(path);

  files.value.splice(index, 1);
  activePath.value = files.value[index]?.path ?? files.value[index - 1]?.path ?? "";
  if (!activePath.value) editorInstance.value?.setModel(null);
  showStatus(`已删除 ${path}`);
}

async function resetWorkspace() {
  if (!window.confirm("确定恢复示例工作区？当前本地文件会被覆盖。")) return;

  editorInstance.value?.setModel(null);
  for (const model of models.values()) model.dispose();
  models.clear();
  viewStates.clear();

  files.value = cloneDefaultFiles();
  activePath.value = "README.md";
  await nextTick();
  activateModel(activePath.value);
  showStatus("已恢复示例工作区");
}

watch(activePath, (path, previousPath) => {
  if (previousPath && editorInstance.value) {
    const state = editorInstance.value.saveViewState();
    if (state) viewStates.set(previousPath, state);
  }
  void nextTick(() => activateModel(path));
});

watch(files, schedulePersist, { deep: true });

onMounted(() => {
  files.value = readStoredFiles();
  activePath.value =
    files.value.find((file) => file.path === "README.md")?.path ??
    files.value[0]?.path ??
    "";
  void initializeEditor();
});

onBeforeUnmount(() => {
  clearTimeout(persistTimer);
  clearTimeout(statusTimer);
  persistNow();
  themeObserver?.disconnect();
  editorInstance.value?.dispose();
  for (const model of models.values()) model.dispose();
});
</script>

<template>
  <ToolLayout
    wide
    title="在线 IDE"
    description="浏览器内虚拟工作区：Monaco 编辑器 + 自实现文件管理器喵～"
    back-to="/tools/development"
    back-label="返回开发工具"
  >
    <div class="flex w-full max-w-4xl flex-col gap-4">
      <ToolHint hint-id="development-online-ide">
        编辑器内核来自 Monaco（VS Code / VSCodium 同源），文件只保存在当前浏览器的
        localStorage，不会上传到服务器。导入文本文件请控制在 2 MB
        内；清理浏览器站点数据会同时删除工作区。
      </ToolHint>

      <section
        class="overflow-hidden rounded-2xl border border-border bg-card dark:bg-input/30"
      >
        <div class="flex min-h-[440px] flex-col lg:h-[62vh] lg:max-h-[680px] lg:flex-row">
          <aside
            class="flex w-full shrink-0 flex-col border-b border-border bg-muted/20 lg:w-56 lg:border-r lg:border-b-0"
          >
            <div
              class="flex items-center justify-between gap-2 border-b border-border p-2.5"
            >
              <div class="flex min-w-0 items-center gap-2">
                <FolderOpen class="size-4 shrink-0" />
                <span class="truncate text-sm font-medium">资源管理器</span>
                <span class="text-xs text-muted-foreground">{{ files.length }}</span>
              </div>
              <div class="flex items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title="新建文件"
                  aria-label="新建文件"
                  @click="toggleCreateFile"
                >
                  <X v-if="isCreating" class="size-3.5" />
                  <FilePlus2 v-else class="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title="导入文本文件"
                  aria-label="导入文本文件"
                  @click="importInput?.click()"
                >
                  <Upload class="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title="下载当前文件"
                  aria-label="下载当前文件"
                  :disabled="!activeFile"
                  @click="downloadActiveFile"
                >
                  <Download class="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title="删除当前文件"
                  aria-label="删除当前文件"
                  :disabled="!activeFile"
                  @click="deleteActiveFile"
                >
                  <Trash2 class="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title="恢复示例工作区"
                  aria-label="恢复示例工作区"
                  @click="resetWorkspace"
                >
                  <RotateCcw class="size-3.5" />
                </Button>
              </div>
            </div>

            <input
              ref="importInput"
              type="file"
              multiple
              class="sr-only"
              @change="handleImport"
            />

            <div class="max-h-56 min-h-0 flex-1 overflow-y-auto p-2 lg:max-h-none">
              <div
                v-if="isCreating"
                class="mb-2 flex flex-col gap-1 rounded-lg border border-border bg-background p-1.5"
              >
                <div class="flex items-center gap-1">
                  <input
                    ref="createInput"
                    v-model="newFilePath"
                    class="h-7 min-w-0 flex-1 rounded-md border border-input bg-background px-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                    placeholder="src/new-file.ts"
                    spellcheck="false"
                    @keydown.enter.prevent="createFile"
                    @keydown.esc="toggleCreateFile"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    title="创建文件"
                    aria-label="创建文件"
                    @click="createFile"
                  >
                    <Check class="size-3" />
                  </Button>
                </div>
                <p v-if="createError" class="px-1 text-[11px] text-destructive">
                  {{ createError }}
                </p>
              </div>

              <div class="flex flex-col gap-0.5">
                <template v-for="row in treeRows" :key="`${row.kind}:${row.path}`">
                  <div
                    v-if="row.kind === 'folder'"
                    class="flex h-7 items-center gap-1.5 rounded-md px-1.5 text-xs font-medium text-muted-foreground"
                    :style="{ paddingLeft: `${6 + row.depth * 14}px` }"
                  >
                    <FolderOpen class="size-3.5 shrink-0" />
                    <span class="truncate">{{ row.name }}</span>
                  </div>
                  <button
                    v-else
                    type="button"
                    class="flex h-7 w-full items-center gap-1.5 rounded-md pr-1.5 text-left text-xs transition-colors hover:bg-muted"
                    :class="
                      activePath === row.path
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground/80'
                    "
                    :style="{ paddingLeft: `${6 + row.depth * 14}px` }"
                    :aria-current="activePath === row.path ? 'page' : undefined"
                    @click="selectFile(row.path)"
                  >
                    <FileCode2 class="size-3.5 shrink-0" />
                    <span class="truncate">{{ row.name }}</span>
                  </button>
                </template>
              </div>

              <p
                v-if="!files.length"
                class="px-2 py-6 text-center text-xs text-muted-foreground"
              >
                还没有文件，点击上方新建喵～
              </p>
            </div>
          </aside>

          <div class="flex min-h-0 min-w-0 flex-1 flex-col">
            <div
              class="flex min-h-10 items-center justify-between gap-2 border-b border-border px-3 py-1.5"
            >
              <div class="flex min-w-0 items-center gap-2">
                <FileCode2 class="size-4 shrink-0 text-muted-foreground" />
                <span class="truncate font-mono text-xs">
                  {{ activePath || "没有打开文件" }}
                </span>
              </div>
              <span
                v-if="statusMessage"
                class="shrink-0 text-xs text-primary"
                aria-live="polite"
              >
                {{ statusMessage }}
              </span>
            </div>

            <div class="relative min-h-[360px] flex-1 overflow-hidden">
              <div ref="editorHost" class="absolute inset-0"></div>
              <div
                v-if="!editorReady && !editorError"
                class="absolute inset-0 grid place-items-center bg-card text-sm text-muted-foreground"
              >
                <span class="flex items-center gap-2">
                  <Loader2 class="size-4 animate-spin" />
                  正在加载 Monaco Editor…
                </span>
              </div>
              <div
                v-else-if="editorError"
                class="absolute inset-0 grid place-items-center bg-card p-6 text-center text-sm text-destructive"
                role="alert"
              >
                {{ editorError }}
              </div>
              <div
                v-else-if="!activeFile"
                class="pointer-events-none absolute inset-0 grid place-items-center bg-card/80 text-sm text-muted-foreground"
              >
                新建或选择一个文件开始编辑
              </div>
            </div>

            <div
              class="flex h-7 items-center justify-between gap-3 border-t border-border bg-muted/30 px-3 font-mono text-[11px] text-muted-foreground"
            >
              <div class="flex items-center gap-3">
                <span>Ln {{ cursor.line }}, Col {{ cursor.column }}</span>
                <span class="hidden sm:inline">{{ activeLanguage }}</span>
              </div>
              <div class="flex items-center gap-3">
                <span>{{ activeFileSize }}</span>
                <span>UTF-8</span>
                <span class="hidden sm:inline">本地保存</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </ToolLayout>
</template>
