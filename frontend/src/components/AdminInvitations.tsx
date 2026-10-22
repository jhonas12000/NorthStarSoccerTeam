import { useEffect, useState, type FormEvent } from 'react';

type Invitation = {
  id: string;
  contactMethod: 'email' | 'telephone';
  email: string | null;
  telephone: string | null;
  role: string;
  status: string;
  createdAt: string;
  expiresAt: string;
};

export default function AdminInvitations() {
  const [contactMethod, setContactMethod] = useState<'email' | 'telephone'>('email');
  const [contact, setContact] = useState('');
  const [role, setRole] = useState('head_coach');
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteLink, setInviteLink] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingInvitationId, setDeletingInvitationId] = useState<string | null>(null);

  const loadInvitations = async () => {
    try {
      const response = await fetch('/api/invitations', { credentials: 'same-origin' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load invitations.');
      setInvitations(result.invitations);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load invitations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    fetch('/api/invitations', { credentials: 'same-origin' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load invitations.');
        return result.invitations;
      })
      .then((result) => {
        if (active) setInvitations(result);
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load invitations.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const createInvitation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    setInviteLink('');

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          contactMethod,
          role,
          ...(contactMethod === 'email' ? { email: contact } : { telephone: contact }),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to create invitation.');

      setInviteLink(new URL(result.invitePath, window.location.origin).toString());
      const recipient = result.invitation.email || result.invitation.telephone;
      setMessage(`Invitation created for ${recipient}.`);
      setContact('');
      await loadInvitations();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyInvitation = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setMessage('Invitation link copied to the clipboard.');
    } catch {
      setError('Unable to copy automatically. Select and copy the link manually.');
    }
  };

  const deleteInvitation = async (invitation: Invitation) => {
    const recipient = invitation.email || invitation.telephone || 'this recipient';
    if (!window.confirm(`Delete the pending invitation for ${recipient}? To change its details, delete it and create a new invitation.`)) return;

    setError('');
    setMessage('');
    setDeletingInvitationId(invitation.id);
    try {
      const response = await fetch(`/api/invitations/${encodeURIComponent(invitation.id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Unable to delete invitation.');
      }
      setInvitations((current) => current.filter((item) => item.id !== invitation.id));
      setMessage(`Invitation for ${recipient} deleted. You can now create a replacement invitation.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete invitation.');
    } finally {
      setDeletingInvitationId(null);
    }
  };

  return (
    <section className="mt-10 border-t border-slate-200 pt-8" aria-labelledby="invitations-heading">
      <h2 id="invitations-heading" className="text-2xl font-extrabold text-blue-950">
        Invite a user
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Invitations are valid for seven days and can only be used once.
      </p>

      <form className="mt-6 grid gap-4 sm:grid-cols-[10rem_1fr_10rem_auto] sm:items-end" onSubmit={createInvitation}>
        <div>
          <label htmlFor="invite-method" className="block text-sm font-semibold text-blue-950">
            Invite by
          </label>
          <select
            id="invite-method"
            value={contactMethod}
            onChange={(event) => {
              setContactMethod(event.target.value as 'email' | 'telephone');
              setContact('');
            }}
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-100"
          >
            <option value="email">Email</option>
            <option value="telephone">Telephone</option>
          </select>
        </div>

        <div>
          <label htmlFor="invite-contact" className="block text-sm font-semibold text-blue-950">
            {contactMethod === 'email' ? 'Email address' : 'Telephone number'}
          </label>
          <input
            id="invite-contact"
            type={contactMethod === 'email' ? 'email' : 'tel'}
            required
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            placeholder={contactMethod === 'email' ? 'member@example.com' : '+1 555 123 4567'}
            className="mt-2 w-full rounded-md border border-slate-300 px-4 py-3 outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label htmlFor="invite-role" className="block text-sm font-semibold text-blue-950">
            Role
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-100"
          >
            <option value="head_coach">Head Coach</option>
            <option value="chairman">Chairman</option>
            <option value="finance">Finance</option>
            <option value="user">User</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-amber-400 px-5 py-3 font-bold text-blue-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Creating…' : 'Create invite'}
        </button>
      </form>

      {error && <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-800">{message}</p>}

      {inviteLink && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <label htmlFor="invite-link" className="block text-sm font-semibold text-blue-950">
            Share this link privately
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="invite-link"
              readOnly
              value={inviteLink}
              onFocus={(event) => event.currentTarget.select()}
              className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
            />
            <button
              type="button"
              onClick={copyInvitation}
              className="rounded-md bg-blue-950 px-4 py-2 font-bold text-white hover:bg-blue-800"
            >
              Copy link
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            This is the only time the complete link is shown.
          </p>
        </div>
      )}

      <div className="mt-8">
        <h3 className="font-bold text-blue-950">Recent invitations</h3>
        {loading ? (
          <p className="mt-3 text-sm text-slate-600">Loading invitations…</p>
        ) : invitations.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No invitations have been created.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-3 pr-4 font-semibold">Recipient</th>
                  <th className="py-3 pr-4 font-semibold">Method</th>
                  <th className="py-3 pr-4 font-semibold">Role</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 font-semibold">Expires</th>
                  <th className="py-3 pl-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((invitation) => (
                  <tr key={invitation.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 text-slate-700">
                      {invitation.email || invitation.telephone}
                    </td>
                    <td className="py-3 pr-4 capitalize text-slate-600">{invitation.contactMethod}</td>
                    <td className="py-3 pr-4 capitalize text-slate-600">
                      {invitation.role.replace('_', ' ')}
                    </td>
                    <td className="py-3 pr-4 capitalize text-slate-600">{invitation.status}</td>
                    <td className="py-3 text-slate-600">
                      {invitation.expiresAt ? new Date(invitation.expiresAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      {invitation.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => void deleteInvitation(invitation)}
                          disabled={deletingInvitationId === invitation.id}
                          aria-label={`Delete invitation for ${invitation.email || invitation.telephone}`}
                          className="rounded p-2 text-red-700 hover:bg-red-50 disabled:cursor-wait disabled:opacity-50"
                          title="Delete pending invitation"
                        >
                          {deletingInvitationId === invitation.id ? 'Deleting…' : (
                            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2">
                              <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5M14 11v5" />
                            </svg>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
