import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', schoolName: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try { await signup(form.name, form.email, form.password, form.schoolName, form.phone); toast.success('Account created!'); navigate('/'); }
    catch (err) { toast.error(err.message.replace('Firebase: ', '')); }
    finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-school-500 to-school-700 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-10"><h1 className="text-4xl font-extrabold text-white tracking-tight">🏈 CoachTrack</h1><p className="text-school-200 mt-3">Create your coaching account</p></div>
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <label className="label">Full Name</label>
              <input type="text" className="input" placeholder="Coach Smith" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="coach@school.edu" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <label className="label">Phone</label>
              <input type="tel" className="input" placeholder="555-123-4567" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <label className="label">School Name</label>
              <input type="text" className="input" placeholder="Springfield High" value={form.schoolName} onChange={e => setForm({...form, schoolName: e.target.value})} />
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="At least 6 characters" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <label className="label">Confirm Password</label>
              <input type="password" className="input" placeholder="Repeat password" required value={form.confirm} onChange={e => setForm({...form, confirm: e.target.value})} />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full text-base py-3 mt-4">{loading ? 'Creating Account...' : 'Create Account'}</button>
          <p className="text-center text-sm text-gray-500 mt-4">Already have an account? <Link to="/login" className="text-school-500 font-semibold hover:underline">Sign in</Link></p>
        </form>
      </div>
    </div>
  );
}
