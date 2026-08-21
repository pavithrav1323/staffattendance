import { useState, useEffect } from 'react';
import { programOwnerService } from '../services/program-owner.service';
import WelcomeMessage from '../components/WelcomeMessage';

const ProgramOwnerDashboard = () => {
  const [masterAdmins, setMasterAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMasterAdmins = async () => {
      try {
        const response = await programOwnerService.getMasterAdmins();
        if (response.success && response.data) {
          setMasterAdmins(response.data);
        }
      } catch (error) {
        console.error('Failed to load master admins:', error);
      } finally {
        setLoading(false);
      }
    };
    loadMasterAdmins();
  }, []);

  if (loading) {
    return <div className="loading-state">Loading...</div>;
  }

  const totalMasterAdmins = masterAdmins.length;
  const activeMasterAdmins = masterAdmins.filter(m => m.status === 'APPROVED').length;
  const inactiveMasterAdmins = masterAdmins.filter(m => m.status !== 'APPROVED').length;

  return (
    <>
      <WelcomeMessage />
      <div className="dashboard-cards">
      <div className="summary-card">
        <div className="card-content">
          <div className="card-value">{totalMasterAdmins}</div>
          <div className="card-label">Total Master Admins</div>
        </div>
      </div>

      <div className="summary-card">
        <div className="card-content">
          <div className="card-value">{activeMasterAdmins}</div>
          <div className="card-label">Active Master Admins</div>
        </div>
      </div>

      <div className="summary-card">
        <div className="card-content">
          <div className="card-value">{inactiveMasterAdmins}</div>
          <div className="card-label">Inactive Master Admins</div>
        </div>
      </div>
    </div>
    </>
  );
};

export default ProgramOwnerDashboard;