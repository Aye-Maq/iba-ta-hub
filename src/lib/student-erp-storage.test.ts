import { beforeEach, describe, expect, it } from 'vitest';
import { clearStudentERP, readStudentERP, writeStudentERP } from './student-erp-storage';

describe('student ERP storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('centralizes read/write and clears shared-PC state', () => {
    writeStudentERP('26611');
    expect(readStudentERP()).toBe('26611');

    clearStudentERP();
    expect(readStudentERP()).toBeNull();
  });
});
