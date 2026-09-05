# Project Conventions

## Clinical Report ID Generation

- **Format**: `<last digit of companyId>/<7-digit sequence>/<2-digit year>` (e.g. `7/0000001/26`)
- **Sequence table**: `clinical_report_sequences` — keyed by `(company_id, year)`
- **Concurrency safety**: Uses `INSERT ... ON CONFLICT (company_id, year) DO UPDATE SET last_number = last_number + 1 RETURNING last_number`, wrapped in a transaction.
- **`report_number` column** on `clinical_reports`: unique and nullable. Legacy records without a report number fall back to the UUID prefix for display.
- **Display surfaces**: list table, view modal, PDF, and DOCX exports.
- **Tests**: `clinical-reports.service.test.ts` covers first/second report, company isolation, year reset, multiple trainees, and concurrent allocation uniqueness.
