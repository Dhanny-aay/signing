import type { DocumentRef, SigningElement } from "@/lib/types/document";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import html2canvas from "html2canvas";

export interface ExportOptions {
  format: "pdf" | "png";
  dpi?: number; // for image export
  filename?: string;
}

export interface ExportContext {
  document: DocumentRef;
  pageIndex: number; // 1-based page index
  stageWidth: number; // DOM px of rendered page
  stageHeight: number; // DOM px of rendered page
}

function mapToPdf(
  el: SigningElement,
  ctx: ExportContext,
  pdfPageWidth: number,
  pdfPageHeight: number
) {
  const xRatio = pdfPageWidth / ctx.stageWidth;
  const yRatio = pdfPageHeight / ctx.stageHeight;
  const x = el.position.x * xRatio;
  const yTop = el.position.y * yRatio;
  const w = el.size.width * xRatio;
  const h = el.size.height * yRatio;
  // Convert top-left DOM origin to PDF bottom-left origin
  const y = pdfPageHeight - yTop - h;
  return { x, y, w, h };
}

function pickFont(name?: string) {
  switch (name) {
    case "TimesRoman":
      return StandardFonts.TimesRoman;
    case "Courier":
      return StandardFonts.Courier;
    default:
      return StandardFonts.Helvetica;
  }
}

