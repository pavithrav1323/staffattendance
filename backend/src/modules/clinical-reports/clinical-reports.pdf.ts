import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit-table";

import type { ClinicalReportDetail } from "./clinical-reports.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const translations = {
  en: {
    docRef: "BPL.KKM.PK (T) 08.3A/17",
    ministry: "MINISTRY OF HEALTH MALAYSIA",
    title: "CLINICAL AREA MONITORING REPORT",
    unitLocation: "UNIT / LOCATION NAME :",
    dateTime: "DATE & TIME OF MONITORING :",
    reportId: "REPORT ID :",

    bil: "NO.",
    traineeName: "TRAINEE NAME",
    group: "GROUP",
    monitoringObjective: "MONITORING OBJECTIVE",
    teachingLearningActivities: "TEACHING AND LEARNING ACTIVITIES",
    clinicalPracticeRecordBook: "MONITORING OF CLINICAL PRACTICE RECORD BOOK",
    disciplineTraineeWelfareDiscussion:
      "DISCIPLINE / TRAINEE WELFARE / DISCUSSION WITH LP / SUPERVISOR",
    signature: "Signature:",
    nameOfInstructor: "Name of Instructor:",
    tpa: "TPA:",
    date: "Date:",
  },
  ms: {
    docRef: "BPL.KKM.PK (T) 08.3A/17",
    ministry: "KEMENTERIAN KESIHATAN MALAYSIA",
    title: "LAPORAN PEMANTAUAN KAWASAN KLINIKAL",
    unitLocation: "NAMA UNIT / TEMPAT :",
    dateTime: "TARIKH & MASA PEMANTAUAN :",
    reportId: "ID LAPORAN :",

    bil: "BIL",
    traineeName: "NAMA PELATIH",
    group: "KUMPULAN",
    monitoringObjective: "OBJEKTIF PEMANTAUAN",
    teachingLearningActivities: "AKTIVITI PENGAJARAN DAN PEMBELAJARAN",
    clinicalPracticeRecordBook: "PEMANTAUAN BUKU REKOD PRAKTIS KLINIKAL",
    disciplineTraineeWelfareDiscussion:
      "DISIPLIN / KEBAJIKAN PELATIH / PERBINCANGAN DENGAN LP / PENYELIA",
    signature: "Tandatangan:",
    nameOfInstructor: "Nama Pengajar:",
    tpa: "TPA:",
    date: "Tarikh:",
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
      layout: "landscape",
      margin: 30,
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err: Error) => reject(err));

    const pageWidth = doc.page.width;
    const rightX = pageWidth - 30;

    doc.fontSize(9).text(t.docRef, rightX - 200, 30, {
      width: 170,
      align: "right",
    });

    const logoY = 30;
    doc.image(logoPath, (pageWidth - 70) / 2, logoY, { width: 70 });
    doc.y = logoY + 75;

    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(t.ministry, 30, doc.y, { align: "center" });
    doc.moveDown(0.4);
    doc.fontSize(15).text(t.title, { align: "center" });
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").fontSize(10);
    doc.text(`${t.unitLocation} ${report.unitLocation}`, 30, doc.y, {
      continued: false,
    });
    doc.moveDown(0.3);
    doc.text(
      `${t.dateTime} ${formatDateTime(report.monitoringDateTime, report.language)}`,
      30,
      doc.y,
      { continued: false }
    );
    doc.moveDown(0.3);
    doc.text(
      `${t.reportId} ${report.reportNumber ?? report.id}`,
      30,
      doc.y,
      { continued: false }
    );
    doc.moveDown(0.6);

    const tableWidth = pageWidth - 60;
    const columnsSize = [
      Math.round(tableWidth * 0.045),
      Math.round(tableWidth * 0.235),
      Math.round(tableWidth * 0.105),
      Math.round(tableWidth * 0.115),
      Math.round(tableWidth * 0.25),
      Math.round(tableWidth * 0.122),
      Math.round(tableWidth * 0.128),
    ];

    const table = {
      headers: [
        { label: t.bil, property: "no", width: columnsSize[0] },
        { label: t.traineeName, property: "traineeName", width: columnsSize[1] },
        { label: t.group, property: "group", width: columnsSize[2] },
        {
          label: t.monitoringObjective,
          property: "monitoringObjective",
          width: columnsSize[3],
        },
        {
          label: t.teachingLearningActivities,
          property: "teachingLearningActivities",
          width: columnsSize[4],
        },
        {
          label: t.clinicalPracticeRecordBook,
          property: "clinicalPracticeRecordBook",
          width: columnsSize[5],
        },
        {
          label: t.disciplineTraineeWelfareDiscussion,
          property: "disciplineTraineeWelfareDiscussion",
          width: columnsSize[6],
        },
      ],
      datas: report.trainees.map((trainee, index) => ({
        no: `${index + 1}.`,
        traineeName: trainee.traineeName,
        group: trainee.group,
        monitoringObjective: trainee.monitoringObjective,
        teachingLearningActivities: trainee.teachingLearningActivities,
        clinicalPracticeRecordBook: trainee.clinicalPracticeRecordBook,
        disciplineTraineeWelfareDiscussion: trainee.disciplineTraineeWelfareDiscussion,
      })),
    };

    const tableOptions = {
      x: 30,
      y: doc.y,
      width: tableWidth,
      columnsSize,
      columnSpacing: 1,
      padding: 3,
      prepareHeader: () => {
        doc.font("Helvetica-Bold").fontSize(7);
      },
      prepareRow: () => {
        doc.font("Helvetica").fontSize(7);
      },
    };

    void doc.table(table, tableOptions).then(() => {
      doc.moveDown(1);

      const leftColX = 30;
      const colWidth = (pageWidth - 90) / 2;
      const rightColX = pageWidth - 30 - colWidth;
      const labelGap = 8;

      const drawFooterRow = (
        leftLabel: string,
        rightLabel: string,
        isSignature = false
      ) => {
        const baselineY = doc.y + (isSignature ? 35 : 25);

        doc.font("Helvetica-Bold").fontSize(10);

        const leftLabelWidth = doc.widthOfString(leftLabel);
        const rightLabelWidth = doc.widthOfString(rightLabel);

        doc.text(leftLabel, leftColX, baselineY, { width: colWidth });
        doc
          .moveTo(leftColX + leftLabelWidth + labelGap, baselineY)
          .lineTo(leftColX + colWidth, baselineY)
          .stroke();

        doc.text(rightLabel, rightColX, baselineY, { width: colWidth });
        doc
          .moveTo(rightColX + rightLabelWidth + labelGap, baselineY)
          .lineTo(rightColX + colWidth, baselineY)
          .stroke();

        doc.y = baselineY + (isSignature ? 18 : 12);
      };

      drawFooterRow(t.signature, t.signature, true);
      drawFooterRow(t.nameOfInstructor, t.tpa);
      drawFooterRow(t.date, t.date);

      doc.end();
    });
  });
}
