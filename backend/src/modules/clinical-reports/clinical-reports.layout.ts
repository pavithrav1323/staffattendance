const PDF_POINTS_PER_INCH = 72;
const TWIPS_PER_POINT = 20;

export const mmToTwip = (mm: number): number =>
  Math.round(mm * 56.6929133858);

export const pointsToTwip = (points: number): number =>
  Math.round(points * TWIPS_PER_POINT);

export const pointsToPixels = (points: number): number =>
  Math.round((points / PDF_POINTS_PER_INCH) * 96);

const pageWidthPt = 841.89;
const pageHeightPt = 595.28;
const marginPt = 30;
const tableWidthPt = pageWidthPt - marginPt * 2;
const columnRatios = [0.05, 0.24, 0.1, 0.12, 0.25, 0.12, 0.12];
const columnWidthsPt = columnRatios.map((ratio) =>
  Math.floor(tableWidthPt * ratio)
);
columnWidthsPt[columnWidthsPt.length - 1] +=
  tableWidthPt - columnWidthsPt.reduce((sum, width) => sum + width, 0);

const fontLineHeight = (fontSize: number): number => fontSize * 1.2;
const ministryY = marginPt + 60;
const titleY = ministryY + fontLineHeight(13) + 13 * 0.3 * 1.2;
const metadataUnitY = titleY + fontLineHeight(15) + 15 * 0.6 * 1.2;
const metadataDateY = metadataUnitY + fontLineHeight(10) + 10 * 0.25 * 1.2;
const tableStartY = metadataDateY + fontLineHeight(10) + 10 * 0.5 * 1.2;

export const CLINICAL_REPORT_LAYOUT = {
  page: {
    widthPt: pageWidthPt,
    heightPt: pageHeightPt,
    orientation: "landscape" as const,
  },
  margins: {
    topPt: marginPt,
    rightPt: marginPt,
    bottomPt: marginPt,
    leftPt: marginPt,
    headerDistancePt: 0,
    footerDistancePt: 14,
  },
  header: {
    documentCode: { xPt: pageWidthPt - marginPt - 200, yPt: 30, widthPt: 170 },
    logo: { xPt: (pageWidthPt - 70) / 2, yPt: 30, widthPt: 70 },
    ministry: { xPt: marginPt, yPt: ministryY, fontSizePt: 13 },
    title: { xPt: marginPt, yPt: titleY, fontSizePt: 15 },
  },
  metadata: {
    labelWidthPt: 190,
    colonWidthPt: 10,
    unitLocation: { xPt: marginPt, yPt: metadataUnitY, fontSizePt: 10 },
    dateTime: { xPt: marginPt, yPt: metadataDateY, fontSizePt: 10 },
  },
  table: {
    xPt: marginPt,
    yPt: tableStartY,
    widthPt: tableWidthPt,
    columnWidthsPt,
    cellPaddingPt: 3,
    minimumRowHeightPt: 14,
    headerFontSizePt: 7,
    bodyFontSizePt: 7,
    headerLineHeightPt: 8.4,
    headerHeightPt: 6 * 8.4 + 6,
    lineWidthPt: 0.5,
    bottomReservePt: 130,
  },
  signatures: {
    yOffsetAfterTablePt: 12,
    leftXPt: marginPt,
    rightXPt: pageWidthPt - marginPt - (pageWidthPt - 90) / 2,
    columnWidthPt: (pageWidthPt - 90) / 2,
    signatureFontSizePt: 10,
    firstBaselineOffsetPt: 18,
    subsequentBaselineOffsetPt: 12,
    firstAdvancePt: 10,
    subsequentAdvancePt: 6,
  },
  footer: {
    xPt: marginPt,
    yPt: pageHeightPt - marginPt - 14,
    fontSizePt: 8,
  },
  fonts: {
    regular: "Helvetica",
    bold: "Helvetica-Bold",
  },
} as const;

export const CLINICAL_REPORT_LAYOUT_TWIPS = {
  page: {
    width: pointsToTwip(CLINICAL_REPORT_LAYOUT.page.widthPt),
    height: pointsToTwip(CLINICAL_REPORT_LAYOUT.page.heightPt),
  },
  margins: {
    top: pointsToTwip(CLINICAL_REPORT_LAYOUT.margins.topPt),
    right: pointsToTwip(CLINICAL_REPORT_LAYOUT.margins.rightPt),
    bottom: pointsToTwip(CLINICAL_REPORT_LAYOUT.margins.bottomPt),
    left: pointsToTwip(CLINICAL_REPORT_LAYOUT.margins.leftPt),
    headerDistance: pointsToTwip(CLINICAL_REPORT_LAYOUT.margins.headerDistancePt),
    footerDistance: pointsToTwip(CLINICAL_REPORT_LAYOUT.margins.footerDistancePt),
  },
  table: {
    x: pointsToTwip(CLINICAL_REPORT_LAYOUT.table.xPt),
    y: pointsToTwip(CLINICAL_REPORT_LAYOUT.table.yPt),
    width: pointsToTwip(CLINICAL_REPORT_LAYOUT.table.widthPt),
    columnWidths: CLINICAL_REPORT_LAYOUT.table.columnWidthsPt.map(pointsToTwip),
    cellPadding: pointsToTwip(CLINICAL_REPORT_LAYOUT.table.cellPaddingPt),
  },
  signatures: {
    width: pointsToTwip(CLINICAL_REPORT_LAYOUT.signatures.columnWidthPt),
    rightX: pointsToTwip(CLINICAL_REPORT_LAYOUT.signatures.rightXPt),
  },
};

if (
  CLINICAL_REPORT_LAYOUT_TWIPS.table.columnWidths.reduce(
    (sum, width) => sum + width,
    0
  ) !== CLINICAL_REPORT_LAYOUT_TWIPS.table.width
) {
  throw new Error("Clinical report column widths do not equal table width");
}
