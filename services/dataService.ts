import { HostRevenue, VideoConfigItem, Store, AdShiftData, VideoMetric, LiveReport, Personnel, MenuPermission } from '../types';

const FIREBASE_URL = 'https://phonglive-26d30-default-rtdb.asia-southeast1.firebasedatabase.app';

// --- API FUNCTIONS ---

export const fetchLiveReports = async (): Promise<LiveReport[]> => {
  let reports: LiveReport[] = [];
  try {
    const response = await fetch(`${FIREBASE_URL}/live_reports.json`);
    if (response.ok) {
      const data = await response.json();
      if (data) {
        reports = Object.keys(data).map(key => ({
          ...data[key],
          id: key
        }));
      }
    }
  } catch (error) {
    console.warn("API unavailable, checking local storage...");
  }

  // Merge with Local Storage (demo mode)
  const localReports = JSON.parse(localStorage.getItem('local_live_reports') || '[]');
  return [...reports, ...localReports];
};

export const createLiveReport = async (report: Omit<LiveReport, 'id'>) => {
  try {
    const response = await fetch(`${FIREBASE_URL}/live_reports.json`, {
      method: 'POST',
      body: JSON.stringify(report),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('API Failed');
    return await response.json();
  } catch (error) {
    console.warn("API Error, saving to local storage instead:", error);
    // Fallback: Save to Local Storage
    const localReports = JSON.parse(localStorage.getItem('local_live_reports') || '[]');
    const newReport = { ...report, id: `local_${Date.now()}` };
    localReports.push(newReport);
    localStorage.setItem('local_live_reports', JSON.stringify(localReports));
    return { name: newReport.id };
  }
};

export const updateLiveReport = async (id: string, report: Partial<LiveReport>) => {
  if (id.startsWith('local_')) {
    const localReports = JSON.parse(localStorage.getItem('local_live_reports') || '[]');
    const index = localReports.findIndex((r: LiveReport) => r.id === id);
    if (index !== -1) {
      localReports[index] = { ...localReports[index], ...report };
      localStorage.setItem('local_live_reports', JSON.stringify(localReports));
      return localReports[index];
    }
    return null;
  }

  try {
    const response = await fetch(`${FIREBASE_URL}/live_reports/${id}.json`, {
      method: 'PATCH',
      body: JSON.stringify(report),
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to update live report');
    return await response.json();
  } catch (error) {
    console.error("Update failed", error);
    throw error;
  }
};

export const deleteLiveReport = async (id: string) => {
  if (id.startsWith('local_')) {
    const localReports = JSON.parse(localStorage.getItem('local_live_reports') || '[]');
    const filtered = localReports.filter((r: LiveReport) => r.id !== id);
    localStorage.setItem('local_live_reports', JSON.stringify(filtered));
    return true;
  }

  try {
    const response = await fetch(`${FIREBASE_URL}/live_reports/${id}.json`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete live report');
    return true;
  } catch (error) {
    console.error("Delete failed", error);
    throw error;
  }
};

// --- PERSONNEL ---

export const fetchPersonnel = async (): Promise<Personnel[]> => {
  let personnel: Personnel[] = [];
  try {
    const response = await fetch(`${FIREBASE_URL}/personnel.json`);
    if (response.ok) {
      const data = await response.json();
      if (data) {
        personnel = Object.keys(data).map(key => ({ ...data[key], id: key }));
      }
    }
  } catch (error) {
    console.warn("API unavailable, checking local storage...");
  }

  // Merge with Local Storage
  const localPersonnel = JSON.parse(localStorage.getItem('local_personnel') || '[]');

  // Combine lists, preferring local adjustments if IDs conflict (simplistic merge)
  const allPersonnel = [...personnel, ...localPersonnel];

  // Seed Admin if list is empty (or just ensure it exists in local for demo)
  if (!allPersonnel.find(p => p.email === 'admin@phonglive.com')) {
    const adminUser: Personnel = {
      id: 'admin_seed',
      fullName: 'Admin User',
      department: 'Management',
      position: 'Admin',
      phoneNumber: '0900000000',
      email: 'admin@phonglive.com',
      password: 'password', // Default password
      role: 'admin'
    };
    // Save seed to local storage so it persists
    localPersonnel.push(adminUser);
    localStorage.setItem('local_personnel', JSON.stringify(localPersonnel));
    allPersonnel.push(adminUser);
  }

  // Remove duplicates by ID (if any)
  const uniquePersonnel = Array.from(new Map(allPersonnel.map(item => [item.id, item])).values());

  return uniquePersonnel;
};

export const createPersonnel = async (person: Omit<Personnel, 'id'>) => {
  try {
    const response = await fetch(`${FIREBASE_URL}/personnel.json`, {
      method: 'POST',
      body: JSON.stringify(person),
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to create personnel');
    return await response.json();
  } catch (error) {
    console.warn("API Error, saving to local storage instead:", error);
    const localPersonnel = JSON.parse(localStorage.getItem('local_personnel') || '[]');
    const newPerson = { ...person, id: `local_p_${Date.now()}` };
    localPersonnel.push(newPerson);
    localStorage.setItem('local_personnel', JSON.stringify(localPersonnel));
    return { name: newPerson.id };
  }
};

export const updatePersonnel = async (id: string, person: Partial<Personnel>) => {
  // If it's a local ID, update locally
  if (id.startsWith('local_') || id === 'admin_seed') {
    const localPersonnel = JSON.parse(localStorage.getItem('local_personnel') || '[]');
    const index = localPersonnel.findIndex((p: Personnel) => p.id === id);
    if (index !== -1) {
      localPersonnel[index] = { ...localPersonnel[index], ...person };
      localStorage.setItem('local_personnel', JSON.stringify(localPersonnel));
      return localPersonnel[index];
    } else if (id === 'admin_seed') {
      // Re-seed if missing but requested? Should be handled by fetch.
      // Assume exists if we are updating it.
    }
    return null;
  }

  // Try API
  try {
    const response = await fetch(`${FIREBASE_URL}/personnel/${id}.json`, {
      method: 'PATCH',
      body: JSON.stringify(person),
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to update personnel');
    return await response.json();
  } catch (error) {
    console.error("Update failed", error);
    throw error;
  }
};

export const deletePersonnel = async (id: string) => {
  if (id.startsWith('local_') || id === 'admin_seed') {
    const localPersonnel = JSON.parse(localStorage.getItem('local_personnel') || '[]');
    const filtered = localPersonnel.filter((p: Personnel) => p.id !== id);
    localStorage.setItem('local_personnel', JSON.stringify(filtered));
    return true;
  }

  try {
    const response = await fetch(`${FIREBASE_URL}/personnel/${id}.json`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete personnel');
    return true;
  } catch (error) {
    console.error("Delete failed", error);
    throw error;
  }
};


export const fetchVideoMetrics = async (): Promise<VideoMetric[]> => {
  try {
    const response = await fetch(`${FIREBASE_URL}/video_metrics.json`);
    if (!response.ok) throw new Error('Failed to fetch video metrics');
    const data = await response.json();
    if (!data) return [];

    return Object.keys(data).map(key => ({
      ...data[key],
      id: key
    }));
  } catch (error) {
    console.error("Error fetching video metrics:", error);
    return [];
  }
};

export const createVideoMetric = async (metric: Omit<VideoMetric, 'id'>) => {
  try {
    const response = await fetch(`${FIREBASE_URL}/video_metrics.json`, {
      method: 'POST',
      body: JSON.stringify(metric),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error('Failed to create video metric');
    return await response.json();
  } catch (error) {
    console.error("Error creating video metric:", error);
    throw error;
  }
};

export const updateVideoMetric = async (id: string, metric: Partial<VideoMetric>) => {
  try {
    const response = await fetch(`${FIREBASE_URL}/video_metrics/${id}.json`, {
      method: 'PATCH',
      body: JSON.stringify(metric),
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to update video metric');
    return await response.json();
  } catch (error) {
    console.error("Update failed", error);
    throw error;
  }
};

export const deleteVideoMetric = async (id: string) => {
  try {
    const response = await fetch(`${FIREBASE_URL}/video_metrics/${id}.json`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete video metric');
    return true;
  } catch (error) {
    console.error("Delete failed", error);
    throw error;
  }
};

// --- MOCK DATA ---


// --- STORES ---

export const fetchStores = async (): Promise<Store[]> => {
  let stores: Store[] = [];
  try {
    const response = await fetch(`${FIREBASE_URL}/stores.json`);
    if (response.ok) {
      const data = await response.json();
      if (data) {
        stores = Object.keys(data).map(key => ({
          ...data[key],
          id: key
        }));
      }
    }
  } catch (error) {
    console.warn("API unavailable, checking local storage...");
  }

  // Merge with Local Storage
  const localStores = JSON.parse(localStorage.getItem('local_stores') || '[]');

  // Filter out old mock stores (store1, store2, store3) that were seeded from MOCK_STORES
  const mockStoreIds = ['store1', 'store2', 'store3'];
  const filteredLocalStores = localStores.filter((s: Store) => !mockStoreIds.includes(s.id));

  // If we filtered out any stores, update localStorage
  if (filteredLocalStores.length !== localStores.length) {
    localStorage.setItem('local_stores', JSON.stringify(filteredLocalStores));
  }

  // Merge stores and remove duplicates by id
  const allStores = [...stores, ...filteredLocalStores];
  const uniqueStores = allStores.reduce((acc, store) => {
    if (!acc.find(s => s.id === store.id)) {
      acc.push(store);
    }
    return acc;
  }, [] as Store[]);

  return uniqueStores;
};

export const createStore = async (store: Omit<Store, 'id'>) => {
  try {
    const response = await fetch(`${FIREBASE_URL}/stores.json`, {
      method: 'POST',
      body: JSON.stringify(store),
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to create store');
    return await response.json();
  } catch (error) {
    console.warn("API Error, saving to local storage instead:", error);
    const localStores = JSON.parse(localStorage.getItem('local_stores') || '[]');
    const newStore = { ...store, id: `local_store_${Date.now()}` };
    localStores.push(newStore);
    localStorage.setItem('local_stores', JSON.stringify(localStores));
    return { name: newStore.id };
  }
};

export const updateStore = async (id: string, store: Partial<Store>) => {
  if (id.startsWith('local_') || id.startsWith('store_')) {
    const localStores = JSON.parse(localStorage.getItem('local_stores') || '[]');
    const index = localStores.findIndex((s: Store) => s.id === id);
    if (index !== -1) {
      localStores[index] = { ...localStores[index], ...store };
      localStorage.setItem('local_stores', JSON.stringify(localStores));
      return localStores[index];
    }
    return null;
  }

  try {
    const response = await fetch(`${FIREBASE_URL}/stores/${id}.json`, {
      method: 'PATCH',
      body: JSON.stringify(store),
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to update store');
    return await response.json();
  } catch (error) {
    console.error("Update failed", error);
    throw error;
  }
};

export const deleteStore = async (id: string) => {
  // Delete from localStorage if it's a local or mock store
  if (id.startsWith('local_') || id.startsWith('store_')) {
    const localStores = JSON.parse(localStorage.getItem('local_stores') || '[]');
    const filtered = localStores.filter((s: Store) => s.id !== id);
    localStorage.setItem('local_stores', JSON.stringify(filtered));
  }

  // Also try to delete from Firebase (in case it was synced there)
  try {
    const response = await fetch(`${FIREBASE_URL}/stores/${id}.json`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      // If it's a local/mock store and not in Firebase, that's OK
      if (id.startsWith('local_') || id.startsWith('store_')) {
        return true;
      }
      throw new Error('Failed to delete store');
    }
    return true;
  } catch (error) {
    // If it's a local/mock store and Firebase delete fails, that's OK (might not exist in Firebase)
    if (id.startsWith('local_') || id.startsWith('store_')) {
      return true;
    }
    console.error("Delete failed", error);
    throw error;
  }
};


export const VIDEO_CONFIG_DATA: VideoConfigItem[] = [
  { id: '1', category: 'ROI', format: 'Currency', formula: 'GVM - Chi phí QC', sourceType: 'formula' },
  { id: '2', category: 'Tỷ lệ chuyển đổi', format: '%', formula: '(Đơn hàng / Click) * 100', sourceType: 'formula' },
  { id: '3', category: 'Giá trung bình', format: 'Currency', formula: 'Nhập tay', sourceType: 'manual' },
  { id: '4', category: 'CTR (Tỷ lệ nhấp)', format: '%', formula: 'Nhập tay', sourceType: 'manual' },
  { id: '5', category: 'CPM', format: 'Currency', formula: 'Nhập tay', sourceType: 'manual' },
  { id: '6', category: 'GPM', format: '%', formula: 'Nhập tay', sourceType: 'manual' },
  { id: '7', category: 'Số lượt bán', format: 'Number', formula: 'Lấy từ excel', sourceType: 'excel' },
  { id: '8', category: 'Số người xem', format: 'Number', formula: 'Lấy từ excel', sourceType: 'excel' },
  { id: '9', category: 'Người phụ trách', format: 'Text', formula: 'Lấy từ excel', sourceType: 'excel' },
];

export const fetchLiveData = async () => {
  return null;
};

// --- MENU PERMISSIONS ---

export const fetchMenuPermissions = async (): Promise<MenuPermission[]> => {
  let permissions: MenuPermission[] = [];
  try {
    const response = await fetch(`${FIREBASE_URL}/menu_permissions.json`);
    if (response.ok) {
      const data = await response.json();
      if (data) {
        // Firebase trả về object, cần convert thành array
        if (Array.isArray(data)) {
          permissions = data;
        } else {
          permissions = Object.keys(data).map(key => data[key]);
        }
      }
    }
  } catch (error) {
    console.warn("API unavailable, checking local storage...");
  }

  // Merge with Local Storage
  const localPermissions = JSON.parse(localStorage.getItem('local_menu_permissions') || '[]');
  
  // Merge permissions and remove duplicates by menuId
  const allPermissions = [...permissions, ...localPermissions];
  const uniquePermissions = Array.from(
    new Map(allPermissions.map(item => [item.menuId, item])).values()
  );

  return uniquePermissions;
};

export const saveMenuPermissionsToFirebase = async (permissions: MenuPermission[]): Promise<void> => {
  try {
    // Save to Firebase (save as array)
    const response = await fetch(`${FIREBASE_URL}/menu_permissions.json`, {
      method: 'PUT',
      body: JSON.stringify(permissions),
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to save menu permissions');
    
    // Also save to local storage as backup
    localStorage.setItem('local_menu_permissions', JSON.stringify(permissions));
  } catch (error) {
    console.warn("API Error, saving to local storage instead:", error);
    // Fallback: Save to Local Storage
    localStorage.setItem('local_menu_permissions', JSON.stringify(permissions));
    throw error; // Re-throw để permissionUtils có thể xử lý
  }
};