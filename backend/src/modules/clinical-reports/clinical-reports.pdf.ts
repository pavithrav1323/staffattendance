import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit-table";

import type { ClinicalReportDetail } from "./clinical-reports.service.js";
import { CLINICAL_REPORT_LAYOUT } from "./clinical-reports.layout.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const translations = {
  en: {
    docRef: "BPL.KKM.PK (T) 08.3A/17",
    ministry: "MINISTRY OF HEALTH MALAYSIA",
    title: "CLINICAL AREA MONITORING REPORT",
    unitLocation: "UNIT / LOCATION NAME     : ",
    dateTime: "DATE & TIME OF MONITORING : ",
    reportId: "REPORT ID : ",

    bil: "NO.",
    traineeName: "TRAINEE\nNAME",
    group: "GROUP",
    monitoringObjective: "MONITORING\nOBJECTIVE",
    teachingLearningActivities: "TEACHING AND\nLEARNING ACTIVITIES",
    clinicalPracticeRecordBook: "MONITORING\nOF CLINICAL\nPRACTICE\nRECORD BOOK",
    disciplineTraineeWelfareDiscussion:
      "DISCIPLINE\n/ TRAINEE\nWELFARE /\nDISCUSSION\nWITH LP /\nSUPERVISOR",
    signature: "Signature:",
    nameOfInstructor: "Name of Instructor:",
    tpa: "TPA/KP Verification:",
    date: "Date:",
  },
  ms: {
    docRef: "BPL.KKM.PK (T) 08.3A/17",
    ministry: "KEMENTERIAN KESIHATAN MALAYSIA",
    title: "LAPORAN PEMANTAUAN KAWASAN KLINIKAL",
    unitLocation: "NAMA UNIT/ TEMPAT        : ",
    dateTime: "TARIKH & MASA PEMANTAUAN : ",
    reportId: "ID LAPORAN : ",

    bil: "BIL",
    traineeName: "NAMA\nPELATIH",
    group: "KUMPULAN",
    monitoringObjective: "OBJEKTIF\nPEMANTAUAN",
    teachingLearningActivities: "AKTIVITI PENGAJARAN\nDAN\nPEMBELAJARAN",
    clinicalPracticeRecordBook: "PEMANTAUAN\nBUKU REKOD\nPRAKTIS\nKLINIKAL",
    disciplineTraineeWelfareDiscussion:
      "DISIPLIN\nKEBAJIKAN\nPELATIH /\nPERBINCANGAN\nDENGAN LP /\nPENYELIA",
    signature: "Tandatangan:",
    nameOfInstructor: "Nama Pengajar:",
    tpa: "Pengesahan TPA/KP",
    date: "Tarikh :",
  },
};

