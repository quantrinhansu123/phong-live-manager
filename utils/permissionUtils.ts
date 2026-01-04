import { UserRole, MenuPermission } from '../types';
import { fetchMenuPermissions as fetchMenuPermissionsFromFirebase, saveMenuPermissionsToFirebase } from '../services/dataService';

// Cache để tránh fetch quá nhiều lần
let menuPermissionsCache: MenuPermission[] | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 60000; // Cache trong 1 phút

// Lấy menu permissions từ Firebase (với cache và fallback về localStorage)
export const getMenuPermissions = (): MenuPermission[] => {
  // Nếu có cache và cache chưa hết hạn, dùng cache
  const now = Date.now();
  if (menuPermissionsCache && (now - lastFetchTime) < CACHE_DURATION) {
    return menuPermissionsCache;
  }

  // Fallback: Lấy từ localStorage nếu có
  const stored = localStorage.getItem('menuPermissions');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      menuPermissionsCache = parsed;
      lastFetchTime = now;
      return parsed;
    } catch (e) {
      console.error('Error parsing menu permissions from localStorage:', e);
    }
  }

  // Default: Tất cả menu cho admin, không có menu nào cho partner và employee
  return [];
};

// Load menu permissions từ Firebase (async)
export const loadMenuPermissions = async (): Promise<MenuPermission[]> => {
  try {
    const permissions = await fetchMenuPermissionsFromFirebase();
    menuPermissionsCache = permissions;
    lastFetchTime = Date.now();
    // Đồng bộ với localStorage để có fallback
    localStorage.setItem('menuPermissions', JSON.stringify(permissions));
    return permissions;
  } catch (error) {
    console.error('Error loading menu permissions:', error);
    return getMenuPermissions(); // Fallback về localStorage
  }
};

// Lưu menu permissions vào Firebase và localStorage
export const saveMenuPermissions = async (permissions: MenuPermission[]): Promise<void> => {
  try {
    await saveMenuPermissionsToFirebase(permissions);
    // Cập nhật cache
    menuPermissionsCache = permissions;
    lastFetchTime = Date.now();
    // Đồng bộ với localStorage
    localStorage.setItem('menuPermissions', JSON.stringify(permissions));
  } catch (error) {
    console.error('Error saving menu permissions:', error);
    // Fallback: Lưu vào localStorage
    localStorage.setItem('menuPermissions', JSON.stringify(permissions));
    menuPermissionsCache = permissions;
    lastFetchTime = Date.now();
  }
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
  if (!menuPermission.allowedRoles || !Array.isArray(menuPermission.allowedRoles) || !menuPermission.allowedRoles.includes(userRole)) {
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

