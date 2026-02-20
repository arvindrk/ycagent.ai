'use client';

import * as React from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTypingAnimation } from '@/hooks/use-typing-animation';

const SEARCH_PHRASES = [
  'W24 AI companies that are hiring',
  'Seed-stage cybersecurity startups in Europe',
  'YC companies that went public',
  'S23 fintech with open roles',
  'Generative AI companies founded after 2022',
  'Series B enterprise SaaS hiring',
  'Acquired biotech in the Bay Area',
  'Healthcare AI actively hiring in London',
  'Nonprofits solving education access in Africa',
  'Remote-first developer tools for AI',
  '50+ employee climate tech startups',
  'Drug discovery AI startups in South Asia',
  'Mental health platforms for underserved markets',
  'No-code tools for building marketplaces',
  'Infrastructure for real-time data pipelines',
  'W23 seed-stage AI companies',
  'Growth-stage SaaS in New York',
  'Pre-2020 fintech startups in New York',
  'Shut down edtech companies',
  'Small team healthcare startups hiring',
  'Nonprofit edtech in New York',
  'F24 AI companies in Latin America',
  '10 to 50 employee B2B devtools',
];

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  isLoading = false,
  placeholder,
  className,
}: SearchInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = React.useState(false);

  const isAnimationEnabled = !isFocused && !value;

  const animatedPlaceholder = useTypingAnimation(SEARCH_PHRASES, {
    typingSpeed: 50,
    deletingSpeed: 20,
    pauseDuration: 2000,
    enabled: isAnimationEnabled,
  });

  const displayPlaceholder = placeholder ||
    (isAnimationEnabled ? animatedPlaceholder : 'Search YC companies...');

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className={cn('relative w-full', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />

      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={displayPlaceholder}
        className="pl-10 pr-10"
      />

      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {isLoading && (
          <Loader2 className="w-4 h-4 text-text-tertiary animate-spin" />
        )}
        {value && !isLoading && (
          <button
            type="button"
            onClick={handleClear}
            className="text-text-tertiary hover:text-text-primary transition-fast"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
