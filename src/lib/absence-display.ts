/** Shared visual treatment for numerical absence totals (not session status). */
export const getAbsenceCountClass = (count: number, neutralClass = 'text-foreground'): string =>
  count >= 6 ? 'text-amber-600 dark:text-amber-400' : neutralClass;

export const getAbsenceCountMessage = (count: number): string =>
  count >= 6 ? 'Absence allowance exceeded' : '';
