export interface Store {
  id: string;
  name: string;
}

export interface LiveReport {
  id?: string;
  date: string; // Ngày tháng
  channelId: string; // KÊNH LIVE (Store ID)
  startTime: string; // Thời gian bắt đầu
  endTime: string; // Thời gian kết thúc
  hostName: string; // Hostlive
  duration: string; // Thời gian live (formatted HH:mm or minutes)
  gmv: number; // GMV (Doanh số)
  totalGmv: number; // Tổng GMV (Total transaction)
  adCost: number; // Chi phí quảng cáo

  // New fields
  conversionRate?: number; // 转化率 Tỉ lệ chuyển đổi (%)
  averagePrice?: number; // 平均价格 Giá trung bình
  productClickRate?: number; // 点击率 Tỉ lệ lượt nhấp vào sản phẩm (%)
  ctr?: number; // 进房率 CTR (%)
  gpm?: number; // 直播千次金额 GPM
  orders?: number; // 订单数 Số lượt bán
  viewers?: number; // 场观人数 Số người xem
  totalViews?: number; // 直播观看次数 Số lượt xem
  avgWatchTime?: string; // 平均观看时长 Thời gian xem TB
  productClicks?: number; // 产品点击次数 Lượt nhấp sản phẩm
  newFollowers?: number; // 关注人数 FL mới
  reporter?: string; // NGƯỜI BÁO CÁO
}

export interface Personnel {
  id?: string;
  fullName: string; // hovaten
  department: string; // phongban
  position: string; // vitri
  phoneNumber: string; // sdt
  email?: string; // email login
  password?: string; // password login
  role?: 'admin' | 'user'; // role
  baseSalary?: number; // Lương cứng
  monthlyKPITarget?: number; // Mục tiêu KPI theo tháng (doanh số)
}

export interface AdShiftData {
  id: string;
  date: string;
  shift: 'Sáng' | 'Chiều' | 'Tối';
  storeId: string;
  gmv: number;
  adCost: number;
  orders: number;
  viewCount: number;
}

export interface HostRevenue {
  id: string;
  name: string;
  storeId: string;
  revenue: Record<string, number>;
}

export interface VideoMetric {
  id: string;
  title: string;
  storeId: string;
  platform: 'TikTok' | 'Facebook' | 'Shopee';
  uploadDate: string;
  views: number;
  personInCharge: string;
  sales: number;
}

export interface VideoConfigItem {
  id: string;
  category: string;
  format?: string;
  formula: string;
  sourceType: 'manual' | 'excel' | 'formula';
}

export interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
}

export enum ReportType {
  DASHBOARD = 'dashboard',
  LIVE_ADS = 'live_ads',
  VIDEO_PARAM = 'video_param',
  STORE_MGR = 'store_mgr',
  PERSONNEL = 'personnel',
}