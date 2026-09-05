import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeightRule,
  ImageRun,
  Packer,
  Paragraph,
  PageOrientation,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  convertInchesToTwip,
} from "docx";

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

function getPngDimensions(filePath: string): { width: number; height: number } {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 24) {
    throw new Error("Invalid logo image");
  }
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") {
    throw new Error("Logo is not a PNG");
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

function formatDateTime(value: Date | string, locale: string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString(locale === "ms" ? "ms-MY" : "en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function logoImage(): ImageRun {
  const logoPath = resolveLogoPath();
  const dimensions = getPngDimensions(logoPath);
  const maxWidthPx = 90;
  const scale = maxWidthPx / dimensions.width;
  const widthPx = Math.round(maxWidthPx);
  const heightPx = Math.round(dimensions.height * scale);

  return new ImageRun({
    type: "png",
    data: fs.readFileSync(logoPath),
    transformation: {
      width: widthPx,
      height: heightPx,
    },
  });
}

function cell(
  text: string,
  options: {
    bold?: boolean;
    columnWidth?: number;
    header?: boolean;
  } = {}
): TableCell {
  const { bold = false, columnWidth, header = false } = options;

  return new TableCell({
    width:
      columnWidth !== undefined
        ? { size: columnWidth, type: WidthType.PERCENTAGE }
        : undefined,
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold,
            size: header ? 16 : 15,
            font: "Arial",
          }),
        ],
      }),
    ],
    shading: header
      ? {
          type: "clear",
          fill: "D9D9D9",
          color: "auto",
        }
      : undefined,
    margins: { top: 60, right: 60, bottom: 60, left: 60 },
  });
}

export function generateClinicalReportDocx(
  report: ClinicalReportDetail
): Promise<Buffer> {
  const t = translations[report.language as "en" | "ms"] || translations.en;
  const colWidths = [4.5, 23.5, 10.5, 11.5, 25, 12, 13];

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      cell(t.bil, { bold: true, columnWidth: colWidths[0], header: true }),
      cell(t.traineeName, { bold: true, columnWidth: colWidths[1], header: true }),
      cell(t.group, { bold: true, columnWidth: colWidths[2], header: true }),
      cell(t.monitoringObjective, { bold: true, columnWidth: colWidths[3], header: true }),
      cell(t.teachingLearningActivities, { bold: true, columnWidth: colWidths[4], header: true }),
      cell(t.clinicalPracticeRecordBook, { bold: true, columnWidth: colWidths[5], header: true }),
      cell(t.disciplineTraineeWelfareDiscussion, { bold: true, columnWidth: colWidths[6], header: true }),
    ],
  });

  const dataRows = report.trainees.map((trainee, index) => {
    return new TableRow({
      children: [
        cell(`${index + 1}.`, { columnWidth: colWidths[0] }),
        cell(trainee.traineeName, { columnWidth: colWidths[1] }),
        cell(trainee.group, { columnWidth: colWidths[2] }),
        cell(trainee.monitoringObjective, { columnWidth: colWidths[3] }),
        cell(trainee.teachingLearningActivities, { columnWidth: colWidths[4] }),
        cell(trainee.clinicalPracticeRecordBook, { columnWidth: colWidths[5] }),
        cell(trainee.disciplineTraineeWelfareDiscussion, { columnWidth: colWidths[6] }),
      ],
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertInchesToTwip(11.69),
              height: convertInchesToTwip(8.27),
              orientation: PageOrientation.LANDSCAPE,
            },
            margin: {
              top: convertInchesToTwip(0.5),
              right: convertInchesToTwip(0.5),
              bottom: convertInchesToTwip(0.5),
              left: convertInchesToTwip(0.5),
            },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: t.docRef, size: 16, font: "Arial" }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [logoImage()],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: t.ministry,
                bold: true,
                size: 22,
                font: "Arial",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: t.title,
                bold: true,
                size: 24,
                font: "Arial",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: `${t.unitLocation} ${report.unitLocation}`,
                bold: true,
                size: 18,
                font: "Arial",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: `${t.dateTime} ${formatDateTime(
                  report.monitoringDateTime,
                  report.language
                )}`,
                bold: true,
                size: 18,
                font: "Arial",
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: `${t.reportId} ${report.reportNumber ?? report.id}`,
                bold: true,
                size: 18,
                font: "Arial",
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
              insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
            },
          }),
          new Paragraph({ spacing: { before: 240, after: 120 }, children: [] }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                height: { value: convertInchesToTwip(0.7), rule: HeightRule.ATLEAST },
                children: [
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.BOTTOM,
                    margins: { top: 60, right: 80, bottom: 60, left: 0 },
                    children: [new Paragraph({ children: [new TextRun({ text: t.signature, bold: true, size: 18, font: "Arial" })] })],
                  }),
                  new TableCell({
                    width: { size: 35, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.BOTTOM,
                    margins: { top: 60, right: 0, bottom: 60, left: 0 },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      bottom: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
                      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    },
                    children: [],
                  }),
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.BOTTOM,
                    margins: { top: 60, right: 80, bottom: 60, left: 120 },
                    children: [new Paragraph({ children: [new TextRun({ text: t.signature, bold: true, size: 18, font: "Arial" })] })],
                  }),
                  new TableCell({
                    width: { size: 35, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.BOTTOM,
                    margins: { top: 60, right: 0, bottom: 60, left: 0 },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      bottom: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
                      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    },
                    children: [],
                  }),
                ],
              }),
              new TableRow({
                height: { value: convertInchesToTwip(0.4), rule: HeightRule.ATLEAST },
                children: [
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.BOTTOM,
                    margins: { top: 60, right: 80, bottom: 60, left: 0 },
                    children: [new Paragraph({ children: [new TextRun({ text: t.nameOfInstructor, bold: true, size: 18, font: "Arial" })] })],
                  }),
                  new TableCell({
                    width: { size: 35, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.BOTTOM,
                    margins: { top: 60, right: 0, bottom: 60, left: 0 },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      bottom: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
                      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    },
                    children: [],
                  }),
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.BOTTOM,
                    margins: { top: 60, right: 80, bottom: 60, left: 120 },
                    children: [new Paragraph({ children: [new TextRun({ text: t.tpa, bold: true, size: 18, font: "Arial" })] })],
                  }),
                  new TableCell({
                    width: { size: 35, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.BOTTOM,
                    margins: { top: 60, right: 0, bottom: 60, left: 0 },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      bottom: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
                      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    },
                    children: [],
                  }),
                ],
              }),
              new TableRow({
                height: { value: convertInchesToTwip(0.4), rule: HeightRule.ATLEAST },
                children: [
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.BOTTOM,
                    margins: { top: 60, right: 80, bottom: 60, left: 0 },
                    children: [new Paragraph({ children: [new TextRun({ text: t.date, bold: true, size: 18, font: "Arial" })] })],
                  }),
                  new TableCell({
                    width: { size: 35, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.BOTTOM,
                    margins: { top: 60, right: 0, bottom: 60, left: 0 },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      bottom: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
                      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    },
                    children: [],
                  }),
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.BOTTOM,
                    margins: { top: 60, right: 80, bottom: 60, left: 120 },
                    children: [new Paragraph({ children: [new TextRun({ text: t.date, bold: true, size: 18, font: "Arial" })] })],
                  }),
                  new TableCell({
                    width: { size: 35, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.BOTTOM,
                    margins: { top: 60, right: 0, bottom: 60, left: 0 },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      bottom: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
                      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    },
                    children: [],
                  }),
                ],
              }),
            ],
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            },
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
