import { forwardRef } from 'react';

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  gold: 'btn-gold',
  outline: 'btn-outline',
  danger: 'btn-outline', // visually outline, but red text — handled via className below
};

const SIZES = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
};

/**
 * Shared button. Always prefer this over a raw <button className="btn-...">
 * so hover/active states, sizing, and disabled/loading styling stay
 * consistent across every page.
 *
 * <Button variant="primary" size="sm" loading={saving}>Save changes</Button>
 */
const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, className = '', children, ...props },
  ref
) {
  const isDanger = variant === 'danger';
  return (
    <button
      ref={ref}
      className={[
        VARIANTS[variant] || VARIANTS.primary,
        SIZES[size],
        isDanger ? 'text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700' : '',
        className,
      ].join(' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
      )}
      {children}
    </button>
  );
});

export default Button;
