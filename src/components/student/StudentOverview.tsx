import { CalendarDays, Clock3, Users } from 'lucide-react';
import { useStudentAttendanceQuery } from '@/features/attendance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import StudentSectionHeader from './StudentSectionHeader';

interface StudentOverviewProps {
  erp: string;
  studentName: string | null;
  lateDaysRemaining: number;
  isLateDaysLoading: boolean;
  currentGroupNumber: number | null;
  onOpenAttendance: () => void;
  onOpenGroups: () => void;
  onOpenLateDays: () => void;
}

const metrics = [
  { id: 'attendance', label: 'Absences', icon: CalendarDays },
  { id: 'groups', label: 'Group', icon: Users },
  { id: 'late-days', label: 'Late days left', icon: Clock3 },
] as const;

export default function StudentOverview({
  erp,
  studentName,
  lateDaysRemaining,
  isLateDaysLoading,
  currentGroupNumber,
  onOpenAttendance,
  onOpenGroups,
  onOpenLateDays,
}: StudentOverviewProps) {
  const { data: attendanceSummary, isLoading: isAttendanceLoading } = useStudentAttendanceQuery(erp);
  const values = {
    attendance: isAttendanceLoading ? '...' : String(attendanceSummary.total_absences),
    groups: currentGroupNumber === null ? 'Ungrouped' : `Group ${currentGroupNumber}`,
    'late-days': isLateDaysLoading ? '...' : String(lateDaysRemaining),
  };
  const actions = {
    attendance: onOpenAttendance,
    groups: onOpenGroups,
    'late-days': onOpenLateDays,
  };

  return (
    <section aria-labelledby="student-overview-heading">
      <div id="student-overview-heading">
        <StudentSectionHeader title="Overview" description={`${studentName ?? 'Student'} · ERP ${erp}`} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {metrics.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={actions[id]}
            className="group rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/30"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{values[id]}</p>
            <p className="mt-1 text-xs text-muted-foreground">Open {label.toLowerCase()}</p>
          </button>
        ))}
      </div>
      <Card className="mt-4 border-primary/15 bg-primary/[0.03] shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Keep your course record current</CardTitle>
          <CardDescription>
            Review attendance after each session, confirm your group membership, and use late days before the due window closes.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 text-xs text-muted-foreground">
          Your portal reflects the latest records available from the course workspace.
        </CardContent>
      </Card>
    </section>
  );
}
