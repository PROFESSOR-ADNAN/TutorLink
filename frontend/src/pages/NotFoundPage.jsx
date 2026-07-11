import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6 text-center bg-canvas-100">
      <div className="font-serif mb-2 text-ink-300" style={{ fontSize: '7rem', lineHeight: 1, letterSpacing: '-0.04em' }}>
        404
      </div>
      <h1 className="font-serif text-2xl text-ink-900 mb-2">Page not found</h1>
      <p className="text-sm text-ink-400 mb-8 max-w-xs">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex gap-3">
        <Link to="/" className="btn-primary">Go home</Link>
        <Link to="/tutors" className="btn-outline">Browse tutors</Link>
      </div>
    </div>
  );
}
