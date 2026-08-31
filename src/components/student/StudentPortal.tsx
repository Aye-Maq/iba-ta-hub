import { useEffect, useState } from 'react';
import { useERP } from '@/lib/erp-context';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import AttendanceView from './AttendanceView';
import LateDays from './LateDays';
import Groups from './Groups';
import { useAuth } from '@/lib/auth';
import { useLateDaysSummary } from '@/features/late-days';
import { readScopedSessionStorage, writeScopedSessionStorage } from '@/lib/scoped-session-storage';
import StudentNavigation, { type StudentPortalSection } from './StudentNavigation';
import StudentOverview from './StudentOverview';
import StudentSectionHeader from './StudentSectionHeader';

type StudentPortalTab = StudentPortalSection;
const STUDENT_STORAGE_SCOPE = 'student';
const ACTIVE_TAB_STORAGE_KEY = 'active-tab';

interface LateDaysSummary {
  remaining: number;
  totalAllowance: number;
}

const isStudentPortalTab = (value: string | null): value is StudentPortalTab =>
  value === 'dashboard' || value === 'attendance' || value === 'groups' || value === 'late-days';

export default function StudentPortal() {
  const { erp, isVerified, studentName, isLoading } = useERP();
  const { user } = useAuth();
  const storageUserKey = user?.email ?? erp ?? null;
  const storedActiveTab = readScopedSessionStorage<string | null>(
    STUDENT_STORAGE_SCOPE,
    storageUserKey,
    ACTIVE_TAB_STORAGE_KEY,
    null,
  );
  const [activeTab, setActiveTab] = useState<StudentPortalTab>(
    isStudentPortalTab(storedActiveTab) ? storedActiveTab : 'dashboard',
  );
  const [hasInitializedTab, setHasInitializedTab] = useState(false);
  const { data: lateDaysSummary, isLoading: isLateDaysLoading } = useLateDaysSummary(isVerified ? erp : null);
  const lateDaysRemaining = lateDaysSummary.remaining;
  const currentGroupNumber = lateDaysSummary.groupNumber ?? null;

  useEffect(() => {
    if (!hasInitializedTab) {
      setHasInitializedTab(true);
    }
  }, [hasInitializedTab]);

  useEffect(() => {
    if (!hasInitializedTab) {
      return;
    }

    writeScopedSessionStorage(STUDENT_STORAGE_SCOPE, storageUserKey, ACTIVE_TAB_STORAGE_KEY, activeTab);
  }, [activeTab, hasInitializedTab, storageUserKey]);

  const handleLateDaysSummaryChange = (_summary: LateDaysSummary) => {
    // Keep callback for LateDays component contract; source of truth is feature hook above.
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div data-ui-surface="student" className="student-shell container mx-auto max-w-5xl space-y-8 p-4 pb-20 animate-fade-in md:p-8 md:pb-8">
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="space-y-1 text-center md:text-left">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground text-center md:text-left">
            Student Portal
          </h1>
          <p className="text-muted-foreground text-lg">Track attendance, groups, and late days</p>
        </div>

        {erp && (
          <div className="w-full md:w-auto">
            <div className={`glass-card p-4 rounded-2xl border flex items-center gap-4 transition-all duration-300 hover:scale-[1.02] ${isVerified ? 'border-success/20 bg-success/5' : 'border-destructive/20 bg-destructive/5'}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isVerified ? 'bg-success/20 text-success' : 'bg-destructive/10 text-destructive'}`}>
                {isVerified ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
              </div>
              <div className="flex flex-col">
                <span className={`text-sm font-bold tracking-wide uppercase ${isVerified ? 'text-success' : 'text-destructive'}`}>
                  {isVerified ? 'Verified Account' : 'Status: Unverified'}
                </span>
                <span className="text-foreground font-semibold">
                  {isVerified ? `${studentName} (${erp})` : `ERP: ${erp}`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {!isVerified && erp ? (
        <div className="glass-card border-destructive/20 bg-destructive/5 p-8 rounded-2xl flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-destructive">Access Restricted</h2>
            <p className="text-muted-foreground max-w-md">
              Your ERP <span className="font-mono bg-destructive/10 px-1.5 py-0.5 rounded text-destructive">{erp}</span> was not found in the official roster. Please contact the TAs if you believe this is an error.
            </p>
          </div>
        </div>
      ) : isVerified ? (
        <div className="space-y-6">
          <StudentNavigation active={activeTab} onSelect={setActiveTab} />

          {activeTab === 'dashboard' && (
            <StudentOverview
              erp={erp}
              studentName={studentName}
              lateDaysRemaining={lateDaysRemaining}
              isLateDaysLoading={isLateDaysLoading}
              currentGroupNumber={currentGroupNumber}
              onOpenAttendance={() => setActiveTab('attendance')}
              onOpenGroups={() => setActiveTab('groups')}
              onOpenLateDays={() => setActiveTab('late-days')}
            />
          )}
          {activeTab === 'attendance' && (
            <section>
              <StudentSectionHeader title="Attendance" description="Review your session history and naming penalties." />
              <AttendanceView />
            </section>
          )}
          {activeTab === 'groups' && (
            <section>
              <StudentSectionHeader title="Groups" description="Review membership and manage your group while it is editable." />
              <Groups />
            </section>
          )}
          {activeTab === 'late-days' && (
            <section>
              <StudentSectionHeader title="Late days" description="Review your balance and submit a claim when eligible." />
              <LateDays onSummaryChange={handleLateDaysSummaryChange} />
            </section>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Could not identify your ERP from your email.</p>
          <p className="text-sm mt-2">Please ensure you are logged in with your IBA email.</p>
        </div>
      )}
    </div>
  );
}
