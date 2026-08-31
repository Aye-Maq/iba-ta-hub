import { FormEvent, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  Info,
  LayoutDashboard,
  Loader2,
  LogIn,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import CompanionBotLogo from "@/components/CompanionBotLogo";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  currentStudent,
  initialClaims,
  initialGroups,
  initialJoinRequests,
  previewSessions,
  previewStudents,
  type JoinRequest,
  type JoinRequestStatus,
  type PreviewClaim,
  type PreviewGroup,
  type PreviewStudent,
  type StudentStatus,
} from "@/preview/mockState";

type PreviewScreen = "public" | "login" | "dashboard";
type PortalSection = "dashboard" | "attendance" | "groups" | "late-days";
type BoardState = "ready" | "loading" | "error" | "empty";
type FontStyle = "modern" | "clean" | "academic" | "editorial";

const fontPresets: Record<
  FontStyle,
  { label: string; heading: string; body: string }
> = {
  modern: {
    label: "Modern",
    heading: "'Manrope', sans-serif",
    body: "'Inter', sans-serif",
  },
  clean: {
    label: "Clean",
    heading: "'Inter', sans-serif",
    body: "'Inter', sans-serif",
  },
  academic: {
    label: "Academic",
    heading: "'IBM Plex Sans', sans-serif",
    body: "'IBM Plex Sans', sans-serif",
  },
  editorial: {
    label: "Editorial",
    heading: "'Source Serif 4', Georgia, serif",
    body: "'Source Sans 3', sans-serif",
  },
};

const navItems: Array<{
  id: PortalSection;
  label: string;
  icon: typeof LayoutDashboard;
  description: string;
}> = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Course summary",
  },
  {
    id: "attendance",
    label: "Attendance",
    icon: CalendarDays,
    description: "Session history",
  },
  {
    id: "groups",
    label: "Groups",
    icon: Users,
    description: "Group membership",
  },
  {
    id: "late-days",
    label: "Late days",
    icon: Clock3,
    description: "Shared balance",
  },
];

const surface =
  "border-slate-200/80 bg-white dark:border-white/[0.1] dark:bg-[#111111]";
const softSurface =
  "border-slate-200/70 bg-slate-50/80 dark:border-white/[0.08] dark:bg-[#080808]";

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <CompanionBotLogo
        className={cn("shrink-0", compact ? "h-11 w-11" : "h-12 w-12")}
      />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold text-slate-950 dark:text-white">
          AAMD Portal
        </p>
        {!compact && (
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            Fall 2026 · Student space
          </p>
        )}
      </div>
    </div>
  );
}

