import fs from "fs";
import https from "https";

export type ExportItem = {
  quantity?: number | string;
  qty?: number | string;
  unitPrice?: number | string;
  price?: number | string;
  discount?: number | string;
  total?: number | string;
  totalPrice?: number | string;
  productName?: string;
  name?: string;
};

export function asExportItem(value: unknown): ExportItem {
  return value && typeof value === "object" ? value as ExportItem : {};
}

export function asExportRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

export function ensureFontExists(resourceFontPath: string): Promise<string | null> {
  if (fs.existsSync(resourceFontPath)) return Promise.resolve(resourceFontPath);
  return new Promise((resolve) => {
    const file = fs.createWriteStream(resourceFontPath);
    https.get("https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Regular.ttf", (response) => {
      response.pipe(file);
      file.on("finish", () => { file.close(); resolve(resourceFontPath); });
    }).on("error", () => {
      fs.unlink(resourceFontPath, () => {});
      resolve(null);
    });
  });
}

export function reverseArabicLine(text: string): string {
  if (!text) return "";
  if (!/[\u0600-\u06FF]/.test(text)) return text;
  return text.split(" ").map((word) => /[\u0600-\u06FF]/.test(word) ? word.split("").reverse().join("") : word).reverse().join(" ");
}
