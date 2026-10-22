import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth-context';

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  parents: string[];
};

export default function TeamRoster() {
  const { division = '' } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (user.role !== 'admin' && user.role !== 'head_coach' && user.role !== 'chairman') {
      navigate(user.role === 'user' ? '/' : '/member', { replace: true });
      return;
    }

    let active = true;
    fetch(`/api/members/teams/${encodeURIComponent(division)}/roster`, { credentials: 'same-origin' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load team list.');
        return result.players as Player[];
      })
      .then((result) => {
        if (active) setPlayers(result);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load team list.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [authLoading, division, navigate, user]);

  if (authLoading || loading || !user || (user.role !== 'admin' && user.role !== 'head_coach' && user.role !== 'chairman')) {
    return <p role="status" className="px-4 py-24 text-center text-slate-600">Loading team list…</p>;
  }

  return (
    <section className="min-h-[60vh] bg-slate-50 px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <Link to="/teams" className="text-sm font-semibold text-blue-800 hover:underline">← Back to teams</Link>
        <header className="mt-6 border-b border-slate-200 pb-5">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-600">Private team list</p>
          <h1 className="mt-2 text-3xl font-extrabold text-blue-950">{division} roster</h1>
          <p className="mt-2 text-slate-600">Players are grouped by age using the current date and their registered birth month and year.</p>
        </header>

        {error ? (
          <p role="alert" className="mt-6 rounded-md bg-red-50 p-3 text-red-800">{error}</p>
        ) : players.length ? (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-2xl text-left text-sm">
              <thead className="border-b border-slate-300 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr><th className="px-3 py-3">Player</th><th className="px-3 py-3">Age</th><th className="px-3 py-3">Parent/guardian</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {players.map((player) => (
                  <tr key={player.id}>
                    <td className="px-3 py-3 font-medium text-blue-950">{player.firstName} {player.lastName}</td>
                    <td className="px-3 py-3">{player.age}</td>
                    <td className="px-3 py-3">{player.parents.join(' / ') || 'Not provided'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-6 text-slate-600">No registered players currently match {division}.</p>
        )}
      </div>
    </section>
  );
}
