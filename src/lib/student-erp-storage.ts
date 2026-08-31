const STUDENT_ERP_STORAGE_KEY = 'student_erp';

export const readStudentERP = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(STUDENT_ERP_STORAGE_KEY);
};

export const writeStudentERP = (erp: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STUDENT_ERP_STORAGE_KEY, erp);
};

export const clearStudentERP = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(STUDENT_ERP_STORAGE_KEY);
};
