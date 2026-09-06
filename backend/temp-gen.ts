import { generateClinicalReportDocx } from './src/modules/clinical-reports/clinical-reports.docx.js';
import fs from 'fs';

const report = {
  id: 'test',
  reportNumber: '7/0000001/26',
  unitLocation: 'Wad 1',
  monitoringDateTime: '2025-01-15T08:00:00.000Z',
  language: 'ms',
  trainees: [
    {
      traineeName: 'Ahmad Bin Ali',
      group: 'Kumpulan A',
      monitoringObjective: 'Mengikut objektif\nPenempatan klinikal\n(Lampiran B)',
      teachingLearningActivities: '8.00 am -1.00 pm\n1.\n2.\n2.00 pm - 5.00 pm\n1.\n2.',
      clinicalPracticeRecordBook: '1.Semak pencapaian rekod praktis pelatih\n2.',
      disciplineTraineeWelfareDiscussion: 'Baik',
    },
    {
      traineeName: 'Siti Binti Abu',
      group: 'Kumpulan B',
      monitoringObjective: 'Objektif 2',
      teachingLearningActivities: ' Aktiviti 2',
      clinicalPracticeRecordBook: 'Semak',
      disciplineTraineeWelfareDiscussion: '',
    },
  ],
};

const docx = await generateClinicalReportDocx(report as any);
fs.writeFileSync('temp-out.docx', docx);
console.log('DOCX generated, bytes:', docx.length);
