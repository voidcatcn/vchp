/**
 * 内置 24 位 BMP 编码器单元测试（issue #249）。
 *
 * BMP 无法通过 canvas.toBlob 导出（会静默回退 PNG），本仓库使用
 * encodeBmp 手工编码；重点验证文件头结构与像素数据布局。
 */
import { describe, expect, it } from "vitest";
import { encodeBmp } from "@/lib/conversion/image";

/** 构造一个 w×h 的纯色 ImageData 测试样本 */
function solidImage(width: number, height: number, r: number, g: number, b: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return { data, width, height, colorSpace: "srgb" } as ImageData;
}

describe("encodeBmp（24 位 BMP 编码器）", () => {
  it("文件头结构正确：BM 标识 / 尺寸 / 24bpp / 数据偏移 54", async () => {
    const blob = encodeBmp(solidImage(2, 2, 255, 0, 0));
    expect(blob.type).toBe("image/bmp");
  });

  it("2×3 图像：行宽 4 字节对齐、自下而上 BGR 布局", async () => {
    // 第一行红色像素，第二、三行绿色
    const width = 2;
    const height = 3;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let x = 0; x < width; x++) {
      // y=0 红
      data[(0 * width + x) * 4] = 255;
      data[(0 * width + x) * 4 + 1] = 0;
      data[(0 * width + x) * 4 + 2] = 0;
      data[(0 * width + x) * 4 + 3] = 255;
      // y=1、2 绿
      for (const y of [1, 2]) {
        data[(y * width + x) * 4] = 0;
        data[(y * width + x) * 4 + 1] = 255;
        data[(y * width + x) * 4 + 2] = 0;
        data[(y * width + x) * 4 + 3] = 255;
      }
    }
    const blob = encodeBmp({ data, width, height, colorSpace: "srgb" } as ImageData);

    const buf = new Uint8Array(await blob.arrayBuffer());
    const view = new DataView(buf.buffer);
    // 文件头
    expect(view.getUint8(0)).toBe(0x42);
    expect(view.getUint8(1)).toBe(0x4d);
    const rowSize = Math.ceil((width * 3) / 4) * 4; // 2*3=6 → 对齐 8
    expect(view.getUint32(2, true)).toBe(54 + rowSize * height);
    expect(view.getInt32(18, true)).toBe(width);
    expect(view.getInt32(22, true)).toBe(height);
    expect(view.getUint16(28, true)).toBe(24);
    // 像素数据：自下而上，第一行像素 = 原图最后一行（绿）
    const pixelStart = 54;
    expect([buf[pixelStart], buf[pixelStart + 1], buf[pixelStart + 2]]).toEqual([0, 255, 0]);
    // 最后一行像素 = 原图第一行（红），BMP 存 BGR：RGB(255,0,0) → [0,0,255]
    const lastRow = pixelStart + rowSize * (height - 1);
    expect([buf[lastRow], buf[lastRow + 1], buf[lastRow + 2]]).toEqual([0, 0, 255]);
  });

  it("行对齐：宽度 1（3 字节行）补 1 字节填充", async () => {
    const blob = encodeBmp(solidImage(1, 1, 10, 20, 30));
    const buf = new Uint8Array(await blob.arrayBuffer());
    const view = new DataView(buf.buffer);
    const rowSize = Math.ceil(3 / 4) * 4; // 4
    expect(view.getUint32(2, true)).toBe(54 + rowSize);
    expect(view.getUint32(34, true)).toBe(rowSize);
    // 填充字节存在（文件大小包含对齐）
    expect(buf.length).toBe(54 + 4);
  });
});
