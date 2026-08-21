import { authService } from '../services/auth.service';

const WelcomeMessage = () => {
  const user = authService.getCurrentUser();

  if (!user?.name) {
    return null;
  }

  return (
    <div className="dashboard-welcome">
      <span className="dashboard-welcome-text">Welcome</span>
      <span className="dashboard-welcome-name">{user.name}</span>
    </div>
  );
};

export default WelcomeMessage;
