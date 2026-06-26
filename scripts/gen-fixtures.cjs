// Generate document-parser test fixtures into public/test/ (txt, pdf, docx).
const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

const outDir = path.join(__dirname, "..", "public", "test");
fs.mkdirSync(outDir, { recursive: true });

// --- TXT ---
fs.writeFileSync(
  path.join(outDir, "brief.txt"),
  "Aurora Notes TXT brief. Teams waste 4 hours a week on notes. Sign up free today at auroranotes.ai.\n"
);

// --- PDF (hand-built with a correct xref table) ---
const content = "BT /F1 18 Tf 72 700 Td (Aurora Notes PDF brief. Trusted by 12000 teams. Sign up free today.) Tj ET";
const objs = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
  `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
];
let pdf = "%PDF-1.4\n";
const offsets = [];
objs.forEach((body, i) => {
  offsets[i + 1] = Buffer.byteLength(pdf);
  pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
});
const xrefStart = Buffer.byteLength(pdf);
pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
for (let i = 1; i <= objs.length; i++) {
  pdf += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
}
pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
fs.writeFileSync(path.join(outDir, "brief.pdf"), pdf, "latin1");

// --- DOCX (minimal OOXML zip) ---
const zip = new JSZip();
zip.file(
  "[Content_Types].xml",
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
);
zip.folder("_rels").file(
  ".rels",
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
);
zip.folder("word").file(
  "document.xml",
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body><w:p><w:r><w:t>Aurora Notes DOCX brief. Trusted by 12000 teams. Sign up free today at auroranotes.ai.</w:t></w:r></w:p></w:body>
</w:document>`
);
zip.generateAsync({ type: "nodebuffer" }).then((buf) => {
  fs.writeFileSync(path.join(outDir, "brief.docx"), buf);
  console.log("fixtures written to", outDir);
  console.log(fs.readdirSync(outDir));
});
