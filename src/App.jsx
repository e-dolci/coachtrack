import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';
import Roster from './pages/Roster';
import Attendance from './pages/Attendance';
import AttendanceHistory from './pages/AttendanceHistory';
import AthleteProfile from './pages/AthleteProfile';
import Reports from './pages/Reports';
import AthleteLogin from './pages/AthleteLogin';
import AthleteSignup from './pages/AthleteSignup';
import AthleteDashboard from './pages/AthleteDashboard';
import SignupChoice from './pages/SignupChoice';
function ProtectedRoute({ children }) {
  const { user, coachData, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner /></div>;
  if (!user || !coachData) return <Navigate to="/login" replace />;
  return children;
}
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignupChoice />} />
      <Route path="/signup/coach" element={<Signup />} />
      <Route path="/signup/athlete" element={<AthleteSignup />} />
      <Route path="/athlete-login" element={<AthleteLogin />} />
      <Route path="/athlete/dashboard" element={<AthleteDashboard />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="teams" replace />} />
        <Route path="teams" element={<Teams />} />
        <Route path="teams/:teamId" element={<TeamDetail />} />
        <Route path="teams/:teamId/roster" element={<Roster />} />
        <Route path="teams/:teamId/attendance" element={<Attendance />} />
        <Route path="teams/:teamId/attendance-history" element={<AttendanceHistory />} />
        <Route path="athletes/:athleteId" element={<AthleteProfile />} />
        <Route path="reports" element={<Reports />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
