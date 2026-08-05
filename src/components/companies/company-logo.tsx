'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface CompanyLogoProps {
  logoUrl: string | null | undefined;
  companyName: string;
  size?: number;
  priority?: boolean;
  className?: string;
}

/**
 * 632 of 5,653 companies store YC's own placeholder path
 * ("/company/thumb/missing.png") rather than a logo. It is relative, so
 * next/image resolves it against our origin and 400s. Those companies have no
 * logo, so anything that is not an absolute URL counts as absent.
 */
function hasUsableLogo(logoUrl: string | null | undefined): logoUrl is string {
  return typeof logoUrl === 'string' && /^https?:\/\//.test(logoUrl);
}

function monogram(companyName: string): string {
  return [...companyName.trim()][0]?.toUpperCase() ?? '?';
}

export function CompanyLogo({
  logoUrl,
  companyName,
  size = 40,
  priority = false,
  className,
}: CompanyLogoProps) {
  const [failed, setFailed] = useState(false);
  const box = cn(
    'flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-bg-tertiary',
    className,
  );

  // Roughly 2.5% of the real S3 objects are gone, so a runtime failure still
  // has to land on the same placeholder as a missing URL.
  if (!hasUsableLogo(logoUrl) || failed) {
    return (
      <div
        className={box}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <span
          className="font-medium leading-none text-text-tertiary"
          style={{ fontSize: Math.round(size * 0.4) }}
        >
          {monogram(companyName)}
        </span>
      </div>
    );
  }

  return (
    <div className={box} style={{ width: size, height: size }}>
      <Image
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        priority={priority}
        className="h-full w-full object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
