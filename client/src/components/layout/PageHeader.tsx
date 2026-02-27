import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export default function PageHeader({ title, subtitle, className }: PageHeaderProps) {
  return (
    <header className={cn("bg-primary px-4 pt-12 pb-5 text-white", className)}>
      <h1 className="text-2xl font-heading font-bold">{title}</h1>
      {subtitle && (
        <p className="text-white/80 text-sm italic mt-0.5">{subtitle}</p>
      )}
    </header>
  );
}
