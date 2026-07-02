import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile, deleteUser } from 'firebase/auth';
import { auth } from '../firebase';
import { db } from '../firebase';
import toast from 'react-hot-toast';

function makeAthleteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function AthleteSignup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', teamCode: '', position: '', jerseyNumber: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password || !form.confirmPassword || !form.teamCode.trim()) {
      return toast.error('Please fill in all required fields');
    }
    if (form.password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    if (form.password !== form.confirmPassword) {
      return toast.error('Passwords do not match');
    }

    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, form.email.trim().toLowerCase(), form.password);
      await updateProfile(credential.user, { displayName: form.name.trim() });

      const teamCode = form.teamCode.trim().toUpperCase().replace(/\s+/g, '');
      const teamSnap = await getDocs(query(collection(db, 'teams'), where('teamCode', '==', teamCode)));
      if (teamSnap.empty) {
        await deleteUser(credential.user);
        throw new Error('Team code not found. Check with your coach.');
      }

      const teamDoc = teamSnap.docs[0];
      const team = { id: teamDoc.id, ...teamDoc.data() };
      let athleteCode = makeAthleteCode();
      let codeExists = true;

      while (codeExists) {
        const existing = await getDocs(query(collection(db, 'athletes'), where('athleteCode', '==', athleteCode)));
        if (existing.empty) codeExists = false;
        else athleteCode = makeAthleteCode();
      }

      const athlete = {
        authUid: credential.user.uid,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        position: form.position.trim(),
        jerseyNumber: form.jerseyNumber ? Number(form.jerseyNumber) : null,
        coachId: team.coachId || (team.coachIds?.[0] ?? null),
        teamId: team.id,
        athleteCode,
        isCleared: false,
        createdAt: new Date().toISOString(),
      };

      const athleteRef = doc(db, 'athletes', credential.user.uid);
      await setDoc(athleteRef, athlete);
      sessionStorage.setItem('athleteSession', JSON.stringify({ id: credential.user.uid, ...athlete }));
      toast.success(`Account created! Your code is ${athleteCode}`);
      navigate('/athlete/dashboard');
    } catch (err) {
      toast.error(err.message || 'Failed to create athlete account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-school-500 to-school-700 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-white tracking-tight">🏈 Athlete Signup</h1>
          <p className="text-school-200 mt-3">Join your team and access your dashboard.</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input type="text" className="input" placeholder="Taylor Athlete" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="you@example.com" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="Create a password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className="label">Confirm password</label>
              <input type="password" className="input" placeholder="Confirm password" required value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} />
            </div>
            <div>
              <label className="label">Position</label>
              <input type="text" className="input" placeholder="Position" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} />
            </div>
            <div>
              <label className="label">Jersey #</label>
              <input type="number" className="input" placeholder="10" value={form.jerseyNumber} onChange={e => setForm({ ...form, jerseyNumber: e.target.value })} />
            </div>
            <div>
              <label className="label">Team Code</label>
              <input type="text" className="input uppercase" placeholder="TEAM01" required value={form.teamCode} onChange={e => setForm({ ...form, teamCode: e.target.value.toUpperCase() })} />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full text-base py-3 mt-2">
            {loading ? 'Creating account...' : 'Create athlete account'}
          </button>
          <p className="text-center text-sm text-gray-500 mt-4">
            Already have a code? <Link to="/athlete-login" className="text-school-500 font-semibold hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
