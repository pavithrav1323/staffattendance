import { forwardRef } from 'react';

export type ReportRow = {
  traineeName: string;
  group: string;
  monitoringObjective: string;
  teachingLearningActivities: string;
  clinicalPracticeRecordBook: string;
  disciplineTraineeWelfareDiscussion: string;
};

type Language = 'en' | 'ms';

interface ClinicalReportDocumentProps {
  language: Language;
  unitLocation: string;
  monitoringDateTime: string;
  reportNumber?: string;
  rows: ReportRow[];
  onUnitLocationChange?: (value: string) => void;
  onMonitoringDateTimeChange?: (value: string) => void;
  onRowChange?: (index: number, field: keyof ReportRow, value: string) => void;
  onAddRow?: () => void;
  onRemoveRow?: (index: number) => void;
  showActions?: boolean;
}

const docLabels = {
  en: {
    docRef: 'BPL.KKM.PK (T) 08.3A/17',
    ministry: 'MINISTRY OF HEALTH MALAYSIA',
    title: 'CLINICAL AREA MONITORING REPORT',
    unitLocation: 'UNIT / LOCATION NAME :',
    dateTime: 'DATE & TIME OF MONITORING :',
    reportId: 'REPORT ID :',
    bil: 'NO.',
    traineeName: 'TRAINEE NAME',
    group: 'GROUP',
    monitoringObjective: 'MONITORING OBJECTIVE',
    teachingLearningActivities: 'TEACHING AND LEARNING ACTIVITIES',
    clinicalPracticeRecordBook: 'MONITORING OF CLINICAL PRACTICE RECORD BOOK',
    disciplineTraineeWelfareDiscussion:
      'DISCIPLINE / TRAINEE WELFARE / DISCUSSION WITH LP / SUPERVISOR',
    signature: 'Signature:',
    nameOfInstructor: 'Name of Instructor:',
    tpa: 'TPA:',
    date: 'Date:',
    addRow: 'Add Row',
  },
  ms: {
    docRef: 'BPL.KKM.PK (T) 08.3A/17',
    ministry: 'KEMENTERIAN KESIHATAN MALAYSIA',
    title: 'LAPORAN PEMANTAUAN KAWASAN KLINIKAL',
    unitLocation: 'NAMA UNIT / TEMPAT :',
    dateTime: 'TARIKH & MASA PEMANTAUAN :',
    reportId: 'ID LAPORAN :',
    bil: 'BIL',
    traineeName: 'NAMA PELATIH',
    group: 'KUMPULAN',
    monitoringObjective: 'OBJEKTIF PEMANTAUAN',
    teachingLearningActivities: 'AKTIVITI PENGAJARAN DAN PEMBELAJARAN',
    clinicalPracticeRecordBook: 'PEMANTAUAN BUKU REKOD PRAKTIS KLINIKAL',
    disciplineTraineeWelfareDiscussion:
      'DISIPLIN / KEBAJIKAN PELATIH / PERBINCANGAN DENGAN LP / PENYELIA',
    signature: 'Tandatangan:',
    nameOfInstructor: 'Nama Pengajar:',
    tpa: 'TPA:',
    date: 'Tarikh:',
    addRow: 'Tambah Baris',
  },
};

const pad2 = (n: number) => String(n).padStart(2, '0');

export const emptyRow = (): ReportRow => ({
  traineeName: '',
  group: '',
  monitoringObjective: '',
  teachingLearningActivities: '',
  clinicalPracticeRecordBook: '',
  disciplineTraineeWelfareDiscussion: '',
});

const toDatetimeLocal = (value: string): string => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    return value.length >= 16 ? value.slice(0, 16) : value;
  }
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

const formatDateTime = (language: Language, value: string): string => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString(language === 'ms' ? 'ms-MY' : 'en-GB', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
};

