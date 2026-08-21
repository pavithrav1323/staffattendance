import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../services/auth.service';

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
      return <Navigate to="/login" replace />;
    }
  }

  if (
    currentUser?.role === 'STAFF' &&
    currentUser?.mustChangePassword &&
    !location.pathname.startsWith('/staff/change-password')
  ) {
    return <Navigate to="/staff/change-password" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;