/**
 * 图片格式转换（Canvas 原生 + @jsquash WASM 兜底）。
 *
 * 支持 PNG / JPEG / WebP / AVIF / BMP 互相转换；有损格式（JPEG/WebP/AVIF）
 * 提供质量参数。全部在本地完成，数据不离开当前设备。
 *
 * 导出策略（修复部分浏览器 toBlob 静默回退 PNG 的问题）：
 * 1. 优先 Canvas 原生 toBlob —— 快，且 png/jpeg 全平台可用；
 * 2. 校验产物 blob.type 必须与目标 mime 一致 —— Safari 等浏览器对不支持的
 *    格式会静默回退 PNG，产物名不副实；
 * 3. 原生失败或类型不符时回退 @jsquash WASM 编码器（动态 import，
 *    仅在需要时下载对应 codec chunk，不增加首屏体积）。
 * 4. BMP 无 toBlob 支持，使用内置 24 位 BMP 编码器（透明区铺白底）。
 */
export interface ImageFormat {
  id: string;
  label: string;
  mime: string;
  ext: string;
  /** 有损格式支持质量参数 */
  lossy: boolean;
  note?: string;
}

export const imageFormats: ImageFormat[] = [
  { id: "png", label: "PNG", mime: "image/png", ext: "png", lossy: false },
  { id: "jpeg", label: "JPEG", mime: "image/jpeg", ext: "jpg", lossy: true },
  {
    id: "webp",
    label: "WebP",
    mime: "image/webp",
    ext: "webp",
    lossy: true,
    note: "不支持时自动 WASM 编码",
  },
  {
    id: "avif",
    label: "AVIF",
    mime: "image/avif",
    ext: "avif",
    lossy: true,
    note: "WASM 编码，全平台支持",
  },
  { id: "bmp", label: "BMP", mime: "image/bmp", ext: "bmp", lossy: false, note: "体积较大" },
];

/** 输出文件名：保留原文件主名，替换扩展名 */
export function imageOutputName(fileName: string, format: ImageFormat): string {
  return `${fileName.replace(/\.[^.]+$/, "")}.${format.ext}`;
}

/**
 * 内置 24 位 BMP 编码器（无 alpha，透明区由调用方铺白底）。
 *
 * 结构：14 字节 BITMAPFILEHEADER + 40 字节 BITMAPINFOHEADER +
 * 自下而上、行宽 4 字节对齐的 BGR 像素数据。
 */
export function encodeBmp(imageData: ImageData): Blob {
  const { width, height, data } = imageData;
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelSize = rowSize * height;
  const fileSize = 54 + pixelSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  // BITMAPFILEHEADER
  view.setUint8(0, 0x42); // "B"
  view.setUint8(1, 0x4d); // "M"
  view.setUint32(2, fileSize, true);
  view.setUint32(10, 54, true);
  // BITMAPINFOHEADER
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true); // 正高度 = 自下而上
  view.setUint16(26, 1, true); // 颜色平面数
  view.setUint16(28, 24, true); // 每像素位数
  view.setUint32(30, 0, true); // 无压缩
  view.setUint32(34, pixelSize, true);
  // 像素数据（BGR，自下而上）
  let offset = 54;
  for (let y = height - 1; y >= 0; y--) {
    const rowStart = offset;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      view.setUint8(offset++, data[i + 2]); // B
      view.setUint8(offset++, data[i + 1]); // G
      view.setUint8(offset++, data[i]); // R
    }
    offset = rowStart + rowSize; // 行尾对齐填充
  }
  return new Blob([buffer], { type: "image/bmp" });
}

/** 有损格式质量 0~1 → 编码器所需 0~100 */
function qualityPercent(quality: number): number {
  return Math.round(Math.min(1, Math.max(0, quality)) * 100);
}

/**
 * @jsquash WASM 编码器兜底：动态 import，各 codec 独立 chunk，
 * 只有原生导出不可用时才会下载对应的 wasm。
 */
async function encodeWithJsquash(
  format: ImageFormat,
  imageData: ImageData,
  quality: number,
): Promise<Blob> {
  switch (format.id) {
    case "webp": {
      const { default: encodeWebp } = await import("@jsquash/webp/encode.js");
      return new Blob([await encodeWebp(imageData, { quality: qualityPercent(quality) })], {
        type: format.mime,
      });
    }
    case "avif": {
      const { default: encodeAvif } = await import("@jsquash/avif/encode.js");
      return new Blob([await encodeAvif(imageData, { quality: qualityPercent(quality), bitDepth: 8 })], { type: format.mime });
    }
    case "jpeg": {
      const { default: encodeJpeg } = await import("@jsquash/jpeg/encode.js");
      return new Blob([await encodeJpeg(imageData, { quality: qualityPercent(quality) })], {
        type: format.mime,
      });
    }
    case "png": {
      const { default: encodePng } = await import("@jsquash/png/encode.js");
      return new Blob([await encodePng(imageData, { bitDepth: 8 })], { type: format.mime });
    }
    default:
      throw new Error(`当前浏览器不支持导出 ${format.label} 格式，请换一种格式`);
  }
}

/**
 * 把图片文件解码后重编码为目标格式。
 * @param file 任意浏览器可解码的图片（PNG/JPEG/WebP/GIF/BMP/AVIF…）
 * @param format 目标格式
 * @param quality 有损格式质量（0~1），无损格式忽略
 * @returns 目标格式 Blob 与原图尺寸
 */
export async function convertImage(
  file: File,
  format: ImageFormat,
  quality = 0.9,
): Promise<{ blob: Blob; width: number; height: number }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("无法解码该图片，请确认文件是受支持的图片格式");
  }
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("当前浏览器不支持 Canvas 2D，无法转换图片");
    // JPEG/BMP 无透明通道，先铺白底避免透明区域变黑
    if (format.mime === "image/jpeg" || format.mime === "image/bmp") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(bitmap, 0, 0);

    // BMP：无 toBlob 支持且 jsquash 无对应 codec，走内置编码器
    if (format.mime === "image/bmp") {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return { blob: encodeBmp(imageData), width: bitmap.width, height: bitmap.height };
    }

    // 原生优先：png/jpeg 全平台可用，webp 视浏览器而定
    const nativeBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, format.mime, format.lossy ? quality : undefined);
    });
    // 关键校验：不支持的格式会被静默回退成 PNG（blob.type 不符），视为失败
    if (nativeBlob && nativeBlob.type === format.mime) {
      return { blob: nativeBlob, width: bitmap.width, height: bitmap.height };
    }

    // 原生不可用（或被静默回退）→ @jsquash WASM 编码兜底
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const blob = await encodeWithJsquash(format, imageData, quality);
    return { blob, width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}
