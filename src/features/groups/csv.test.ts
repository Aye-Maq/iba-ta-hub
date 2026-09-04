import { describe, expect, it } from 'vitest';
import { buildGroupsCsv } from './csv';

describe('buildGroupsCsv', () => {
  it('writes the group number only on the first row for each group', () => {
    const csv = buildGroupsCsv({
      groups: [],
      roster: [
        { erp: '2', student_name: 'B, Two', class_no: 'B', group_number: 1 },
        { erp: '1', student_name: 'A One', class_no: 'A', group_number: 1 },
        { erp: '3', student_name: 'Ungrouped', class_no: 'C', group_number: null },
      ],
    });

    expect(csv).toBe(['Group No,ERP,Full Name', '1,1,A One', ',2,"B, Two"', ',3,Ungrouped'].join('\n'));
  });
});
