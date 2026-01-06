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

  // Fallback: Lấy từ localStorage nếu có (thử cả 2 key để tương thích)
  const stored = localStorage.getItem('menuPermissions') || localStorage.getItem('local_menu_permissions');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      menuPermissionsCache = parsed;
      lastFetchTime = now;
      // Đồng bộ cả 2 key
      localStorage.setItem('menuPermissions', stored);
      localStorage.setItem('local_menu_permissions', stored);
      return parsed;
    } catch (e) {
      console.error('Error parsing menu permissions from localStorage:', e);
    }
  }

  // Default: Không có menu nào được cấp quyền (phải được admin cấp quyền thủ công)
  return [];
};

// Load menu permissions từ Firebase (async)
export const loadMenuPermissions = async (): Promise<MenuPermission[]> => {
  try {
    const permissions = await fetchMenuPermissionsFromFirebase();
    menuPermissionsCache = permissions;
    lastFetchTime = Date.now();
    // Đồng bộ với localStorage để có fallback (lưu cả 2 key)
    const permissionsJson = JSON.stringify(permissions);
    localStorage.setItem('menuPermissions', permissionsJson);
    localStorage.setItem('local_menu_permissions', permissionsJson);
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
    // Đồng bộ với localStorage (lưu cả 2 key để tương thích)
    const permissionsJson = JSON.stringify(permissions);
    localStorage.setItem('menuPermissions', permissionsJson);
    localStorage.setItem('local_menu_permissions', permissionsJson);
  } catch (error) {
    console.error('Error saving menu permissions:', error);
    // Fallback: Lưu vào localStorage (lưu cả 2 key)
    const permissionsJson = JSON.stringify(permissions);
    localStorage.setItem('menuPermissions', permissionsJson);
    localStorage.setItem('local_menu_permissions', permissionsJson);
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

  const permissions = getMenuPermissions();
  const menuPermission = permissions.find(p => p.menuId === menuId);
  
  if (!menuPermission) {
    // Nếu không có permission được set, mặc định là không có quyền (cho employee)
    return false;
  }

  // Kiểm tra role - phải có allowedRoles và phải chứa userRole
  if (!menuPermission.allowedRoles || !Array.isArray(menuPermission.allowedRoles) || menuPermission.allowedRoles.length === 0) {
    return false;
  }
  
  if (!menuPermission.allowedRoles.includes(userRole)) {
    return false;
  }

  // Nếu là employee, cần kiểm tra thêm department
  if (userRole === 'employee') {
    // Nếu có allowedDepartments (dù rỗng hay không), thì phải kiểm tra department
    if (menuPermission.allowedDepartments !== undefined) {
      // Nếu allowedDepartments rỗng, thì không employee nào có quyền
      if (menuPermission.allowedDepartments.length === 0) {
        return false;
      }
      // Nếu user không có department hoặc department không trong danh sách allowed
      if (!userDepartment || !menuPermission.allowedDepartments.includes(userDepartment)) {
        return false;
      }
    } else {
      // Nếu allowedDepartments là undefined (chưa được set), thì không employee nào có quyền
      // Để đảm bảo phải chọn department cụ thể
      return false;
    }
  }

  return true;
};

// Lấy user ID hiện tại
export const getCurrentUserId = (): string | undefined => {
  return localStorage.getItem('currentUserId') || undefined;
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
  return 'employee'; // Default
};

// Kiểm tra user có phải Admin không
export const isAdmin = (): boolean => {
  return getCurrentUserRole() === 'admin';
};

// Kiểm tra user có phải đối tác không (nhân viên có department = 'Đối tác')
export const isPartner = (): boolean => {
  const department = getCurrentUserDepartment();
  return department === 'Đối tác';
};

// Lấy ID của đối tác (ID của nhân viên có department = 'Đối tác')
export const getPartnerId = (): string | undefined => {
  if (isPartner()) {
    return getCurrentUserId();
  }
  return undefined;
};

// Lấy tên user hiện tại (fullName)
export const getCurrentUserName = (): string | undefined => {
  return localStorage.getItem('currentUser') || undefined;
};

// Kiểm tra user có phải nhân viên thường không (không phải admin, không phải đối tác)
export const isRegularEmployee = (): boolean => {
  return !isAdmin() && !isPartner();
};
