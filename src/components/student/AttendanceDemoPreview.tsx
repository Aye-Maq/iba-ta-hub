import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const DEMO_ROWS = [
  {
    label: 'Present',
    status: 'PRESENT',
    zoomName: '12345_Demo Student',
    attended: '60 min',
    required: '48 min',
    detail: 'Cutoff met; name format accepted.',
    className: 'border-green-500/30',
  },
  {
    label: 'Absent',
    status: 'ABSENT',
    zoomName: 'No matching Zoom name',
    attended: '30 min',
    required: '48 min',
    detail: 'Below the required 80% cutoff.',
    className: 'border-red-500/30',
  },
  {
    label: 'Name penalty',
    status: 'PRESENT',
    zoomName: 'Demo Student',
    attended: '55 min',
    required: '48 min',
    detail: 'Present · Name format incorrect.',
    className: 'border-pink-500/30',
  },
] as const;

/** Development-only sample content. It never reads from or writes to Supabase. */
export default function AttendanceDemoPreview() {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Sample student preview</CardTitle>
        <CardDescription>Demo-only examples of the attendance evidence layout. No real student record is used.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-3">
        {DEMO_ROWS.map((row) => (
          <div key={row.label} className={`rounded-lg border p-3 ${row.className}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{row.label}</span>
              <Badge variant={row.status === 'PRESENT' ? 'default' : 'destructive'}>{row.status}</Badge>
            </div>
            <dl className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Zoom name</dt><dd className="break-words text-right">{row.zoomName}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Attended</dt><dd>{row.attended}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Required</dt><dd>{row.required}</dd></div>
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">{row.detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
