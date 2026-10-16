import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';

type Invitation = {
  contactMethod: 'email' | 'telephone';
  email: string | null;
  telephone: string | null;
  role: string;
};

type Child = {
  firstName: string;
  lastName: string;
  gender: string;
  birthMonth: string;
  birthYear: string;
};

const emptyChild = (): Child => ({ firstName: '', lastName: '', gender: '', birthMonth: '', birthYear: '' });
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 26 }, (_, index) => currentYear - index);

export default function AcceptInvitation() {
  const { token = '' } = useParams();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const [form, setForm] = useState({
    parent1FirstName: '', parent1LastName: '', parent2FirstName: '', parent2LastName: '',
    email: '', telephone: '', password: '', confirmPassword: '',
  });
  const [children, setChildren] = useState<Child[]>([emptyChild()]);

  useEffect(() => {
    fetch(`/api/invitations/accept/${encodeURIComponent(token)}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load invitation.');
        return result.invitation as Invitation;
      })
      .then((result) => {
        setInvitation(result);
        setForm((current) => ({
          ...current,
          email: result.email || '',
          telephone: result.telephone || '',
        }));
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load invitation.'))
      .finally(() => setLoading(false));
  }, [token]);

  const updateChild = (index: number, field: keyof Child, value: string) => {
    setChildren((current) => current.map((child, childIndex) => (
      childIndex === index ? { ...child, [field]: value } : child
    )));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);

    try {
      const response = await fetch(`/api/invitations/accept/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, children }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to create account.');
      setComplete(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create account.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p role="status" className="px-4 py-24 text-center text-slate-600">Loading invitation…</p>;
  if (!invitation) return <p role="alert" className="mx-auto max-w-2xl px-4 py-24 text-center text-red-800">{error}</p>;
  if (complete) {
    return (
      <section className="px-4 py-24 text-center">
        <h1 className="text-3xl font-extrabold text-blue-950">Account created</h1>
        <p className="mt-3 text-slate-600">Your family registration is complete. You can now sign in.</p>
        <Link to="/login" className="mt-6 inline-block rounded-md bg-amber-400 px-5 py-3 font-bold text-blue-950">Go to login</Link>
      </section>
    );
  }

  return (
    <section className="bg-slate-50 px-4 py-12">
      <form onSubmit={submit} className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-lg sm:p-10">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-600">Invitation registration</p>
        <h1 className="mt-2 text-3xl font-extrabold text-blue-950">Create your family account</h1>

        <fieldset className="mt-8">
          <legend className="text-xl font-bold text-blue-950">Parent 1</legend>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextField label="First name" value={form.parent1FirstName} onChange={(value) => setForm({ ...form, parent1FirstName: value })} required />
            <TextField label="Last name" value={form.parent1LastName} onChange={(value) => setForm({ ...form, parent1LastName: value })} required />
          </div>
        </fieldset>

        <fieldset className="mt-8">
          <legend className="text-xl font-bold text-blue-950">Parent 2 <span className="text-sm font-normal text-slate-500">(optional)</span></legend>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextField label="First name" value={form.parent2FirstName} onChange={(value) => setForm({ ...form, parent2FirstName: value })} />
            <TextField label="Last name" value={form.parent2LastName} onChange={(value) => setForm({ ...form, parent2LastName: value })} />
          </div>
        </fieldset>

        <fieldset className="mt-8">
          <legend className="text-xl font-bold text-blue-950">Children</legend>
          {children.map((child, index) => (
            <div key={index} className="mt-4 rounded-lg border border-slate-200 p-4">
              <div className="flex justify-between"><h2 className="font-bold text-blue-950">Child {index + 1}</h2>{children.length > 1 && <button type="button" onClick={() => setChildren((current) => current.filter((_, childIndex) => childIndex !== index))} className="text-sm font-bold text-red-700">Remove</button>}</div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <TextField label="First name" value={child.firstName} onChange={(value) => updateChild(index, 'firstName', value)} required />
                <TextField label="Last name" value={child.lastName} onChange={(value) => updateChild(index, 'lastName', value)} required />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <SelectField label="Gender" value={child.gender} onChange={(value) => updateChild(index, 'gender', value)} options={[['female', 'Female'], ['male', 'Male'], ['non_binary', 'Non-binary'], ['prefer_not_to_say', 'Prefer not to say']]} />
                <SelectField label="Birth month" value={child.birthMonth} onChange={(value) => updateChild(index, 'birthMonth', value)} options={months.map((month, monthIndex) => [String(monthIndex + 1), month])} />
                <SelectField label="Birth year" value={child.birthYear} onChange={(value) => updateChild(index, 'birthYear', value)} options={years.map((year) => [String(year), String(year)])} />
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setChildren((current) => [...current, emptyChild()])} className="mt-4 font-bold text-blue-800 hover:underline">+ Add another child</button>
        </fieldset>

        <fieldset className="mt-8">
          <legend className="text-xl font-bold text-blue-950">Account details</legend>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextField label="Email address" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} required readOnly={invitation.contactMethod === 'email'} />
            <TextField label="Telephone" type="tel" value={form.telephone} onChange={(value) => setForm({ ...form, telephone: value })} required readOnly={invitation.contactMethod === 'telephone'} />
            <TextField label="Password" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} required minLength={12} />
            <TextField label="Confirm password" type="password" value={form.confirmPassword} onChange={(value) => setForm({ ...form, confirmPassword: value })} required minLength={12} />
          </div>
        </fieldset>

        {error && <p role="alert" className="mt-6 rounded-md bg-red-50 p-3 text-red-800">{error}</p>}
        <button type="submit" disabled={submitting} className="mt-8 rounded-md bg-amber-400 px-6 py-3 font-bold text-blue-950 hover:bg-amber-300 disabled:opacity-60">{submitting ? 'Creating account…' : 'Create account'}</button>
      </form>
    </section>
  );
}

function TextField({ label, value, onChange, type = 'text', required = false, readOnly = false, minLength }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; readOnly?: boolean; minLength?: number }) {
  return <label className="block text-sm font-semibold text-blue-950">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} readOnly={readOnly} minLength={minLength} className="mt-2 w-full rounded-md border border-slate-300 px-4 py-3 font-normal outline-none read-only:bg-slate-100 focus:border-blue-800 focus:ring-2 focus:ring-blue-100" /></label>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <label className="block text-sm font-semibold text-blue-950">{label}<select value={value} onChange={(event) => onChange(event.target.value)} required className="mt-2 w-full rounded-md border border-slate-300 bg-white px-4 py-3 font-normal"><option value="">Select</option>{options.map(([optionValue, text]) => <option key={optionValue} value={optionValue}>{text}</option>)}</select></label>;
}
