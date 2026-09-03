import { useEffect, useState } from 'react';
import { authService } from '../services/auth.service';
import { clinicalReportsService, type ClinicalReport } from '../services/clinical-reports.service';

type Language = 'en' | 'ms';

const labels = {
  en: {
    pageTitle: 'Clinical Report',
    ministry: 'Ministry of Health Malaysia',
    title: 'Clinical Area Monitoring Report',
    unitLocation: 'Unit / Location',
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
    actions: 'Actions',
    view: 'View',
    download: 'Download PDF',
    close: 'Close',
    english: 'English',
    malay: 'Malay',
    success: 'Clinical report submitted successfully.',
    error: 'Failed to submit. Please check all required fields.',
    invalid: 'All required fields must be filled.',
    required: ' (required)',
  },
  ms: {
    pageTitle: 'Laporan Klinikal',
    ministry: 'Kementerian Kesihatan Malaysia',
    title: 'Laporan Pemantauan Kawasan Klinikal',
    unitLocation: 'Unit / Lokasi',
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
    actions: 'Tindakan',
    view: 'Lihat',
    download: 'Muat Turun PDF',
    close: 'Tutup',
    english: 'English',
    malay: 'Malay',
    success: 'Laporan klinikal berjaya dihantar.',
    error: 'Gagal menghantar. Sila semak semua medan yang diperlukan.',
    invalid: 'Semua medan yang diperlukan mesti diisi.',
    required: ' (diperlukan)',
  },
};

const initialForm = {
  unitLocation: '',
  traineeName: '',
  group: '',
  monitoringObjective: '',
  teachingLearningActivities: '',
  clinicalPracticeRecordBook: '',
  disciplineTraineeWelfareDiscussion: '',
};

