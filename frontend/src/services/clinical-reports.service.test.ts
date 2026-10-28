// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { clinicalReportsService } from './clinical-reports.service';
import { docLabels } from '../components/ClinicalReportDocument';

vi.mock('./api', () => ({
  apiRequest: vi.fn(),
  getAccessToken: vi.fn(() => 'test-token'),
}));

const indexHtml = readFileSync('index.html', 'utf8');

// The unhandledrejection handler in index.html decides whether to show the
// "Application updated" screen. Extract the exact regex it uses so this test
// guards the deployed markup, not a copy of the pattern.
const chunkLoadPattern = (() => {
  const match = indexHtml.match(/\/(.+)\/i\.test\(reason\)/);
  if (!match) throw new Error('chunk-load detection regex not found in index.html');
  return new RegExp(match[1], 'i');
})();

describe('index.html chunk-load detection', () => {
  it('still shows the update screen for genuine code-loading failures', () => {
    expect(chunkLoadPattern.test('ChunkLoadError: Loading chunk 42 failed.')).toBe(true);
    expect(
      chunkLoadPattern.test('TypeError: Failed to fetch dynamically imported module')
    ).toBe(true);
  });

  it('does not show the update screen for ordinary download failures', () => {
    expect(
      chunkLoadPattern.test('Error: Failed to download clinical-report-1.pdf')
    ).toBe(false);
    expect(
      chunkLoadPattern.test('Error: Failed to download clinical-report-1.docx')
    ).toBe(false);
  });
});

describe('clinicalReportsService downloads', () => {
  beforeEach(() => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('downloadPdf returns the promise so callers can catch HTTP failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500 }))
    );

    await expect(clinicalReportsService.downloadPdf('report-1')).rejects.toThrow(
      'Failed to download'
    );
  });

  it('downloadDocx returns the promise so callers can catch HTTP failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500 }))
    );

    await expect(clinicalReportsService.downloadDocx('report-1')).rejects.toThrow(
      'Failed to download'
    );
  });

  it('downloadPdf resolves and triggers a file download on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, blob: async () => new Blob(['%PDF']) }))
    );

    await expect(
      clinicalReportsService.downloadPdf('report-1')
    ).resolves.toBeUndefined();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });

  it('passes the selected language to the PDF and DOCX endpoints', async () => {
    const fetchMock = vi.fn(async (_url: unknown) => ({
      ok: true,
      blob: async () => new Blob(['x']),
    }));
    vi.stubGlobal('fetch', fetchMock);

    await clinicalReportsService.downloadPdf('report-1', 'ms');
    await clinicalReportsService.downloadDocx('report-1', 'ms');
    await clinicalReportsService.downloadPdf('report-2', 'en');
    await clinicalReportsService.downloadDocx('report-2', 'en');

    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls[0]).toContain('/clinical-reports/report-1/pdf?lang=ms');
    expect(urls[1]).toContain('/clinical-reports/report-1/docx?lang=ms');
    expect(urls[2]).toContain('/clinical-reports/report-2/pdf?lang=en');
    expect(urls[3]).toContain('/clinical-reports/report-2/docx?lang=en');
  });

  it('omits the lang parameter when no language is selected', async () => {
    const fetchMock = vi.fn(async (_url: unknown) => ({
      ok: true,
      blob: async () => new Blob(['x']),
    }));
    vi.stubGlobal('fetch', fetchMock);

    await clinicalReportsService.downloadPdf('report-1');

    expect(String(fetchMock.mock.calls[0][0])).not.toContain('lang=');
  });
});

describe('clinical report document dictionaries', () => {
  it('provides the same set of labels in English and Malay', () => {
    expect(Object.keys(docLabels.en).sort()).toEqual(
      Object.keys(docLabels.ms).sort()
    );
  });

  it('translates every static report label between English and Malay', () => {
    const keys = Object.keys(docLabels.en) as (keyof typeof docLabels.en)[];
    for (const key of keys) {
      expect(docLabels.ms[key]).toBeTruthy();
    }
    expect(docLabels.ms.title).toBe('LAPORAN PEMANTAUAN KAWASAN KLINIKAL');
    expect(docLabels.ms.ministry).toBe('KEMENTERIAN KESIHATAN MALAYSIA');
    expect(docLabels.ms.signature).toBe('Tandatangan:');
    expect(docLabels.ms.nameOfInstructor).toBe('Nama Pengajar:');
    expect(docLabels.en.title).toBe('CLINICAL AREA MONITORING REPORT');
    expect(docLabels.en.ministry).toBe('MINISTRY OF HEALTH MALAYSIA');
  });
});
