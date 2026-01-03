import { UserRole, MenuPermission } from '../types';

// Lưu menu permissions vào localStorage
export const saveMenuPermissions = (permissions: MenuPermission[]) => {
  localStorage.setItem('menuPermissions', JSON.stringify(permissions));
};

// Lấy menu permissions từ localStorage
export const getMenuPermissions = (): MenuPermission[] => {
  const stored = localStorage.getItem('menuPermissions');
  if (stored) {
    return JSON.parse(stored);
  }
  // Default: Tất cả menu cho admin, không có menu nào cho partner và employee
  return [];
};

// Kiểm tra user có quyền truy cập menu không
export const canAccessMenu = (menuId: string, userRole: UserRole): boolean => {
  // Admin luôn có quyền truy cập tất cả
  if (userRole === 'admin') {
    return true;
  }

  const permissions = getMenuPermissions();
  const menuPermission = permissions.find(p => p.menuId === menuId);
  
  if (!menuPermission) {
    // Nếu không có permission được set, mặc định là không có quyền (cho partner và employee)
    return false;
  }

  return menuPermission.allowedRoles.includes(userRole);
};

// Lấy role hiện tại của user
export const getCurrentUserRole = (): UserRole => {
  const role = localStorage.getItem('currentUserRole');
  if (role === 'admin') return 'admin';
  if (role === 'partner') return 'partner';
  if (role === 'employee') return 'employee';
  return 'employee'; // Default
};

// Kiểm tra user có phải Admin không
export const isAdmin = (): boolean => {
  return getCurrentUserRole() === 'admin';
};

