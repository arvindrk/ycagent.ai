'use client';

import { useState } from 'react';
import Image from 'next/image';

interface CompanyLogoProps {
  logoUrl: string | null | undefined;
  companyName: string;
}

export function CompanyLogo({ logoUrl, companyName }: CompanyLogoProps) {
  const [error, setError] = useState(false);

  if (logoUrl && !error) {
    return (
      <Image
        src={logoUrl}
        alt={`${companyName} logo`}
        width={120}
        height={120}
        priority
        className="object-contain"
        onError={() => setError(true)}
      />
    );
  }

  return (
    <Image
      src="/yc.png"
      alt="Y Combinator fallback img"
      width={120}
      height={120}
      className="object-contain grayscale opacity-30"
    />
  );
}
