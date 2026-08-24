import { useState, useRef, useEffect } from 'react';

export interface Company {
  id: string;
  companyCode: string;
  companyName: string;
}

interface CompanyDropdownProps {
  companies: Company[];
  selectedCompanyId: string;
  onSelect: (companyId: string, companyCode: string) => void;
  disabled?: boolean;
  loading?: boolean;
  emptyMessage?: string;
}

const CompanyDropdown = ({
  companies,
  selectedCompanyId,
  onSelect,
  disabled = false,
  loading = false,
  emptyMessage = 'No companies available for registration',
}: CompanyDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleSelect = (company: Company) => {
    onSelect(company.id, company.companyCode);
    setIsOpen(false);
  };

  const getSelectedDisplay = () => {
    if (loading) return 'Loading companies...';
    if (companies.length === 0) return emptyMessage;
    if (!selectedCompany) return 'Select ILKKM ID';
    
    // Compact display: ASSN001 - ILKKM Sungai Buloh
    const shortName = selectedCompany.companyName
      .replace(/Institut Latihan Kementerian Kesihatan Malaysia \(ILKKM\) /gi, 'ILKKM ')
      .replace(/Institut Latihan Kementerian Kesihatan Malaysia /gi, 'ILKKM ');
    
    return `${selectedCompany.companyCode} - ${shortName}`;
  };

  return (
    <div className="company-dropdown" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && !loading && companies.length > 0 && setIsOpen(!isOpen)}
        className="company-dropdown-button"
        disabled={disabled || loading || companies.length === 0}
      >
        <span className="company-dropdown-selected">
          {getSelectedDisplay()}
        </span>
        {!disabled && !loading && companies.length > 0 && (
          <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
        )}
      </button>

      {isOpen && !disabled && !loading && companies.length > 0 && (
        <div className="company-dropdown-menu">
          <div className="company-list">
            {companies.map((company) => (
              <div
                key={company.id}
                onClick={() => handleSelect(company)}
                className={`company-item ${selectedCompanyId === company.id ? 'selected' : ''}`}
              >
                <div className="company-item-code">{company.companyCode}</div>
                <div className="company-item-name">{company.companyName}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyDropdown;