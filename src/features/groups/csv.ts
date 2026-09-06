import type { GroupAdminState } from './types';

const csvCell = (value: string | number | null) => {
  const text = value === null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Build the compact group roster export expected by the TA workflow. */
export const buildGroupsCsv = (state: Pick<GroupAdminState, 'groups' | 'roster'>): string => {
  // The export is a grouped roster, so students without a group do not belong
  // in it. Keep the existing deterministic ordering within each group.
  const rows = state.roster.filter((entry) => entry.group_number !== null).sort((a, b) => {
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
