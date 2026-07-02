import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence, signOut } from 'firebase/auth';
import { db } from '../firebase';
import toast from 'react-hot-toast';

export default function AthleteLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState('code');
  const [form, setForm] = useState({ code: '', email: '', password: '' });
  const [staySignedIn, setStaySignedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'code') {
        if (!form.code.trim()) throw new Error('Enter your athlete code');
        const snap = await getDocs(query(collection(db, 'athletes'), where('athleteCode', '==', form.code.trim().toUpperCase())));
        if (snap.empty) throw new Error('Invalid athlete code');
        const a = { id: snap.docs[0].id, ...snap.docs[0].data() };
        const storage = staySignedIn ? localStorage : sessionStorage;
        storage.setItem('athleteSession', JSON.stringify(a));
        toast.success('Welcome, ' + a.name + '!');
        navigate('/athlete/dashboard');
      } else {
        if (!form.email.trim() || !form.password) throw new Error('Enter email and password');
        const persistence = staySignedIn ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, persistence);
        await signInWithEmailAndPassword(auth, form.email.trim().toLowerCase(), form.password);
        const athleteSnap = await getDocs(query(collection(db, 'athletes'), where('email', '==', form.email.trim().toLowerCase())));
        if (athleteSnap.empty) {
          await signOut(auth);
          throw new Error('No athlete profile found for this account');
        }
        const a = { id: athleteSnap.docs[0].id, ...athleteSnap.docs[0].data() };
        const storage = staySignedIn ? localStorage : sessionStorage;
        storage.setItem('athleteSession', JSON.stringify(a));
        toast.success('Welcome back, ' + a.name + '!');
        navigate('/athlete/dashboard');
      }
    } catch (err) {
      const message = err?.message?.replace('Firebase: ', '') || 'Sign in failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-school-500 to-school-700 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-white tracking-tight">🏈 CoachTrack</h1>
          <p className="text-school-200 mt-3">Athlete sign in</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/10 p-1 shadow-lg backdrop-blur-xl mb-6 flex gap-1">
          <button type="button" onClick={() => setMode('code')} className={`flex-1 rounded-3xl px-4 py-3 text-sm font-semibold transition ${mode === 'code' ? 'bg-white text-slate-900' : 'text-white/80 hover:text-white'}`}>
            Athlete Code
          </button>
          <button type="button" onClick={() => setMode('email')} className={`flex-1 rounded-3xl px-4 py-3 text-sm font-semibold transition ${mode === 'email' ? 'bg-white text-slate-900' : 'text-white/80 hover:text-white'}`}>
            Email & Password
          </button>
        </div>
        <form onSubmit={submit} className="card space-y-5 bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          {mode === 'code' ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <label className="label text-center block text-base">Enter your athlete code</label>
              <div className="rounded-3xl border border-slate-200 bg-white p-3">
                <input
                  type="text"
                  className="input text-center text-2xl font-mono tracking-widest uppercase bg-transparent"
                  placeholder="ABC123"
                  maxLength={10}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  autoFocus
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <label className="label">Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full text-base py-3">
            {loading ? 'Signing in...' : mode === 'code' ? 'Sign in with code' : 'Sign in with email'}
          </button>

          <div className="flex items-center gap-3">
            <input id="staySignedIn" type="checkbox" className="rounded border-slate-300 text-school-500 focus:ring-school-500" checked={staySignedIn} onChange={(e) => setStaySignedIn(e.target.checked)} />
            <label htmlFor="staySignedIn" className="text-sm text-slate-600">Stay signed in</label>
          </div>
          <p className="text-center text-sm text-gray-500 mt-4">
            Need an account? <Link to="/signup" className="text-school-500 font-semibold hover:underline">Create one</Link>
          </p>
          <p className="text-center text-sm text-gray-500">
            Coach? <Link to="/login" className="text-school-500 font-semibold hover:underline">Sign in here</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