function resolveLogoPath(): string {
  const candidates = [
    path.resolve(__dirname, "../../../../frontend/dist/images/ilkkmlogo.png"),
    path.resolve(__dirname, "../../../../frontend/public/images/ilkkmlogo.png"),
    path.resolve(process.cwd(), "../frontend/dist/images/ilkkmlogo.png"),
    path.resolve(process.cwd(), "../frontend/public/images/ilkkmlogo.png"),
    path.resolve(process.cwd(), "frontend/dist/images/ilkkmlogo.png"),
    path.resolve(process.cwd(), "frontend/public/images/ilkkmlogo.png"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error("ILKKM logo not found");
}

function formatDateTime(value: Date | string, locale: string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString(locale === "ms" ? "ms-MY" : "en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function generateClinicalReportPdf(
  report: ClinicalReportDetail
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const t = translations[report.language as "en" | "ms"] || translations.en;
    const logoPath = resolveLogoPath();

    const PDF = PDFDocument as unknown as new (
      options: Record<string, unknown>
    ) => PDFKit.PDFDocument & {
      table: (table: unknown, options?: Record<string, unknown>) => Promise<void>;
    };

    const doc = new PDF({
      size: "A4",
      layout: CLINICAL_REPORT_LAYOUT.page.orientation,
      margin: CLINICAL_REPORT_LAYOUT.margins.topPt,
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err: Error) => reject(err));

    const pageWidth = doc.page.width;
    const rightX = pageWidth - CLINICAL_REPORT_LAYOUT.margins.rightPt;

    doc.fontSize(9).text(
      t.docRef,
      rightX - 200,
      CLINICAL_REPORT_LAYOUT.header.documentCode.yPt,
      {
        width: CLINICAL_REPORT_LAYOUT.header.documentCode.widthPt,
        align: "right",
      }
    );

    const logoY = CLINICAL_REPORT_LAYOUT.header.logo.yPt;
    doc.image(logoPath, CLINICAL_REPORT_LAYOUT.header.logo.xPt, logoY, {
      width: CLINICAL_REPORT_LAYOUT.header.logo.widthPt,
    });
    doc.y = logoY + 60;

    doc.font("Helvetica").fontSize(13).text(t.ministry, 30, doc.y, {
      align: "center",
    });
    doc.moveDown(0.3);
    doc.font("Helvetica-Bold").fontSize(15).text(t.title, { align: "center" });
    doc.moveDown(0.6);

    doc.font("Helvetica-Bold").fontSize(10);
    const metadataLabelX = CLINICAL_REPORT_LAYOUT.margins.leftPt;
    const metadataLabel = (label: string) => label.replace(/:\s*$/, "");
    const metadataColonX =
      metadataLabelX + CLINICAL_REPORT_LAYOUT.metadata.labelWidthPt;
    const metadataValueX =
      metadataColonX + CLINICAL_REPORT_LAYOUT.metadata.colonWidthPt;
    const metadataValueWidth =
      doc.page.width -
      CLINICAL_REPORT_LAYOUT.margins.rightPt -
      metadataValueX;

    const metadataUnitY = doc.y;
    doc.text(metadataLabel(t.unitLocation), metadataLabelX, metadataUnitY, {
      width: CLINICAL_REPORT_LAYOUT.metadata.labelWidthPt,
      continued: false,
    });
    doc.text(":", metadataColonX, metadataUnitY, {
      width: CLINICAL_REPORT_LAYOUT.metadata.colonWidthPt,
      continued: false,
    });
    doc.text(report.unitLocation, metadataValueX, metadataUnitY, {
      width: metadataValueWidth,
      continued: false,
    });
    doc.moveDown(0.25);
    const metadataDateY = doc.y;
    doc.text(metadataLabel(t.dateTime), metadataLabelX, metadataDateY, {
      width: CLINICAL_REPORT_LAYOUT.metadata.labelWidthPt,
      continued: false,
    });
    doc.text(":", metadataColonX, metadataDateY, {
      width: CLINICAL_REPORT_LAYOUT.metadata.colonWidthPt,
      continued: false,
    });
    doc.text(formatDateTime(report.monitoringDateTime, report.language), metadataValueX, metadataDateY, {
      width: metadataValueWidth,
      continued: false,
    });
    doc.moveDown(0.5);

    const tableX = CLINICAL_REPORT_LAYOUT.table.xPt;
    const tableWidth = CLINICAL_REPORT_LAYOUT.table.widthPt;
    const colWidths = [...CLINICAL_REPORT_LAYOUT.table.columnWidthsPt];

    const colPositions: number[] = [];
    let cx = tableX;
    for (const w of colWidths) {
      colPositions.push(cx);
      cx += w;
    }
    colPositions.push(cx);

    const cellPadding = CLINICAL_REPORT_LAYOUT.table.cellPaddingPt;
    const minRowHeight = CLINICAL_REPORT_LAYOUT.table.minimumRowHeightPt;
    const fontSize = CLINICAL_REPORT_LAYOUT.table.bodyFontSizePt;
    const headerFontSize = CLINICAL_REPORT_LAYOUT.table.headerFontSizePt;
    const bottomReserve = CLINICAL_REPORT_LAYOUT.table.bottomReservePt;
    const pageBottom = doc.page.height - doc.page.margins.bottom;

    function textHeight(
      text: string,
      width: number,
      align: "left" | "center" = "left"
    ): number {
      return doc.heightOfString(String(text), {
        width: Math.max(1, width - 2 * cellPadding),
        align,
        lineBreak: true,
      });
    }

    function headerHeight(): number {
      doc.font("Helvetica-Bold").fontSize(headerFontSize);
      const labels = [
        t.bil,
        t.traineeName,
        t.group,
        t.monitoringObjective,
        t.teachingLearningActivities,
        t.clinicalPracticeRecordBook,
        t.disciplineTraineeWelfareDiscussion,
      ];
      const heights = labels.map((label, i) =>
        textHeight(label, colWidths[i], "center")
      );
      return Math.max(...heights, minRowHeight) + 2 * cellPadding;
    }

    function rowHeight(row: { [key: string]: string }): number {
      doc.font("Helvetica").fontSize(fontSize);
      const values = [
        row.no,
        row.traineeName,
        row.group,
        row.monitoringObjective,
        row.teachingLearningActivities,
        row.clinicalPracticeRecordBook,
        row.disciplineTraineeWelfareDiscussion,
      ];
      const heights = values.map((val, i) =>
        textHeight(String(val), colWidths[i], "left")
      );
      return Math.max(Math.max(...heights, 0) + 2 * cellPadding, minRowHeight);
    }

    function drawLine(x1: number, y1: number, x2: number, y2: number) {
      doc
        .lineWidth(0.5)
        .strokeColor("#000000")
        .moveTo(x1, y1)
        .lineTo(x2, y2)
        .stroke();
    }

    function drawHeader(y: number): number {
      const hHeight = headerHeight();
      // top border
      drawLine(tableX, y, tableX + tableWidth, y);

      doc.font("Helvetica-Bold").fontSize(headerFontSize);
      const labels = [
        t.bil,
        t.traineeName,
        t.group,
        t.monitoringObjective,
        t.teachingLearningActivities,
        t.clinicalPracticeRecordBook,
        t.disciplineTraineeWelfareDiscussion,
      ];
      labels.forEach((label, i) => {
        const textH = textHeight(label, colWidths[i], "center");
        const textY = y + cellPadding + (hHeight - 2 * cellPadding - textH) / 2;
        doc.text(label, colPositions[i] + cellPadding, textY, {
          width: Math.max(1, colPositions[i + 1] - colPositions[i] - 2 * cellPadding),
          align: "center",
        });
      });

      // header bottom / body separator
      drawLine(tableX, y + hHeight, tableX + tableWidth, y + hHeight);

      // vertical lines for header
      colPositions.forEach((xPos) => {
        drawLine(xPos, y, xPos, y + hHeight);
      });

      return hHeight;
    }

    const dataRows = report.trainees.map((trainee, index) => ({
      no: `${index + 1}.`,
      traineeName: trainee.traineeName,
      group: trainee.group,
      monitoringObjective: trainee.monitoringObjective,
      teachingLearningActivities: trainee.teachingLearningActivities,
      clinicalPracticeRecordBook: trainee.clinicalPracticeRecordBook,
      disciplineTraineeWelfareDiscussion: trainee.disciplineTraineeWelfareDiscussion,
    }));

    const tableStartY = doc.y;

    // Draw initial header
    const headerH = drawHeader(tableStartY);
    doc.y = tableStartY + headerH;

    dataRows.forEach((row, idx) => {
      const rHeight = rowHeight(row);

      if (doc.y + rHeight > pageBottom - bottomReserve) {
        // bottom border for current page table
        drawLine(tableX, doc.y, tableX + tableWidth, doc.y);

        doc.addPage();
        doc.y = doc.page.margins.top + 30;
        const newHeaderH = drawHeader(doc.y);
        doc.y = doc.y + newHeaderH;
      }

      const rowY = doc.y;

      doc.font("Helvetica").fontSize(fontSize);
      const values = [
        row.no,
        row.traineeName,
        row.group,
        row.monitoringObjective,
        row.teachingLearningActivities,
        row.clinicalPracticeRecordBook,
        row.disciplineTraineeWelfareDiscussion,
      ];
      values.forEach((val, i) => {
        const textH = textHeight(String(val), colWidths[i], "left");
        const textY = rowY + cellPadding;
        doc.text(String(val), colPositions[i] + cellPadding, textY, {
          width: Math.max(1, colPositions[i + 1] - colPositions[i] - 2 * cellPadding),
          align: "left",
        });
      });

      // vertical lines for this row
      colPositions.forEach((xPos) => {
        drawLine(xPos, rowY, xPos, rowY + rHeight);
      });

      doc.y = rowY + rHeight;
    });

    // bottom border
    drawLine(tableX, doc.y, tableX + tableWidth, doc.y);

    doc.moveDown(1);

    const leftColX = CLINICAL_REPORT_LAYOUT.signatures.leftXPt;
    const sigColWidth = CLINICAL_REPORT_LAYOUT.signatures.columnWidthPt;
    const rightColX = CLINICAL_REPORT_LAYOUT.signatures.rightXPt;

    const drawFooterRow = (
      leftLabel: string,
      rightLabel: string,
      isSignature = false
    ) => {
      const baselineY =
        doc.y +
        (isSignature
          ? CLINICAL_REPORT_LAYOUT.signatures.firstBaselineOffsetPt
          : CLINICAL_REPORT_LAYOUT.signatures.subsequentBaselineOffsetPt);

      doc
        .font(CLINICAL_REPORT_LAYOUT.fonts.bold)
        .fontSize(CLINICAL_REPORT_LAYOUT.signatures.signatureFontSizePt);

      doc.text(leftLabel, leftColX, baselineY, { width: sigColWidth });
      doc.text(rightLabel, rightColX, baselineY, { width: sigColWidth });

      doc.y =
        baselineY +
        (isSignature
          ? CLINICAL_REPORT_LAYOUT.signatures.firstAdvancePt
          : CLINICAL_REPORT_LAYOUT.signatures.subsequentAdvancePt);
    };

    drawFooterRow(t.signature, t.signature, true);
    drawFooterRow(t.nameOfInstructor, t.tpa);
    drawFooterRow(t.date, t.date);

    doc.font(CLINICAL_REPORT_LAYOUT.fonts.regular).fontSize(CLINICAL_REPORT_LAYOUT.footer.fontSizePt);
    doc.text(
      `${t.reportId}${report.reportNumber ?? report.id}`,
      CLINICAL_REPORT_LAYOUT.footer.xPt,
      CLINICAL_REPORT_LAYOUT.footer.yPt,
      {
        width: CLINICAL_REPORT_LAYOUT.table.widthPt,
        align: "right",
      }
    );

    doc.end();
  });
}
