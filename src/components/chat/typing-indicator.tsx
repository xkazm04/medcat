'use client';

export function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3 px-4" role="status" aria-live="polite">
      <div className="max-w-[85%] px-4 py-3 bg-muted rounded-2xl rounded-bl-md">
        {/* Skeleton text bars mimicking incoming message */}
        <div className="space-y-2">
          <div className="h-3 bg-muted-foreground/15 rounded-full w-[80%] animate-pulse" />
          <div
            className="h-3 bg-muted-foreground/12 rounded-full w-[60%] animate-pulse"
            style={{ animationDelay: '75ms' }}
          />
          <div
            className="h-3 bg-muted-foreground/10 rounded-full w-[40%] animate-pulse"
            style={{ animationDelay: '150ms' }}
          />
        </div>
        <span className="text-[11px] text-muted-foreground/60 mt-2 block">
          Generating response...
        </span>
      </div>
    </div>
  );
}
