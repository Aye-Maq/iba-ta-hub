import type { GroupAdminState } from './types';

const csvCell = (value: string | number | null) => {
  const text = value === null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Build the compact group roster export expected by the TA workflow. */
export const buildGroupsCsv = (state: Pick<GroupAdminState, 'groups' | 'roster'>): string => {
  const rows = [...state.roster].sort((a, b) => {
    if (a.group_number === null) return b.group_number === null ? a.erp.localeCompare(b.erp) : 1;
    if (b.group_number === null) return -1;
    return a.group_number - b.group_number || a.class_no.localeCompare(b.class_no) || a.student_name.localeCompare(b.student_name);
  });
  const seenGroups = new Set<number>();
  return [
    ['Group No', 'ERP', 'Full Name'].join(','),
    ...rows.map((entry) => {
      const groupNumber = entry.group_number;
      const groupCell = groupNumber !== null && !seenGroups.has(groupNumber) ? groupNumber : null;
      if (groupNumber !== null) seenGroups.add(groupNumber);
      return [csvCell(groupCell), csvCell(entry.erp), csvCell(entry.student_name)].join(',');
    }),
  ].join('\n');
};
