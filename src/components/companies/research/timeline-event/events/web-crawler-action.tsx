import { useState } from 'react';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { WebCrawlerCommand } from '@/types/sandbox.types';
import { EventStyle } from '../types';

interface WebCrawlerActionProps {
  action: WebCrawlerCommand;
  style: EventStyle;
}

export function WebCrawlerAction({ action, style }: WebCrawlerActionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const urls = action.urls;
  const hasMultipleUrls = urls.length > 1;

  return (
    <div className="flex-1 min-w-0">
      <div className={`text-xs font-medium uppercase tracking-wider mb-1 ${style.labelColor}`}>
        WEB CRAWLER
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2 min-w-0">
          <a
            href={urls[0]}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-fast flex-1 min-w-0"
          >
            <span className="truncate">{urls[0]}</span>
            <ExternalLink className="w-3 h-3 opacity-0 text-accent group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </a>
          {hasMultipleUrls && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-xs text-text-secondary hover:text-accent transition-fast flex-shrink-0"
              aria-expanded={isExpanded}
            >
              <ChevronRight
                className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
              />
              <span>+{urls.length - 1} more</span>
            </button>
          )}
        </div>

        <div
          className={`overflow-hidden transition-all duration-200 ${
            isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <ul className="space-y-1 mt-2">
            {urls.map((url, idx) => (
              <li key={idx} className="flex gap-2 min-w-0">
                <span className="flex-shrink-0 text-xs text-text-secondary">•</span>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-fast min-w-0"
                >
                  <span className="truncate">{url}</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 text-accent transition-opacity flex-shrink-0" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
