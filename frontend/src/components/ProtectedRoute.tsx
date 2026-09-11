import { Navigate, useLocation } from 'react-router-dom';
import {
  authService,
  canChangeOwnPassword,
  getRoleHomePath,
  CHANGE_PASSWORD_PATH,
} from '../services/auth.service';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();
  const currentUser = authService.getCurrentUser();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && currentUser) {
    if (!allowedRoles.includes(currentUser.role)) {
      // Authenticated but wrong role: send the user to their own dashboard
      // instead of logging them out.
      const homePath = getRoleHomePath(currentUser.role);

      if (homePath === location.pathname) {
        return <Navigate to="/login" replace />;
      }

      return <Navigate to={homePath} replace />;
    }
  }

  if (
    canChangeOwnPassword(currentUser?.role) &&
    currentUser?.mustChangePassword &&
    !location.pathname.includes('change-password')
  ) {
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;