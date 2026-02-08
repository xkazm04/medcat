'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Wifi } from 'lucide-react';

interface ErrorBubbleProps {
  message: string;
  isRetryable: boolean;
  onRetry?: () => void;
  errorType?: 'rate_limit' | 'network' | 'generic';
}

export function ErrorBubble({ message, isRetryable, onRetry, errorType }: ErrorBubbleProps) {
  const [countdown, setCountdown] = useState(errorType === 'rate_limit' ? 30 : 0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  return (
    <div className="flex justify-start mb-3 px-4" role="alert">
      <div className="max-w-[85%] px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl rounded-bl-md">
        <div className="flex items-start gap-2.5">
          <div className="shrink-0 mt-0.5">
            {errorType === 'network' ? (
              <Wifi className="h-4 w-4 text-red-500 dark:text-red-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-red-800 dark:text-red-200">{message}</p>
            {errorType === 'network' && (
              <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">Check your internet connection and try again.</p>
            )}
            {errorType === 'rate_limit' && countdown > 0 && (
              <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1 tabular-nums">
                Try again in {countdown}s
              </p>
            )}
            {isRetryable && onRetry && (
              <button
                onClick={onRetry}
                disabled={errorType === 'rate_limit' && countdown > 0}
                className="flex items-center gap-1.5 mt-2.5 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
