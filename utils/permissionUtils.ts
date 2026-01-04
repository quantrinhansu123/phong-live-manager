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
export const canAccessMenu = (menuId: string, userRole: UserRole, userDepartment?: string): boolean => {
  // Admin luôn có quyền truy cập tất cả
  if (userRole === 'admin') {
    return true;
  }

  // Partner mặc định có quyền xem "Quản lý Cửa Hàng" (STORE_MGR = 'store_mgr')
  if (userRole === 'partner' && menuId === 'store_mgr') {
    return true;
  }

  const permissions = getMenuPermissions();
  const menuPermission = permissions.find(p => p.menuId === menuId);
  
  if (!menuPermission) {
    // Nếu không có permission được set, mặc định là không có quyền (cho partner và employee)
    // Trừ trường hợp đặc biệt đã xử lý ở trên
    return false;
  }

  // Kiểm tra role
  if (!menuPermission.allowedRoles.includes(userRole)) {
    return false;
  }

  // Nếu là employee, cần kiểm tra thêm department
  if (userRole === 'employee') {
    // Nếu có allowedDepartments và không rỗng, thì phải kiểm tra department
    if (menuPermission.allowedDepartments && menuPermission.allowedDepartments.length > 0) {
      // Nếu user không có department hoặc department không trong danh sách allowed
      if (!userDepartment || !menuPermission.allowedDepartments.includes(userDepartment)) {
        return false;
      }
    }
    // Nếu không có allowedDepartments (undefined hoặc rỗng), thì employee có role 'employee' là đủ
  }

  return true;
};

// Lấy department hiện tại của user
export const getCurrentUserDepartment = (): string | undefined => {
  return localStorage.getItem('currentUserDepartment') || undefined;
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

