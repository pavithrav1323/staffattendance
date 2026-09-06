import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import type { ClinicalReportDetail } from "./clinical-reports.service.js";
import { generateClinicalReportPdf } from "./clinical-reports.pdf.js";

const execFileAsync = promisify(execFile);
const conversionError = "Failed to convert Clinical Report PDF to DOCX.";
const converterScript =
  "import sys; from pdf2docx import Converter; converter = Converter(sys.argv[1]); converter.convert(sys.argv[2]); converter.close()";

function pythonCommands(): string[] {
  return process.platform === "win32" ? ["python", "py"] : ["python3", "python"];
}

async function convertPdfToDocx(pdfBuffer: Buffer): Promise<Buffer> {
  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "clinical-report-")
  );
  const pdfPath = path.join(temporaryDirectory, "report.pdf");
  const docxPath = path.join(temporaryDirectory, "report.docx");

  try {
    await fs.writeFile(pdfPath, pdfBuffer);

    let lastError: unknown;
    for (const python of pythonCommands()) {
      try {
        await execFileAsync(
          python,
          ["-c", converterScript, pdfPath, docxPath],
          { windowsHide: true, maxBuffer: 1024 * 1024 }
        );
        const docxBuffer = await fs.readFile(docxPath);
        if (docxBuffer.length === 0) {
          throw new Error("The converter produced an empty DOCX file");
        }
        return docxBuffer;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error("No Python runtime available");
  } catch (error) {
    console.error("Clinical Report PDF-to-DOCX conversion failed", error);
    throw new Error(conversionError, { cause: error });
  } finally {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
}

export async function generateClinicalReportDocx(
  report: ClinicalReportDetail
): Promise<Buffer> {
  const pdfBuffer = await generateClinicalReportPdf(report);
  return convertPdfToDocx(pdfBuffer);
}
