/**
 * letterGeneratorService.ts
 * --------------------------
 * Orchestrates dispute letter creation and local exports. Drafting itself is
 * delegated to openaiService, with a local educational template fallback.
 * The MVP now creates real downloadable files from the renderer so users can
 * save drafts immediately while PDF/DOCX-grade formatting can be improved in
 * the Electron main process later.
 */

import type { DisputeLetter, GenerateLetterInput } from "@/types";
import { draftDisputeLetter } from "./openaiService";
import { letterTitleFor } from "./letterTemplates";

export async function generateLetter(
  clientId: string,
  input: GenerateLetterInput,
  negativeItemId?: string
): Promise<{ letter: DisputeLetter; aiUsed: boolean }> {
  const { text: bodyText, aiUsed } = await draftDisputeLetter(input);
  const now = new Date().toISOString();

  return {
    letter: {
      id: `letter-${Date.now()}`,
      clientId,
      negativeItemId,
      letterType: input.letterType,
      bureau: input.bureau,
      creditorName: input.accountName,
      accountNumberMasked: input.accountNumber,
      title: letterTitleFor(input),
      bodyText,
      createdAt: now,
      updatedAt: now,
    },
    aiUsed,
  };
}

export interface ExportResult {
  ok: boolean;
  fileName: string;
  message: string;
}

export async function exportLetterAsPdf(letter: DisputeLetter): Promise<ExportResult> {
  await delay(150);
  const fileName = `${slugify(letter.title)}.pdf`;
  const pdf = buildSimplePdf(`${letter.title}\n\n${letter.bodyText}`);
  downloadBlob(new Blob([pdf], { type: "application/pdf" }), fileName);
  return {
    ok: true,
    fileName,
    message: "PDF saved locally. Review the draft before mailing or submitting.",
  };
}

export async function exportLetterAsDocx(letter: DisputeLetter): Promise<ExportResult> {
  await delay(150);
  const fileName = `${slugify(letter.title)}.doc`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(letter.title)}</title></head><body><pre style="font-family: Arial, sans-serif; white-space: pre-wrap; line-height: 1.5;">${escapeHtml(letter.bodyText)}</pre></body></html>`;
  downloadBlob(new Blob([html], { type: "application/msword" }), fileName);
  return {
    ok: true,
    fileName,
    message: "Word-compatible document saved locally. Open it in Word, Pages, or Google Docs to edit formatting.",
  };
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function downloadBlob(blob: Blob, fileName: string) {
  if (typeof document === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildSimplePdf(text: string): string {
  const lines = text.replace(/\r/g, "").split("\n").flatMap((line) => wrapLine(line, 86));
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += 45) pages.push(lines.slice(i, i + 45));
  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(`<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`);

  pages.forEach((pageLines, pageIndex) => {
    const pageObj = 3 + pageIndex * 2;
    const streamObj = pageObj + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${streamObj} 0 R >>`);
    const content = ["BT", "/F1 10 Tf", "50 750 Td", "14 TL"];
    pageLines.forEach((line, idx) => {
      if (idx === 0) content.push(`(${escapePdf(line)}) Tj`);
      else content.push(`T* (${escapePdf(line)}) Tj`);
    });
    content.push("ET");
    const stream = content.join("\n");
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function wrapLine(line: string, max: number): string[] {
  if (!line.trim()) return [""];
  const words = line.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function escapePdf(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
