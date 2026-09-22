import mammoth from "mammoth";
import { Buffer } from "node:buffer";
import { extractText, getDocumentProxy } from "unpdf";
import { DocumentContentError } from "./errors.ts";

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const MAX_EXTRACTED_CHARACTERS = 80_000;
const MAX_PDF_PAGES = 50;
const EXTRACTION_TIMEOUT_MS = 20_000;

export type ResumeDocumentMetadata = {
  name: string;
  mimeType: string | null;
  declaredSize: number | null;
};

export type ExtractedResume = {
  format: "pdf" | "docx";
  text: string;
  characterCount: number;
};

function documentFormat(metadata: ResumeDocumentMetadata): "pdf" | "docx" {
  const mimeType = metadata.mimeType?.split(";")[0].trim().toLowerCase() || "";
  const lowerName = metadata.name.toLowerCase();
  if (mimeType === "application/msword" || lowerName.endsWith(".doc")) {
    throw new DocumentContentError(
      "UNSUPPORTED_DOCUMENT_TYPE",
      "Legacy DOC resumes cannot be analyzed. Save the document as PDF or DOCX and upload it again.",
      415,
    );
  }
  if (mimeType === "application/pdf" || lowerName.endsWith(".pdf")) {
    return "pdf";
  }
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx")
  ) return "docx";
  throw new DocumentContentError(
    "UNSUPPORTED_DOCUMENT_TYPE",
    "This resume type is not supported for analysis. Upload a text-based PDF or DOCX file.",
    415,
  );
}

function hasPrefix(bytes: Uint8Array, prefix: number[]): boolean {
  return prefix.every((value, index) => bytes[index] === value);
}

async function withTimeout<T>(
  work: Promise<T>,
  milliseconds: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new DocumentContentError(
            "DOCUMENT_EXTRACTION_FAILED",
            "The resume took too long to read. Try a smaller text-based PDF or DOCX file.",
          ),
        ),
      milliseconds,
    );
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

async function extractPdf(bytes: Uint8Array): Promise<string> {
  if (!hasPrefix(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    throw new DocumentContentError(
      "DOCUMENT_READ_FAILED",
      "The selected file is not a valid PDF document.",
    );
  }
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | null = null;
  try {
    pdf = await withTimeout(getDocumentProxy(bytes), EXTRACTION_TIMEOUT_MS);
    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new DocumentContentError(
        "DOCUMENT_TOO_LARGE",
        `The PDF has too many pages to analyze. The limit is ${MAX_PDF_PAGES} pages.`,
        413,
      );
    }
    const extracted = await withTimeout(
      extractText(pdf, { mergePages: true }),
      EXTRACTION_TIMEOUT_MS,
    );
    return extracted.text;
  } catch (error) {
    if (error instanceof DocumentContentError) throw error;
    throw new DocumentContentError(
      "DOCUMENT_EXTRACTION_FAILED",
      "The PDF text could not be extracted. If it is scanned or image-only, export it as a text-based PDF or DOCX file.",
    );
  } finally {
    const destroy = (pdf as unknown as { destroy?: () => Promise<void> } | null)
      ?.destroy;
    if (destroy) await destroy.call(pdf).catch(() => undefined);
  }
}

async function extractDocx(bytes: Uint8Array): Promise<string> {
  if (!hasPrefix(bytes, [0x50, 0x4b])) {
    throw new DocumentContentError(
      "DOCUMENT_READ_FAILED",
      "The selected file is not a valid DOCX document.",
    );
  }
  try {
    const extracted = await withTimeout(
      mammoth.extractRawText({ buffer: Buffer.from(bytes) }),
      EXTRACTION_TIMEOUT_MS,
    );
    if (
      extracted.messages.some((message) => message.type === "error") &&
      !extracted.value.trim()
    ) {
      throw new DocumentContentError(
        "DOCUMENT_EXTRACTION_FAILED",
        "The DOCX text could not be extracted. Export the resume again and retry.",
      );
    }
    return extracted.value;
  } catch (error) {
    if (error instanceof DocumentContentError) throw error;
    throw new DocumentContentError(
      "DOCUMENT_EXTRACTION_FAILED",
      "The DOCX text could not be extracted. Export the resume again and retry.",
    );
  }
}

export function validateExtractedText(rawText: string): string {
  const normalized = rawText
    .normalize("NFKC")
    .replace(/\0/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const words = normalized.match(/[\p{L}\p{N}][\p{L}\p{N}+#.'\u2019-]*/gu) ||
    [];
  if (normalized.length < 40 || words.length < 8) {
    throw new DocumentContentError(
      "NO_READABLE_TEXT",
      "No readable resume text was found. Upload a text-based PDF or DOCX instead of a scanned or empty document.",
    );
  }
  if (normalized.length > MAX_EXTRACTED_CHARACTERS) {
    throw new DocumentContentError(
      "EXTRACTED_TEXT_TOO_LARGE",
      "The extracted resume text is too large to analyze safely. Upload a shorter resume.",
      413,
    );
  }
  return normalized;
}

export async function extractResumeText(
  metadata: ResumeDocumentMetadata,
  bytes: Uint8Array,
): Promise<ExtractedResume> {
  if (!bytes.byteLength) {
    throw new DocumentContentError(
      "DOCUMENT_READ_FAILED",
      "The uploaded resume is empty.",
    );
  }
  if (
    metadata.declaredSize !== null && metadata.declaredSize > MAX_DOCUMENT_BYTES
  ) {
    throw new DocumentContentError(
      "DOCUMENT_TOO_LARGE",
      "The resume exceeds the 10 MB analysis limit.",
      413,
    );
  }
  if (bytes.byteLength > MAX_DOCUMENT_BYTES) {
    throw new DocumentContentError(
      "DOCUMENT_TOO_LARGE",
      "The resume exceeds the 10 MB analysis limit.",
      413,
    );
  }
  const format = documentFormat(metadata);
  const rawText = format === "pdf"
    ? await extractPdf(bytes)
    : await extractDocx(bytes);
  const text = validateExtractedText(rawText);
  return { format, text, characterCount: text.length };
}
