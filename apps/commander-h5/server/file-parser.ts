/**
 * Commander V6.0 — File Parser
 * 支持从 PDF、文本文件中提取文本内容，供 AI 引擎分析
 */

import fs from "fs";
import path from "path";

/**
 * 从文件中提取文本内容
 * 支持：PDF、TXT、CSV、JSON、MD
 */
export async function extractTextFromFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".pdf") {
    return extractFromPdf(filePath);
  } else if ([".txt", ".md", ".csv", ".json"].includes(ext)) {
    return fs.readFileSync(filePath, "utf-8");
  } else {
    // 对于不支持的格式，返回文件名作为上下文
    return `文件名：${path.basename(filePath)}（格式：${ext}，内容需人工解析）`;
  }
}

async function extractFromPdf(filePath: string): Promise<string> {
  try {
    // 动态导入 pdf-parse（兼容 CommonJS/ESM）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParse: any = await import("pdf-parse").catch(() => null);
    if (!pdfParse) {
      return `PDF 文件：${path.basename(filePath)}（pdf-parse 未可用）`;
    }
    const dataBuffer = fs.readFileSync(filePath);
    const parseFn = pdfParse.default ?? pdfParse;
    const data = await parseFn(dataBuffer);
    return data.text || `PDF 文件：${path.basename(filePath)}（无可提取文本）`;
  } catch (err) {
    console.warn("[file-parser] PDF 解析失败:", err);
    return `PDF 文件：${path.basename(filePath)}（解析失败，请检查文件格式）`;
  }
}

/**
 * 将文本截断到指定长度（避免超出 LLM token 限制）
 */
export function truncateText(text: string, maxChars = 5000): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n...[内容已截断，共 " + text.length + " 字符]";
}
