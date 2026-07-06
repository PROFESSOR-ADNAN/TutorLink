import Button from './Button';

/**
 * Shown when a page-level data fetch fails. Always give people a way to
 * retry — a silent console.error() with no UI feedback is a dead end.
 *
 * <ErrorState message={error} onRetry={fetchBookings} />
 */
export default function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-red-50">
        <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>
      <p className="font-sans font-medium text-ink-900 mb-1 text-sm">Something went wrong</p>
      <p className="text-xs text-ink-400 mb-4 max-w-xs">
        {message || "We couldn't load this. Check your connection and try again."}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
