import { Link } from 'react-router-dom';

export default function SignupChoice() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-school-500 to-school-700 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Create an account</h1>
          <p className="text-school-200 mt-3 max-w-2xl mx-auto">Choose how you want to join CoachTrack: as a coach to manage teams, or as an athlete to join your squad.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Link to="/signup/coach" className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-900/5 transition hover:-translate-y-1">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Coach</p>
            <h2 className="mt-4 text-3xl font-bold text-slate-900">Create a coach account</h2>
            <p className="mt-3 text-slate-600">Manage your teams, athletes, attendance, and reports all in one place.</p>
            <span className="mt-6 inline-flex items-center gap-2 text-school-600 font-semibold">Continue <span>→</span></span>
          </Link>

          <Link to="/signup/athlete" className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-900/5 transition hover:-translate-y-1">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Athlete</p>
            <h2 className="mt-4 text-3xl font-bold text-slate-900">Create an athlete account</h2>
            <p className="mt-3 text-slate-600">Join your team with a coach-provided code and track your attendance.</p>
            <span className="mt-6 inline-flex items-center gap-2 text-school-600 font-semibold">Continue <span>→</span></span>
          </Link>
        </div>

        <div className="mt-8 text-center text-sm text-slate-200">
          Already have an account? <Link to="/login" className="text-white font-semibold hover:underline">Coach sign in</Link> or <Link to="/athlete-login" className="text-white font-semibold hover:underline">Athlete sign in</Link>.
        </div>
      </div>
    </div>
  );
}
