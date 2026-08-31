import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StudentPortal from './StudentPortal';

const { useERPMock, useAuthMock, useAppSettingsQueryMock, useLateDaysSummaryMock, useStudentAttendanceQueryMock } = vi.hoisted(() => ({
  useERPMock: vi.fn(),
  useAuthMock: vi.fn(),
  useAppSettingsQueryMock: vi.fn(),
  useLateDaysSummaryMock: vi.fn(),
  useStudentAttendanceQueryMock: vi.fn(),
}));

vi.mock('@/lib/erp-context', () => ({
  useERP: useERPMock,
}));

vi.mock('@/lib/auth', () => ({
  useAuth: useAuthMock,
}));

vi.mock('@/features/settings', () => ({
  useAppSettingsQuery: useAppSettingsQueryMock,
}));

vi.mock('@/features/late-days', () => ({
  useLateDaysSummary: useLateDaysSummaryMock,
}));

vi.mock('@/features/attendance', () => ({
  useStudentAttendanceQuery: useStudentAttendanceQueryMock,
}));

vi.mock('./SubmitIssue', () => ({
  default: () => <div>Submit Issue Mock</div>,
}));

vi.mock('./MyIssues', () => ({
  default: () => <div>My Issues Mock</div>,
}));

vi.mock('./AttendanceView', () => ({
  default: () => <div>Attendance View Mock</div>,
}));

vi.mock('./LateDays', () => ({
  default: () => <div>Late Days Mock</div>,
}));

vi.mock('./Groups', () => ({
  default: () => <div>Groups Mock</div>,
}));

describe('StudentPortal persistence', () => {
  beforeEach(() => {
    window.sessionStorage.clear();

    useERPMock.mockReturnValue({
      erp: '00000',
      isVerified: true,
      studentName: 'Test Student',
      isLoading: false,
    });
    useAuthMock.mockReturnValue({
      user: { email: 'test.00000@khi.iba.edu.pk' },
    });
    useAppSettingsQueryMock.mockReturnValue({
      data: { tickets_enabled: true },
      isLoading: false,
    });
    useLateDaysSummaryMock.mockReturnValue({
      data: { remaining: 3, totalAllowance: 3 },
      isLoading: false,
    });
    useStudentAttendanceQueryMock.mockReturnValue({
      data: { total_absences: 2, total_naming_penalties: 1, records: [] },
      isLoading: false,
    });
  });

  it('restores the persisted active tab', async () => {
    window.sessionStorage.setItem(
      'aamd-workspace:student:test.00000@khi.iba.edu.pk:active-tab',
      JSON.stringify('groups'),
    );

    render(<StudentPortal />);

    expect(await screen.findByText('Groups Mock')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /groups/i })[0]).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('navigation', { name: 'Student portal navigation' })).toBeInTheDocument();
    expect(screen.queryByText('Submit Issue Mock')).not.toBeInTheDocument();
    expect(screen.queryByText('My Issues Mock')).not.toBeInTheDocument();
  });

  it('renders a concise dashboard overview with live summary values', async () => {
    window.sessionStorage.setItem(
      'aamd-workspace:student:test.00000@khi.iba.edu.pk:active-tab',
      JSON.stringify('dashboard'),
    );
    render(<StudentPortal />);

    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Ungrouped')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getAllByRole('navigation', { name: 'Student portal navigation' })).toHaveLength(1);
  });

  it('lands on the dashboard when no student section is persisted', async () => {
    render(<StudentPortal />);

    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /dashboard/i })[0]).toHaveAttribute('aria-current', 'page');
  });
});
