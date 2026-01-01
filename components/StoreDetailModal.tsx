import React, { useState, useEffect, useMemo } from 'react';
import { Store, Personnel, LiveReport } from '../types';
import { fetchPersonnel, fetchLiveReports, MOCK_STORES, MOCK_AD_DATA, MOCK_VIDEO_METRICS } from '../services/dataService';
import { AdShiftData, VideoMetric } from '../types';

interface StoreDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: Store | null;
}

export const StoreDetailModal: React.FC<StoreDetailModalProps> = ({ isOpen, onClose, store }) => {
  const [activeTab, setActiveTab] = useState<'personnel' | 'metrics' | 'history'>('personnel');
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [liveReports, setLiveReports] = useState<LiveReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && store) {
      loadData();
    }
  }, [isOpen, store]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [personnel, reports] = await Promise.all([
        fetchPersonnel(),
        fetchLiveReports()
      ]);
      setPersonnelList(personnel);
      setLiveReports(reports);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Lấy nhân sự phụ trách từ các báo cáo của cửa hàng
  const responsiblePersonnel = useMemo(() => {
    if (!store) return [];
    
    // Lấy danh sách người báo cáo từ LiveReport của cửa hàng này
    const reporters = liveReports
      .filter(report => report.channelId === store.id && report.reporter)
      .map(report => report.reporter!)
      .filter((value, index, self) => self.indexOf(value) === index); // unique
    
    // Tìm nhân sự tương ứng
    return personnelList.filter(person => 
      reporters.some(reporter => 
        person.fullName.toLowerCase().includes(reporter.toLowerCase()) ||
        person.email?.toLowerCase().includes(reporter.toLowerCase())
      )
    );
  }, [store, liveReports, personnelList]);

  // Tính toán chỉ số cửa hàng
  const storeMetrics = useMemo(() => {
    if (!store) return null;

    const storeReports = liveReports.filter(r => r.channelId === store.id);
    const storeAdData = MOCK_AD_DATA.filter(a => a.storeId === store.id);
    const storeVideos = MOCK_VIDEO_METRICS.filter(v => v.storeId === store.id);

    const totalGMV = storeReports.reduce((sum, r) => sum + (Number(r.gmv) || 0), 0);
    const totalAdCost = storeReports.reduce((sum, r) => sum + (Number(r.adCost) || 0), 0);
    const totalOrders = storeReports.reduce((sum, r) => sum + (Number(r.orders) || 0), 0);
    const totalViews = storeReports.reduce((sum, r) => sum + (Number(r.totalViews) || 0), 0);
    const totalViewers = storeReports.reduce((sum, r) => sum + (Number(r.viewers) || 0), 0);
    const videoViews = storeVideos.reduce((sum, v) => sum + (v.views || 0), 0);
    const videoSales = storeVideos.reduce((sum, v) => sum + (v.sales || 0), 0);
    
    const roi = totalAdCost > 0 ? ((totalGMV - totalAdCost) / totalAdCost) * 100 : 0;
    const avgOrderValue = totalOrders > 0 ? totalGMV / totalOrders : 0;

    return {
      totalGMV,
      totalAdCost,
      totalOrders,
      totalViews,
      totalViewers,
      videoViews,
      videoSales,
      roi,
      avgOrderValue,
      reportCount: storeReports.length,
      videoCount: storeVideos.length
    };
  }, [store, liveReports]);

  // Lịch sử hoạt động gần đây
  const recentHistory = useMemo(() => {
    if (!store) return [];
    
    const storeReports = liveReports
      .filter(r => r.channelId === store.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10); // 10 báo cáo gần nhất
    
    return storeReports;
  }, [store, liveReports]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);

  if (!isOpen || !store) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] overflow-y-auto p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 uppercase">{store.name}</h2>
            <p className="text-sm text-gray-500 mt-1">ID: {store.id}</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-white">
          <div className="flex">
            <button
              onClick={() => setActiveTab('personnel')}
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                activeTab === 'personnel'
                  ? 'border-b-2 border-brand-red text-brand-red bg-red-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              Nhân sự phụ trách
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                activeTab === 'metrics'
                  ? 'border-b-2 border-brand-red text-brand-red bg-red-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              Chỉ số cửa hàng
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-b-2 border-brand-red text-brand-red bg-red-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              Lịch sử hoạt động
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Đang tải dữ liệu...</div>
          ) : (
            <>
              {/* Tab 1: Nhân sự phụ trách */}
              {activeTab === 'personnel' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Danh sách nhân sự phụ trách</h3>
                  {responsiblePersonnel.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 bg-gray-50 rounded border border-gray-200">
                      <p>Chưa có nhân sự phụ trách được gán cho cửa hàng này</p>
                      <p className="text-xs mt-2 text-gray-500">Nhân sự sẽ được tự động xác định từ các báo cáo Live</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {responsiblePersonnel.map((person) => (
                        <div key={person.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-800 text-lg">{person.fullName}</h4>
                              <div className="mt-2 space-y-1 text-sm">
                                <p className="text-gray-600">
                                  <span className="font-medium">Vị trí:</span> {person.position || '-'}
                                </p>
                                <p className="text-gray-600">
                                  <span className="font-medium">Phòng ban:</span>{' '}
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                                    person.department === 'Live' ? 'bg-red-50 text-red-700 border-red-200' :
                                    person.department === 'Media' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    'bg-gray-50 text-gray-600 border-gray-200'
                                  }`}>
                                    {person.department || '-'}
                                  </span>
                                </p>
                                <p className="text-gray-600">
                                  <span className="font-medium">SĐT:</span> {person.phoneNumber || '-'}
                                </p>
                                <p className="text-gray-600">
                                  <span className="font-medium">Email:</span> {person.email || '-'}
                                </p>
                              </div>
                            </div>
                            {person.role === 'admin' && (
                              <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded border border-purple-200 font-medium">
                                Admin
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Chỉ số cửa hàng */}
              {activeTab === 'metrics' && storeMetrics && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Tổng quan chỉ số</h3>
                  
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded shadow-sm">
                      <p className="text-xs text-gray-600 uppercase font-bold mb-1">Tổng GMV</p>
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency(storeMetrics.totalGMV)}</p>
                    </div>
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
                      <p className="text-xs text-gray-600 uppercase font-bold mb-1">Tổng Chi phí QC</p>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(storeMetrics.totalAdCost)}</p>
                    </div>
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded shadow-sm">
                      <p className="text-xs text-gray-600 uppercase font-bold mb-1">ROI</p>
                      <p className="text-2xl font-bold text-green-600">{storeMetrics.roi.toFixed(1)}%</p>
                    </div>
                  </div>

                  {/* Chi tiết chỉ số */}
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-200">
                      <h4 className="font-bold text-gray-800">Chi tiết chỉ số</h4>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">Tổng đơn hàng</p>
                          <p className="text-lg font-bold text-gray-800">{storeMetrics.totalOrders}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">Giá trị đơn TB</p>
                          <p className="text-lg font-bold text-gray-800">{formatCurrency(storeMetrics.avgOrderValue)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">Tổng lượt xem Live</p>
                          <p className="text-lg font-bold text-gray-800">{storeMetrics.totalViews.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">Người xem Live</p>
                          <p className="text-lg font-bold text-gray-800">{storeMetrics.totalViewers.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">Lượt xem Video</p>
                          <p className="text-lg font-bold text-gray-800">{storeMetrics.videoViews.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">Doanh số Video</p>
                          <p className="text-lg font-bold text-gray-800">{formatCurrency(storeMetrics.videoSales)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">Số báo cáo</p>
                          <p className="text-lg font-bold text-gray-800">{storeMetrics.reportCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">Số video</p>
                          <p className="text-lg font-bold text-gray-800">{storeMetrics.videoCount}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Lịch sử hoạt động */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Lịch sử báo cáo gần đây</h3>
                  {recentHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 bg-gray-50 rounded border border-gray-200">
                      <p>Chưa có báo cáo nào cho cửa hàng này</p>
                    </div>
                  ) : (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Ngày</th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Host</th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Thời gian</th>
                              <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">GMV</th>
                              <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Chi phí QC</th>
                              <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">ROI</th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Người báo cáo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentHistory.map((report) => {
                              const gmv = Number(report.gmv) || 0;
                              const adCost = Number(report.adCost) || 0;
                              const roi = adCost > 0 ? ((gmv - adCost) / adCost) * 100 : 0;
                              
                              return (
                                <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="px-4 py-3 font-medium text-gray-800">{report.date}</td>
                                  <td className="px-4 py-3 text-gray-600">{report.hostName}</td>
                                  <td className="px-4 py-3 text-gray-600 text-xs">
                                    {report.startTime} - {report.endTime}
                                  </td>
                                  <td className="px-4 py-3 text-right font-bold text-blue-600">{formatCurrency(gmv)}</td>
                                  <td className="px-4 py-3 text-right font-bold text-red-600">{formatCurrency(adCost)}</td>
                                  <td className="px-4 py-3 text-right">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      roi >= 400 ? 'bg-green-100 text-green-800' :
                                      roi >= 200 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {roi.toFixed(1)}%
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-gray-600">{report.reporter || '-'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

