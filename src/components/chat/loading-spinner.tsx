'use client';

import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  text: string;
}

export function LoadingSpinner({ text }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>{text}</span>
    </div>
  );
}
