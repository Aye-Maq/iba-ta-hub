import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import PublicAttendance from './PublicAttendance';

vi.mock('@/components/public/PublicAttendanceBoard', () => ({
  default: () => <div data-testid="public-attendance-board">Attendance board</div>,
}));

describe('PublicAttendance', () => {
  it('starts with the attendance surface and login without the companion bot', () => {
    render(
      <MemoryRouter>
        <PublicAttendance />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('public-attendance-board')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
    expect(screen.queryByTestId('companion-bot-logo')).not.toBeInTheDocument();
    expect(document.querySelector('.theme-toggle-label--compact')).toBeInTheDocument();
  });
});
