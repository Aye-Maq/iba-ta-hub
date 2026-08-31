import { CalendarDays, LayoutDashboard, Users, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StudentPortalSection = 'dashboard' | 'attendance' | 'groups' | 'late-days';

interface StudentNavigationProps {
  active: StudentPortalSection;
  onSelect: (section: StudentPortalSection) => void;
}

const navigationItems: Array<{
  id: StudentPortalSection;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'dashboard', label: 'Dashboard', description: 'Course summary', icon: LayoutDashboard },
  { id: 'attendance', label: 'Attendance', description: 'Session history', icon: CalendarDays },
  { id: 'groups', label: 'Groups', description: 'Group membership', icon: Users },
  { id: 'late-days', label: 'Late days', description: 'Shared balance', icon: Clock3 },
];

export default function StudentNavigation({ active, onSelect }: StudentNavigationProps) {
  return (
    <nav aria-label="Student portal navigation" className="mb-6">
      <div className="hidden rounded-xl border bg-card p-2 shadow-sm md:grid md:grid-cols-4 md:gap-2">
        {navigationItems.map(({ id, label, description, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-current={active === id ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
              active === id
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{label}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{description}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background/95 px-1 py-1 shadow-lg backdrop-blur md:hidden">
        {navigationItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-current={active === id ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-1 py-2 text-[10px] font-semibold',
              active === id ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
