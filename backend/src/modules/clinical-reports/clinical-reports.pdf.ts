import PDFDocument from "pdfkit";

import type { ClinicalReportDetail } from "./clinical-reports.service.js";

const translations = {
  en: {
    ministry: "Ministry of Health Malaysia",
    title: "Clinical Area Monitoring Report",
    unitLocation: "Unit / Location",
    no: "No.",
    traineeName: "Trainee Name",
    group: "Group",
    monitoringObjective: "Monitoring Objective",
    teachingLearningActivities: "Teaching and Learning Activities",
    clinicalPracticeRecordBook: "Monitoring of Clinical Practice Record Book",
    disciplineTraineeWelfareDiscussion:
      "Discipline / Trainee Welfare / Discussion with LP / Supervisor",
    submittedBy: "Submitted By",
    submittedAt: "Submitted At",
    page: "Page",
  },
  ms: {
    ministry: "Kementerian Kesihatan Malaysia",
    title: "Laporan Pemantauan Kawasan Klinikal",
    unitLocation: "Unit / Lokasi",
    no: "No.",
    traineeName: "Nama Pelatih",
    group: "Kumpulan",
    monitoringObjective: "Objektif Pemantauan",
    teachingLearningActivities: "Aktiviti Pengajaran dan Pembelajaran",
    clinicalPracticeRecordBook: "Pemantauan Buku Rekod Amalan Klinikal",
    disciplineTraineeWelfareDiscussion:
      "Disiplin / Kebajikan Pelatih / Perbincangan dengan LP / Penyelia",
    submittedBy: "Dihantar Oleh",
    submittedAt: "Tarikh Hantar",
    page: "Muka Surat",
  },
};

function formatDateTime(date: Date | string, locale: string) {
  const d = date instanceof Date ? date : new Date(date);
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };
  const localeCode = locale === "ms" ? "ms-MY" : "en-GB";
  return d.toLocaleString(localeCode, options);
}

function labelledText(doc: PDFKit.PDFDocument, label: string, value: string) {
  doc.font("Helvetica-Bold").fontSize(11).text(`${label}: `, { continued: true });
  doc.font("Helvetica").fontSize(11).text(value);
  doc.moveDown(0.4);
}

function blockText(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string
) {
  doc.font("Helvetica-Bold").fontSize(11).text(`${label}:`);
  doc.font("Helvetica").fontSize(11).text(value);
  doc.moveDown(0.8);
}

export function generateClinicalReportPdf(
  report: ClinicalReportDetail
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const t = translations[report.language as "en" | "ms"] || translations.en;
    const doc = new PDFDocument({
      margin: 50,
      bufferPages: true,
    });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err: Error) => reject(err));

    doc.fontSize(10).text(t.ministry, { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(14).font("Helvetica-Bold").text(t.title, { align: "center" });
    doc.font("Helvetica").fontSize(11);
    doc.moveDown(1);

    labelledText(doc, t.unitLocation, report.unitLocation);
    labelledText(doc, t.no, "1");
    labelledText(doc, t.traineeName, report.traineeName);
    labelledText(doc, t.group, report.group);

    blockText(doc, t.monitoringObjective, report.monitoringObjective);
    blockText(doc, t.teachingLearningActivities, report.teachingLearningActivities);
    blockText(doc, t.clinicalPracticeRecordBook, report.clinicalPracticeRecordBook);
    blockText(
      doc,
      t.disciplineTraineeWelfareDiscussion,
      report.disciplineTraineeWelfareDiscussion
    );

    doc.moveDown(0.5);
    labelledText(
      doc,
      t.submittedBy,
      report.submittedByName || report.submittedBy
    );
    labelledText(
      doc,
      t.submittedAt,
      formatDateTime(report.createdAt, report.language)
    );

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(9).text(`${t.page} ${i + 1}`, 50, doc.page.height - 50, {
        align: "center",
      });
    }

    doc.end();
  });
}
