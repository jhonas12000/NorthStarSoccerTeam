import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';

type Child = {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthMonth: number;
  birthYear: number;
};

type Payment = {
  id: string;
  amountCents: number;
  category: string;
  description: string;
  date: string;
  monthsPaid: string[];
  months: number;
};

type Profile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  role: string;
  children: Child[];
  memberSince: string | null;
  totalPaidCents: number;
  paidMonths: string[];
  unpaidMonths: string[];
  outstandingAmountCents: number;
  unallocatedMonthsCount: number;
  payments: Payment[];
};

const monthName = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)));
};
const money = (amountCents: number) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
}).format(amountCents / 100);
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const currentYear = new Date().getFullYear();

export default function MemberDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading, setUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', email: '', telephone: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [showChildForm, setShowChildForm] = useState(false);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [savingChild, setSavingChild] = useState(false);
  const [childForm, setChildForm] = useState({ firstName: '', lastName: '', gender: '', birthMonth: '', birthYear: '' });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    let active = true;
    fetch('/api/profile', { credentials: 'same-origin' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load your profile.');
        return result.profile as Profile;
      })
      .then((result) => {
        if (!active) return;
        setProfile(result);
        setProfileForm({ firstName: result.firstName, lastName: result.lastName, email: result.email, telephone: result.telephone });
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load your profile.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [authLoading, navigate, user]);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setSavingProfile(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(profileForm),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to update your profile.');
      setProfile((current) => current ? { ...current, ...result.profile } : current);
      if (user) setUser({ ...user, firstName: result.profile.firstName, lastName: result.profile.lastName, email: result.profile.email });
      setEditingProfile(false);
      setNotice('Profile updated.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update your profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const addChild = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setSavingChild(true);
    try {
      const response = await fetch(editingChildId
        ? `/api/profile/children/${encodeURIComponent(editingChildId)}`
        : '/api/profile/children', {
        method: editingChildId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(childForm),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || (editingChildId ? 'Unable to update child.' : 'Unable to add child.'));
      setProfile((current) => current ? {
        ...current,
        children: editingChildId
          ? current.children.map((child) => child.id === editingChildId ? result.child : child)
          : [...current.children, result.child],
      } : current);
      setChildForm({ firstName: '', lastName: '', gender: '', birthMonth: '', birthYear: '' });
      setShowChildForm(false);
      setNotice(editingChildId ? 'Child details updated.' : 'Child added to your profile.');
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'Unable to add child.');
    } finally {
      setSavingChild(false);
    }
  };

  const beginEditChild = (child: Child) => {
    setError('');
    setNotice('');
    setEditingChildId(child.id);
    setChildForm({
      firstName: child.firstName,
      lastName: child.lastName,
      gender: child.gender,
      birthMonth: String(child.birthMonth),
      birthYear: String(child.birthYear),
    });
    setShowChildForm(true);
  };

  const beginAddChild = () => {
    setError('');
    setNotice('');
    setEditingChildId(null);
    setChildForm({ firstName: '', lastName: '', gender: '', birthMonth: '', birthYear: '' });
    setShowChildForm(true);
  };

  const cancelChildForm = () => {
    setShowChildForm(false);
    setEditingChildId(null);
    setChildForm({ firstName: '', lastName: '', gender: '', birthMonth: '', birthYear: '' });
  };

  const removeChild = async (child: Child) => {
    if (!window.confirm(`Remove ${child.firstName} ${child.lastName} from your account?`)) return;
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/profile/children/${encodeURIComponent(child.id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const result = response.status === 204 ? {} : await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to remove child.');
      setProfile((current) => current ? { ...current, children: current.children.filter((item) => item.id !== child.id) } : current);
      if (editingChildId === child.id) cancelChildForm();
      setNotice('Child removed from your profile.');
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Unable to remove child.');
    }
  };

  if (authLoading || loading) return <p role="status" className="px-4 py-24 text-center text-slate-600">Loading your profile…</p>;
  if (!user) return null;
  if (!profile) return <p role="alert" className="px-4 py-24 text-center text-red-800">{error || 'Unable to load your profile.'}</p>;

  return (
    <section className="min-h-[60vh] bg-white px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <header className="border-b border-slate-200 pb-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-600">Member dashboard</p>
            <h1 className="mt-2 text-3xl font-extrabold text-blue-950">{profile.firstName} {profile.lastName}</h1>
            <p className="mt-2 text-sm capitalize text-slate-600">Account role: {profile.role.replaceAll('_', ' ')}</p>
          </div>
        </header>

        {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-red-800">{error}</p>}
        {notice && <p role="status" className="rounded-md bg-emerald-50 p-3 text-emerald-800">{notice}</p>}

        <section className="border-b border-slate-200 py-7 sm:py-8" aria-labelledby="profile-heading">
          <div>
            <div>
              <h2 id="profile-heading" className="text-xl font-bold text-blue-950">Profile</h2>
              <p className="mt-1 text-sm text-slate-500">Your contact details and account information.</p>
            </div>
          </div>
          {editingProfile ? (
            <form onSubmit={saveProfile} className="mt-5 max-w-2xl space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <TextInput label="First name" value={profileForm.firstName} onChange={(value) => setProfileForm((current) => ({ ...current, firstName: value }))} required />
                <TextInput label="Last name" value={profileForm.lastName} onChange={(value) => setProfileForm((current) => ({ ...current, lastName: value }))} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextInput label="Email address" type="email" value={profileForm.email} onChange={(value) => setProfileForm((current) => ({ ...current, email: value }))} required />
                <TextInput label="Telephone" type="tel" value={profileForm.telephone} onChange={(value) => setProfileForm((current) => ({ ...current, telephone: value }))} required />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={savingProfile} className="rounded-md bg-amber-400 px-5 py-2.5 font-bold text-blue-950 hover:bg-amber-300 disabled:opacity-60">{savingProfile ? 'Saving…' : 'Save profile'}</button>
                <button type="button" onClick={() => setEditingProfile(false)} className="rounded-md px-4 py-2.5 font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
              </div>
            </form>
          ) : (
            <div>
              <dl className="mt-5 grid max-w-2xl gap-x-8 gap-y-4 sm:grid-cols-2">
                <ProfileDetail label="Name" value={`${profile.firstName} ${profile.lastName}`} />
                <ProfileDetail label="Email address" value={profile.email} />
                <ProfileDetail label="Telephone" value={profile.telephone || 'Not provided'} />
              </dl>
              <button type="button" onClick={() => { setProfileForm({ firstName: profile.firstName, lastName: profile.lastName, email: profile.email, telephone: profile.telephone }); setEditingProfile(true); }} className="mt-4 text-left text-sm font-semibold text-blue-800 hover:underline">Edit profile</button>
            </div>
          )}
        </section>

        <section className="border-b border-slate-200 py-7 sm:py-8" aria-labelledby="children-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="children-heading" className="text-xl font-bold text-blue-950">Registered children</h2>
              <p className="mt-1 text-sm text-slate-500">Children linked to your family account.</p>
            </div>
            {!showChildForm && <button type="button" onClick={beginAddChild} className="text-left text-sm font-semibold text-blue-800 hover:underline"><span aria-hidden="true">+ </span>Add child</button>}
          </div>
          {profile.children.length ? (
            <div className="mt-5 max-w-4xl overflow-x-auto">
              <table className="w-full min-w-2xl text-left text-sm">
                <thead className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-3">First name</th>
                    <th className="px-3 py-3">Last name</th>
                    <th className="px-3 py-3">Gender</th>
                    <th className="px-3 py-3">Birthday</th>
                    <th className="px-3 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {profile.children.map((child) => (
                    <tr key={child.id}>
                      <td className="px-3 py-3 font-medium text-blue-950">{child.firstName}</td>
                      <td className="px-3 py-3">{child.lastName}</td>
                      <td className="px-3 py-3 capitalize">{child.gender.replaceAll('_', ' ')}</td>
                      <td className="px-3 py-3">{months[child.birthMonth - 1]} {child.birthYear}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => beginEditChild(child)} title={`Edit ${child.firstName} ${child.lastName}`} aria-label={`Edit ${child.firstName} ${child.lastName}`} className="rounded p-2 text-blue-800 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-800">
                            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2"><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" /></svg>
                          </button>
                          <button type="button" onClick={() => void removeChild(child)} title={`Delete ${child.firstName} ${child.lastName}`} aria-label={`Delete ${child.firstName} ${child.lastName}`} className="rounded p-2 text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-700">
                            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5M14 11v5" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No children are registered under your account yet.</p>}

          {!showChildForm && <button type="button" onClick={beginAddChild} className="mt-4 text-left text-sm font-semibold text-blue-800 hover:underline"><span aria-hidden="true">+ </span>Add child</button>}

          {showChildForm && (
            <form onSubmit={addChild} className="mt-5 grid max-w-3xl gap-4 sm:grid-cols-2">
              <h3 className="text-lg font-semibold text-blue-950 sm:col-span-2">{editingChildId ? 'Update child details' : 'Add a child'}</h3>
              <TextInput label="First name" value={childForm.firstName} onChange={(value) => setChildForm((current) => ({ ...current, firstName: value }))} required />
              <TextInput label="Last name" value={childForm.lastName} onChange={(value) => setChildForm((current) => ({ ...current, lastName: value }))} required />
              <label className="block text-sm font-semibold text-blue-950">Gender
                <select required value={childForm.gender} onChange={(event) => setChildForm((current) => ({ ...current, gender: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 font-normal">
                  <option value="">Select gender</option><option value="female">Female</option><option value="male">Male</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-semibold text-blue-950">Birth month
                  <select required value={childForm.birthMonth} onChange={(event) => setChildForm((current) => ({ ...current, birthMonth: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 font-normal">
                    <option value="">Month</option>{months.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-blue-950">Birth year
                  <select required value={childForm.birthYear} onChange={(event) => setChildForm((current) => ({ ...current, birthYear: event.target.value }))} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 font-normal">
                    <option value="">Year</option>{Array.from({ length: 26 }, (_, index) => currentYear - index).map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex gap-3 sm:col-span-2">
                <button type="submit" disabled={savingChild} className="rounded-md bg-blue-950 px-5 py-2.5 font-bold text-white hover:bg-blue-800 disabled:opacity-60">{savingChild ? 'Saving…' : editingChildId ? 'Update child' : 'Save child'}</button>
                <button type="button" onClick={cancelChildForm} className="rounded-md px-4 py-2.5 font-semibold text-slate-600 hover:bg-slate-200">Cancel</button>
              </div>
            </form>
          )}
        </section>

        <section className="border-b border-slate-200 py-7 sm:py-8" aria-labelledby="membership-heading">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="membership-heading" className="text-xl font-bold text-blue-950">Membership payments</h2>
              <p className="mt-1 text-sm text-slate-500">Monthly dues are $30 per month.</p>
            </div>
            <div className={profile.outstandingAmountCents > 0 ? 'text-amber-800' : 'text-emerald-700'}>
              <p className="text-xs font-semibold uppercase tracking-wide">Outstanding balance</p>
              <p className="mt-1 text-2xl font-extrabold">{money(profile.outstandingAmountCents)}</p>
            </div>
          </div>
          {profile.unpaidMonths.length ? (
            <div className="mt-5">
              <h3 className="text-sm font-bold text-blue-950">Unpaid months</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {profile.unpaidMonths.map((month) => <li key={month} className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-900">{monthName(month)}</li>)}
              </ul>
            </div>
          ) : <p className="mt-5 text-sm font-semibold text-emerald-700">No outstanding monthly dues.</p>}
          {profile.unallocatedMonthsCount > 0 && <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">Some earlier payment records do not list the months they covered, so the outstanding balance may need finance review.</p>}
          <div className="mt-6 border-t border-slate-200 pt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold text-blue-950">Payment history</h3>
              <p className="text-sm text-slate-600">Total paid: <span className="font-bold text-blue-950">{money(profile.totalPaidCents)}</span></p>
            </div>
            {profile.payments.length ? (
              <ul className="mt-3 divide-y divide-slate-100">
                {profile.payments.map((payment) => (
                  <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <p className="font-semibold text-blue-950">{payment.category}</p>
                      <p className="mt-1 text-slate-500">{payment.description}{payment.monthsPaid.length ? ` · ${payment.monthsPaid.map(monthName).join(', ')}` : ''}</p>
                      <p className="mt-1 text-xs text-slate-400">{payment.date ? new Date(`${payment.date}T00:00:00`).toLocaleDateString() : ''}</p>
                    </div>
                    <p className="font-bold text-emerald-700">{money(payment.amountCents)}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 text-sm text-slate-600">No payment history yet.</p>}
          </div>
        </section>

        {user.role === 'admin' && (
          <div className="pt-6 text-right"><Link to="/admin/invitations" className="font-semibold text-blue-800 hover:underline">Invitation management →</Link></div>
        )}
      </div>
    </section>
  );
}

function TextInput({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="block text-sm font-semibold text-blue-950">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-100" /></label>;
}

function ProfileDetail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 font-medium text-blue-950">{value || 'Not provided'}</dd></div>;
}
