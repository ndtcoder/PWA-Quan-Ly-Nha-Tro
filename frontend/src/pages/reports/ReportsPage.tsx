import { useState } from 'react';
import FinanceReportPage from './FinanceReportPage';
import StaffReportPage from './StaffReportPage';
import PropertyKPIPage from './PropertyKPIPage';

type TabKey = 'finance' | 'staff' | 'property';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('finance');

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'finance', label: 'Finance' },
    { key: 'staff', label: 'Staff' },
    { key: 'property', label: 'Property KPIs' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600 mt-1">Insights and performance metrics</p>
      </div>

      {/* Tab buttons */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'finance' && <FinanceReportPage />}
        {activeTab === 'staff' && <StaffReportPage />}
        {activeTab === 'property' && <PropertyKPIPage />}
      </div>
    </div>
  );
}
