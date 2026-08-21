import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/auth.service';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import StaffRegisterPage from './pages/StaffRegisterPage';
import ProfilePage from './pages/ProfilePage';
import StaffLayout from './layouts/StaffLayout';
import StaffDashboardPage from './pages/staff/StaffDashboardPage';
import StaffAttendancePage from './pages/staff/StaffAttendancePage';
import StaffAttendanceHistoryPage from './pages/staff/StaffAttendanceHistoryPage';
import StaffProfilePage from './pages/staff/StaffProfilePage';
import StaffChangePasswordPage from './pages/staff/StaffChangePasswordPage';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminStaffPage from './pages/AdminStaffPage';
import AdminAttendancePage from './pages/AdminAttendancePage';
import MasterAdminLayout from './layouts/MasterAdminLayout';
import MasterAdminDashboard from './pages/MasterAdminDashboard';
import MasterAdminAttendancePage from './pages/MasterAdminAttendancePage';
import MasterAdminDepartmentsPage from './pages/MasterAdminDepartmentsPage';
import MasterAdminAdminsPage from './pages/MasterAdminAdminsPage';
import ProgramOwnerLayout from './layouts/ProgramOwnerLayout';
import ProgramOwnerDashboardPage from './pages/ProgramOwnerDashboardPage';
import ProgramOwnerMasterAdminsPage from './pages/ProgramOwnerMasterAdminsPage';
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            authService.isAuthenticated() ? (
              authService.getCurrentUser()?.role === 'STAFF' ? (
                <Navigate to="/staff/attendance" replace />
              ) : authService.getCurrentUser()?.role === 'ADMIN' ? (
                <Navigate to="/admin" replace />
              ) : authService.getCurrentUser()?.role === 'MASTER_ADMIN' ? (
                <Navigate to="/master-admin" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/staff/register" element={<StaffRegisterPage />} />
        <Route
          path="/staff/change-password"
          element={
            <ProtectedRoute allowedRoles={['STAFF']}>
              <StaffChangePasswordPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff"
          element={
            <ProtectedRoute allowedRoles={['STAFF']}>
              <StaffLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/staff/attendance" replace />} />
          <Route path="attendance" element={<StaffAttendancePage />} />
          <Route path="attendance-history" element={<StaffAttendanceHistoryPage />} />
          <Route path="dashboard" element={<StaffDashboardPage />} />
          <Route path="profile" element={<StaffProfilePage />} />
        </Route>
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="staff" element={<AdminStaffPage />} />
          <Route path="attendance" element={<AdminAttendancePage />} />
        </Route>
        <Route
          path="/master-admin"
          element={
            <ProtectedRoute allowedRoles={['MASTER_ADMIN']}>
              <MasterAdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<MasterAdminDashboard />} />
          <Route path="attendance" element={<MasterAdminAttendancePage />} />
          <Route path="departments" element={<MasterAdminDepartmentsPage />} />
          <Route path="admins" element={<MasterAdminAdminsPage />} />
        </Route>
        <Route
          path="/program-owner"
          element={
            <ProtectedRoute allowedRoles={['PROGRAM_OWNER']}>
              <ProgramOwnerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ProgramOwnerDashboardPage />} />
          <Route path="master-admins" element={<ProgramOwnerMasterAdminsPage />} />
        </Route>
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