const ClinicalReportsPage = () => {
  const currentUser = authService.getCurrentUser();
  const isStaff = currentUser?.role === 'STAFF';

  const [language, setLanguage] = useState<Language>('en');
  const [form, setForm] = useState(initialForm);
  const [reports, setReports] = useState<ClinicalReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ClinicalReport | null>(null);

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = (): boolean => {
    const values = Object.values(form).map((v) => v.trim());
    return values.every((v) => v.length > 0);
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
      const response = await clinicalReportsService.create({
        ...form,
        language,
      });

      if (response.success) {
        setSuccess(t.success);
        setForm(initialForm);
        loadReports();
      } else {
        setError(response.message || t.error);
      }
    } catch (err: any) {
      setError(err.message || t.error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      await clinicalReportsService.downloadPdf(id);
    } catch (err: any) {
      setError(err.message || 'Failed to download PDF');
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
    <form onSubmit={handleSubmit} className="clinical-form">
      <div className="form-group">
        <label htmlFor="unitLocation">{t.unitLocation}{t.required}</label>
        <input
          id="unitLocation"
          name="unitLocation"
          type="text"
          className="staff-search-input"
          value={form.unitLocation}
          onChange={handleChange}
          maxLength={200}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="traineeName">{t.traineeName}{t.required}</label>
        <input
          id="traineeName"
          name="traineeName"
          type="text"
          className="staff-search-input"
          value={form.traineeName}
          onChange={handleChange}
          maxLength={150}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="group">{t.group}{t.required}</label>
        <input
          id="group"
          name="group"
          type="text"
          className="staff-search-input"
          value={form.group}
          onChange={handleChange}
          maxLength={100}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="monitoringObjective">{t.monitoringObjective}{t.required}</label>
        <textarea
          id="monitoringObjective"
          name="monitoringObjective"
          className="staff-search-input"
          rows={3}
          value={form.monitoringObjective}
          onChange={handleChange}
          maxLength={2000}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="teachingLearningActivities">{t.teachingLearningActivities}{t.required}</label>
        <textarea
          id="teachingLearningActivities"
          name="teachingLearningActivities"
          className="staff-search-input"
          rows={5}
          value={form.teachingLearningActivities}
          onChange={handleChange}
          maxLength={4000}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="clinicalPracticeRecordBook">{t.clinicalPracticeRecordBook}{t.required}</label>
        <textarea
          id="clinicalPracticeRecordBook"
          name="clinicalPracticeRecordBook"
          className="staff-search-input"
          rows={5}
          value={form.clinicalPracticeRecordBook}
          onChange={handleChange}
          maxLength={4000}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="disciplineTraineeWelfareDiscussion">{t.disciplineTraineeWelfareDiscussion}{t.required}</label>
        <textarea
          id="disciplineTraineeWelfareDiscussion"
          name="disciplineTraineeWelfareDiscussion"
          className="staff-search-input"
          rows={5}
          value={form.disciplineTraineeWelfareDiscussion}
          onChange={handleChange}
          maxLength={4000}
          required
        />
      </div>

      <div className="form-actions">
        <button
          type="submit"
          className="approve-button"
          disabled={submitting}
        >
          {submitting ? t.submitting : t.submit}
        </button>
      </div>
    </form>
  );

  const renderList = () => (
    <div className="table-container">
      {reports.length === 0 ? (
        <div className="empty-state">{t.noReports}</div>
      ) : (
        <table className="staff-table">
          <thead>
            <tr>
              <th>{t.reportId}</th>
              <th>{t.unitLocation}</th>
              <th>{t.traineeName}</th>
              <th>{t.group}</th>
              {!isStaff && <th>{t.submittedBy}</th>}
              <th>{t.submittedAt}</th>
              <th>{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id}>
                <td>{report.id.slice(0, 8)}</td>
                <td>{report.unitLocation}</td>
                <td>{report.traineeName}</td>
                <td>{report.group}</td>
                {!isStaff && <td>{report.submittedByName || report.submittedBy}</td>}
                <td>{formatDate(report.createdAt)}</td>
                <td>
                  <div className="staff-actions">
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="action-button"
                      type="button"
                    >
                      {t.view}
                    </button>
                    <button
                      onClick={() => handleDownload(report.id)}
                      className="action-button activate-button"
                      type="button"
                    >
                      {t.download}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="clinical-reports-page">
      <div className="clinical-header" style={{ marginBottom: '1rem' }}>
        <h2>{isStaff ? t.title : t.reportsList}</h2>
        <div className="language-toggle" style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className={language === 'en' ? 'approve-button' : 'action-button'}
            onClick={() => setLanguage('en')}
          >
            {t.english}
          </button>
          <button
            type="button"
            className={language === 'ms' ? 'approve-button' : 'action-button'}
            onClick={() => setLanguage('ms')}
          >
            {t.malay}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {isStaff && renderForm()}

      <h3 style={{ marginTop: '1.5rem' }}>
        {isStaff ? t.myReports : t.reportsList}
      </h3>
      {loading ? (
        <div className="loading-state">Loading...</div>
      ) : (
        renderList()
      )}

      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{labels[selectedReport.language as Language]?.title || t.title}</h3>

            <p><strong>{t.unitLocation}:</strong> {selectedReport.unitLocation}</p>
            <p><strong>{t.traineeName}:</strong> {selectedReport.traineeName}</p>
            <p><strong>{t.group}:</strong> {selectedReport.group}</p>
            <p><strong>{t.monitoringObjective}:</strong> {selectedReport.monitoringObjective}</p>
            <p><strong>{t.teachingLearningActivities}:</strong> {selectedReport.teachingLearningActivities}</p>
            <p><strong>{t.clinicalPracticeRecordBook}:</strong> {selectedReport.clinicalPracticeRecordBook}</p>
            <p><strong>{t.disciplineTraineeWelfareDiscussion}:</strong> {selectedReport.disciplineTraineeWelfareDiscussion}</p>
            <p><strong>{t.submittedAt}:</strong> {formatDate(selectedReport.createdAt)}</p>

            <div className="modal-actions" style={{ marginTop: '1rem' }}>
              <button
                onClick={() => setSelectedReport(null)}
                className="reject-button"
                type="button"
              >
                {t.close}
              </button>
              <button
                onClick={() => handleDownload(selectedReport.id)}
                className="approve-button"
                type="button"
              >
                {t.download}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicalReportsPage;
