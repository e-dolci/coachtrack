import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [staySignedIn, setStaySignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const getErrorMessage = (err) => {
    const message = err?.message || '';
    if (message.includes('auth/configuration-not-found')) {
      return 'Email/password sign-in is not enabled in Firebase. Enable it in Firebase Console.';
    }
    return message.replace('Firebase: ', '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await login(form.email, form.password, staySignedIn); toast.success('Welcome back!'); navigate('/'); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-school-500 to-school-700 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10"><h1 className="text-4xl font-extrabold text-white tracking-tight">🏈 CoachTrack</h1><p className="text-school-200 mt-3">Sign in to your coaching account</p></div>
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="coach@school.edu" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="......" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input id="staySignedIn" type="checkbox" className="rounded border-slate-300 text-school-500 focus:ring-school-500" checked={staySignedIn} onChange={e => setStaySignedIn(e.target.checked)} />
            <label htmlFor="staySignedIn" className="text-sm text-slate-600">Stay signed in</label>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full text-base py-3 mt-4">{loading ? 'Signing in...' : 'Sign In'}</button>
          <div className="mt-4 space-y-3 text-center">
            <p className="text-sm text-gray-500">Don't have an account? <Link to="/signup" className="text-school-500 font-semibold hover:underline">Create account</Link></p>
            <p className="text-sm text-gray-400"><Link to="/athlete-login" className="hover:underline">Athlete? Log in here</Link></p>
          </div>
        </form>
      </div>
    </div>
  );
}
