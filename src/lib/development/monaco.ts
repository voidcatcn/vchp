/**
 * 按需加载 Monaco Editor、语言 Worker 与编辑器字体。
 *
 * 该模块只被在线 IDE 页面动态引用，避免把编辑器内核和字体样式带进全站首屏。
 */
export type MonacoApi = typeof import("monaco-editor");

const MAPLE_MONO_CSS_URL = "https://fontsapi.zeoseven.com/442/main/result.css";
const FONT_LOAD_TIMEOUT_MS = 4000;

let monacoPromise: Promise<MonacoApi> | null = null;
let editorFontPromise: Promise<void> | null = null;

/** 仅在进入 IDE 时加载 Maple Mono NF CN，失败时回落到系统等宽字体。 */
function loadEditorFont(): Promise<void> {
  if (editorFontPromise) return editorFontPromise;
  if (typeof document === "undefined") return Promise.resolve();

  editorFontPromise = new Promise((resolve) => {
    const link = document.createElement("link");
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve();
    };

    const timeout = setTimeout(finish, FONT_LOAD_TIMEOUT_MS);
    link.rel = "stylesheet";
    link.href = MAPLE_MONO_CSS_URL;
    link.dataset.editorFont = "maple-mono";
    link.onload = () => {
      if (!document.fonts?.load) {
        finish();
        return;
      }

      void document.fonts
        .load('14px "Maple Mono NF CN"', "Maple Mono 编辑器")
        .then(finish)
        .catch(finish);
    };
    link.onerror = finish;
    document.head.appendChild(link);
  });

  return editorFontPromise;
}

export function loadMonaco(): Promise<MonacoApi> {
  if (monacoPromise) return monacoPromise;

  monacoPromise = Promise.all([
    loadEditorFont(),
    import("monaco-editor"),
    import("monaco-editor/editor/editor.worker?worker"),
    import("monaco-editor/language/css/css.worker?worker"),
    import("monaco-editor/language/html/html.worker?worker"),
    import("monaco-editor/language/json/json.worker?worker"),
    import("monaco-editor/language/typescript/ts.worker?worker"),
  ]).then(
    ([_font, monaco, editorModule, cssModule, htmlModule, jsonModule, tsModule]) => {
      const EditorWorker = editorModule.default;
      const CssWorker = cssModule.default;
      const HtmlWorker = htmlModule.default;
      const JsonWorker = jsonModule.default;
      const TsWorker = tsModule.default;

      globalThis.MonacoEnvironment = {
        getWorker(_workerId: string, label: string) {
          if (label === "json") return new JsonWorker();
          if (label === "css" || label === "scss" || label === "less") {
            return new CssWorker();
          }
          if (label === "html" || label === "handlebars" || label === "razor") {
            return new HtmlWorker();
          }
          if (label === "typescript" || label === "javascript") {
            return new TsWorker();
          }
          return new EditorWorker();
        },
      };

      return monaco;
    },
  );

  return monacoPromise;
}
