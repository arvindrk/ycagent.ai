'use client';

import * as React from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTypingAnimation } from '@/hooks/use-typing-animation';

const SEARCH_PHRASES = [
  'AI agent platforms in San Francisco',
  'B2B automation tools in Europe',
  'Fintech infrastructure in New York',
  'Healthcare AI in Latin America',
  'Asia-based developer agent tools',
  'Climate tech platforms in San Francisco',
  'Europe-based AI agent startups',
  'B2B SaaS built remote-first',
  'Edtech automation in New York',
  'Latin American fintech agents',
  'LLM platforms in San Francisco',
  'Infrastructure tools in Europe',
  'Asian AI automation startups',
  'Workflow agent platforms remote',
  'New York healthcare AI tools',
  'Developer infrastructure in San Francisco',
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
    typingSpeed: 70,
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
