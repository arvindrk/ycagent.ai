"use client";

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FeedbackModal } from './feedback-modal';

export function FeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="accent"
              size="icon"
              onClick={() => setOpen(true)}
              aria-label="Give feedback"
              className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg"
            >
              <MessageSquare />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Give feedback</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <FeedbackModal open={open} onOpenChange={setOpen} />
    </>
  );
}
