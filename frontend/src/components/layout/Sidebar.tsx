import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'Tổng quan', path: '/dashboard', icon: '📊', roles: ['owner', 'manager', 'accountant', 'maintenance', 'cleaner', 'renter'] },
  { label: 'Nhà cho thuê', path: '/properties', icon: '🏠', roles: ['owner', 'manager'] },
  { label: 'Hợp đồng', path: '/contracts', icon: '📄', roles: ['owner', 'manager', 'accountant'] },
  { label: 'Người thuê', path: '/renters', icon: '👥', roles: ['owner', 'manager'] },
  { label: 'Nhân viên', path: '/staff', icon: '👷', roles: ['owner'] },
  { label: 'Công việc', path: '/tasks', icon: '✅', roles: ['owner', 'manager', 'maintenance', 'cleaner'] },
  { label: 'Hóa đơn', path: '/invoices', icon: '💰', roles: ['owner', 'manager', 'accountant'] },
  { label: 'Đồng hồ điện nước', path: '/meters', icon: '⚡', roles: ['owner', 'manager'] },
  { label: 'Bảo trì', path: '/maintenance', icon: '🔧', roles: ['owner', 'manager', 'maintenance', 'renter'] },
  { label: 'Báo cáo', path: '/reports', icon: '📈', roles: ['owner', 'manager', 'accountant'] },
  { label: 'Thông báo', path: '/notifications', icon: '🔔', roles: ['owner', 'manager', 'accountant', 'maintenance', 'cleaner', 'renter'] },
  // Renter-specific items
  { label: 'Hợp đồng của tôi', path: '/contracts', icon: '📄', roles: ['renter'] },
  { label: 'Hóa đơn của tôi', path: '/invoices', icon: '💰', roles: ['renter'] },
  { label: 'Chỉ số điện nước', path: '/meters', icon: '⚡', roles: ['renter'] },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || 'renter';

  // Filter and deduplicate nav items based on role
  const filteredItems = navItems.filter((item) => {
    if (userRole === 'renter') {
      // For renters, show specific renter items
      if (['Hợp đồng của tôi', 'Hóa đơn của tôi', 'Chỉ số điện nước', 'Bảo trì', 'Tổng quan', 'Thông báo'].includes(item.label)) {
        return item.roles.includes(userRole);
      }
      return false;
    }
    // For non-renters, skip renter-specific labeled items
    if (['Hợp đồng của tôi', 'Hóa đơn của tôi', 'Chỉ số điện nước'].includes(item.label)) {
      return false;
    }
    return item.roles.includes(userRole);
  });

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:z-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-primary-600">Quản Lý Lưu Trú</h1>
          <p className="text-xs text-gray-500 mt-0.5">Thông Minh</p>
        </div>

        <nav className="p-2 overflow-y-auto h-[calc(100%-80px)]">
          {filteredItems.map((item) => (
            <NavLink
              key={item.label + item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors mb-0.5 ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <span className="mr-3 text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          {/* Settings section - only for owners */}
          {userRole === 'owner' && (
            <>
              <div className="border-t my-2" />
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase">Cài đặt</p>
              <NavLink
                to="/settings/organization"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors mb-0.5 ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                <span className="mr-3 text-base">⚙️</span>
                Hệ thống nhà trọ
              </NavLink>
            </>
          )}
        </nav>
      </aside>
    </>
  );
}
