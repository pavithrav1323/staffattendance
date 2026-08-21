import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import ProfileDetails from '../components/ProfileDetails';

interface Profile {
  id: string;
  employeeId: string | null;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  designation: string | null;
  companyId: string | null;
  companyName: string | null;
  companyCode: string | null;
  departmentId: string | null;
  departmentName: string | null;
}

const ProfilePage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await authService.getMyProfile();
        setProfile(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  if (loading) {
    return <div className="loading-state">Loading profile...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!profile) {
    return <div className="empty-state">No profile data found.</div>;
  }

  return (
    <div className="profile-page">
      <div className="profile-app-bar">
        <button onClick={() => navigate(-1)} className="back-button" type="button" aria-label="Back">
          ←
        </button>
        <h1 className="app-bar-title">Profile</h1>
      </div>
      <div className="page-content">
        <h2 className="section-title">Personal Information</h2>
        <ProfileDetails profile={profile} />
      </div>
    </div>
  );
};

export default ProfilePage;