function StatusPill({
  children,
  tone = "success",
  className,
}: {
  children: React.ReactNode;
  tone?: "success" | "neutral" | "warning" | "danger";
  className?: string;
}) {
  const tones = {
    success:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    neutral:
      "border-slate-200 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300",
    warning:
      "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300",
    danger: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

function FontStyleSelector({
  value,
  onChange,
}: {
  value: FontStyle;
  onChange: (value: FontStyle) => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <label
        htmlFor="student-preview-font-style"
        className="hidden text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 sm:inline"
      >
        Font style
      </label>
      <select
        id="student-preview-font-style"
        aria-label="Font style"
        value={value}
        onChange={(event) => onChange(event.target.value as FontStyle)}
        className="h-8 w-[84px] max-w-full rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20 dark:border-white/[0.12] dark:bg-[#111111] dark:text-slate-200 sm:w-[106px]"
      >
        {(Object.keys(fontPresets) as FontStyle[]).map((preset) => (
          <option key={preset} value={preset}>
            {fontPresets[preset].label}
          </option>
        ))}
      </select>
    </div>
  );
}

function PreviewSwitcher({
  screen,
  onNavigate,
  fontStyle,
  onFontStyleChange,
}: {
  screen: PreviewScreen;
  onNavigate: (screen: PreviewScreen) => void;
  fontStyle: FontStyle;
  onFontStyleChange: (value: FontStyle) => void;
}) {
  return (
    <div className="border-b border-slate-200/80 bg-white px-4 py-2 dark:border-white/[0.08] dark:bg-black sm:px-6">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          <span className="hidden h-2 w-2 rounded-full bg-emerald-500 sm:block" />
          Design preview
        </div>
        <div
          className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-white/[0.09] dark:bg-white/[0.04]"
          aria-label="Preview screens"
        >
          {(["public", "login"] as PreviewScreen[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onNavigate(item)}
              className={cn(
                "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                screen === item
                  ? "bg-white text-slate-950 shadow-sm dark:bg-white/10 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
              )}
            >
              {item === "public" ? "Public" : "Login"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <FontStyleSelector value={fontStyle} onChange={onFontStyleChange} />
          <ModeToggle />
        </div>
      </div>
    </div>
  );
}

export default function StudentPortalPreview() {
  const [screen, setScreen] = useState<PreviewScreen>("public");
  const [fontStyle, setFontStyle] = useState<FontStyle>("modern");
  const [section, setSection] = useState<PortalSection>("dashboard");
  const [groups, setGroups] = useState<PreviewGroup[]>(initialGroups);
  const [myGroup, setMyGroup] = useState<string | null>(null);
  const [requests, setRequests] = useState<JoinRequest[]>(initialJoinRequests);
  const [claims, setClaims] = useState<PreviewClaim[]>(initialClaims);
  const [lateBalance, setLateBalance] = useState(3);
  const [logoutOpen, setLogoutOpen] = useState(false);
  useEffect(() => {
    const linkId = "student-preview-google-fonts";
    const previousDocumentOverflowX = document.documentElement.style.overflowX;
    document.documentElement.style.overflowX = "clip";
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&family=Source+Sans+3:wght@400;500;600;700&family=Source+Serif+4:wght@400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
    return () => {
      document.getElementById(linkId)?.remove();
      document.documentElement.style.overflowX = previousDocumentOverflowX;
    };
  }, []);
  const resetPreviewScroll = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };
  const navigate = (next: PreviewScreen) => {
    resetPreviewScroll();
    setScreen(next);
  };
  const setPortalSection = (next: PortalSection) => {
    resetPreviewScroll();
    setSection(next);
  };
  const handleCreate = () => {
    const nextGroup = `Group ${groups.length + 1}`;
    setGroups((current) => [
      ...current,
      {
        id: nextGroup,
        poc: currentStudent.name,
        members: [currentStudent.name],
        capacity: 5,
      },
    ]);
    setMyGroup(nextGroup);
    setRequests((current) => [
      ...current,
      {
        id: `request-sample-${Date.now()}`,
        groupId: nextGroup,
        studentName: "Ayesha Khan",
        erp: "12345",
        status: "pending",
      },
    ]);
  };
  const handleJoinRequest = (groupId: string) => {
    if (
      requests.some(
        (request) =>
          request.erp === currentStudent.erp && request.status === "pending",
      )
    )
      return;
    setRequests((current) => [
      ...current.filter((request) => request.erp !== currentStudent.erp),
      {
        id: `request-${Date.now()}`,
        groupId,
        studentName: currentStudent.name,
        erp: currentStudent.erp,
        status: "pending",
      },
    ]);
  };
  const handleRequestStatus = (status: JoinRequestStatus) => {
    const request = requests.find((item) => item.erp === currentStudent.erp);
    if (!request) return;
    setRequests((current) =>
      current.map((item) =>
        item.id === request.id ? { ...item, status } : item,
      ),
    );
    if (status === "accepted") {
      setGroups((current) =>
        current.map((group) =>
          group.id === request.groupId &&
          !group.members.includes(currentStudent.name)
            ? { ...group, members: [...group.members, currentStudent.name] }
            : group,
        ),
      );
      setMyGroup(request.groupId);
    }
  };
  const handleCancelRequest = () => {
    const request = requests.find((item) => item.erp === currentStudent.erp);
    if (request?.status === "accepted") {
      setGroups((current) =>
        current.map((group) =>
          group.id === request.groupId
            ? {
                ...group,
                members: group.members.filter(
                  (member) => member !== currentStudent.name,
                ),
              }
            : group,
        ),
      );
      setMyGroup(null);
    }
    setRequests((current) =>
      current.filter((item) => item.erp !== currentStudent.erp),
    );
  };
  const handlePocDecision = (requestId: string, accepted: boolean) => {
    const request = requests.find((item) => item.id === requestId);
    if (!request) return;
    setRequests((current) =>
      current.map((item) =>
        item.id === requestId
          ? { ...item, status: accepted ? "accepted" : "declined" }
          : item,
      ),
    );
    if (accepted)
      setGroups((current) =>
        current.map((group) =>
          group.id === request.groupId &&
          !group.members.includes(request.studentName)
            ? { ...group, members: [...group.members, request.studentName] }
            : group,
        ),
      );
  };
  const handleLeave = () => {
    if (!myGroup) return;
    setGroups((current) =>
      current.map((group) =>
        group.id === myGroup
          ? {
              ...group,
              members: group.members.filter(
                (member) => member !== currentStudent.name,
              ),
            }
          : group,
      ),
    );
    setMyGroup(null);
    setRequests((current) =>
      current.filter((request) => request.erp !== currentStudent.erp),
    );
  };
  const handleDeleteGroup = () => {
    if (!myGroup) return;
    setGroups((current) => current.filter((group) => group.id !== myGroup));
    setRequests((current) =>
      current.filter((request) => request.groupId !== myGroup),
    );
    setMyGroup(null);
  };
  const handleClaim = (assignment: string, days: number) => {
    setClaims((current) => [
      { id: `claim-${Date.now()}`, assignment, claimedOn: "31 Aug 2026", days },
      ...current,
    ]);
    setLateBalance((current) => Math.max(0, current - days));
  };

  return (
    <div
      data-student-preview-root
      style={
        {
          "--preview-heading-font": fontPresets[fontStyle].heading,
          "--preview-body-font": fontPresets[fontStyle].body,
        } as CSSProperties
      }
      className="min-h-screen overflow-x-hidden bg-[#f5f7fa] text-slate-900 transition-colors dark:bg-black dark:text-slate-100"
    >
      <style>{`
        [data-student-preview-root] {
          font-family: var(--preview-body-font);
        }
        [data-student-preview-root] button,
        [data-student-preview-root] input,
        [data-student-preview-root] select,
        [data-student-preview-root] textarea {
          font-family: var(--preview-body-font);
        }
        [data-student-preview-root] h1,
        [data-student-preview-root] h2,
        [data-student-preview-root] h3,
        [data-student-preview-root] h4,
        [data-student-preview-root] h5,
        [data-student-preview-root] h6 {
          font-family: var(--preview-heading-font);
        }
        [data-student-preview-root] code,
        [data-student-preview-root] .font-mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
        }
      `}</style>
      {screen !== "dashboard" && (
        <PreviewSwitcher
          screen={screen}
          onNavigate={navigate}
          fontStyle={fontStyle}
          onFontStyleChange={setFontStyle}
        />
      )}
      {screen === "public" && (
        <PublicPreview onLogin={() => navigate("login")} />
      )}
      {screen === "login" && (
        <LoginPreview
          onBack={() => navigate("public")}
          onSuccess={() => {
            setPortalSection("dashboard");
            navigate("dashboard");
          }}
        />
      )}
      {screen === "dashboard" && (
        <DashboardPreview
          section={section}
          setSection={setPortalSection}
          groups={groups}
          myGroup={myGroup}
          requests={requests}
          onJoinRequest={handleJoinRequest}
          onRequestStatus={handleRequestStatus}
          onCancelRequest={handleCancelRequest}
          onPocDecision={handlePocDecision}
          onCreate={handleCreate}
          onLeave={handleLeave}
          onDeleteGroup={handleDeleteGroup}
          claims={claims}
          lateBalance={lateBalance}
          onClaim={handleClaim}
          onSignOut={() => setLogoutOpen(true)}
          fontStyle={fontStyle}
          onFontStyleChange={setFontStyle}
        />
      )}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign out of the preview?</DialogTitle>
            <DialogDescription>
              Your local demo changes will be kept for this session.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>
              Stay signed in
            </Button>
            <Button
              onClick={() => {
                setLogoutOpen(false);
                navigate("login");
              }}
            >
              Sign out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PublicPreview({ onLogin }: { onLogin: () => void }) {
  const [query, setQuery] = useState("");
  const [boardState, setBoardState] = useState<BoardState>("ready");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return previewStudents;
    return previewStudents.filter((student) =>
      [student.name, student.erp, student.classNo].some((field) =>
        field.toLowerCase().includes(normalized),
      ),
    );
  }, [query]);
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200/80 bg-white dark:border-white/[0.08] dark:bg-black">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-5 px-4 py-5 sm:px-8 sm:py-6">
          <div>
            <div className="mb-4">
              <Brand />
            </div>
            <h1 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-3xl">
              Attendance
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Attendance records and penalties for enrolled students.
            </p>
          </div>
          <Button className="rounded-md" onClick={onLogin}>
            <LogIn className="h-4 w-4" /> Login
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1400px] min-w-0 max-w-full overflow-hidden px-4 py-6 sm:px-8 sm:py-8">
        <Card
          className={cn(surface, "w-full min-w-0 max-w-full overflow-hidden")}
        >
          <CardHeader className="border-b border-slate-200/80 pb-5 dark:border-white/[0.08] sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-lg">Enrolled students</CardTitle>
                <CardDescription className="mt-1">
                  Read-only · {previewStudents.length} students ·{" "}
                  {previewSessions.length} sessions
                </CardDescription>
              </div>
              <div className="relative w-full lg:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search name, ERP, or class"
                  className="h-10 rounded-md pl-9"
                  aria-label="Search attendance board"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Legend
              </span>
              <span className="inline-flex items-center gap-1.5">
                <AttendanceDot status="present" /> Present
              </span>
              <span className="inline-flex items-center gap-1.5">
                <AttendanceDot status="absent" /> Absent
              </span>
              <span className="inline-flex items-center gap-1.5">
                <AttendanceDot status="excused" /> Excused
              </span>
              <span className="inline-flex items-center gap-1.5">
                <AttendanceDot status="pending" /> Pending
              </span>
              <span className="basis-full">
                Naming penalties appear in their own column.
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-500">
                Preview state
              </span>
              {(["ready", "loading", "error", "empty"] as BoardState[]).map(
                (state) => (
                  <button
                    type="button"
                    key={state}
                    onClick={() => setBoardState(state)}
                    className={cn(
                      "rounded px-2 py-1 text-xs capitalize transition-colors",
                      boardState === state
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.06]",
                    )}
                  >
                    {state}
                  </button>
                ),
              )}
            </div>
          </CardHeader>
          <CardContent className="w-full min-w-0 max-w-full overflow-hidden p-0">
            {boardState === "loading" && (
              <BoardMessage
                icon={<Loader2 className="h-5 w-5 animate-spin" />}
                title="Loading attendance"
                description="Refreshing the preview roster…"
              />
            )}
            {boardState === "error" && (
              <BoardMessage
                icon={<AlertCircle className="h-5 w-5 text-red-500" />}
                title="Could not load the board"
                description="Preview the retry state without making a request."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBoardState("ready")}
                  >
                    Retry
                  </Button>
                }
              />
            )}
            {boardState === "empty" && (
              <BoardMessage
                icon={<Search className="h-5 w-5" />}
                title="No attendance records yet"
                description="Preview the first-session empty state."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBoardState("ready")}
                  >
                    Show sample data
                  </Button>
                }
              />
            )}
            {boardState === "ready" && <AttendanceTable students={filtered} />}
          </CardContent>
          <CardFooter className="justify-between border-t border-slate-200/80 px-5 py-3 text-xs text-slate-500 dark:border-white/[0.08] sm:px-6">
            <span>
              {filtered.length} of {previewStudents.length} students shown
            </span>
            <span className="hidden sm:inline">
              Scroll horizontally to see all sessions
            </span>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}

