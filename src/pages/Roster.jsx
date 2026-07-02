import { useState, useEffect } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Roster() {
  const { teamId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', jerseyNumber: '', position: '', notes: '' });

  const load = async () => {
    const teamSnap = await getDoc(doc(db, 'teams', teamId));
    setTeam({ id: teamSnap.id, ...teamSnap.data() });
    const snap = await getDocs(query(collection(db, 'athletes'), where('teamId', '==', teamId)));
    setAthletes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };
  useEffect(() => { load(); }, [teamId]);

  const reset = () => { setForm({ name: '', jerseyNumber: '', position: '', notes: '' }); setEditing(null); setShowForm(false); };
  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name required');
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      if (editing) { await updateDoc(doc(db, 'athletes', editing.id), form); toast.success('Updated'); }
      else { await addDoc(collection(db, 'athletes'), { ...form, jerseyNumber: form.jerseyNumber ? Number(form.jerseyNumber) : null, teamId, coachId: user.uid, athleteCode: code, isCleared: true, createdAt: new Date().toISOString() }); toast.success('Added! Code: ' + code); }
      reset(); load();
    } catch (err) { toast.error(err.message); }
  };

  const toggle = async (a) => { await updateDoc(doc(db, 'athletes', a.id), { isCleared: !a.isCleared }); load(); };
  const remove = async (id) => { if (!confirm('Remove?')) return; await deleteDoc(doc(db, 'athletes', id)); toast.success('Removed'); load(); };

  const params = new URLSearchParams(location.search);
  const statusFilter = params.get('status');
  const filteredAthletes = athletes
    .filter(a => statusFilter === 'cleared' ? a.isCleared !== false : statusFilter === 'not-cleared' ? a.isCleared === false : true)
    .filter(a => {
      const query = search.trim().toLowerCase();
      if (!query) return true;
      return a.name.toLowerCase().includes(query) || String(a.jerseyNumber || '').includes(query) || (a.position || '').toLowerCase().includes(query);
    });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <Link to={"/teams/" + teamId} className="text-sm text-school-500 hover:underline">&larr; {team?.name}</Link>
            <h1 className="text-2xl font-extrabold mt-1">Roster ({filteredAthletes.length})</h1>
            {statusFilter && (
              <p className="text-sm text-gray-500 mt-1">Showing <span className="font-semibold">{statusFilter === 'cleared' ? 'cleared' : 'not cleared'}</span> athletes. <button onClick={() => navigate(`/teams/${teamId}/roster`)} className="text-school-500 hover:underline">Clear filter</button></p>
            )}
          </div>
          <button onClick={() => { reset(); setShowForm(!showForm); }} className="btn-primary">{showForm ? 'Cancel' : '+ Add Athlete'}</button>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="label">Search athletes</label>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, jersey, or position"
            className="input"
          />
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card space-y-4">
          <h3 className="font-bold">{editing ? 'Edit' : 'Add'} Athlete</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div><label className="label">Name *</label><input className="input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div><label className="label">Jersey #</label><input type="number" className="input" value={form.jerseyNumber} onChange={e => setForm({...form, jerseyNumber: e.target.value})} /></div>
            <div><label className="label">Position</label><input className="input" value={form.position} onChange={e => setForm({...form, position: e.target.value})} /></div>
            <div><label className="label">Notes</label><input className="input" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
          </div>
          <div className="flex gap-2"><button type="submit" className="btn-primary">{editing ? 'Update' : 'Add'}</button>{editing && <button type="button" onClick={reset} className="btn-secondary">Cancel</button>}</div>
        </form>
      )}

      {filteredAthletes.length === 0 ? (
        <div className="card text-center py-12"><p className="text-5xl mb-4">🏃</p><h2 className="text-xl font-bold">Roster is empty</h2></div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase">
              <th className="px-4 py-3">#</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Position</th><th className="px-4 py-3">Code</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAthletes.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{a.jerseyNumber || '—'}</td>
                  <td className="px-4 py-3"><Link to={"/athletes/" + a.id} className="font-semibold text-gray-900 hover:text-school-600">{a.name}</Link></td>
                  <td className="px-4 py-3 text-gray-500">{a.position || '—'}</td>
                  <td className="px-4 py-3"><span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{a.athleteCode}</span></td>
                  <td className="px-4 py-3"><button onClick={() => toggle(a)} className={"text-xs font-semibold px-3 py-1 rounded-full " + (a.isCleared !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>{a.isCleared !== false ? 'Cleared' : 'Not Cleared'}</button></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setForm({ name: a.name, jerseyNumber: a.jerseyNumber || '', position: a.position || '', notes: a.notes || '' }); setEditing(a); setShowForm(true); }} className="text-school-500 text-sm mr-3">Edit</button>
                    <button onClick={() => remove(a.id)} className="text-red-500 text-sm">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
