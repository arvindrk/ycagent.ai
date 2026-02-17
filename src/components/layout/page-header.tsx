import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  metadata?: string;
  showBackLink?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  metadata,
  showBackLink = false,
}: PageHeaderProps) {
  return (
    <header className="border-b border-border-primary min-h-[110px]">
      <div className="container mx-auto px-4 py-6">
        <div className="relative flex items-center justify-between">
          {showBackLink && (
            <Link
              href="/"
              className="absolute left-[-60px] top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md px-2 py-1"
              aria-label="Back to home"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Link>
          )}
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
              {title}
            </h1>
            <div className="min-h-[24px] mt-1">
              {subtitle && (
                <p className="text-text-secondary text-sm tracking-tight">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-6">
            {metadata && (
              <div className="text-sm text-text-secondary">{metadata}</div>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
