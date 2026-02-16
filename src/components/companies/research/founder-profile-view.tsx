import { FounderProfileResult } from '@/types/llm.types';
import { Users, Zap, TrendingUp, Award, Linkedin, Twitter, Github, ExternalLink, LucideIcon } from 'lucide-react';
import { useMemo } from 'react';

interface FounderProfileViewProps {
  result: FounderProfileResult;
}

interface CleanedItem {
  text: string;
  urls: string[];
}

interface CleanedFounder {
  name: string;
  title: string;
  education?: CleanedItem[];
  previousCompanies?: CleanedItem[];
  achievements?: CleanedItem[];
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
  };
}

interface ProcessedResult {
  founderRelationship: CleanedItem[];
  complementarySkills: CleanedItem[];
  socialPresence: CleanedItem[];
  trackRecord: CleanedItem[];
  founders: CleanedFounder[];
}

const SOCIAL_PLATFORMS = [
  { key: 'linkedin' as const, icon: Linkedin, label: 'LinkedIn' },
  { key: 'twitter' as const, icon: Twitter, label: 'Twitter' },
  { key: 'github' as const, icon: Github, label: 'GitHub' },
] as const;

function extractUrls(text: string): CleanedItem {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = text.match(urlRegex) || [];
  const cleanText = text.replace(urlRegex, '').trim();
  return { text: cleanText, urls };
}

function processResult(result: FounderProfileResult): ProcessedResult {
  return {
    founderRelationship: result.founderRelationship.map(extractUrls),
    complementarySkills: result.complementarySkills.map(extractUrls),
    socialPresence: result.socialPresence.map(extractUrls),
    trackRecord: result.trackRecord.map(extractUrls),
    founders: result.founders.map(founder => ({
      name: founder.name,
      title: founder.title,
      education: founder.education?.map(extractUrls),
      previousCompanies: founder.previousCompanies?.map(extractUrls),
      achievements: founder.achievements?.map(extractUrls),
      socialLinks: founder.socialLinks,
    })),
  };
}

function BulletPoint({ item }: { item: CleanedItem }) {
  return (
    <li className="flex gap-2">
      <span className="text-accent flex-shrink-0">•</span>
      <div className="flex-1">
        <span className="text-text-primary">{item.text}</span>
        {item.urls.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {item.urls.map((url, j) => (
              <a
                key={j}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-tertiary hover:bg-quaternary text-text-tertiary hover:text-accent text-xs rounded transition-colors border border-border"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Source {j + 1}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

function SocialLinks({ socialLinks, founderName }: { socialLinks?: CleanedFounder['socialLinks']; founderName: string }) {
  if (!socialLinks) return null;

  return (
    <div className="flex gap-2">
      {SOCIAL_PLATFORMS.map(({ key, icon: Icon, label }) => {
        const url = socialLinks[key];
        if (!url) return null;

        return (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent/60 hover:text-accent transition-colors"
            aria-label={`${founderName}'s ${label}`}
          >
            <Icon className="w-4 h-4" />
          </a>
        );
      })}
    </div>
  );
}

function ProfileSection({ title, items }: { title: string; items?: CleanedItem[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="mb-3">
      <h5 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">
        {title}
      </h5>
      <ul className="space-y-1 text-sm">
        {items.map((item, i) => (
          <BulletPoint key={i} item={item} />
        ))}
      </ul>
    </div>
  );
}

function AnalysisSection({ icon: Icon, title, items }: { icon: LucideIcon; title: string; items: CleanedItem[] }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-text-primary" />
        <h3 className="text-accent font-medium ">
          {title}
        </h3>
      </div>
      <ul className="space-y-2 text-sm">
        {items.map((item, i) => (
          <BulletPoint key={i} item={item} />
        ))}
      </ul>
    </section>
  );
}

export function FounderProfileView({ result }: FounderProfileViewProps) {
  const processed = useMemo(() => processResult(result), [result]);

  const founderSections = [
    { title: 'Education', items: (founder: CleanedFounder) => founder.education },
    { title: 'Previous Experience', items: (founder: CleanedFounder) => founder.previousCompanies },
    { title: 'Notable Achievements', items: (founder: CleanedFounder) => founder.achievements },
  ];

  const analysisSections = [
    { icon: Users, title: 'Founder Relationship', items: processed.founderRelationship },
    { icon: Zap, title: 'Complementary Skills', items: processed.complementarySkills },
    { icon: TrendingUp, title: 'Social Presence & Credibility', items: processed.socialPresence },
    { icon: Award, title: 'Execution Track Record', items: processed.trackRecord },
  ];

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-accent font-medium text-text-primary mb-3">
          Individual Profiles
        </h3>
        <div className="space-y-4">
          {processed.founders.map((founder, i) => (
            <div key={i} className="p-4 bg-secondary rounded-lg border border-border">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-accent">{founder.name}</h4>
                  <p className="text-sm text-text-secondary">{founder.title}</p>
                </div>
                <SocialLinks socialLinks={founder.socialLinks} founderName={founder.name} />
              </div>

              {founderSections.map((section) => (
                <ProfileSection
                  key={section.title}
                  title={section.title}
                  items={section.items(founder)}
                />
              ))}
            </div>
          ))}
        </div>
      </section>

      {analysisSections.map((section) => (
        <AnalysisSection
          key={section.title}
          icon={section.icon}
          title={section.title}
          items={section.items}
        />
      ))}
    </div>
  );
}
