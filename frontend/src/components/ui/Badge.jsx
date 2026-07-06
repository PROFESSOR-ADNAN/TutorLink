const VARIANTS = {
  forest: 'badge-forest',
  gold: 'badge-gold',
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
  neutral: 'badge-neutral',
};

/** <Badge variant="success">Confirmed</Badge> */
export default function Badge({ variant = 'neutral', className = '', children }) {
  return <span className={`badge ${VARIANTS[variant] || VARIANTS.neutral} ${className}`}>{children}</span>;
}
