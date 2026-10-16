import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth-context';

type Person = { firstName: string; lastName: string };
type Child = Person & { gender: string; birthMonth: number; birthYear: number };
type Member = Person & {
  id: string;
  email: string;
  telephone: string;
  parents?: Person[];
  children?: Child[];
  role?: string;
  isActive?: boolean;
  createdAt?: string;
};

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function MemberDetails() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [viewerRole, setViewerRole] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (user.role === 'user') {
      navigate('/', { replace: true });
      return;
    }

    let active = true;
    fetch(`/api/members/${encodeURIComponent(id)}`, { credentials: 'same-origin' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load member details.');
        return result;
      })
      .then((result) => {
        if (active) {
          setMember(result.member);
          setViewerRole(result.viewerRole);
        }
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load member details.');
      });

    return () => {
      active = false;
    };
  }, [authLoading, id, navigate, user]);

  if (authLoading || (!member && !error)) {
    return <p role="status" className="px-4 py-24 text-center text-slate-600">Loading member details…</p>;
  }
  if (error || !member) {
    return <p role="alert" className="px-4 py-24 text-center text-red-800">{error || 'Member not found.'}</p>;
  }

  return (
    <section className="min-h-[60vh] bg-slate-50 px-4 py-16">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <Link to="/members" className="text-sm font-bold text-blue-800 hover:underline">← Back to members</Link>
        <p className="mt-8 text-sm font-bold uppercase tracking-[0.18em] text-amber-600">Member details</p>
        <h1 className="mt-2 text-3xl font-extrabold text-blue-950">{member.firstName} {member.lastName}</h1>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <Detail label="Email"><a className="text-blue-800 hover:underline" href={`mailto:${member.email}`}>{member.email}</a></Detail>
          <Detail label="Telephone">{member.telephone ? <a className="text-blue-800 hover:underline" href={`tel:${member.telephone}`}>{member.telephone}</a> : 'Not provided'}</Detail>
          {member.role && <Detail label="Account role">{member.role.replace('_', ' ')}</Detail>}
          {viewerRole === 'admin' && member.createdAt && <Detail label="Member since">{new Date(member.createdAt).toLocaleDateString()}</Detail>}
        </dl>

        {member.parents && (
          <div className="mt-10">
            <h2 className="text-xl font-bold text-blue-950">Parents</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {member.parents.map((parent, index) => (
                <div key={`${parent.firstName}-${parent.lastName}-${index}`} className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Parent {index + 1}</p>
                  <p className="mt-1 font-semibold text-blue-950">{parent.firstName} {parent.lastName}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {member.children && (
          <div className="mt-10">
            <h2 className="text-xl font-bold text-blue-950">Children</h2>
            {member.children.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b-2 border-blue-950 text-sm text-blue-950"><tr><th className="px-3 py-3">Name</th><th className="px-3 py-3">Gender</th><th className="px-3 py-3">Birth month and year</th></tr></thead>
                  <tbody>{member.children.map((child, index) => <tr key={`${child.firstName}-${child.lastName}-${index}`} className="border-b border-slate-200"><td className="px-3 py-4">{child.firstName} {child.lastName}</td><td className="px-3 py-4 capitalize">{child.gender.replaceAll('_', ' ')}</td><td className="px-3 py-4">{monthNames[child.birthMonth - 1]} {child.birthYear}</td></tr>)}</tbody>
                </table>
              </div>
            ) : <p className="mt-3 text-slate-600">No child information is available.</p>}
          </div>
        )}

        {viewerRole === 'finance' && <p className="mt-8 rounded-md bg-slate-100 p-3 text-sm text-slate-600">Finance access is limited to parent contact information.</p>}
      </div>
    </section>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt className="text-sm font-semibold text-slate-500">{label}</dt><dd className="mt-1 capitalize text-slate-800">{children}</dd></div>;
}