export async function exportAsPdf(
  elements: SigningElement[],
  ctx: ExportContext
): Promise<Blob> {
  if (ctx.document.kind === "pdf") {
    const res = await fetch(ctx.document.url);
    const bytes = await res.arrayBuffer();
    const pdfDoc = await PDFDocument.load(bytes);
    const page = pdfDoc.getPage(ctx.pageIndex - 1);
    const { width: pw, height: ph } = page.getSize();
    // Embed chosen fonts lazily
    const fontCache = new Map<string, any>();
    const getFont = async (name?: string) => {
      const key = pickFont(name);
      if (!fontCache.has(key)) fontCache.set(key, await pdfDoc.embedFont(key));
      return fontCache.get(key);
    };

    for (const el of elements.filter((e) => e.page === ctx.pageIndex)) {
      const { x, y, w, h } = mapToPdf(el, ctx, pw, ph);
      switch (el.type) {
        case "text": {
          const fontSize =
            (el.properties?.fontSize ?? 14) * (w / Math.max(1, el.size.width));
          const font = await getFont(el.properties?.fontFamily);
          page.drawText(String(el.properties?.text ?? ""), {
            x: x + 2,
            y: y + h - fontSize - 2,
            size: Math.max(6, Math.min(48, fontSize)),
            font,
            color: rgb(0.07, 0.09, 0.15),
          });
          break;
        }
        case "date": {
          const text = String(
            el.properties?.value ?? new Date().toISOString().slice(0, 10)
          );
          const fontSize = Math.min(18, h * 0.7);
          const font = await getFont(el.properties?.fontFamily);
          page.drawText(text, {
            x: x + 2,
            y: y + h - fontSize - 2,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
          break;
        }
        case "checkbox": {
          page.drawRectangle({
            x,
            y,
            width: h,
            height: h,
            borderColor: rgb(0.2, 0.2, 0.2),
            borderWidth: 1,
          });
          if (el.properties?.checked) {
            // Draw an X
            page.drawLine({
              start: { x, y },
              end: { x: x + h, y: y + h },
              color: rgb(0.1, 0.1, 0.1),
              thickness: 1.5,
            });
            page.drawLine({
              start: { x: x + h, y },
              end: { x, y: y + h },
              color: rgb(0.1, 0.1, 0.1),
              thickness: 1.5,
            });
          }
          break;
        }
        case "radio": {
          const r = Math.min(w, h) / 2;
          page.drawCircle({
            x: x + r,
            y: y + r,
            size: r,
            borderColor: rgb(0.2, 0.2, 0.2),
            borderWidth: 1,
          });
          if (el.properties?.selected) {
            page.drawCircle({
              x: x + r,
              y: y + r,
              size: r * 0.6,
              color: rgb(0.1, 0.1, 0.1),
            });
          }
          break;
        }
        case "stamp": {
          page.drawRectangle({
            x,
            y,
            width: w,
            height: h,
            borderColor: rgb(0.1, 0.6, 0.3),
            borderWidth: 2,
          });
          const text = String(el.properties?.text ?? "APPROVED");
          const fontSize = Math.min(24, h * 0.5);
          const font = await getFont(el.properties?.fontFamily);
          const tw = font.widthOfTextAtSize(text, fontSize);
          const tx = x + (w - tw) / 2;
          const ty = y + (h - fontSize) / 2;
          page.drawText(text, {
            x: tx,
            y: ty,
            size: fontSize,
            font,
            color: rgb(0.1, 0.5, 0.3),
          });
          break;
        }
        case "signature": {
          const dataUrl: string | undefined = el.properties?.dataUrl;
          if (dataUrl) {
            const bytes = await (await fetch(dataUrl)).arrayBuffer();
            const png = await pdfDoc.embedPng(bytes);
            page.drawImage(png, { x, y, width: w, height: h });
          }
          break;
        }
        case "initials": {
          const text = String(el.properties?.value ?? "");
          const fontSize = Math.min(24, h * 0.8);
          const font = await getFont(el.properties?.fontFamily);
          page.drawText(text, {
            x: x + 4,
            y: y + (h - fontSize) / 2,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
          break;
        }
        default:
          break;
      }
    }

    // Metadata
    pdfDoc.setTitle(ctx.document.name);
    pdfDoc.setSubject("Signed document");
    pdfDoc.setProducer("Signing Platform");
    pdfDoc.setCreationDate(new Date());

    const out = await pdfDoc.save();
    return new Blob([out.buffer], { type: "application/pdf" });
  }

  // Image document: create new PDF with the image as a background
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([ctx.stageWidth, ctx.stageHeight]);
  const imgResp = await fetch(ctx.document.url);
  const imgBytes = await imgResp.arrayBuffer();
  // Heuristic: detect file type by name extension
  const isPng = ctx.document.name.toLowerCase().endsWith(".png");
  const embedded = isPng
    ? await pdfDoc.embedPng(imgBytes)
    : await pdfDoc.embedJpg(imgBytes);
  page.drawImage(embedded, {
    x: 0,
    y: 0,
    width: ctx.stageWidth,
    height: ctx.stageHeight,
  });
  const fontCache = new Map<string, any>();
  const getFont = async (name?: string) => {
    const key = pickFont(name);
    if (!fontCache.has(key)) fontCache.set(key, await pdfDoc.embedFont(key));
    return fontCache.get(key);
  };
  for (const el of elements.filter((e) => e.page === ctx.pageIndex)) {
    const { x, y, w, h } = mapToPdf(el, ctx, ctx.stageWidth, ctx.stageHeight);
    switch (el.type) {
      case "text": {
        const font = await getFont(el.properties?.fontFamily);
        page.drawText(String(el.properties?.text ?? ""), {
          x: x + 2,
          y: y + h - 12,
          size: 12,
          font,
          color: rgb(0, 0, 0),
        });
        break;
      }
      case "signature": {
        const dataUrl: string | undefined = el.properties?.dataUrl;
        if (dataUrl) {
          const bytes = await (await fetch(dataUrl)).arrayBuffer();
          const png = await pdfDoc.embedPng(bytes);
          page.drawImage(png, { x, y, width: w, height: h });
        }
        break;
      }
      case "date": {
        const text = String(
          el.properties?.value ?? new Date().toISOString().slice(0, 10)
        );
        const font = await getFont(el.properties?.fontFamily);
        page.drawText(text, {
          x: x + 2,
          y: y + h - 12,
          size: 12,
          font,
          color: rgb(0, 0, 0),
        });
        break;
      }
      case "checkbox": {
        page.drawRectangle({
          x,
          y,
          width: h,
          height: h,
          borderColor: rgb(0.2, 0.2, 0.2),
          borderWidth: 1,
        });
        if (el.properties?.checked) {
          page.drawLine({
            start: { x, y },
            end: { x: x + h, y: y + h },
            color: rgb(0.1, 0.1, 0.1),
            thickness: 1.5,
          });
          page.drawLine({
            start: { x: x + h, y },
            end: { x, y: y + h },
            color: rgb(0.1, 0.1, 0.1),
            thickness: 1.5,
          });
        }
        break;
      }
      case "stamp": {
        page.drawRectangle({
          x,
          y,
          width: w,
          height: h,
          borderColor: rgb(0.1, 0.6, 0.3),
          borderWidth: 2,
        });
        const text = String(el.properties?.text ?? "APPROVED");
        const fontSize = Math.min(24, h * 0.5);
        const font = await getFont(el.properties?.fontFamily);
        const tw = font.widthOfTextAtSize(text, fontSize);
        const tx = x + (w - tw) / 2;
        const ty = y + (h - fontSize) / 2;
        page.drawText(text, {
          x: tx,
          y: ty,
          size: fontSize,
          font,
          color: rgb(0.1, 0.5, 0.3),
        });
        break;
      }
      default:
        break;
    }
  }
  const out = await pdfDoc.save();
  return new Blob([out], { type: "application/pdf" });
}

export async function exportAsImage(
  stageEl: HTMLElement,
  opts: ExportOptions
): Promise<Blob> {
  const scale = (opts.dpi ?? 144) / 96; // default DPI: 144 for sharper output
  const canvas = await html2canvas(stageEl, {
    scale,
    backgroundColor: "#ffffff",
  });
  const type = opts.format === "png" ? "image/png" : "image/jpeg";
  const blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b as Blob), type)
  );
  return blob;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportFullPdf(
  document: DocumentRef,
  pages: { index: number; width?: number; height?: number }[],
  elements: SigningElement[],
  fallbackStage: { width: number; height: number } | null = null
): Promise<Blob> {
  // Load or create base PDF
  let pdfDoc: PDFDocument;
  let pageSizes: Array<{ width: number; height: number }>; // in PDF points
  if (document.kind === "pdf") {
    const res = await fetch(document.url);
    const bytes = await res.arrayBuffer();
    pdfDoc = await PDFDocument.load(bytes);
    pageSizes = pdfDoc.getPages().map((p) => p.getSize());
  } else {
    pdfDoc = await PDFDocument.create();
    // Create pages from image only for pages that exist
    pageSizes = pages.map(() => ({
      width: fallbackStage?.width ?? 800,
      height: fallbackStage?.height ?? 1100,
    }));
  }
  const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Ensure pages exist in doc for image kind
  if (document.kind === "image") {
    // Single page only for images by default
    const size = pageSizes[0];
    const page = pdfDoc.addPage([size.width, size.height]);
    const imgResp = await fetch(document.url);
    const imgBytes = await imgResp.arrayBuffer();
    const isPng = document.name.toLowerCase().endsWith(".png");
    const embedded = isPng
      ? await pdfDoc.embedPng(imgBytes)
      : await pdfDoc.embedJpg(imgBytes);
    page.drawImage(embedded, {
      x: 0,
      y: 0,
      width: size.width,
      height: size.height,
    });
  }

  // Overlay elements page by page
  for (let i = 0; i < pages.length; i++) {
    const pageIndex = i + 1;
    const size = pageSizes[i] ?? pageSizes[0];
    const pw = size.width,
      ph = size.height;
    const page =
      document.kind === "pdf" ? pdfDoc.getPage(i) : pdfDoc.getPages()[i];

    // Determine stage dimensions in DOM units at zoom=1
    const baseW = pages[i].width ?? fallbackStage?.width ?? pw;
    const baseH = pages[i].height ?? fallbackStage?.height ?? ph;
    const ctx = {
      document,
      pageIndex,
      stageWidth: baseW,
      stageHeight: baseH,
    } as ExportContext;

    for (const el of elements.filter((e) => e.page === pageIndex)) {
      const { x, y, w, h } = mapToPdf(el, ctx, pw, ph);
      switch (el.type) {
        case "text": {
          const fontSize = Math.max(
            6,
            Math.min(
              48,
              (el.properties?.fontSize ?? 14) * (w / Math.max(1, el.size.width))
            )
          );
          page.drawText(String(el.properties?.text ?? ""), {
            x: x + 2,
            y: y + h - fontSize - 2,
            size: fontSize,
            font: helv,
            color: rgb(0.07, 0.09, 0.15),
          });
          break;
        }
        case "date": {
          const text = String(
            el.properties?.value ?? new Date().toISOString().slice(0, 10)
          );
          const fontSize = Math.min(18, h * 0.7);
          page.drawText(text, {
            x: x + 2,
            y: y + h - fontSize - 2,
            size: fontSize,
            font: helv,
            color: rgb(0, 0, 0),
          });
          break;
        }
        case "checkbox": {
          page.drawRectangle({
            x,
            y,
            width: h,
            height: h,
            borderColor: rgb(0.2, 0.2, 0.2),
            borderWidth: 1,
          });
          if (el.properties?.checked) {
            page.drawLine({
              start: { x, y },
              end: { x: x + h, y: y + h },
              color: rgb(0.1, 0.1, 0.1),
              thickness: 1.5,
            });
            page.drawLine({
              start: { x: x + h, y },
              end: { x, y: y + h },
              color: rgb(0.1, 0.1, 0.1),
              thickness: 1.5,
            });
          }
          break;
        }
        case "radio": {
          const r = Math.min(w, h) / 2;
          page.drawCircle({
            x: x + r,
            y: y + r,
            size: r,
            borderColor: rgb(0.2, 0.2, 0.2),
            borderWidth: 1,
          });
          if (el.properties?.selected)
            page.drawCircle({
              x: x + r,
              y: y + r,
              size: r * 0.6,
              color: rgb(0.1, 0.1, 0.1),
            });
          break;
        }
        case "stamp": {
          page.drawRectangle({
            x,
            y,
            width: w,
            height: h,
            borderColor: rgb(0.1, 0.6, 0.3),
            borderWidth: 2,
          });
          const text = String(el.properties?.text ?? "APPROVED");
          const fontSize = Math.min(24, h * 0.5);
          const tw = helv.widthOfTextAtSize(text, fontSize);
          const tx = x + (w - tw) / 2;
          const ty = y + (h - fontSize) / 2;
          page.drawText(text, {
            x: tx,
            y: ty,
            size: fontSize,
            font: helv,
            color: rgb(0.1, 0.5, 0.3),
          });
          break;
        }
        case "signature": {
          const dataUrl: string | undefined = el.properties?.dataUrl;
          if (dataUrl) {
            const bytes = await (await fetch(dataUrl)).arrayBuffer();
            const png = await pdfDoc.embedPng(bytes);
            page.drawImage(png, { x, y, width: w, height: h });
          }
          break;
        }
        case "initials": {
          const text = String(el.properties?.value ?? "");
          const fontSize = Math.min(24, h * 0.8);
          page.drawText(text, {
            x: x + 4,
            y: y + (h - fontSize) / 2,
            size: fontSize,
            font: helv,
            color: rgb(0, 0, 0),
          });
          break;
        }
        default:
          break;
      }
    }
  }

  pdfDoc.setTitle(document.name);
  pdfDoc.setSubject("Signed document");
  pdfDoc.setProducer("Signing Platform");
  pdfDoc.setCreationDate(new Date());
  const out = await pdfDoc.save();
  return new Blob([out.buffer], { type: "application/pdf" });
}
