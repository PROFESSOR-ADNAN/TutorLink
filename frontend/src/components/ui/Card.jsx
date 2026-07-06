/**
 * <Card hover padding="lg">...</Card>
 * padding: 'none' | 'sm' | 'md' (default) | 'lg'
 */
const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-6 sm:p-8',
};

export default function Card({ hover = false, padding = 'md', className = '', children, ...props }) {
  return (
    <div className={`${hover ? 'card-hover' : 'card'} ${PADDING[padding]} ${className}`} {...props}>
      {children}
    </div>
  );
}
