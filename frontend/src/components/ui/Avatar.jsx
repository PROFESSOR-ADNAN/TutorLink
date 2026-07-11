const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-28 h-28 text-3xl',
};

function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';
}

/**
 * Renders the user's photo, or a colored initials tile if there isn't one —
 * so a missing avatar never shows a broken image icon.
 */
export default function Avatar({ src, name, size = 'md', ring = false, className = '' }) {
  const base = `${SIZES[size] || SIZES.md} rounded-xl object-cover flex-shrink-0 ${ring ? 'ring-4 ring-surface' : ''} ${className}`;

  if (!src) {
    return (
      <div
        className={`${base} flex items-center justify-center font-sans font-semibold text-white bg-forest-600`}
        title={name}
      >
        {initials(name)}
      </div>
    );
  }

  return <img src={src} alt={name || 'Avatar'} className={base} />;
}
