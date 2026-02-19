"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { GoogleIcon } from "../icons/google-icon";

interface SignInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
}

export function SignInDialog({ open, onOpenChange, companyName }: SignInDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    await authClient.signIn.social({
      provider: "google",
      callbackURL: window.location.href,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-bg-secondary border-border-primary">
        <DialogHeader className="items-center text-center gap-4 pt-2">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-accent" />
          </div>
          <div className="space-y-2">
            <DialogTitle className="text-[18px] font-semibold tracking-tight">
              Sign in to run Deep Research
            </DialogTitle>
            <DialogDescription className="text-text-secondary text-[14px] leading-relaxed">
              Deep Research uses AI Agents to analyse{" "}
              <span className="text-text-primary font-medium">{companyName}</span>{" "}
              in real time — crawling news, web data, and public sources to build
              a comprehensive intelligence report.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-3 pt-2 pb-2">
          <Button
            className="w-full gap-2 h-11 hover:border-accent"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <GoogleIcon />
            {isLoading ? "Redirecting…" : "Continue with Google"}
          </Button>
          <Button
            variant="ghost"
            className="w-full text-text-tertiary hover:text-text-primary"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
