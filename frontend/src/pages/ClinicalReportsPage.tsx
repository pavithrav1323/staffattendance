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
    selectAll: 'Select All',
    deselectAll: 'Unselect All',
    deleteSelected: 'Delete Selected Records',
    selectedRecords: 'Selected Records',
    confirmDeleteSelected: 'Are you sure you want to permanently delete the selected Clinical Report records?',
    cannotUndo: 'This action cannot be undone.',
    cancel: 'Cancel',
    deletePermanently: 'Delete Permanently',
    deleteSuccess: 'Clinical Report deleted successfully.',
    update: 'Update Clinical Report',
    updating: 'Updating...',
    updateSuccess: 'Clinical report updated successfully.',
    close: 'Close',
    english: 'English',
    malay: 'Malay',
    success: 'Clinical report submitted successfully.',
    error: 'Failed to submit. Please check all required fields.',
    invalid: 'All required fields must be filled.',
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
    selectAll: 'Pilih Semua',
    deselectAll: 'Nyahpilih Semua',
    deleteSelected: 'Padam Rekod Dipilih',
    selectedRecords: 'Rekod Dipilih',
    confirmDeleteSelected: 'Adakah anda pasti mahu memadam rekod Laporan Klinikal yang dipilih secara kekal?',
    cannotUndo: 'Tindakan ini tidak boleh dibuat asal.',
    cancel: 'Batal',
    deletePermanently: 'Padam Secara Kekal',
    deleteSuccess: 'Laporan Klinikal berjaya dipadam.',
    update: 'Kemas Kini Laporan Klinikal',
    updating: 'Sedang mengemas kini...',
    updateSuccess: 'Laporan klinikal berjaya dikemas kini.',
    close: 'Tutup',
    english: 'English',
    malay: 'Malay',
    success: 'Laporan klinikal berjaya dihantar.',
    error: 'Gagal menghantar. Sila semak semua medan yang diperlukan.',
    invalid: 'Semua medan yang diperlukan mesti diisi.',
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
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

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

  const parseMultilineToTrainees = (row: ReportRow): ReportRow[] => {
    const nameLines = row.traineeName.split('\n');
    const getLine = (value: string, index: number) =>
      (value.split('\n')[index] ?? '').trim();

    return nameLines
      .map((name, index) => ({
        traineeName: name.trim(),
        group: getLine(row.group, index),
        monitoringObjective: getLine(row.monitoringObjective, index),
        teachingLearningActivities: getLine(row.teachingLearningActivities, index),
        clinicalPracticeRecordBook: getLine(row.clinicalPracticeRecordBook, index),
        disciplineTraineeWelfareDiscussion: getLine(row.disciplineTraineeWelfareDiscussion, index),
      }))
      .filter((r) => r.traineeName.length > 0);
  };

  const joinTraineesToMultiline = (trainees: ReportTrainee[]): ReportRow => {
    const row = emptyRow();
    const fields: (keyof ReportRow)[] = [
      'traineeName',
      'group',
      'monitoringObjective',
      'teachingLearningActivities',
      'clinicalPracticeRecordBook',
      'disciplineTraineeWelfareDiscussion',
    ];
    for (const field of fields) {
      row[field] = trainees
        .map((t) => String((t as ReportRow)[field] ?? ''))
        .join('\n');
    }
    return row;
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
      const trainees = parseMultilineToTrainees(form.rows[0]);
      const input = {
        unitLocation: form.unitLocation,
        monitoringDateTime: form.monitoringDateTime,
        language,
        trainees: trainees as ReportTrainee[],
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
          rows: trainees,
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
        rows: [joinTraineesToMultiline(detail.trainees)],
      });
      setEditingReportId(detail.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
    }
  };

  const requestDelete = (reportIds: string[]) => {
    if (reportIds.length > 0) setPendingDeleteIds(reportIds);
  };

  const toggleReportSelection = (reportId: string) => {
    setSelectedReportIds((current) => {
      const next = new Set(current);
      if (next.has(reportId)) next.delete(reportId);
      else next.add(reportId);
      return next;
    });
  };

  const handleConfirmDelete = async () => {
    if (pendingDeleteIds.length === 0 || deleting) return;

    setDeleting(true);
    setError(null);
    try {
      const response = await clinicalReportsService.delete(pendingDeleteIds);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete Clinical Report');
      }

      if (preview?.id && pendingDeleteIds.includes(preview.id)) {
        setPreview(null);
        setShowPreviewModal(false);
      }
      setSelectedReportIds((current) => {
        const next = new Set(current);
        pendingDeleteIds.forEach((id) => next.delete(id));
        return next;
      });
      setPendingDeleteIds([]);
      await loadReports();
      setSuccess(t.deleteSuccess);
    } catch (err: any) {
      setError(err.message || 'Failed to delete Clinical Report');
    } finally {
      setDeleting(false);
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
        <label htmlFor="unitLocation">{t.unitLocation} <span className="required-star">*</span></label>
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
        <label htmlFor="monitoringDateTime">{t.dateTime} <span className="required-star">*</span></label>
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
          <div className="form-group">
            <label>{t.traineeName} <span className="required-star">*</span></label>
            <textarea
              rows={2}
              value={row.traineeName ?? ''}
              onChange={(e) => handleRowChange(index, 'traineeName', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>{t.group} <span className="required-star">*</span></label>
            <textarea
              rows={2}
              value={row.group ?? ''}
              onChange={(e) => handleRowChange(index, 'group', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>{t.monitoringObjective} <span className="required-star">*</span></label>
            <textarea
              rows={3}
              value={row.monitoringObjective}
              onChange={(e) => handleRowChange(index, 'monitoringObjective', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>{t.teachingLearningActivities} <span className="required-star">*</span></label>
            <textarea
              rows={4}
              value={row.teachingLearningActivities}
              onChange={(e) => handleRowChange(index, 'teachingLearningActivities', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>{t.clinicalPracticeRecordBook} <span className="required-star">*</span></label>
            <textarea
              rows={4}
              value={row.clinicalPracticeRecordBook}
              onChange={(e) => handleRowChange(index, 'clinicalPracticeRecordBook', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>{t.disciplineTraineeWelfareDiscussion} <span className="required-star">*</span></label>
            <textarea
              rows={4}
              value={row.disciplineTraineeWelfareDiscussion}
              onChange={(e) => handleRowChange(index, 'disciplineTraineeWelfareDiscussion', e.target.value)}
              required
            />
          </div>
        </div>
      ))}

      <div className="clinical-form-actions no-print">
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
        <div
          className="modal-content clinical-preview-modal"
          onClick={(e) => e.stopPropagation()}
        >
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
          <div className="clinical-preview-scroll">
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
      </div>
    );
  };

  const renderDeleteModal = () => {
    if (pendingDeleteIds.length === 0) return null;

    return (
      <div className="modal-overlay" onClick={() => !deleting && setPendingDeleteIds([])}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h3>{t.confirmDeleteSelected}</h3>
          <p>{t.cannotUndo}</p>
          <div className="modal-actions">
            <button
              type="button"
              className="approve-button"
              disabled={deleting}
              onClick={() => setPendingDeleteIds([])}
            >
              {t.cancel}
            </button>
            <button
              type="button"
              className="reject-button"
              disabled={deleting}
              onClick={handleConfirmDelete}
            >
              {t.deletePermanently}
            </button>
          </div>
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
        <>
        <div className="clinical-row-actions clinical-report-bulk-actions">
            <button type="button" className="clinical-action-button" onClick={() => setSelectedReportIds(new Set(reports.map((report) => report.id)))}>
              {t.selectAll}
            </button>
            <button type="button" className="clinical-action-button" onClick={() => setSelectedReportIds(new Set())}>
              {t.deselectAll}
            </button>
            <span>{t.selectedRecords}: {selectedReportIds.size}</span>
            <button
              type="button"
              className="reject-button"
              disabled={selectedReportIds.size === 0}
              onClick={() => requestDelete(Array.from(selectedReportIds))}
            >
              {t.deleteSelected}
            </button>
        </div>
        <div className="table-container">
          <table className="staff-table">
            <thead>
              <tr>
                <th aria-label={t.selectedRecords} />
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
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedReportIds.has(report.id)}
                      onChange={() => toggleReportSelection(report.id)}
                      aria-label={`${t.selectedRecords}: ${report.reportNumber || report.id}`}
                    />
                  </td>
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
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
      {renderDeleteModal()}
    </div>
  );
};

export default ClinicalReportsPage;
