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

interface ProfileDetailsProps {
  profile: Profile;
}

const ProfileDetails = ({ profile }: ProfileDetailsProps) => {
  const items = [
    { label: 'Name', value: profile.name },
    { label: 'Employee ID', value: profile.employeeId },
    { label: 'Email', value: profile.email },
    { label: 'Phone', value: profile.phone },
    { label: 'Role', value: profile.role },
    { label: 'Company Name', value: profile.companyName },
    { label: 'Company ID / Company Code', value: profile.companyCode || profile.companyId },
    { label: 'Department', value: profile.departmentName },
    { label: 'Designation', value: profile.designation },
    { label: 'Status', value: profile.status },
  ];

  return (
    <div className="profile-details">
      {items.map((item) => (
        item.value ? (
          <div key={item.label} className="profile-row">
            <div className="profile-label">{item.label}</div>
            <div className="profile-value">{item.value}</div>
          </div>
        ) : null
      ))}
    </div>
  );
};

export default ProfileDetails;
