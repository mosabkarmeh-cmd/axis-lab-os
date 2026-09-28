import fs from "fs";
import https from "https";
import path from "path";

export function reverseArabicLine(text: string): string {
  if (!text) return "";
  if (!/[\u0600-\u06FF]/.test(text)) return text;
  const words = text.split(" ");
  const reversedWords = words.map((word) => {
    if (/[\u0600-\u06FF]/.test(word)) {
      return word.split("").reverse().join("");
    }
    return word;
  });
  return reversedWords.reverse().join(" ");
}

export function createEnsureFontExists(resourceFontPath: string, fallbackFontPath: string) {
  return async function ensureFontExists(): Promise<string | null> {
    if (fs.existsSync(resourceFontPath)) return resourceFontPath;
    if (fs.existsSync(fallbackFontPath)) return fallbackFontPath;

    await fs.promises.mkdir(path.dirname(fallbackFontPath), { recursive: true });
    const tempPath = `${fallbackFontPath}.tmp`;

    return new Promise((resolve) => {
      const request = https.get(
        "https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Regular.ttf",
        (response) => {
          if (response.statusCode && response.statusCode >= 400) {
            response.resume();
            resolve(null);
            return;
          }
          const file = fs.createWriteStream(tempPath);
          response.pipe(file);
          file.on("finish", () => {
            file.close(() => {
              try {
                fs.renameSync(tempPath, fallbackFontPath);
                resolve(fallbackFontPath);
              } catch (error) {
                try { fs.unlinkSync(tempPath); } catch {}
                console.error("Failed to store Amiri font", error);
                resolve(null);
              }
            });
          });
          file.on("error", () => {
            try { fs.unlinkSync(tempPath); } catch {}
            resolve(null);
          });
        }
      );

      request.on("error", (error) => {
        try { fs.unlinkSync(tempPath); } catch {}
        console.error("Failed to download Amiri font, falling back", error);
        resolve(null);
      });
      request.setTimeout(15000, () => {
        request.destroy(new Error("Font download timeout"));
      });
    });
  };
}
