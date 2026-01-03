import React, { useState, useEffect } from 'react';
import { UserRole, MenuPermission } from '../types';
import { getMenuPermissions, saveMenuPermissions } from '../utils/permissionUtils';

interface MenuPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuId: string;
  menuLabel: string;
}

export const MenuPermissionModal: React.FC<MenuPermissionModalProps> = ({ 
  isOpen, 
  onClose, 
  menuId, 
  menuLabel 
}) => {
  const [allowedRoles, setAllowedRoles] = useState<UserRole[]>([]);

  useEffect(() => {
    if (isOpen) {
      const permissions = getMenuPermissions();
      const menuPermission = permissions.find(p => p.menuId === menuId);
      setAllowedRoles(menuPermission?.allowedRoles || []);
    }
  }, [isOpen, menuId]);

  const handleRoleToggle = (role: UserRole) => {
    setAllowedRoles(prev => {
      if (prev.includes(role)) {
        return prev.filter(r => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  const handleSave = () => {
    const permissions = getMenuPermissions();
    const existingIndex = permissions.findIndex(p => p.menuId === menuId);
    
    const newPermission: MenuPermission = {
      menuId,
      allowedRoles
    };

    if (existingIndex >= 0) {
      permissions[existingIndex] = newPermission;
    } else {
      permissions.push(newPermission);
    }

    saveMenuPermissions(permissions);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Phân quyền Menu (菜单权限): {menuLabel}
        </h2>
        
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={allowedRoles.includes('admin')}
              onChange={() => handleRoleToggle('admin')}
              className="w-5 h-5 text-brand-navy"
              disabled // Admin luôn có quyền
            />
            <label className="text-sm font-medium text-gray-700">Admin (管理员)</label>
            <span className="text-xs text-gray-500">(Luôn có quyền)</span>
          </div>
          
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={allowedRoles.includes('partner')}
              onChange={() => handleRoleToggle('partner')}
              className="w-5 h-5 text-brand-navy"
            />
            <label className="text-sm font-medium text-gray-700">Đối tác (合作伙伴)</label>
          </div>
          
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={allowedRoles.includes('employee')}
              onChange={() => handleRoleToggle('employee')}
              className="w-5 h-5 text-brand-navy"
            />
            <label className="text-sm font-medium text-gray-700">Nhân viên (员工)</label>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
          >
            Hủy (取消)
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-brand-navy text-white rounded hover:bg-brand-darkNavy"
          >
            Lưu (保存)
          </button>
        </div>
      </div>
    </div>
  );
};