function BoardMessage({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 px-6 text-center text-slate-500">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-white/[0.06]">
        {icon}
      </div>
      <p className="font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </p>
      <p className="max-w-sm text-sm">{description}</p>
      {action}
    </div>
  );
}

const attendanceStatusMeta: Record<
  StudentStatus,
  { label: string; dot: string }
> = {
  present: {
    label: "Present",
    dot: "bg-[#39ff88] shadow-[0_0_0_1px_rgba(57,255,136,0.3),0_0_4px_rgba(57,255,136,0.55)]",
  },
  absent: {
    label: "Absent",
    dot: "bg-[#ff4d5f] shadow-[0_0_0_1px_rgba(255,77,95,0.3),0_0_4px_rgba(255,77,95,0.5)]",
  },
  excused: {
    label: "Excused",
    dot: "bg-[#ffd447] shadow-[0_0_0_1px_rgba(255,212,71,0.3),0_0_4px_rgba(255,212,71,0.5)]",
  },
  pending: { label: "Pending", dot: "bg-slate-500" },
};

function AttendanceDot({ status }: { status: StudentStatus }) {
  const meta = attendanceStatusMeta[status];
  return (
    <span
      role="img"
      aria-label={meta.label}
      title={meta.label}
      className="inline-flex h-5 w-5 items-center justify-center"
    >
      <span
        aria-hidden="true"
        className={cn("h-2 w-2 rounded-full", meta.dot)}
      />
      <span className="sr-only">{meta.label}</span>
    </span>
  );
}

