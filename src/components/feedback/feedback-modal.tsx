"use client";

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type Sentiment = 'love' | 'okay' | 'hate';

const SENTIMENTS: { value: Sentiment; label: string; emoji: string }[] = [
  { value: 'love', label: 'Love it', emoji: '😍' },
  { value: 'okay', label: "It's okay", emoji: '😐' },
  { value: 'hate', label: 'Hate it', emoji: '😤' },
];

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!sentiment) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentiment,
          message: message.trim() || null,
          page_url: window.location.href,
        }),
      });

      if (!res.ok) throw new Error('Request failed');

      onOpenChange(false);
      setSentiment(null);
      setMessage('');
      toast.success('Thanks for your feedback!');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSentiment(null);
      setMessage('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm bg-bg-secondary border-border-primary">
        <DialogHeader>
          <DialogTitle>How&apos;s your experience?</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 pt-1">
          {SENTIMENTS.map(({ value, label, emoji }) => (
            <Button
              key={value}
              variant={sentiment === value ? 'accent' : 'secondary'}
              onClick={() => setSentiment(value)}
              aria-pressed={sentiment === value}
              className={`flex h-auto flex-1 flex-col gap-1.5 py-3 text-xs ${sentiment === value ? 'border border-transparent' : 'bg-bg-primary'}`}
            >
              <span className="text-xl leading-none">{emoji}</span>
              {label}
            </Button>
          ))}
        </div>

        <Textarea
          placeholder="Anything else? (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1000}
          rows={3}
          className="resize-none"
          aria-label="Additional feedback"
        />

        <Button
          variant="accent"
          onClick={handleSubmit}
          disabled={!sentiment || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? 'Sending…' : 'Send feedback'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
