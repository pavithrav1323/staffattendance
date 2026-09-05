import { useEffect, useState } from 'react';
import { authService } from '../services/auth.service';
import { clinicalReportsService, type ClinicalReportListItem, type ClinicalReportDetail, type ReportTrainee } from '../services/clinical-reports.service';
import ClinicalReportDocument, { emptyRow, type ReportRow } from '../components/ClinicalReportDocument';

type Language = 'en' | 'ms';

interface PreviewData {
  id?: string;
  reportNumber?: string;
  unitLocation: string;
  monitoringDateTime: string;
  rows: ReportRow[];
  language: Language;
}

const labels = {
  en: {
    pageTitle: 'Clinical Report',
    unitLocation: 'Unit / Location',
    dateTime: 'Date & Time of Monitoring',
    traineeName: 'Trainee Name',
    group: 'Group',
    monitoringObjective: 'Monitoring Objective',
    teachingLearningActivities: 'Teaching and Learning Activities',
    clinicalPracticeRecordBook: 'Monitoring of Clinical Practice Record Book',
    disciplineTraineeWelfareDiscussion:
      'Discipline / Trainee Welfare / Discussion with LP / Supervisor',
    submit: 'Submit Clinical Report',
    submitting: 'Submitting...',
    myReports: 'My Submitted Reports',
    reportsList: 'Clinical Reports',
    noReports: 'No reports found.',
    reportId: 'Report ID',
    submittedBy: 'Submitted By',
    submittedAt: 'Submitted At',
    monitoringAt: 'Monitoring Date & Time',
    traineeCount: 'Trainees',
    actions: 'Actions',
    view: 'View Report',
    downloadDocx: 'Download DOCX',
    edit: 'Edit',
    update: 'Update Clinical Report',
    updating: 'Updating...',
    updateSuccess: 'Clinical report updated successfully.',
    close: 'Close',
    english: 'English',
    malay: 'Malay',
    success: 'Clinical report submitted successfully.',
    error: 'Failed to submit. Please check all required fields.',
    invalid: 'All required fields must be filled.',
    required: ' (required)',
    traineeRow: 'Trainee',
    addRow: 'Add Trainee',
    removeRow: 'Remove Trainee',
    viewReport: 'View Report',
    downloadPdf: 'Download PDF',
    newReport: 'New Report',
  },
  ms: {
    pageTitle: 'Laporan Klinikal',
    unitLocation: 'Unit / Lokasi',
    dateTime: 'Tarikh & Masa Pemantauan',
    traineeName: 'Nama Pelatih',
    group: 'Kumpulan',
    monitoringObjective: 'Objektif Pemantauan',
    teachingLearningActivities: 'Aktiviti Pengajaran dan Pembelajaran',
    clinicalPracticeRecordBook: 'Pemantauan Buku Rekod Amalan Klinikal',
    disciplineTraineeWelfareDiscussion:
      'Disiplin / Kebajikan Pelatih / Perbincangan dengan LP / Penyelia',
    submit: 'Hantar Laporan Klinikal',
    submitting: 'Sedang menghantar...',
    myReports: 'Laporan Saya',
    reportsList: 'Laporan Klinikal',
    noReports: 'Tiada laporan dijumpai.',
    reportId: 'ID Laporan',
    submittedBy: 'Dihantar Oleh',
    submittedAt: 'Tarikh Hantar',
    monitoringAt: 'Tarikh & Masa Pemantauan',
    traineeCount: 'Pelatih',
    actions: 'Tindakan',
    view: 'Lihat Laporan',
    downloadDocx: 'Muat Turun DOCX',
    edit: 'Sunting',
    update: 'Kemas Kini Laporan Klinikal',
    updating: 'Sedang mengemas kini...',
    updateSuccess: 'Laporan klinikal berjaya dikemas kini.',
    close: 'Tutup',
    english: 'English',
    malay: 'Malay',
    success: 'Laporan klinikal berjaya dihantar.',
    error: 'Gagal menghantar. Sila semak semua medan yang diperlukan.',
    invalid: 'Semua medan yang diperlukan mesti diisi.',
    required: ' (diperlukan)',
    traineeRow: 'Pelatih',
    addRow: 'Tambah Pelatih',
    removeRow: 'Buang Pelatih',
    viewReport: 'Lihat Laporan',
    downloadPdf: 'Muat Turun PDF',
    newReport: 'Laporan Baharu',
  },
};

