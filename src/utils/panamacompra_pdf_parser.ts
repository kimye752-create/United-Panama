/**
 * PanamaCompra ORDEN DE COMPRA PDF — pdf-parse 텍스트·정규식 추출 (순수 로직)
 */
/// <reference types="node" />

import { readFile } from "node:fs/promises";

import { PDFParse } from "pdf-parse";

export type RenglonParsed = {
  codigo: string;
  cantidad: number;
  precioUnitario: number;
  importeTotal: number;
  descripcion: string;
  atcCode: string;
  registroSanitario: string;
  origen: string;
  fabricante: string;
  formaFarma: string;
  concentracion: string;
  presentacion: string;
};

export type ParsedPriceData = {
  procesoNumero: string;
  proveedor: string;
  entidadCompradora: string;
  renglones: RenglonParsed[];
  rawTextFirstPage: string;
};

/** B/. 또는 숫자만 */
function parseMoneyEs(raw: string): number {
  const t = raw.replace(/\s/g, "").replace(/B\/\.\s*/gi, "");
  const normalized =
    t.includes(",") && !t.includes(".")
      ? t.replace(/\./g, "").replace(",", ".")
      : t.replace(/,/g, "");
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : Number.NaN;
}

function parseFloatEs(raw: string): number {
  const s = raw.trim().replace(/\s/g, "");
  const n = Number.parseFloat(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : Number.NaN;
}

function parseCantidad(raw: string): number {
  const n = parseFloatEs(raw);
  return Number.isFinite(n) ? n : Number.NaN;
}

/** 문서 전역 ATC (첫 매칭) */
function extractGlobalAtc(text: string): string {
  const m1 = text.match(/Código\s+Externo\s*\(ATC\)\s*:\s*([A-Z0-9]+)/i);
  if (m1 !== null) {
    return (m1[1] ?? "").trim();
  }
  const m2 = text.match(/\b([A-Z]\d{2}[A-Z]{1,2}\d{0,3})\b/);
  if (m2 !== null && /^[A-Z]\d{2}/.test(m2[1] ?? "")) {
    return (m2[1] ?? "").trim();
  }
  return "";
}

/**
 * ORDEN PDF 전체 텍스트에서 RENGLÓN·표 형식 라인 추출
 */
export async function extractPriceFromOrdenPDF(
  pdfPath: string,
  procesoNumero: string,
): Promise<ParsedPriceData> {
  const fileBuf = await readFile(pdfPath);
  const parser = new PDFParse({ data: new Uint8Array(fileBuf) });
  let fullText = "";
  try {
    const trAll = await parser.getText();
    fullText = trAll.text;
  } finally {
    await parser.destroy();
  }

  /** 디버깅용 — 전체 텍스트 앞부분(첫 페이지에 가까운 구간) */
  const rawTextFirstPage = fullText.slice(0, 1000);
  const text = fullText;

  const globalAtc = extractGlobalAtc(text);

  const provM = text.match(
    /PROVEEDOR\s+([A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑ0-9\s,.&]+?(?:S\.A\.?|S\.R\.L\.?|LTDA\.?|[A-ZÁÉÍÓÚÑ]))/im,
  );
  const proveedor =
    provM !== null
      ? (provM[1] ?? "").trim().replace(/\s+/g, " ")
      : "";

  let entidadCompradora = "";
  if (/CAJA\s+DE\s+SEGURO\s+SOCIAL/i.test(text)) {
    entidadCompradora = "CAJA DE SEGURO SOCIAL (CSS)";
  } else if (/MINISTERIO\s+DE\s+SALUD/i.test(text)) {
    entidadCompradora = "MINISTERIO DE SALUD (MINSA)";
  }

  const renglones: RenglonParsed[] = [];

  const blockRe =
    /RENGL[OÓ]N\s+(\d+)[\s\S]*?(?=RENGL[OÓ]N\s+\d+|$)/gi;
  let blockMatch: RegExpExecArray | null;
  const blocks: string[] = [];
  while ((blockMatch = blockRe.exec(text)) !== null) {
    blocks.push(blockMatch[0]);
  }
  if (blocks.length === 0) {
    blocks.push(text);
  }

  const linePipe =
    /([A-Z0-9]+)\s*\|\s*([\d.,]+)\s*\|\s*([\d.,]+)\s*\|\s*B\/\.\s*([\d.,]+)/gi;

  const descGlobalM = text.match(
    /DESCRIPCI[OÓ]N\s*:?\s*([\s\S]+?)(?=CONDICI[OÓ]N\s+DE\s+VENTA|VIA\s+DE\s+ADMINISTRACI[OÓ]N|Código\s+Externo|$)/i,
  );
  const descripcionGlobal =
    descGlobalM !== null
      ? (descGlobalM[1] ?? "").trim().replace(/\s+/g, " ").slice(0, 500)
      : "";

  for (const block of blocks) {
    let rowM: RegExpExecArray | null;
    const sub = block;
    while ((rowM = linePipe.exec(sub)) !== null) {
      const codigo = (rowM[1] ?? "").trim();
      const cantidad = parseCantidad(rowM[2] ?? "");
      const pUnit = parseFloatEs(rowM[3] ?? "");
      const imp = parseMoneyEs(rowM[4] ?? "");

      const rsM = block.match(/REGISTRO\s+SANITARIO\s*:\s*(R[\d-]+)/i);
      const origM = block.match(
        /PA[ÍI]S\s+DE\s+PROCEDENCIA\s+([A-Za-zÁÉÍÓÚÑ]+)/i,
      );
      const fabM = block.match(
        /ELABORADO\s+POR\/FABRICANTE:?\s*([^\n]+)/i,
      );
      const ffM = block.match(/FORMA\s+FARMAC[ÉE]UTICA\s+([^\n]+)/i);
      const concM = block.match(/Concentraci[oó]n\s*:\s*([^\n]+)/i);
      const presM = block.match(/PRESENTACI[OÓ]N\s+([^\n]+)/i);

      renglones.push({
        codigo,
        cantidad,
        precioUnitario: pUnit,
        importeTotal: imp,
        descripcion: descripcionGlobal,
        atcCode: globalAtc || extractGlobalAtc(block),
        registroSanitario: rsM !== null ? (rsM[1] ?? "").trim() : "",
        origen: origM !== null ? (origM[1] ?? "").trim() : "",
        fabricante: fabM !== null ? (fabM[1] ?? "").trim() : "",
        formaFarma: ffM !== null ? (ffM[1] ?? "").trim() : "",
        concentracion: concM !== null ? (concM[1] ?? "").trim() : "",
        presentacion: presM !== null ? (presM[1] ?? "").trim() : "",
      });
    }
    linePipe.lastIndex = 0;
  }

  if (renglones.length === 0) {
    const legacy = text.match(
      /CÓDIGO\(S\)\s+CANTIDAD\s+P\.\s*UNITARIO\s+IMPORTE\s+([A-Z0-9-]+)\s+([\d.,]+)\s+([\d.,]+)\s+B\/\.\s*([\d.,]+)/i,
    );
    if (legacy !== null) {
      renglones.push({
        codigo: (legacy[1] ?? "").trim(),
        cantidad: parseCantidad(legacy[2] ?? ""),
        precioUnitario: parseFloatEs(legacy[3] ?? ""),
        importeTotal: parseMoneyEs(legacy[4] ?? ""),
        descripcion: descripcionGlobal,
        atcCode: globalAtc,
        registroSanitario: "",
        origen: "",
        fabricante: "",
        formaFarma: "",
        concentracion: "",
        presentacion: "",
      });
    }
  }

  return {
    procesoNumero,
    proveedor,
    entidadCompradora,
    renglones,
    rawTextFirstPage,
  };
}
