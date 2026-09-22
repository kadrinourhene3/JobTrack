import { strToU8, zipSync } from "fflate";
import { extractResumeText, validateExtractedText } from "./documentText.ts";
import { DocumentContentError } from "./errors.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function pdfFixture(text: string): Uint8Array {
  const escaped = text.replace(/([\\()])/g, "\\$1");
  const stream = `BT /F1 12 Tf 72 720 Td (${escaped}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${
    objects.length + 1
  } /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function docxFixture(text: string): Uint8Array {
  const documentXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p><w:sectPr/></w:body></w:document>`;
  return zipSync({
    "[Content_Types].xml": strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    ),
    "_rels/.rels": strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    ),
    "word/document.xml": strToU8(documentXml),
    "word/_rels/document.xml.rels": strToU8(
      '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>',
    ),
  });
}

Deno.test("extractResumeText reads actual PDF text", async () => {
  const source =
    "React Native TypeScript Supabase developer building secure mobile applications and measurable product improvements.";
  const bytes = pdfFixture(source);
  const extracted = await extractResumeText({
    name: "mobile-resume.pdf",
    mimeType: "application/pdf",
    declaredSize: bytes.length,
  }, bytes);
  assert(extracted.format === "pdf", "Expected PDF format.");
  assert(
    extracted.text.includes("React Native TypeScript Supabase"),
    "Expected real PDF text in extraction output.",
  );
});

Deno.test("extractResumeText reads actual DOCX text", async () => {
  const source =
    "Data Scientist using Python machine learning XGBoost experimentation statistics and production model monitoring.";
  const bytes = docxFixture(source);
  const extracted = await extractResumeText({
    name: "data-resume.docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    declaredSize: bytes.length,
  }, bytes);
  assert(extracted.format === "docx", "Expected DOCX format.");
  assert(
    extracted.text.includes("Python machine learning XGBoost"),
    "Expected real DOCX text in extraction output.",
  );
});

Deno.test("validateExtractedText rejects empty or unreadable content", () => {
  let rejected = false;
  try {
    validateExtractedText("   ");
  } catch (error) {
    rejected = error instanceof DocumentContentError &&
      error.code === "NO_READABLE_TEXT";
  }
  assert(rejected, "Expected an explicit no-readable-text error.");
});
