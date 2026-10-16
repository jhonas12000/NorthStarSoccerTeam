import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import AdminInvitations from './AdminInvitations';

export default function AdminInvitationsPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true });
    if (!loading && user && user.role !== 'admin') navigate('/member', { replace: true });
  }, [loading, navigate, user]);

  if (loading || !user || user.role !== 'admin') {
    return <p role="status" className="px-4 py-24 text-center text-slate-600">Loading…</p>;
  }

  return (
    <section className="min-h-[60vh] bg-slate-50 px-4 py-16">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow-lg">
        <Link to="/member" className="text-sm font-bold text-blue-800 hover:underline">
          ← Back to dashboard
        </Link>
        <AdminInvitations />
      </div>
    </section>
  );
}
