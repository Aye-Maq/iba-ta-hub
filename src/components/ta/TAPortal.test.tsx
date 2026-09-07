import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import TAPortal from './TAPortal';

const { useAuthMock, useGroupAdminStateMock, subscribeToRealtimeTablesMock, removeRealtimeChannelMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useGroupAdminStateMock: vi.fn(),
  subscribeToRealtimeTablesMock: vi.fn(),
  removeRealtimeChannelMock: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  useAuth: useAuthMock,
}));

vi.mock('@/features/groups', () => ({
  useGroupAdminState: useGroupAdminStateMock,
}));

vi.mock('@/lib/realtime-table-subscriptions', () => ({
  subscribeToRealtimeTables: subscribeToRealtimeTablesMock,
  removeRealtimeChannel: removeRealtimeChannelMock,
}));

vi.mock('./TAZoomProcess', () => ({
  default: () => <div>Zoom Process Mock</div>,
}));

vi.mock('./AttendanceMarking', () => ({
  default: () => <div>Attendance Marking Mock</div>,
}));

vi.mock('./SessionManagement', () => ({
  default: () => <div>Session Management Mock</div>,
}));

vi.mock('./ConsolidatedView', () => ({
  default: () => <div>Consolidated View Mock</div>,
}));

vi.mock('./RuleExceptions', () => ({
  default: () => <div>Rule Exceptions Mock</div>,
}));

vi.mock('./RosterManagement', () => ({
  default: () => <div>Roster Management Mock</div>,
}));

vi.mock('./GroupsManagement', () => ({
  default: () => <div>Groups Management Mock</div>,
}));

vi.mock('./LateDaysManagement', () => ({
  default: () => <div>Late Days Management Mock</div>,
}));

vi.mock('./ExportData', () => ({
  default: () => <div>Export Data Mock</div>,
}));

vi.mock('./IssueManagement', () => ({
  default: () => <div>Issue Management Mock</div>,
}));

vi.mock('./ListsSettings', () => ({
  default: () => <div>Lists Settings Mock</div>,
}));

describe('TAPortal persistence', () => {
  const dashboardRefetchMock = vi.fn();
  let realtimeHandler: (() => void) | undefined;

  beforeEach(() => {
    window.sessionStorage.clear();
    dashboardRefetchMock.mockReset();
    realtimeHandler = undefined;
    useGroupAdminStateMock.mockReturnValue({
      data: { viewer_email: '', groups: [], roster: [], join_requests: [] },
      refetch: dashboardRefetchMock,
    });
    subscribeToRealtimeTablesMock.mockImplementation((_channelName: string, _subscriptions: unknown[], handler: () => void) => {
      realtimeHandler = handler;
      return {};
    });
    removeRealtimeChannelMock.mockResolvedValue(undefined);

    useAuthMock.mockReturnValue({
      user: { email: 'ayeshamaqsood5100@gmail.com' },
      signOut: vi.fn(),
    });
  });

  it('restores the persisted TA module', async () => {
    window.sessionStorage.setItem(
      'aamd-workspace:ta:ayeshamaqsood5100@gmail.com:active-module',
      JSON.stringify('groups'),
    );

    render(
      <MemoryRouter>
        <TAPortal />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Groups Management Mock')).toBeInTheDocument();
    expect(screen.queryByText('Zoom Processor')).not.toBeInTheDocument();
  });

  it('restores the attendance workspace tab', async () => {
    window.sessionStorage.setItem(
      'aamd-workspace:ta:ayeshamaqsood5100@gmail.com:active-module',
      JSON.stringify('attendance'),
    );
    window.sessionStorage.setItem(
      'aamd-workspace:ta:ayeshamaqsood5100@gmail.com:attendance-workspace-tab',
      JSON.stringify('attendance'),
    );

    render(
      <MemoryRouter>
        <TAPortal />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Attendance Marking Mock')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'LIVE ATTENDANCE' })).toHaveAttribute('aria-selected', 'true');
  });

  it('renders dashboard cards with the enhanced hover-ready icon treatment', async () => {
    render(
      <MemoryRouter>
        <TAPortal />
      </MemoryRouter>,
    );

    const zoomCard = screen.getByRole('button', { name: /zoom processor upload logs, review matches, and generate attendance/i });
    expect(zoomCard).toHaveClass('ta-dashboard-card');
    expect(zoomCard.querySelector('.ta-dashboard-icon-glow--base')).toBeTruthy();
    expect(zoomCard.querySelector('.ta-dashboard-icon-glow--hover')).toBeTruthy();
  });

  it('refreshes the dashboard group badge source when a group realtime event arrives', async () => {
    render(
      <MemoryRouter>
        <TAPortal />
      </MemoryRouter>,
    );

    expect(subscribeToRealtimeTablesMock).toHaveBeenCalledWith(
      'ta-dashboard-pending-group-requests',
      expect.arrayContaining([
        expect.objectContaining({ table: 'student_group_join_requests' }),
        expect.objectContaining({ table: 'student_group_members' }),
        expect.objectContaining({ table: 'student_groups' }),
      ]),
      expect.any(Function),
    );

    await act(async () => {
      realtimeHandler?.();
    });
    expect(dashboardRefetchMock).toHaveBeenCalledTimes(1);
  });

  it('hides Issue Queue and falls back to the dashboard when it was previously persisted', async () => {
    window.sessionStorage.setItem(
      'aamd-workspace:ta:ayeshamaqsood5100@gmail.com:active-module',
      JSON.stringify('issues'),
    );

    render(
      <MemoryRouter>
        <TAPortal />
      </MemoryRouter>,
    );

    expect(await screen.findByText('TA Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Issue Queue')).not.toBeInTheDocument();
    expect(screen.queryByText('Issue Management Mock')).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem('aamd-workspace:ta:ayeshamaqsood5100@gmail.com:active-module')).toBe('null');
  });
});
