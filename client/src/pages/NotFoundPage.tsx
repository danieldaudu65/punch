import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function NotFoundPage() {
  useDocumentTitle('Page not found');

  return (
    <main className="center-page" style={{ minHeight: '100dvh', padding: '0 var(--page-gutter)' }}>
      <h1>This page doesn’t exist.</h1>
      <p>The link may be old or mistyped.</p>
      <Link to="/dashboard" className="btn btn--primary">
        Go to your dashboard
      </Link>
    </main>
  );
}
