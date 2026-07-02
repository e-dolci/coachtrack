import { Link } from 'react-router-dom';

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <section className="space-y-6 rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl shadow-slate-900/30 ring-1 ring-white/10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <p className="text-sm uppercase tracking-[0.3em] text-sky-300/80">CoachTrack</p>
              <h1 className="text-4xl font-extrabold sm:text-5xl">Modern team management for coaches.</h1>
              <p className="max-w-xl text-slate-300 leading-7">
                Track attendance, manage rosters, and review reports in a calm, connected workspace built for athletic programs.
              </p>
            </div>
            <div className="rounded-3xl bg-white/10 p-6 ring-1 ring-white/10 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-200/70">Daily snapshot</p>
              <p className="mt-4 text-3xl font-bold">12 teams</p>
              <p className="mt-2 text-slate-300">3 new attendance records today</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Link to="/teams" className="group rounded-3xl bg-slate-900 p-6 ring-1 ring-white/5 transition hover:-translate-y-1 hover:bg-slate-900/90">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400 group-hover:text-sky-300">Teams</p>
              <h2 className="mt-4 text-2xl font-semibold text-white">Browse teams</h2>
              <p className="mt-3 text-sm text-slate-400">View your roster, schedule, and active team details.</p>
            </Link>
            <Link to="/teams" className="group rounded-3xl bg-slate-900 p-6 ring-1 ring-white/5 transition hover:-translate-y-1 hover:bg-slate-900/90">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400 group-hover:text-sky-300">Roster</p>
              <h2 className="mt-4 text-2xl font-semibold text-white">Manage athletes</h2>
              <p className="mt-3 text-sm text-slate-400">Update profiles, assignments, and team clearance.</p>
            </Link>
            <Link to="/reports" className="group rounded-3xl bg-slate-900 p-6 ring-1 ring-white/5 transition hover:-translate-y-1 hover:bg-slate-900/90">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400 group-hover:text-sky-300">Reports</p>
              <h2 className="mt-4 text-2xl font-semibold text-white">Attendance insights</h2>
              <p className="mt-3 text-sm text-slate-400">Review trends and prepare summaries for your athletes.</p>
            </Link>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-900/5">
            <h2 className="text-lg font-bold">Quick actions</h2>
            <div className="mt-5 space-y-3">
              <Link to="/teams" className="block rounded-3xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                + Create new team
              </Link>
              <Link to="/reports" className="block rounded-3xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                View attendance reports
              </Link>
              <Link to="/teams" className="block rounded-3xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                Open roster manager
              </Link>
            </div>
          </div>
          <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-900/5">
            <h2 className="text-lg font-bold">This week</h2>
            <div className="mt-4 grid gap-3">
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Upcoming session</p>
                <p className="mt-2 font-semibold">Monday practice review</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Pending updates</p>
                <p className="mt-2 font-semibold">Attendance verification</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Team focus</p>
                <p className="mt-2 font-semibold">Player availability</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[2rem] bg-gradient-to-br from-sky-600 to-indigo-600 p-6 text-white shadow-2xl shadow-sky-600/20 ring-1 ring-white/10">
          <p className="text-sm uppercase tracking-[0.3em] text-sky-100/80">Insights</p>
          <h2 className="mt-4 text-2xl font-bold">Attendance pulse</h2>
          <p className="mt-3 text-sm leading-6 text-sky-100/80">Quickly check how your team attendance compares to your season averages.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl bg-white/10 p-4 text-center">
              <p className="text-xl font-bold">92%</p>
              <p className="text-xs uppercase tracking-[0.2em] text-sky-100/70">Present</p>
            </div>
            <div className="rounded-3xl bg-white/10 p-4 text-center">
              <p className="text-xl font-bold">4</p>
              <p className="text-xs uppercase tracking-[0.2em] text-sky-100/70">Teams active</p>
            </div>
            <div className="rounded-3xl bg-white/10 p-4 text-center">
              <p className="text-xl font-bold">18</p>
              <p className="text-xs uppercase tracking-[0.2em] text-sky-100/70">Updates</p>
            </div>
          </div>
        </div>
        <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-900/5">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Team snapshot</p>
          <h2 className="mt-4 text-2xl font-bold">Roster health</h2>
          <p className="mt-3 text-sm text-slate-500">See the most recent roster changes and athlete clearance status at a glance.</p>
        </div>
        <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-900/5">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Reports</p>
          <h2 className="mt-4 text-2xl font-bold">Export attendance</h2>
          <p className="mt-3 text-sm text-slate-500">Generate polished reports for your program and share them with staff and families.</p>
        </div>
      </section>
    </div>
  );
}
