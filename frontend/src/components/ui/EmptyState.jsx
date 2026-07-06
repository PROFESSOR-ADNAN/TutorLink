/**
 * Consistent "nothing here yet" state. `icon` accepts any inline SVG path
 * children, or omit for the default document icon.
 *
 * <EmptyState title="No sessions yet" description="..." action={<Button>Browse tutors</Button>} />
 */
export default function EmptyState({ title, description, action, icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-canvas-200">
        {icon || (
          <svg className="w-7 h-7 text-ink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        )}
      </div>
      <p className="font-sans font-medium text-ink-900 mb-1 text-sm">{title}</p>
      {description && <p className="text-xs text-ink-400 mb-4 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}
