/** A single pulsing placeholder bar/block. */
export function Skeleton({ className = '' }) {
  return <div className={`bg-canvas-200 rounded-lg animate-pulse ${className}`} />;
}

/** A stack of row-shaped skeletons, e.g. for a list of bookings or tutors. */
export function SkeletonRows({ count = 4, height = 'h-16' }) {
  return (
    <div className="space-y-2 p-2">
      {[...Array(count)].map((_, i) => (
        <Skeleton key={i} className={`${height} w-full`} />
      ))}
    </div>
  );
}
