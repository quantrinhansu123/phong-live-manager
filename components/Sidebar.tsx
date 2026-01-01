import React from 'react';
import { NavLink } from 'react-router-dom';
import { ReportType } from '../types';

const MENU_ITEMS = [
  { id: ReportType.LIVE_ADS, label: 'Quản lý Live', path: '/' },
  { id: ReportType.VIDEO_PARAM, label: 'Quản lý Video & KPI', path: '/video-report' },
  { id: ReportType.STORE_MGR, label: 'Quản lý Cửa Hàng', path: '/stores' },
  { id: ReportType.PERSONNEL, label: 'Nhân sự', path: '/personnel' },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col fixed left-0 top-0 z-50">
      <div className="h-16 flex items-center justify-center border-b border-brand-red bg-brand-red">
        <h1 className="text-white font-bold text-xl uppercase tracking-wider">Phong Live</h1>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1">
          {MENU_ITEMS.map((item) => (
            <li key={item.id}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-6 py-3 text-sm font-medium transition-colors ${isActive
                    ? 'bg-red-50 text-brand-red border-r-4 border-brand-red'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="mb-2">
          <p className="text-xs text-gray-500 font-bold uppercase">Người dùng</p>
          <p className="text-sm font-medium text-gray-800 truncate">{localStorage.getItem('currentUser') || 'Unknown'}</p>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('currentUser');
            window.location.reload();
          }}
          className="w-full text-xs text-red-600 hover:text-red-800 font-medium py-1 text-left"
        >
          Đăng xuất
        </button>
        <div className="text-xs text-gray-400 text-center mt-2 pt-2 border-t border-gray-200">
          © 2025 Phong Live System
        </div>
      </div>
    </aside>
  );
};