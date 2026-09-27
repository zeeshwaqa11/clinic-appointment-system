import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="mt-16 text-center">
      <h1 className="text-3xl font-bold text-slate-800">Page not found</h1>
      <p className="mt-2 text-slate-500">The page you're looking for doesn't exist.</p>
      <Link to="/" className="mt-4 inline-block text-brand-600 hover:underline">
        Go home
      </Link>
    </div>
  );
}
