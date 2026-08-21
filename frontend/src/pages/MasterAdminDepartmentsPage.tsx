import { useState, useEffect } from 'react';
import { masterAdminService } from '../services/master-admin.service';
import MasterAdminDepartments from '../components/MasterAdminDepartments';

interface Department {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

const MasterAdminDepartmentsPage = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const response = await masterAdminService.getDepartments();
      if (response.success && response.data) {
        setDepartments(response.data);
      }
    } catch (error) {
      console.error('Failed to load departments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <div className="loading-state">Loading...</div>;
  }

  return (
    <div className="page-content">
      <MasterAdminDepartments departments={departments} onSuccess={loadData} />
    </div>
  );
};

export default MasterAdminDepartmentsPage;