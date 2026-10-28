// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { clinicalReportsService } from './clinical-reports.service';

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
});
