import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import PublicAttendanceBoard from '@/components/public/PublicAttendanceBoard';
import { ModeToggle } from '@/components/mode-toggle';

export default function PublicAttendance() {
  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <header className="safe-sticky-header sticky top-0 z-50 w-full glass-morphism border-b border-primary/10">
        <div className="container flex min-h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="whitespace-nowrap text-lg font-semibold text-foreground">AAMD Portal</h1>
              <p className="hidden text-xs text-muted-foreground sm:block">Public Attendance Record</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ModeToggle compact />
            <Button asChild>
              <Link to="/auth" className="inline-flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Login
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl py-5 md:py-8">
        <PublicAttendanceBoard />
      </main>
    </div>
  );
}