const ClinicalReportDocument = forwardRef<HTMLDivElement, ClinicalReportDocumentProps>(
  (
    {
      language,
      unitLocation,
      monitoringDateTime,
      reportNumber,
      rows,
      onUnitLocationChange,
      onMonitoringDateTimeChange,
      onRowChange,
      onAddRow,
      onRemoveRow,
      showActions = true,
    },
    ref
  ) => {
    const t = docLabels[language];
    const editable = Boolean(onRowChange);

    const renderCellInput = (
      index: number,
      field: keyof ReportRow,
      value: string,
      multiline = true
    ) => {
      if (!editable) {
        return (
          <div className="print-value" style={{ whiteSpace: 'pre-wrap' }}>
            {value}
          </div>
        );
      }

      if (multiline) {
        return (
          <>
            <textarea
              className="screen-only"
              value={value}
              onChange={(e) => onRowChange?.(index, field, e.target.value)}
              rows={2}
              style={{ width: '100%', minHeight: '60px' }}
            />
            <div className="print-only" style={{ whiteSpace: 'pre-wrap' }}>
              {value}
            </div>
          </>
        );
      }

      return (
        <>
          <input
            type="text"
            className="screen-only"
            value={value}
            onChange={(e) => onRowChange?.(index, field, e.target.value)}
            style={{ width: '100%' }}
          />
          <span className="print-only">{value}</span>
        </>
      );
    };

    return (
      <div className="clinical-document" ref={ref}>
        <div className="clinical-doc-header">
          <div className="clinical-doc-ref">{t.docRef}</div>
          <img
            src="/images/ilkkmlogo.png"
            alt="ILKKM"
            className="clinical-logo"
          />
          <div className="clinical-ministry">{t.ministry}</div>
          <div className="clinical-doc-title">{t.title}</div>
        </div>

        <div className="clinical-meta-fields">
          <div className="clinical-meta-row">
            <span className="clinical-meta-label">{t.unitLocation}</span>
            {editable ? (
              <>
                <input
                  type="text"
                  className="screen-only clinical-meta-input"
                  value={unitLocation}
                  onChange={(e) => onUnitLocationChange?.(e.target.value)}
                />
                <span className="print-only clinical-meta-value">{unitLocation}</span>
              </>
            ) : (
              <span className="clinical-meta-value">{unitLocation}</span>
            )}
          </div>
          <div className="clinical-meta-row">
            <span className="clinical-meta-label">{t.dateTime}</span>
            {editable ? (
              <>
                <input
                  type="datetime-local"
                  className="screen-only clinical-meta-input clinical-meta-datetime"
                  value={toDatetimeLocal(monitoringDateTime)}
                  onChange={(e) => onMonitoringDateTimeChange?.(e.target.value)}
                />
                <span className="print-only clinical-meta-value">
                  {formatDateTime(language, monitoringDateTime)}
                </span>
              </>
            ) : (
              <span className="clinical-meta-value">
                {formatDateTime(language, monitoringDateTime)}
              </span>
            )}
          </div>
        </div>

        <div className="clinical-table-scroll">
          <table className="clinical-table">
            <thead>
              <tr>
                <th className="col-bil">{t.bil}</th>
                <th className="col-trainee">{t.traineeName}</th>
                <th className="col-group">{t.group}</th>
                <th className="col-objective">{t.monitoringObjective}</th>
                <th className="col-activities">{t.teachingLearningActivities}</th>
                <th className="col-record">{t.clinicalPracticeRecordBook}</th>
                <th className="col-discipline">{t.disciplineTraineeWelfareDiscussion}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  <td className="col-bil">
                    <div className="bil-cell">
                      <span>{index + 1}.</span>
                      {editable && showActions && onRemoveRow && rows.length > 1 && (
                        <button
                          type="button"
                          className="clinical-row-remove screen-only"
                          onClick={() => onRemoveRow(index)}
                          title="Remove row"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="col-trainee">
                    {renderCellInput(index, 'traineeName', row.traineeName, false)}
                  </td>
                  <td className="col-group">
                    {renderCellInput(index, 'group', row.group, false)}
                  </td>
                  <td className="col-objective">
                    {renderCellInput(index, 'monitoringObjective', row.monitoringObjective)}
                  </td>
                  <td className="col-activities">
                    {renderCellInput(index, 'teachingLearningActivities', row.teachingLearningActivities)}
                  </td>
                  <td className="col-record">
                    {renderCellInput(index, 'clinicalPracticeRecordBook', row.clinicalPracticeRecordBook)}
                  </td>
                  <td className="col-discipline">
                    {renderCellInput(index, 'disciplineTraineeWelfareDiscussion', row.disciplineTraineeWelfareDiscussion)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editable && showActions && onAddRow && (
          <div className="clinical-table-actions screen-only">
            <button type="button" className="action-button" onClick={onAddRow}>
              {t.addRow}
            </button>
          </div>
        )}

        <table className="clinical-signatures-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '2rem' }}>
          <tbody>
            <tr>
              <td style={{ padding: '0 0.5rem 0 0', verticalAlign: 'bottom', whiteSpace: 'nowrap' }}>{t.signature}</td>
              <td style={{ width: '40%', borderBottom: '1px solid #000', height: '3.5rem', verticalAlign: 'bottom' }} />
              <td style={{ padding: '0 0.5rem', paddingLeft: '3rem', verticalAlign: 'bottom', whiteSpace: 'nowrap' }}>{t.signature}</td>
              <td style={{ width: '40%', borderBottom: '1px solid #000', height: '3.5rem', verticalAlign: 'bottom' }} />
            </tr>
            <tr>
              <td style={{ padding: '1rem 0.5rem 0 0', verticalAlign: 'bottom', whiteSpace: 'nowrap' }}>{t.nameOfInstructor}</td>
              <td style={{ width: '40%', borderBottom: '1px solid #000', height: '2rem', verticalAlign: 'bottom' }} />
              <td style={{ padding: '1rem 0.5rem', paddingLeft: '3rem', verticalAlign: 'bottom', whiteSpace: 'nowrap' }}>{t.tpa}</td>
              <td style={{ width: '40%', borderBottom: '1px solid #000', height: '2rem', verticalAlign: 'bottom' }} />
            </tr>
            <tr>
              <td style={{ padding: '1rem 0.5rem 0 0', verticalAlign: 'bottom', whiteSpace: 'nowrap' }}>{t.date}</td>
              <td style={{ width: '40%', borderBottom: '1px solid #000', height: '2rem', verticalAlign: 'bottom' }} />
              <td style={{ padding: '1rem 0.5rem', paddingLeft: '3rem', verticalAlign: 'bottom', whiteSpace: 'nowrap' }}>{t.date}</td>
              <td style={{ width: '40%', borderBottom: '1px solid #000', height: '2rem', verticalAlign: 'bottom' }} />
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
);

ClinicalReportDocument.displayName = 'ClinicalReportDocument';

export default ClinicalReportDocument;
