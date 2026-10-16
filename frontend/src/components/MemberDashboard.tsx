import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';

export default function MemberDashboard() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true });
    if (!loading && user?.role === 'user') navigate('/', { replace: true });
  }, [loading, navigate, user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  if (loading || !user || user.role === 'user') {
    return <p role="status" className="px-4 py-24 text-center text-slate-600">Loading your account…</p>;
  }

  return (
    <section className="min-h-[60vh] bg-slate-50 px-4 py-16">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-lg">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-600">Member area</p>
        <h1 className="mt-2 text-3xl font-extrabold text-blue-950">
          Welcome, {user.firstName}
        </h1>
        <p className="mt-3 text-slate-600">You are signed in as {user.email}.</p>
        <p className="mt-1 text-sm capitalize text-slate-500">Account role: {user.role}</p>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-8 rounded-md bg-blue-950 px-5 py-3 font-bold text-white hover:bg-blue-800"
        >
          Sign out
        </button>

        {user.role === 'admin' && (
          <div className="mt-10 border-t border-slate-200 pt-8">
            <Link
              to="/admin/invitations"
              className="inline-flex items-center gap-2 font-bold text-blue-800 hover:text-blue-600 hover:underline"
            >
              Invitation link <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
