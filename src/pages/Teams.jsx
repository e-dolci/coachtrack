import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import dayjs from 'dayjs';
export default function Teams() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', sport: '', season: dayjs().format('YYYY') });
  const loadTeams = async () => {
    let snap = await getDocs(query(collection(db, 'teams'), where('coachIds', 'array-contains', user.uid)));
    let teamsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (!teamsData.length) {
      snap = await getDocs(query(collection(db, 'teams'), where('coachId', '==', user.uid)));
      teamsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      teamsData.forEach(async (team) => {
        if (!team.coachIds) {
          await updateDoc(doc(db, 'teams', team.id), { coachIds: [user.uid] });
        }
      });
    }
    setTeams(teamsData);
    setLoading(false);
  };
  useEffect(() => { loadTeams(); }, []);
  const createTeam = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const teamCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    await addDoc(collection(db, 'teams'), { ...form, coachId: user.uid, coachIds: [user.uid], teamCode, createdAt: new Date().toISOString() });
    toast.success(`Team created! Code: ${teamCode}`);
    setShowForm(false);
    setForm({ name: '', sport: '', season: dayjs().format('YYYY') });
    loadTeams();
  };
  const deleteTeam = async (id) => { if (!confirm('Delete?')) return; await deleteDoc(doc(db, 'teams', id)); toast.success('Deleted'); loadTeams(); };
  if (loading) return <LoadingSpinner />;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl sm:text-3xl font-extrabold">My Teams</h1><button onClick={() => setShowForm(!showForm)} className="btn-primary">{showForm ? 'Cancel' : '+ New Team'}</button></div>
      {showForm && <form onSubmit={createTeam} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4"><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div><label className="label">Team Name *</label><input className="input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
        <div><label className="label">Sport</label><input className="input" value={form.sport} onChange={e => setForm({...form, sport: e.target.value})} /></div>
        <div><label className="label">Season</label><input className="input" value={form.season} onChange={e => setForm({...form, season: e.target.value})} /></div>
      </div><button type="submit" className="btn-primary">Create Team</button></form>}
      {teams.length === 0 && !showForm && <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center py-12"><p className="text-5xl mb-4">👥</p><h2 className="text-xl font-bold">No teams yet</h2></div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map(team => (
          <div key={team.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md">
            <div className="flex justify-between items-start mb-3"><div><h3 className="text-lg font-bold">{team.name}</h3><p className="text-sm text-gray-500">{team.sport || 'Sport'} · {team.season}</p></div><span className="text-xs bg-school-100 text-school-700 font-bold font-mono px-2 py-1 rounded">{team.teamCode}</span></div>
            <div className="flex gap-2 mt-4"><Link to={`/teams/${team.id}`} className="btn-primary text-xs flex-1 text-center">View</Link><Link to={`/teams/${team.id}/roster`} className="btn-secondary text-xs flex-1 text-center">Roster</Link><Link to={`/teams/${team.id}/attendance?mode=take`} className="btn-secondary text-xs flex-1 text-center">Attendance</Link><button onClick={() => deleteTeam(team.id)} className="text-red-500 text-sm px-2">✕</button></div>
          </div>
        ))}
      </div>
    </div>
  );
}
