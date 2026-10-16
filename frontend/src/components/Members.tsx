import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';

type Member = {
  id: string;
  firstName: string;
  lastName: string;
  telephone: string;
  email: string;
  role?: string;
};

export default function Members() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<Member, 'id'>>({
    firstName: '', lastName: '', telephone: '', email: '', role: 'user',
  });

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
    fetch('/api/members', { credentials: 'same-origin' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load members.');
        return result.members;
      })
      .then((result) => {
        if (active) setMembers(result);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load members.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authLoading, navigate, user]);

  const beginEditing = (member: Member) => {
    setEditingId(member.id);
    setDraft({
      firstName: member.firstName,
      lastName: member.lastName,
      telephone: member.telephone,
      email: member.email,
      role: member.role || (member.id === user?.id ? 'admin' : 'user'),
    });
    setError('');
  };

  const saveMember = async (memberId: string) => {
    setError('');
    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(draft),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to update member.');
      setMembers((current) => current.map((member) => (
        member.id === memberId ? result.member : member
      )));
      setEditingId(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update member.');
    }
  };

  const deactivateMember = async (member: Member) => {
    const confirmed = window.confirm(`Deactivate ${member.firstName} ${member.lastName}? They will no longer be able to sign in.`);
    if (!confirmed) return;

    setError('');
    try {
      const response = await fetch(`/api/members/${member.id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Unable to deactivate member.');
      }
      setMembers((current) => current.filter((currentMember) => currentMember.id !== member.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to deactivate member.');
    }
  };

  const changeRole = async (member: Member, role: string) => {
    setError('');
    setUpdatingRoleId(member.id);
    try {
      const response = await fetch(`/api/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          firstName: member.firstName,
          lastName: member.lastName,
          telephone: member.telephone,
          email: member.email,
          role,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to change role.');
      setMembers((current) => current.map((currentMember) => (
        currentMember.id === member.id ? result.member : currentMember
      )));
      if (editingId === member.id) setDraft((current) => ({ ...current, role: result.member.role }));
    } catch (roleError) {
      setError(roleError instanceof Error ? roleError.message : 'Unable to change role.');
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filteredMembers = normalizedSearch
    ? members.filter((member) => [
        member.firstName,
        member.lastName,
        `${member.firstName} ${member.lastName}`,
        member.telephone,
        member.email,
        member.role || '',
      ].some((value) => value.toLowerCase().includes(normalizedSearch)))
    : members;

  const openMember = (memberId: string) => {
    if (editingId !== memberId) navigate(`/members/${memberId}`);
  };

  if (authLoading || loading || user?.role === 'user') {
    return <p role="status" className="px-4 py-24 text-center text-slate-600">Loading members…</p>;
  }

  return (
    <section className="min-h-[60vh] bg-slate-50 px-4 pt-8 pb-16">
      <div className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-600">Private directory</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-extrabold text-blue-950">Members</h1>
          {user?.role === 'admin' && (
            <Link
              to="/admin/invitations"
              className="rounded-md bg-amber-400 px-5 py-3 font-bold text-blue-950 hover:bg-amber-300"
            >
              Add New Member
            </Link>
          )}
        </div>
        <p className="mt-2 text-sm text-slate-600">This information is visible only to signed-in members.</p>

        <div className="mt-6 max-w-md">
          <label htmlFor="member-search" className="sr-only">
            Search members
          </label>
          <div className="relative">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 fill-none stroke-slate-500"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <input
              id="member-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, telephone, or email"
              className="w-full rounded-md border-0 bg-white py-3 pl-10 pr-4 shadow-md outline-none focus:ring-2 focus:ring-blue-800"
            />
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-6 rounded-md bg-red-50 p-3 text-red-800">{error}</p>
        ) : members.length === 0 ? (
          <p className="mt-8 text-slate-600">No active members were found.</p>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[42rem] text-left">
              <thead className="border-b border-slate-300 text-sm text-blue-950">
                <tr>
                  <th className="px-3 py-3 font-bold">First name</th>
                  <th className="px-3 py-3 font-bold">Last name</th>
                  <th className="px-3 py-3 font-bold">Telephone</th>
                  <th className="px-3 py-3 font-bold">Email</th>
                  {user?.role === 'admin' && <th className="px-3 py-3 font-bold">Role</th>}
                  {user?.role === 'admin' && <th className="px-3 py-3 font-bold">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr
                    key={member.id}
                    tabIndex={editingId === member.id ? -1 : 0}
                    onClick={() => openMember(member.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') openMember(member.id);
                    }}
                    className="cursor-pointer border-b border-slate-200 text-slate-700 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                    aria-label={`View details for ${member.firstName} ${member.lastName}`}
                  >
                    {editingId === member.id ? (
                      <>
                        <td className="px-2 py-3"><input aria-label="First name" className="w-full rounded border p-2" value={draft.firstName} onChange={(event) => setDraft({ ...draft, firstName: event.target.value })} /></td>
                        <td className="px-2 py-3"><input aria-label="Last name" className="w-full rounded border p-2" value={draft.lastName} onChange={(event) => setDraft({ ...draft, lastName: event.target.value })} /></td>
                        <td className="px-2 py-3"><input aria-label="Telephone" className="w-full rounded border p-2" value={draft.telephone} onChange={(event) => setDraft({ ...draft, telephone: event.target.value })} /></td>
                        <td className="px-2 py-3"><input aria-label="Email" type="email" className="w-full rounded border p-2" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></td>
                        <td className="px-2 py-3">
                          {member.id === user?.id ? (
                            <span className="capitalize text-slate-600">Admin</span>
                          ) : (
                            <select
                              aria-label={`Role for ${member.firstName} ${member.lastName}`}
                              value={member.role || 'user'}
                              disabled={updatingRoleId === member.id}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) => void changeRole(member, event.target.value)}
                              className="w-full rounded border bg-white p-2 capitalize"
                            >
                              <option value="head_coach">Head Coach</option>
                              <option value="chairman">Chairman</option>
                              <option value="finance">Finance</option>
                              <option value="user">User</option>
                            </select>
                          )}
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex gap-2">
                            <button type="button" onClick={() => saveMember(member.id)} title="Save changes" aria-label={`Save changes for ${member.firstName} ${member.lastName}`} className="rounded p-2 text-green-700 hover:bg-green-50">
                              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2"><path d="m5 12 4 4L19 6" /></svg>
                            </button>
                            <button type="button" onClick={() => setEditingId(null)} title="Cancel editing" aria-label="Cancel editing" className="rounded p-2 text-slate-600 hover:bg-slate-100">
                              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18" /></svg>
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2">{member.firstName}</td>
                        <td className="px-3 py-2">{member.lastName}</td>
                        <td className="px-3 py-2">
                          {member.telephone ? <a onClick={(event) => event.stopPropagation()} className="text-blue-800 hover:underline" href={`tel:${member.telephone}`}>{member.telephone}</a> : 'Not provided'}
                        </td>
                        <td className="px-3 py-2">
                          <a onClick={(event) => event.stopPropagation()} className="text-blue-800 hover:underline" href={`mailto:${member.email}`}>{member.email}</a>
                        </td>
                        {user?.role === 'admin' && (
                          <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                            <select
                              aria-label={`Role for ${member.firstName} ${member.lastName}`}
                              value={member.id === user.id ? 'admin' : (member.role || 'user')}
                              disabled={member.id === user.id || updatingRoleId === member.id}
                              onChange={(event) => void changeRole(member, event.target.value)}
                              className="w-full min-w-32 rounded-md border border-slate-300 bg-white px-3 py-2 capitalize disabled:bg-slate-100 disabled:text-slate-600"
                            >
                              {member.id === user.id && <option value="admin">Admin</option>}
                              <option value="head_coach">Head Coach</option>
                              <option value="chairman">Chairman</option>
                              <option value="finance">Finance</option>
                              <option value="user">User</option>
                            </select>
                          </td>
                        )}
                        {user?.role === 'admin' && (
                          <td className="px-3 py-2">
                            <div className="flex gap-3" onClick={(event) => event.stopPropagation()}>
                              <button type="button" onClick={() => beginEditing(member)} title="Edit member" aria-label={`Edit ${member.firstName} ${member.lastName}`} className="rounded p-2 text-blue-800 hover:bg-blue-50">
                                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2"><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" /></svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => deactivateMember(member)}
                                disabled={member.id === user.id}
                                title={member.id === user.id ? 'You cannot delete your own administrator account' : 'Delete member'}
                                aria-label={`Delete ${member.firstName} ${member.lastName}`}
                                className="rounded p-2 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-35"
                              >
                                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5M14 11v5" /></svg>
                              </button>
                            </div>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))}
                {filteredMembers.length === 0 && (
                  <tr>
                    <td colSpan={user?.role === 'admin' ? 6 : 4} className="px-3 py-8 text-center text-slate-600">
                      No members match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