const initialForm = {
  unitLocation: '',
  monitoringDateTime: '',
  rows: [emptyRow()],
};

const ClinicalReportsPage = () => {
  const currentUser = authService.getCurrentUser();
  const isStaff = currentUser?.role === 'STAFF';

  const [language, setLanguage] = useState<Language>('en');
  const [form, setForm] = useState(initialForm);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [reports, setReports] = useState<ClinicalReportListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const t = labels[language];

  const loadReports = async () => {
    setLoading(true);
    try {
      const response = await clinicalReportsService.getReports();
      if (response.success && response.data) {
        setReports(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleRowChange = (index: number, field: keyof ReportRow, value: string) => {
    setForm((prev) => {
      const rows = [...prev.rows];
      rows[index] = { ...rows[index], [field]: value };
      return { ...prev, rows };
    });
  };

  const addRow = () => {
    setForm((prev) => ({ ...prev, rows: [...prev.rows, emptyRow()] }));
  };

  const removeRow = (index: number) => {
    setForm((prev) => {
      if (prev.rows.length <= 1) return prev;
      const rows = [...prev.rows];
      rows.splice(index, 1);
      return { ...prev, rows };
    });
  };

  const validate = (): boolean => {
    if (!form.unitLocation.trim() || !form.monitoringDateTime.trim()) return false;
    return form.rows.every((row) =>
      Object.values(row).every((v) => v.trim().length > 0)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setError(null);
    setSuccess(null);

    if (!validate()) {
      setError(t.invalid);
      return;
    }

    setSubmitting(true);
    try {
      const input = {
        unitLocation: form.unitLocation,
        monitoringDateTime: form.monitoringDateTime,
        language,
        trainees: form.rows,
      };

      if (editingReportId) {
        const response = await clinicalReportsService.update(editingReportId, input);

        if (!response.success || !response.data) {
          throw new Error(response.message || t.error);
        }

        const updated = response.data;
        setPreview({
          id: updated.id,
          reportNumber: updated.reportNumber ?? undefined,
          unitLocation: updated.unitLocation,
          monitoringDateTime: updated.monitoringDateTime,
          rows: updated.trainees.map((trainee) => ({ ...trainee })),
          language: updated.language as Language,
        });
        setSuccess(t.updateSuccess);
        setForm(initialForm);
        setEditingReportId(null);
        loadReports();
      } else {
        const response = await clinicalReportsService.create(input);

        if (!response.success) {
          throw new Error(response.message || t.error);
        }

        setPreview({
          id: response.data?.id,
          reportNumber: response.data?.reportNumber ?? undefined,
          unitLocation: form.unitLocation,
          monitoringDateTime: form.monitoringDateTime,
          rows: form.rows,
          language,
        });
        setSuccess(t.success);
        setForm(initialForm);
        loadReports();
      }
    } catch (err: any) {
      setError(err.message || t.error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async () => {
    if (!preview?.id) return;
    try {
      await clinicalReportsService.downloadPdf(preview.id);
    } catch (err: any) {
      setError(err.message || 'Failed to download PDF');
    }
  };

  const handleDownloadDocx = async () => {
    if (!preview?.id) return;
    try {
      await clinicalReportsService.downloadDocx(preview.id);
    } catch (err: any) {
      setError(err.message || 'Failed to download DOCX');
    }
  };

  const handleViewFromList = async (report: ClinicalReportListItem) => {
    try {
      const response = await clinicalReportsService.getReport(report.id);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to load report');
      }

      const detail = response.data as ClinicalReportDetail;
      setPreview({
        id: detail.id,
        reportNumber: detail.reportNumber ?? undefined,
        unitLocation: detail.unitLocation,
        monitoringDateTime: detail.monitoringDateTime,
        rows: (detail.trainees as ReportTrainee[]).map((trainee) => ({ ...trainee })),
        language: detail.language as Language,
      });
      setShowPreviewModal(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
    }
  };

  const toDateTimeLocal = (value: string) => {
    const d = new Date(value);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleEdit = async (report: ClinicalReportListItem) => {
    setError(null);
    setSuccess(null);
    setPreview(null);
    try {
      const response = await clinicalReportsService.getReport(report.id);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to load report');
      }
      const detail = response.data;
      setLanguage(detail.language as Language);
      setForm({
        unitLocation: detail.unitLocation,
        monitoringDateTime: toDateTimeLocal(detail.monitoringDateTime),
        rows: detail.trainees.map((trainee) => ({ ...trainee })),
      });
      setEditingReportId(detail.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
    }
  };

  const formatDate = (value: string) => {
    return new Date(value).toLocaleString(language === 'ms' ? 'ms-MY' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="clinical-form no-print">
      <div className="form-group">
        <label htmlFor="unitLocation">{t.unitLocation}{t.required}</label>
        <input
          id="unitLocation"
          type="text"
          value={form.unitLocation}
          onChange={(e) => setForm((prev) => ({ ...prev, unitLocation: e.target.value }))}
          maxLength={200}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="monitoringDateTime">{t.dateTime}{t.required}</label>
        <input
          id="monitoringDateTime"
          type="datetime-local"
          value={form.monitoringDateTime}
          onChange={(e) => setForm((prev) => ({ ...prev, monitoringDateTime: e.target.value }))}
          required
        />
      </div>

      {form.rows.map((row, index) => (
        <div key={index} className="clinical-row-form">
          <div className="clinical-row-header">
            <h4>{t.traineeRow} {index + 1}</h4>
            {form.rows.length > 1 && (
              <button
                type="button"
                className="action-button small"
                onClick={() => removeRow(index)}
              >
                {t.removeRow}
              </button>
            )}
          </div>

          <div className="form-group">
            <label>{t.traineeName}{t.required}</label>
            <input
              type="text"
              value={row.traineeName}
              onChange={(e) => handleRowChange(index, 'traineeName', e.target.value)}
              maxLength={150}
              required
            />
          </div>

          <div className="form-group">
            <label>{t.group}{t.required}</label>
            <input
              type="text"
              value={row.group}
              onChange={(e) => handleRowChange(index, 'group', e.target.value)}
              maxLength={100}
              required
            />
          </div>

          <div className="form-group">
            <label>{t.monitoringObjective}{t.required}</label>
            <textarea
              rows={3}
              value={row.monitoringObjective}
              onChange={(e) => handleRowChange(index, 'monitoringObjective', e.target.value)}
              maxLength={2000}
              required
            />
          </div>

          <div className="form-group">
            <label>{t.teachingLearningActivities}{t.required}</label>
            <textarea
              rows={4}
              value={row.teachingLearningActivities}
              onChange={(e) => handleRowChange(index, 'teachingLearningActivities', e.target.value)}
              maxLength={4000}
              required
            />
          </div>

          <div className="form-group">
            <label>{t.clinicalPracticeRecordBook}{t.required}</label>
            <textarea
              rows={4}
              value={row.clinicalPracticeRecordBook}
              onChange={(e) => handleRowChange(index, 'clinicalPracticeRecordBook', e.target.value)}
              maxLength={4000}
              required
            />
          </div>

          <div className="form-group">
            <label>{t.disciplineTraineeWelfareDiscussion}{t.required}</label>
            <textarea
              rows={4}
              value={row.disciplineTraineeWelfareDiscussion}
              onChange={(e) => handleRowChange(index, 'disciplineTraineeWelfareDiscussion', e.target.value)}
              maxLength={4000}
              required
            />
          </div>
        </div>
      ))}

      <div className="clinical-form-actions no-print">
        <button
          type="button"
          className="action-button"
          onClick={addRow}
          disabled={submitting}
        >
          {t.addRow}
        </button>
        <button
          type="submit"
          className="approve-button"
          disabled={submitting}
        >
          {submitting ? (editingReportId ? t.updating : t.submitting) : (editingReportId ? t.update : t.submit)}
        </button>
      </div>
    </form>
  );

  const renderPreviewModal = () => {
    if (!preview) return null;
    return (
      <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-actions no-print clinical-preview-modal-actions">
            <button
              type="button"
              className="approve-button"
              onClick={handleDownload}
            >
              {t.downloadPdf}
            </button>
            <button
              type="button"
              className="approve-button"
              onClick={handleDownloadDocx}
            >
              {t.downloadDocx}
            </button>
            <button
              type="button"
              className="reject-button"
              onClick={() => setShowPreviewModal(false)}
            >
              {t.close}
            </button>
          </div>
          <ClinicalReportDocument
            language={preview.language}
            unitLocation={preview.unitLocation}
            monitoringDateTime={preview.monitoringDateTime}
            reportNumber={preview.reportNumber}
            rows={preview.rows}
            showActions={false}
          />
        </div>
      </div>
    );
  };

  const renderList = () => (
    <div className="clinical-reports-list no-print">
      {loading ? (
        <div className="loading-state">Loading...</div>
      ) : reports.length === 0 ? (
        <div className="empty-state">{t.noReports}</div>
      ) : (
        <div className="table-container">
          <table className="staff-table">
            <thead>
              <tr>
                <th>{t.reportId}</th>
                <th>{t.unitLocation}</th>
                <th>{t.monitoringAt}</th>
                <th>{t.traineeCount}</th>
                {!isStaff && <th>{t.submittedBy}</th>}
                <th>{t.submittedAt}</th>
                <th className="clinical-actions-cell">{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>{report.reportNumber || report.id.slice(0, 8)}</td>
                  <td>{report.unitLocation}</td>
                  <td>{formatDate(report.monitoringDateTime)}</td>
                  <td>{report.traineeCount}</td>
                  {!isStaff && <td>{report.submittedByName || report.submittedBy}</td>}
                  <td>{formatDate(report.createdAt)}</td>
                  <td className="clinical-actions-cell">
                    <div className="clinical-row-actions">
                      <button
                        type="button"
                        className="clinical-action-button"
                        onClick={() => handleViewFromList(report)}
                      >
                        {t.view}
                      </button>
                      {isStaff && (
                        <button
                          type="button"
                          className="clinical-action-button"
                          onClick={() => handleEdit(report)}
                        >
                          {t.edit}
                        </button>
                      )}
                      <button
                        type="button"
                        className="clinical-action-button"
                        onClick={() => clinicalReportsService.downloadPdf(report.id)}
                      >
                        PDF
                      </button>
                      <button
                        type="button"
                        className="clinical-action-button"
                        onClick={() => clinicalReportsService.downloadDocx(report.id)}
                      >
                        DOCX
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="clinical-reports-page">
      <div className="clinical-page-header no-print">
        <div className="clinical-language-toggle">
          <button
            type="button"
            className={`clinical-language-button${language === 'en' ? ' active' : ''}`}
            onClick={() => setLanguage('en')}
          >
            {t.english}
          </button>
          <button
            type="button"
            className={`clinical-language-button${language === 'ms' ? ' active' : ''}`}
            onClick={() => setLanguage('ms')}
          >
            {t.malay}
          </button>
        </div>
      </div>

      {error && <div className="error-message no-print">{error}</div>}
      {success && <div className="success-message no-print">{success}</div>}

      {isStaff && renderForm()}
      {renderList()}

      {showPreviewModal && renderPreviewModal()}
    </div>
  );
};

export default ClinicalReportsPage;
