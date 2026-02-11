import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

interface PageHeaderProps {
  title?: string;
  description?: string;
  stats?: string;
  showBackLink?: boolean;
}

export function PageHeader({
  title,
  description,
  stats,
  showBackLink = false,
}: PageHeaderProps) {
  return (
    <header className="border-b border-border-primary">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {showBackLink && (
              <Link
                href="/"
                className="text-text-secondary hover:text-text-primary transition-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md px-2 py-1 -ml-2"
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
            {title && (
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
                  {title}
                </h1>
                {description && (
                  <p className="text-text-secondary mt-1 text-sm tracking-tight">
                    {description}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-6">
            {stats && (
              <div className="text-sm text-text-secondary">{stats}</div>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
