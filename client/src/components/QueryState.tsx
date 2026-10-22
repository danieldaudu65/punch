import { AlertTriangle } from 'lucide-react';
import { ApiError } from '../lib/api';
import { Button } from './Button';

/** One way to show "this failed to load", with a way to try again. */
export function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = error instanceof ApiError ? error.message : 'Something went wrong while loading this.';

  return (
    <div className="load-error" role="alert">
      <AlertTriangle size={20} aria-hidden="true" />
      <p>{message}</p>
      <Button size="small" variant="quiet" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

export function Skeleton({ height, className }: { height: number; className?: string }) {
  return <div className={`skeleton ${className ?? ''}`} style={{ height }} aria-hidden="true" />;
}