function AttendanceTable({ students }: { students: PreviewStudent[] }) {
  return (
    <div
      className="w-full min-w-0 max-w-full max-h-[min(64vh,620px)] overflow-auto"
      style={{ contain: "paint" }}
    >
      <table className="min-w-[1072px] w-full border-separate border-spacing-0 text-sm">
        <thead className="sticky top-0 z-20">
          <tr className="bg-white text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:bg-[#111111] dark:text-slate-400">
            <th className="sticky left-0 z-30 w-12 border-b border-slate-200 px-4 py-3 text-center dark:border-white/[0.08] dark:bg-[#111111]">
              #
            </th>
            <th className="sticky left-12 z-30 w-24 border-b border-slate-200 px-3 py-3 dark:border-white/[0.08] dark:bg-[#111111]">
              Class
            </th>
            <th className="sticky left-[144px] z-30 w-56 border-b border-slate-200 px-3 py-3 dark:border-white/[0.08] dark:bg-[#111111]">
              Student
            </th>
            <th className="sticky left-[368px] z-30 w-28 border-b border-slate-200 px-3 py-3 dark:border-white/[0.08] dark:bg-[#111111]">
              ERP
            </th>
            <th className="w-28 border-b border-slate-200 px-3 py-3 text-center dark:border-white/[0.08]">
              Penalty
            </th>
            <th className="w-24 border-b border-slate-200 px-3 py-3 text-center dark:border-white/[0.08]">
              Absences
            </th>
            {previewSessions.map((session) => (
              <th
                key={session.id}
                title={`${session.weekday}, ${session.date}`}
                className="w-16 border-b border-slate-200 px-3 py-3 text-center dark:border-white/[0.08]"
              >
                {session.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.length === 0 ? (
            <tr>
              <td
                colSpan={12}
                className="py-14 text-center text-sm text-slate-500"
              >
                No students match your search.
              </td>
            </tr>
          ) : (
            students.map((student, index) => {
              const absences = student.statuses.filter(
                (value) => value === "absent",
              ).length;
              return (
                <tr key={student.erp} className="group">
                  <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-2.5 text-center text-xs text-slate-400 group-hover:bg-slate-50 dark:border-white/[0.05] dark:bg-[#111111] dark:group-hover:bg-[#191919]">
                    {index + 1}
                  </td>
                  <td className="sticky left-12 z-10 border-b border-slate-100 bg-white px-3 py-2.5 font-medium dark:border-white/[0.05] dark:bg-[#111111] dark:group-hover:bg-[#191919]">
                    {student.classNo}
                  </td>
                  <td
                    className="sticky left-[144px] z-10 max-w-56 truncate border-b border-slate-100 bg-white px-3 py-2.5 font-medium dark:border-white/[0.05] dark:bg-[#111111] dark:group-hover:bg-[#191919]"
                    title={student.name}
                  >
                    {student.name}
                  </td>
                  <td className="sticky left-[368px] z-10 border-b border-slate-100 bg-white px-3 py-2.5 font-mono text-xs dark:border-white/[0.05] dark:bg-[#111111] dark:group-hover:bg-[#191919]">
                    {student.erp}
                  </td>
                  <td
                    className={cn(
                      "border-b border-slate-100 px-3 py-2.5 text-center font-semibold dark:border-white/[0.05]",
                      student.namingPenalty
                        ? "text-red-600 dark:text-red-400"
                        : "text-slate-400",
                    )}
                  >
                    {student.namingPenalty || "—"}
                  </td>
                  <td
                    className={cn(
                      "border-b border-slate-100 px-3 py-2.5 text-center font-semibold dark:border-white/[0.05]",
                      absences
                        ? "text-red-600 dark:text-red-400"
                        : "text-slate-400",
                    )}
                  >
                    {absences || "—"}
                  </td>
                  {student.statuses.map((value, statusIndex) => {
                    return (
                      <td
                        key={`${student.erp}-${statusIndex}`}
                        className="border-b border-slate-100 px-3 py-2.5 text-center dark:border-white/[0.05]"
                      >
                        <AttendanceDot status={value} />
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function LoginPreview({
  onBack,
  onSuccess,
}: {
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<"student" | "ta">("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const value = email.trim();
    if (!value) return setError("Enter your IBA email or demo ERP.");
    if (
      mode === "student" &&
      value !== "00000" &&
      !value.toLowerCase().endsWith("@khi.iba.edu.pk")
    )
      return setError("Use an IBA email address.");
    if (mode === "ta" && !password) return setError("Enter your password.");
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      onSuccess();
    }, 650);
  };
  return (
    <div className="flex min-h-[calc(100vh-57px)] items-center justify-center px-4 py-8 sm:px-6">
      <Card
        className={cn(
          surface,
          "w-full max-w-4xl overflow-hidden shadow-sm lg:grid lg:grid-cols-[0.9fr_1.1fr]",
        )}
      >
        <div className="hidden flex-col justify-between border-r border-primary/20 bg-[#07111f] p-8 text-white lg:flex">
          <div>
            <Brand />
            <div className="mt-20 max-w-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-300">
                AAMD · Fall 2026
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
                Student portal
              </h2>
              <p className="mt-4 text-sm leading-6 text-blue-100/75">
                Check attendance and grades, manage your group, and use late
                days when you need them.
              </p>
            </div>
          </div>
          <p className="text-xs text-blue-100/55">AAMD · Fall 2026</p>
        </div>
        <div className="min-w-0">
          <CardHeader className="space-y-4 p-5 sm:p-7">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-950 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back to attendance
            </button>
            <div>
              <CardTitle className="text-2xl">Log in</CardTitle>
              <CardDescription className="mt-1">
                Use the same login for the student or TA portal.
              </CardDescription>
            </div>
            <div
              className="grid grid-cols-2 rounded-md bg-slate-100 p-1 dark:bg-white/[0.06]"
              role="tablist"
              aria-label="Account type"
            >
              {(["student", "ta"] as const).map((item) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === item}
                  key={item}
                  onClick={() => {
                    setMode(item);
                    setError("");
                    setPassword("");
                  }}
                  className={cn(
                    "rounded px-3 py-2 text-sm font-semibold capitalize",
                    mode === item
                      ? "bg-white text-slate-950 shadow-sm dark:bg-white/10 dark:text-white"
                      : "text-slate-500 dark:text-slate-400",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0 sm:p-7 sm:pt-0">
            {error && (
              <div className="mb-5 flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="preview-email" className="text-sm font-medium">
                  {mode === "student" ? "IBA email or demo ERP" : "TA email"}
                </label>
                <Input
                  id="preview-email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={
                    mode === "student"
                      ? "name.12345@khi.iba.edu.pk"
                      : "ta@khi.iba.edu.pk"
                  }
                  autoComplete="username"
                  className="h-10 rounded-md"
                />
              </div>
              {mode === "ta" && (
                <div className="space-y-2">
                  <label
                    htmlFor="preview-password"
                    className="text-sm font-medium"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="preview-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      className="h-10 rounded-md pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="h-10 w-full rounded-md"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {loading ? "Logging in…" : "Log in"}
              </Button>
            </form>
            <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
              For preview: enter{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono dark:bg-white/10">
                00000
              </code>
              .
            </p>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}

function DashboardPreview({
  section,
  setSection,
  groups,
  myGroup,
  requests,
  onJoinRequest,
  onRequestStatus,
  onCancelRequest,
  onPocDecision,
  onCreate,
  onLeave,
  claims,
  lateBalance,
  onClaim,
  onSignOut,
  onDeleteGroup,
  fontStyle,
  onFontStyleChange,
}: {
  section: PortalSection;
  setSection: (section: PortalSection) => void;
  groups: PreviewGroup[];
  myGroup: string | null;
  requests: JoinRequest[];
  onJoinRequest: (id: string) => void;
  onRequestStatus: (status: JoinRequestStatus) => void;
  onCancelRequest: () => void;
  onPocDecision: (id: string, accepted: boolean) => void;
  onCreate: () => void;
  onLeave: () => void;
  claims: PreviewClaim[];
  lateBalance: number;
  onClaim: (assignment: string, days: number) => void;
  onSignOut: () => void;
  onDeleteGroup: () => void;
  fontStyle: FontStyle;
  onFontStyleChange: (value: FontStyle) => void;
}) {
  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[236px] border-r border-slate-200/80 bg-white dark:border-white/[0.08] dark:bg-black lg:flex lg:flex-col">
        <div className="flex h-[78px] items-center px-5">
          <Brand compact />
        </div>
        <div className="px-3">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Workspace
          </p>
          <PortalNav active={section} onSelect={setSection} />
        </div>
        <div className="mt-auto border-t border-slate-200/80 p-3 dark:border-white/[0.08]">
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 dark:bg-white/[0.04]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              TS
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {currentStudent.name}
              </p>
              <p className="font-mono text-[10px] text-slate-500">
                {currentStudent.erp}
              </p>
            </div>
            <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-500" />
          </div>
        </div>
      </aside>
      <div className="lg:pl-[236px]">
        <header className="sticky top-0 z-30 flex h-[66px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur dark:border-white/[0.08] dark:bg-black/95 sm:px-8">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                AAMD · Fall 2026
              </p>
              <h1 className="mt-0.5 text-lg font-semibold tracking-[-0.02em]">
                {navItems.find((item) => item.id === section)?.label}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-md sm:hidden"
              onClick={onSignOut}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
            <FontStyleSelector value={fontStyle} onChange={onFontStyleChange} />
            <ModeToggle />
            <Button
              variant="outline"
              className="hidden rounded-md sm:inline-flex"
              onClick={onSignOut}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </header>
        <main className="mx-auto max-w-[1260px] px-4 py-7 sm:px-8 sm:py-9">
          {section === "dashboard" && (
            <DashboardHome
              grouped={Boolean(myGroup)}
              balance={lateBalance}
              onNavigate={setSection}
            />
          )}
          {section === "attendance" && <Attendance />}
          {section === "groups" && (
            <Groups
              groups={groups}
              myGroup={myGroup}
              requests={requests}
              onJoinRequest={onJoinRequest}
              onRequestStatus={onRequestStatus}
              onCancelRequest={onCancelRequest}
              onPocDecision={onPocDecision}
              onCreate={onCreate}
              onLeave={onLeave}
              onDeleteGroup={onDeleteGroup}
            />
          )}
          {section === "late-days" && (
            <LateDays balance={lateBalance} claims={claims} onClaim={onClaim} />
          )}
        </main>
      </div>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-slate-200/80 bg-white/95 px-1 py-1 backdrop-blur dark:border-white/[0.08] dark:bg-black/95 lg:hidden"
        aria-label="Student portal navigation"
      >
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            onClick={() => setSection(id)}
            className={cn(
              "flex flex-col items-center gap-1 py-2 text-[10px] font-semibold",
              section === id
                ? "text-primary"
                : "text-slate-500 dark:text-slate-400",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>
      <div className="fixed bottom-28 right-4 z-30 flex items-center gap-2 rounded-full border border-primary/30 bg-white p-1.5 pr-3 shadow-[0_0_14px_rgba(37,99,235,0.12)] dark:border-primary/40 dark:bg-[#111111] lg:bottom-6">
        <CompanionBotLogo className="h-12 w-12 sm:h-14 sm:w-14" />
        <span className="hidden text-xs font-semibold text-slate-600 dark:text-slate-300 sm:inline">
          Companion
        </span>
      </div>
    </div>
  );
}

function PortalNav({
  active,
  onSelect,
}: {
  active: PortalSection;
  onSelect: (section: PortalSection) => void;
}) {
  return (
    <nav className="space-y-1" aria-label="Student portal navigation">
      {navItems.map(({ id, label, icon: Icon, description }) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          className={cn(
            "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
            active === id
              ? "border border-primary/50 bg-primary/10 text-primary shadow-[0_0_10px_rgba(37,99,235,0.1)]"
              : "border border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white",
          )}
        >
          <Icon className="h-[17px] w-[17px] shrink-0" />
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{label}</span>
            <span
              className={cn(
                "mt-0.5 block truncate text-[10px]",
                active === id
                  ? "text-primary/70"
                  : "text-slate-400 dark:text-slate-500",
              )}
            >
              {description}
            </span>
          </span>
          {active === id && <ChevronRight className="ml-auto h-4 w-4" />}
        </button>
      ))}
    </nav>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  description,
  tone = "blue",
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  description: string;
  tone?: "blue" | "green" | "amber";
}) {
  const tones = {
    blue: "bg-primary/10 text-primary",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  };
  return (
    <Card className={cn(surface, "rounded-md shadow-none")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {label}
            </p>
            <p className="mt-1.5 text-2xl font-semibold tracking-[-0.03em]">
              {value}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md",
              tones[tone],
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardHome({
  grouped,
  balance,
  onNavigate,
}: {
  grouped: boolean;
  balance: number;
  onNavigate: (section: PortalSection) => void;
}) {
  return (
    <div className="space-y-5 animate-fade-in">
      <section>
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          AAMD · Fall 2026 · BBA-1 · ERP {currentStudent.erp}
        </p>
      </section>
      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Attendance"
          value="100%"
          description="6 of 6 sessions present"
          icon={CalendarDays}
          tone="green"
        />
        <MetricCard
          label="Group status"
          value={grouped ? "Group 3" : "Not set"}
          description={grouped ? "Membership active" : "Action required"}
          icon={Users}
          tone="blue"
        />
        <MetricCard
          label="Late-day balance"
          value={String(balance)}
          description="days available"
          icon={Clock3}
          tone="amber"
        />
      </section>
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className={cn(surface, "rounded-md shadow-none")}>
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base">Upcoming deadlines</CardTitle>
            <CardDescription>Current course dates and actions.</CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-1">
            <div className="divide-y divide-slate-200 dark:divide-white/[0.08]">
              <div className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-semibold">Case brief 02</p>
                  <p className="text-xs text-slate-500">Due 12 Sep 2026</p>
                </div>
                <StatusPill tone="neutral">Open</StatusPill>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-semibold">Group registration</p>
                  <p className="text-xs text-slate-500">
                    Closes 02 Sep 2026 · 8:03 PM
                  </p>
                </div>
                <StatusPill tone={grouped ? "success" : "warning"}>
                  {grouped ? "Complete" : "Action"}
                </StatusPill>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={cn(softSurface, "rounded-md shadow-none")}>
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base">Required action</CardTitle>
            <CardDescription>
              {grouped
                ? "Review your current membership."
                : "One item needs attention."}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-1">
            <Button
              variant={grouped ? "outline" : "default"}
              className="w-full rounded-md"
              onClick={() => onNavigate(grouped ? "groups" : "groups")}
            >
              {grouped ? "Open group details" : "Set up a group"}{" "}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Attendance() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="space-y-5 animate-fade-in">
      <section>
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">
          Attendance
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Session history and applied penalties.
        </p>
      </section>
      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Attendance rate"
          value="100%"
          description="6 of 6 sessions present"
          icon={CalendarDays}
          tone="green"
        />
        <MetricCard
          label="Absences"
          value="0"
          description="in good standing"
          icon={CheckCircle2}
        />
        <MetricCard
          label="Naming penalty"
          value="0"
          description="points deducted"
          icon={Info}
          tone="amber"
        />
      </section>
      <Card className={cn(surface, "rounded-md shadow-none")}>
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base">Session history</CardTitle>
          <CardDescription>
            Select a session for its status explanation.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-200 dark:divide-white/[0.08]">
            {previewSessions.map((session) => (
              <button
                type="button"
                key={session.id}
                onClick={() =>
                  setSelected(selected === session.id ? null : session.id)
                }
                className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 dark:hover:bg-white/[0.035]"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Check className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {session.label} · {session.weekday}, {session.date}
                  </p>
                  <p className="text-xs text-slate-500">AAMD · Fall 2026</p>
                  {selected === session.id && (
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      Marked present by the TA team. No naming penalty was
                      applied.
                    </p>
                  )}
                </div>
                <StatusPill>
                  <Check className="h-3 w-3" /> Present
                </StatusPill>
                <ChevronDown
                  className={cn(
                    "hidden h-4 w-4 text-slate-400 sm:block",
                    selected === session.id && "rotate-180",
                  )}
                />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Groups({
  groups,
  myGroup,
  requests,
  onJoinRequest,
  onRequestStatus,
  onCancelRequest,
  onPocDecision,
  onCreate,
  onLeave,
  onDeleteGroup,
}: {
  groups: PreviewGroup[];
  myGroup: string | null;
  requests: JoinRequest[];
  onJoinRequest: (id: string) => void;
  onRequestStatus: (status: JoinRequestStatus) => void;
  onCancelRequest: () => void;
  onPocDecision: (id: string, accepted: boolean) => void;
  onCreate: () => void;
  onLeave: () => void;
  onDeleteGroup: () => void;
}) {
  const [memberQuery, setMemberQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState<string | null>(null);
  const [declineOpen, setDeclineOpen] = useState<string | null>(null);
  const current = groups.find((group) => group.id === myGroup);
  const openGroups = groups.filter(
    (group) => group.id !== myGroup && group.members.length < group.capacity,
  );
  const ownRequest = requests.find(
    (request) => request.erp === currentStudent.erp,
  );
  const members =
    current?.members.filter((member) =>
      member.toLowerCase().includes(memberQuery.toLowerCase()),
    ) ?? [];
  const incoming = current
    ? requests.filter(
        (request) =>
          request.groupId === current.id &&
          request.erp !== currentStudent.erp &&
          request.status === "pending",
      )
    : [];
  const hasPendingRequest = ownRequest?.status === "pending";
  return (
    <div className="space-y-5 animate-fade-in">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">Groups</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Group membership and join requests.
          </p>
        </div>
        {current ? (
          <Button
            variant="outline"
            className="rounded-md"
            onClick={() =>
              setDeclineOpen(
                current.poc === currentStudent.name ? "delete" : "leave",
              )
            }
          >
            <LogOut className="h-4 w-4" />
            {current.poc === currentStudent.name
              ? "Delete group"
              : "Leave group"}
          </Button>
        ) : (
          <Button
            className="rounded-md"
            disabled={hasPendingRequest}
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" /> Create a group
          </Button>
        )}
      </section>
      {!current && ownRequest?.status === "pending" && (
        <Card className={cn(surface, "rounded-md shadow-none")}>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <StatusPill tone="warning">Request pending</StatusPill>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {ownRequest.groupId} · The group POC will accept or decline your
                request.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-500">
                Preview result:
              </span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-md"
                onClick={() => onRequestStatus("accepted")}
              >
                Accepted
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-md"
                onClick={() => onRequestStatus("declined")}
              >
                Declined
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-md"
                onClick={onCancelRequest}
              >
                Cancel request
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {!current && ownRequest?.status === "accepted" && (
        <ResultNotice
          tone="success"
          title="Request accepted"
          detail={`You are now a member of ${ownRequest.groupId}.`}
          action={
            <Button
              variant="outline"
              size="sm"
              className="rounded-md"
              onClick={onCancelRequest}
            >
              Reset preview
            </Button>
          }
        />
      )}
      {!current && ownRequest?.status === "declined" && (
        <ResultNotice
          tone="danger"
          title="Request declined"
          detail={`The group POC declined your request for ${ownRequest.groupId}.`}
          action={
            <Button
              variant="outline"
              size="sm"
              className="rounded-md"
              onClick={onCancelRequest}
            >
              Try another group
            </Button>
          }
        />
      )}
      {current ? (
        <Card className={cn(surface, "rounded-md shadow-none")}>
          <CardContent className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <StatusPill tone="success">
                  <Check className="h-3.5 w-3.5" /> Member
                  {ownRequest?.status === "accepted" && " · Request accepted"}
                </StatusPill>
                <h3 className="mt-3 text-xl font-semibold">{current.id}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  POC: {current.poc} · {current.members.length} of{" "}
                  {current.capacity} members
                </p>
              </div>
              <span className="text-xs text-slate-500">
                Changes close 02 Sep, 8:03 PM
              </span>
            </div>
            {ownRequest?.status === "accepted" && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Your join request was accepted. You are now a member.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 rounded-md"
                  onClick={onCancelRequest}
                >
                  Reset preview
                </Button>
              </div>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold">Members</p>
              <div className="relative w-full sm:w-56">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={memberQuery}
                  onChange={(event) => setMemberQuery(event.target.value)}
                  placeholder="Search members"
                  className="h-9 rounded-md pl-9 text-sm"
                />
              </div>
            </div>
            <div className="mt-3 divide-y divide-slate-200 rounded-md border border-slate-200 px-4 dark:divide-white/[0.08] dark:border-white/[0.08]">
              {members.length ? (
                members.map((member) => (
                  <div
                    key={member}
                    className="flex items-center justify-between py-3 text-sm"
                  >
                    <span className="font-medium">{member}</span>
                    {member === currentStudent.name ? (
                      <StatusPill tone="neutral">You</StatusPill>
                    ) : (
                      <span className="text-xs text-slate-500">Member</span>
                    )}
                  </div>
                ))
              ) : (
                <p className="py-5 text-center text-sm text-slate-500">
                  No members match that search.
                </p>
              )}
            </div>
            {current.poc === currentStudent.name && (
              <div className="mt-7 border-t border-slate-200 pt-5 dark:border-white/[0.08]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Join requests</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Review incoming requests as the group POC.
                    </p>
                  </div>
                  <StatusPill tone="neutral">
                    {incoming.length} pending
                  </StatusPill>
                </div>
                {incoming.length ? (
                  <div className="mt-3 divide-y divide-slate-200 rounded-md border border-slate-200 px-4 dark:divide-white/[0.08] dark:border-white/[0.08]">
                    {incoming.map((request) => (
                      <div
                        key={request.id}
                        className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">
                            {request.studentName}
                          </p>
                          <p className="font-mono text-xs text-slate-500">
                            ERP {request.erp}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="rounded-md"
                            onClick={() => onPocDecision(request.id, true)}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-md"
                            onClick={() => setDeclineOpen(request.id)}
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    No pending requests.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className={cn(softSurface, "rounded-md shadow-none")}>
            <CardContent className="p-5">
              <p className="text-sm font-semibold">Not in a group</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Request to join an open group or create one.
              </p>
            </CardContent>
          </Card>
          <div className="grid gap-2 sm:grid-cols-2">
            {openGroups.map((group) => (
              <div
                key={group.id}
                className={cn(
                  surface,
                  "flex items-center gap-4 rounded-md border p-4",
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Users className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{group.id}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    POC: {group.poc}
                  </p>
                  <p className="text-xs text-slate-500">
                    {group.members.length} of {group.capacity} members
                  </p>
                </div>
                {ownRequest?.groupId === group.id &&
                ownRequest.status === "pending" ? (
                  <StatusPill tone="warning">Pending</StatusPill>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 rounded-md"
                    disabled={Boolean(ownRequest?.status === "pending")}
                    onClick={() => setJoinOpen(group.id)}
                  >
                    Request to join
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a group?</DialogTitle>
            <DialogDescription>
              You will become the POC. A sample incoming request will be added
              so the approval flow can be previewed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setCreateOpen(false);
                onCreate();
              }}
            >
              Create group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(joinOpen)}
        onOpenChange={(open) => !open && setJoinOpen(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request to join {joinOpen}?</DialogTitle>
            <DialogDescription>
              The group POC will accept or decline your request. You can cancel
              while it is pending.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinOpen(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (joinOpen) onJoinRequest(joinOpen);
                setJoinOpen(null);
              }}
            >
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(declineOpen)}
        onOpenChange={(open) => !open && setDeclineOpen(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {declineOpen === "leave"
                ? `Leave ${myGroup}?`
                : declineOpen === "delete"
                  ? `Delete ${myGroup}?`
                  : "Decline this request?"}
            </DialogTitle>
            <DialogDescription>
              {declineOpen === "leave"
                ? "Your place will become available before the lock time."
                : declineOpen === "delete"
                  ? "This removes the group and its pending requests from the preview."
                  : "The student will see that their request was declined."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineOpen(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (declineOpen === "leave") onLeave();
                else if (declineOpen === "delete") onDeleteGroup();
                else onPocDecision(declineOpen, false);
                setDeclineOpen(null);
              }}
            >
              {declineOpen === "leave"
                ? "Leave group"
                : declineOpen === "delete"
                  ? "Delete group"
                  : "Decline request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResultNotice({
  tone,
  title,
  detail,
  action,
}: {
  tone: "success" | "danger";
  title: string;
  detail: string;
  action: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between",
        tone === "success"
          ? "border-emerald-500/20 bg-emerald-500/10"
          : "border-red-500/20 bg-red-500/10",
      )}
    >
      <div>
        <p
          className={cn(
            "text-sm font-semibold",
            tone === "success"
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-red-700 dark:text-red-300",
          )}
        >
          {title}
        </p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {detail}
        </p>
      </div>
      {action}
    </div>
  );
}

function LateDays({
  balance,
  claims,
  onClaim,
}: {
  balance: number;
  claims: PreviewClaim[];
  onClaim: (assignment: string, days: number) => void;
}) {
  const [claimOpen, setClaimOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState(1);
  const assignment = "Case brief 02";
  return (
    <div className="space-y-5 animate-fade-in">
      <section>
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">Late days</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Shared balance and claim history.
        </p>
      </section>
      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Shared balance"
          value={String(balance)}
          description="days available"
          icon={Clock3}
          tone="amber"
        />
        <MetricCard
          label="Your claims"
          value={String(claims.length)}
          description="this semester"
          icon={FileText}
        />
        <MetricCard
          label="Open windows"
          value="1"
          description="assignment available"
          icon={CalendarDays}
          tone="green"
        />
      </section>
      <Card className={cn(surface, "rounded-md shadow-none")}>
        <CardHeader className="p-5 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Available now</CardTitle>
              <CardDescription>
                Claim up to your remaining balance.
              </CardDescription>
            </div>
            <StatusPill>
              <CheckCircle2 className="h-3.5 w-3.5" /> Open
            </StatusPill>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-1">
          <div className="flex flex-col gap-4 rounded-md border border-primary/20 bg-primary/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">{assignment}</p>
              <p className="mt-1 text-xs text-slate-500">
                Due 12 Sep 2026 · Claim window closes 05 Sep
              </p>
            </div>
            <Button
              size="sm"
              className="rounded-md"
              disabled={balance === 0}
              onClick={() => setClaimOpen(true)}
            >
              {balance === 0 ? "Balance used" : "Claim late day"}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card className={cn(surface, "rounded-md shadow-none")}>
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base">Claim history</CardTitle>
          <CardDescription>Recent late-day activity.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {claims.length ? (
            <div className="divide-y divide-slate-200 dark:divide-white/[0.08]">
              {claims.map((claim) => (
                <div
                  key={claim.id}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {claim.assignment}
                    </p>
                    <p className="text-xs text-slate-500">
                      Claimed {claim.claimedOn}
                    </p>
                  </div>
                  <StatusPill tone="neutral">
                    +{claim.days} {claim.days === 1 ? "day" : "days"}
                  </StatusPill>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-6 text-center text-sm text-slate-500">
              No late-day claims yet.
            </p>
          )}
        </CardContent>
      </Card>
      <Dialog open={claimOpen} onOpenChange={setClaimOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Claim late days</DialogTitle>
            <DialogDescription>
              Choose how many days to add to {assignment}. Balance: {balance}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2">
            {Array.from(
              { length: Math.min(3, balance) },
              (_, index) => index + 1,
            ).map((days) => (
              <button
                type="button"
                key={days}
                onClick={() => setSelectedDays(days)}
                className={cn(
                  "rounded-md border px-3 py-3 text-center",
                  selectedDays === days
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-slate-200 dark:border-white/[0.1]",
                )}
              >
                <span className="block text-lg font-semibold">{days}</span>
                <span className="text-xs text-slate-500">
                  {days === 1 ? "late day" : "late days"}
                </span>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClaimOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onClaim(assignment, selectedDays);
                setClaimOpen(false);
              }}
            >
              Confirm claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
