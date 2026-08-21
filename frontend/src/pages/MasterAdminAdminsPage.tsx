import { useState, useEffect } from 'react';
import { masterAdminService } from '../services/master-admin.service';
import MasterAdminAdmins from '../components/MasterAdminAdmins';

interface Department {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface Admin {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string | null;
  departmentId: string;
  designation: string | null;
  status: string;
}

const MasterAdminAdminsPage = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [adminResponse, deptResponse] = await Promise.all([
        masterAdminService.getAdmins(),
        masterAdminService.getDepartments(),
      ]);

      if (adminResponse.success && adminResponse.data) {
        setAdmins(adminResponse.data);
      }
      if (deptResponse.success && deptResponse.data) {
        setDepartments(deptResponse.data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSuccess = () => {
    loadData();
  };

  const handleDepartmentCreated = () => {
    loadData();
  };

  if (loading) {
    return <div className="loading-state">Loading...</div>;
  }

  return (
    <div className="page-content">
      <MasterAdminAdmins
        admins={admins}
        departments={departments}
        onSuccess={handleSuccess}
        onDepartmentCreated={handleDepartmentCreated}
      />
    </div>
  );
};

export default MasterAdminAdminsPage;