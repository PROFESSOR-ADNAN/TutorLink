/**
 * The brand gradient band used on the Tutors page hero, now reused
 * anywhere we want that same "green stripe" treatment — it already
 * switches correctly between light/dark mode via the --brand-primary /
 * --brand-primary-hover CSS variables, so nothing extra is needed per page.
 *
 * Callers supply their own inner content (title, stats, actions, etc.) as
 * children — this component only owns the background, grid texture, and
 * padding. Use light text classes (text-white, text-gold-400) inside it,
 * since the gradient is always a dark forest tone regardless of theme.
 *
 * <GradientHero size="lg"> ... </GradientHero>
 */
const PADDING = {
  sm: 'py-6',
  md: 'py-8',
  lg: 'py-12 md:py-14',
};

export default function GradientHero({ size = 'md', className = '', children }) {
  return (
    <div
      className={`relative overflow-hidden border-b border-canvas-300 ${className}`}
      style={{ background: 'linear-gradient(155deg, rgb(var(--brand-primary)) 0%, rgb(var(--brand-primary-hover)) 100%)' }}
    >
      <div className="absolute inset-0 bg-grid-canvas opacity-10 pointer-events-none" />
      <div className={`section relative ${PADDING[size] || PADDING.md}`}>
        {children}
      </div>
    </div>
  );
}
