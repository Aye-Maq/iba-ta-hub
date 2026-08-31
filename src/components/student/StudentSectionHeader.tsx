interface StudentSectionHeaderProps {
  title: string;
  description: string;
}

export default function StudentSectionHeader({ title, description }: StudentSectionHeaderProps) {
  return (
    <div className="mb-4 flex flex-col gap-1 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Student space</span>
    </div>
  );
}
