import { StreamChunk } from '@/types/llm.types';
import { type LucideIcon } from 'lucide-react';
import { GoogleIcon } from '@/components/icons/google-icon';

export interface TimelineEventProps {
  event: StreamChunk;
  isLatest: boolean;
}

export interface CircularProgressProps {
  duration: number;
  className?: string;
}

export type IconType = LucideIcon | typeof GoogleIcon;

export interface ActionDetails {
  tool: string;
  primary: string;
  secondary?: string;
  icon: IconType;
  duration?: number;
  urls?: string[];
}

export interface EventStyle {
  nodeColor: string;
  nodeBg: string;
  icon: LucideIcon;
  iconColor: string;
  label: string;
  labelColor: string;
  cardBg: string;
}
