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
type MemberPayment = {
  id: string;
  amountCents: number;
  category: string;
  description: string;
  date: string;
  monthsPaid: string[];
};
type MemberPaymentHistory = {
  totalPaidCents: number;
  paidMonths: string[];
  unallocatedMonthsCount: number;
  member: { membershipStartMonth: string };
  payments: MemberPayment[];
};

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const formatCurrency = (amountCents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amountCents / 100);
const monthKeyLabel = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  return `${monthNames[month - 1]} ${year}`;
};
const currentYearDueMonths = (membershipStartMonth: string) => {
  const year = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const membershipYear = Number(membershipStartMonth.slice(0, 4));
  if (membershipYear > year) return [];
  const firstDueMonth = membershipStartMonth.startsWith(`${year}-`)
    ? Number(membershipStartMonth.slice(5, 7))
    : 1;
  return Array.from({ length: Math.max(0, currentMonth - firstDueMonth + 1) }, (_, index) => (
    `${year}-${String(firstDueMonth + index).padStart(2, '0')}`
  ));
};

export default function MemberDetails() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [viewerRole, setViewerRole] = useState('');
  const [paymentHistory, setPaymentHistory] = useState<MemberPaymentHistory | null>(null);
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
        if (result.viewerRole === 'finance') {
          const paymentResponse = await fetch(`/api/finance/members/${encodeURIComponent(id)}/payments`, { credentials: 'same-origin' });
          const paymentResult = await paymentResponse.json();
          if (!paymentResponse.ok) throw new Error(paymentResult.error || 'Unable to load payment history.');
          result.paymentHistory = paymentResult;
        }
        return result;
      })
      .then((result) => {
        if (active) {
          setMember(result.member);
          setViewerRole(result.viewerRole);
          setPaymentHistory(result.paymentHistory || null);
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

        {viewerRole === 'finance' && paymentHistory && (
          <section className="mt-10 border-t border-slate-200 pt-8" aria-labelledby="member-payments-heading">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 id="member-payments-heading" className="text-xl font-bold text-blue-950">Payment information</h2>
                <p className="mt-1 text-sm text-slate-500">Total paid: {formatCurrency(paymentHistory.totalPaidCents)}</p>
              </div>
              <Link to={`/finance/members/${encodeURIComponent(member.id)}/payments`} className="text-sm font-semibold text-blue-800 hover:underline">
                Record payment →
              </Link>
            </div>

            <div className="mt-5 grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-bold text-blue-950">Months paid</h3>
                {paymentHistory.paidMonths.length ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {[...paymentHistory.paidMonths].sort().map((month) => (
                      <li key={month} className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">{monthKeyLabel(month)}</li>
                    ))}
                  </ul>
                ) : <p className="mt-2 text-sm text-slate-500">No month-specific payments recorded.</p>}
              </div>
              <div>
                <h3 className="text-sm font-bold text-blue-950">Unpaid months this year</h3>
                {(() => {
                  const unpaidMonths = currentYearDueMonths(paymentHistory.member.membershipStartMonth)
                    .filter((month) => !paymentHistory.paidMonths.includes(month));
                  return unpaidMonths.length ? (
                    <>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {unpaidMonths.map((month) => (
                          <li key={month} className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-900">{monthKeyLabel(month)}</li>
                        ))}
                      </ul>
                      <p className="mt-3 text-sm font-semibold text-amber-900">
                        Outstanding: {formatCurrency(unpaidMonths.length * 3_000)} ({unpaidMonths.length} month{unpaidMonths.length === 1 ? '' : 's'})
                      </p>
                    </>
                  ) : <p className="mt-2 text-sm text-emerald-700">No unpaid months this year.</p>;
                })()}
              </div>
            </div>

            {paymentHistory.unallocatedMonthsCount > 0 && (
              <p className="mt-5 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                {paymentHistory.unallocatedMonthsCount} previously paid month{paymentHistory.unallocatedMonthsCount === 1 ? '' : 's'} lack specific month allocations; please review before assessing outstanding dues.
              </p>
            )}

            <div className="mt-6 overflow-x-auto">
              <h3 className="text-sm font-bold text-blue-950">Payment history</h3>
              {paymentHistory.payments.length ? (
                <table className="mt-2 w-full min-w-xl text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr><th className="px-3 py-3">Date paid</th><th className="px-3 py-3">Months paid</th><th className="px-3 py-3">Description</th><th className="px-3 py-3 text-right">Amount</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paymentHistory.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-3 py-3 whitespace-nowrap">{payment.date ? new Date(`${payment.date}T00:00:00`).toLocaleDateString() : '—'}</td>
                        <td className="px-3 py-3">{payment.monthsPaid.length ? payment.monthsPaid.map(monthKeyLabel).join(', ') : 'Not specified'}</td>
                        <td className="px-3 py-3">{payment.description}</td>
                        <td className="px-3 py-3 text-right font-semibold whitespace-nowrap">{formatCurrency(payment.amountCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="mt-2 text-sm text-slate-500">No payment history yet.</p>}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt className="text-sm font-semibold text-slate-500">{label}</dt><dd className="mt-1 capitalize text-slate-800">{children}</dd></div>;
}
