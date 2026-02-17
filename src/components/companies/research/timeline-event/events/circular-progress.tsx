import { CircularProgressProps } from '../types';

export function CircularProgress({ duration, className = '' }: CircularProgressProps) {
  const radius = 6;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg className={`w-4 h-4 ${className}`} viewBox="0 0 16 16">
      <circle
        cx="8"
        cy="8"
        r={radius}
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        opacity="0.2"
      />
      <circle
        cx="8"
        cy="8"
        r={radius}
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={circumference}
        strokeLinecap="round"
        transform="rotate(-90 8 8)"
        style={{
          animation: `circular-progress ${duration * 1000}ms linear forwards`,
        }}
      />
    </svg>
  );
}
