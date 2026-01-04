import React, { useState, useMemo, useEffect } from 'react';
import { fetchLiveReports, fetchStores } from '../services/dataService';
import { FilterBar, FilterField } from '../components/FilterBar';
import { exportToExcel, importFromExcel } from '../utils/excelUtils';
import { formatCurrency, calculateROI, formatROI } from '../utils/formatUtils';
import { LiveReport, Store } from '../types';
import { LiveReportModal } from '../components/LiveReportModal';
import { createLiveReport, updateLiveReport, deleteLiveReport } from '../services/dataService';
import { getCurrentUserRole, getCurrentUserId, isAdmin } from '../utils/permissionUtils';

export const LiveReportDetail: React.FC = () => {
  const [reports, setReports] = useState<LiveReport[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<LiveReport | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

  // Filter states
  const [searchText, setSearchText] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [dateFrom, setDateFrom] = useState<string>(firstDayOfMonth.toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState<string>(today.toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [reportData, storeData] = await Promise.all([
        fetchLiveReports(),
        fetchStores()
      ]);
      setReports(reportData);
      setStores(storeData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateReport = async (newReport: Omit<LiveReport, 'id'>) => {
    await createLiveReport(newReport);
    await loadData();
    setIsCreateModalOpen(false);
  };

  const handleUpdateReport = async (id: string, updatedReport: Partial<LiveReport>) => {
    await updateLiveReport(id, updatedReport);
    await loadData();
    setIsEditModalOpen(false);
    setSelectedReport(null);
  };

  const handleDeleteReport = async (id: string) => {
    await deleteLiveReport(id);
    await loadData();
    setReportToDelete(null);
  };

  const handleViewReport = (report: LiveReport) => {
    setSelectedReport(report);
    setIsViewModalOpen(true);
  };

  const handleEditReport = (report: LiveReport) => {
    setSelectedReport(report);
    setIsEditModalOpen(true);
  };

  // Filter Data with search and filters
  const filteredData = useMemo(() => {
    let filtered = reports;

    // For partners, only show reports from their stores
    const currentUserRole = getCurrentUserRole();
    const currentUserId = getCurrentUserId();
    const isAdminUser = isAdmin();
    
    if (currentUserRole === 'partner' && !isAdminUser && currentUserId) {
      const allowedStoreIds = stores.filter(s => s.partnerId === currentUserId).map(s => s.id);
      filtered = filtered.filter(item => allowedStoreIds.includes(item.channelId));
    }

    // Filter by date range
    filtered = filtered.filter(item => {
      const itemDate = new Date(item.date);
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      return itemDate >= fromDate && itemDate <= toDate;
    });

    // Filter by selected filters
    if (selectedFilters.stores && selectedFilters.stores.length > 0) {
      filtered = filtered.filter(item => selectedFilters.stores!.includes(item.channelId));
    }
    if (selectedFilters.hosts && selectedFilters.hosts.length > 0) {
      filtered = filtered.filter(item => selectedFilters.hosts!.includes(item.hostName));
    }
    if (selectedFilters.shifts && selectedFilters.shifts.length > 0) {
      filtered = filtered.filter(item => item.shift && selectedFilters.shifts!.includes(item.shift));
    }
    if (selectedFilters.reporters && selectedFilters.reporters.length > 0) {
      filtered = filtered.filter(item => item.reporter && selectedFilters.reporters!.includes(item.reporter));
    }
    if (selectedFilters.customerGroups && selectedFilters.customerGroups.length > 0) {
      filtered = filtered.filter(item => item.customerGroup && selectedFilters.customerGroups!.includes(item.customerGroup));
    }
    if (selectedFilters.sources && selectedFilters.sources.length > 0) {
      filtered = filtered.filter(item => item.source && selectedFilters.sources!.includes(item.source));
    }
    if (selectedFilters.salesPersons && selectedFilters.salesPersons.length > 0) {
      filtered = filtered.filter(item => item.salesPerson && selectedFilters.salesPersons!.includes(item.salesPerson));
    }
    if (selectedFilters.callCounts && selectedFilters.callCounts.length > 0) {
      filtered = filtered.filter(item => item.callCount !== undefined && selectedFilters.callCounts!.includes(item.callCount.toString()));
    }
    if (selectedFilters.statuses && selectedFilters.statuses.length > 0) {
      filtered = filtered.filter(item => item.status && selectedFilters.statuses!.includes(item.status));
    }

    // Search in all fields
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(item => {
        const storeName = stores.find(s => s.id === item.channelId)?.name || '';
        return (
          item.date.toLowerCase().includes(searchLower) ||
          storeName.toLowerCase().includes(searchLower) ||
          item.hostName.toLowerCase().includes(searchLower) ||
          item.reporter?.toLowerCase().includes(searchLower) ||
          item.shift?.toLowerCase().includes(searchLower) ||
          item.customerGroup?.toLowerCase().includes(searchLower) ||
          item.source?.toLowerCase().includes(searchLower) ||
          item.salesPerson?.toLowerCase().includes(searchLower) ||
          item.status?.toLowerCase().includes(searchLower) ||
          item.callCount?.toString().includes(searchLower) ||
          item.gmv.toString().includes(searchLower) ||
          item.adCost.toString().includes(searchLower) ||
          item.orders?.toString().includes(searchLower) ||
          item.viewers?.toString().includes(searchLower)
        );
      });
    }

    return filtered;
  }, [reports, dateFrom, dateTo, selectedFilters, searchText, stores]);

  // Filter stores for partners
  const filteredStoresForUser = useMemo(() => {
    const currentUserRole = getCurrentUserRole();
    const currentUserId = getCurrentUserId();
    const isAdminUser = isAdmin();
    
    if (isAdminUser) {
      return stores.filter(s => s.id !== 'all');
    } else if (currentUserRole === 'partner' && currentUserId) {
      return stores.filter(s => s.id !== 'all' && s.partnerId === currentUserId);
    }
    return stores.filter(s => s.id !== 'all');
  }, [stores]);

  const getStatusColor = (roi: number) => {
    // roi là giá trị thập phân (ví dụ: 4.0 = 400%, 2.0 = 200%)
    if (roi >= 4.0) return 'bg-green-100 text-green-800 border-green-200';
    if (roi >= 2.0) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Đang tải dữ liệu... (正在加载数据...)</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans space-y-6">
      {/* Modals */}
      <LiveReportModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateReport}
        reports={reports}
      />
      <LiveReportModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setSelectedReport(null); }}
        onSubmit={async (data) => {
          if (selectedReport?.id) {
            await handleUpdateReport(selectedReport.id, data);
          }
        }}
        initialData={selectedReport || undefined}
        isEdit={true}
        reports={reports}
      />

      {/* View Report Modal */}
      {isViewModalOpen && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] overflow-y-auto p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-brand-navy to-blue-700 p-6 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold uppercase mb-2">Chi tiết Báo Cáo Live (直播报告详情)</h2>
                  <p className="text-blue-100 text-sm">ID: {selectedReport.id || 'N/A'}</p>
                </div>
                <button 
                  onClick={() => { setIsViewModalOpen(false); setSelectedReport(null); }} 
                  className="text-white hover:text-blue-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Ngày (日期)</p>
                  <p className="text-lg font-bold text-gray-800">{selectedReport.date}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Cửa hàng (店铺)</p>
                  <p className="text-lg font-bold text-gray-800">{stores.find(s => s.id === selectedReport.channelId)?.name || 'Unknown'}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Host (主播)</p>
                  <p className="text-lg font-bold text-gray-800">{selectedReport.hostName}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">GMV (交易额)</p>
                  <p className="text-lg font-bold text-gray-800">{formatCurrency(Number(selectedReport.gmv))}</p>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200 bg-gray-50 p-4 flex justify-end gap-3">
              <button 
                onClick={() => { setIsViewModalOpen(false); setSelectedReport(null); }} 
                className="px-6 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 font-medium"
              >
                Đóng (关闭)
              </button>
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleEditReport(selectedReport);
                }}
                className="px-6 py-2 bg-brand-navy text-white rounded font-bold hover:bg-brand-darkNavy"
              >
                Sửa (编辑)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {reportToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80]">
          <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Xác nhận xóa? (确认删除?)</h3>
            <p className="text-sm text-gray-500 mb-6">Bạn có chắc chắn muốn xóa báo cáo này không? Hành động này không thể hoàn tác. (您确定要删除此报告吗? 此操作无法撤销。)</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setReportToDelete(null)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-800">Hủy (取消)</button>
              <button onClick={() => handleDeleteReport(reportToDelete)} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Xóa (删除)</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 uppercase">Chi tiết Báo Cáo Live (直播报告详情)</h2>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-brand-navy hover:bg-brand-darkNavy text-white px-4 py-2 rounded shadow text-sm font-bold flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nhập Báo Cáo Mới (输入新报告)
        </button>
      </div>

      {/* Filter Bar */}
      <FilterBar
        onSearch={setSearchText}
        onExportExcel={() => {
          const exportData = filteredData.map(report => ({
            'Ngày': report.date,
            'Cửa hàng': stores.find(s => s.id === report.channelId)?.name || '',
            'Host': report.hostName,
            'Ca': report.shift || '',
            'Thời gian': `${report.startTime} - ${report.endTime}`,
            'Thời lượng': report.duration || '',
            'Người báo cáo': report.reporter || '',
            'Nhóm KH': report.customerGroup || '',
            'Nguồn tới': report.source || '',
            'NV sale': report.salesPerson || '',
            'Lần gọi': report.callCount || 0,
            'Trạng thái': report.status || '',
            'GMV': report.gmv,
            'Tổng GMV': report.totalGmv || 0,
            'Chi phí QC': report.adCost,
            'GPM': report.gpm || 0,
            'ROI': report.adCost > 0 ? formatROI(calculateROI(Number(report.gmv), Number(report.adCost))) : '0.00',
            'Đơn hàng': report.orders || 0,
            'Giá TB': report.averagePrice || 0,
            'Tỉ lệ chuyển đổi': report.conversionRate ? Number(report.conversionRate).toFixed(2) + '%' : '',
            'Click SP': report.productClicks || 0,
            'Tỉ lệ Click SP': report.productClickRate ? Number(report.productClickRate).toFixed(2) + '%' : '',
            'CTR': report.ctr ? Number(report.ctr).toFixed(2) + '%' : '',
            'Tổng lượt xem': report.totalViews || 0,
            'Người xem': report.viewers || 0,
            'TG xem TB': report.avgWatchTime || '',
            'FL mới': report.newFollowers || 0,
          }));
          exportToExcel(exportData, `live-reports-detail-${new Date().toISOString().split('T')[0]}.xlsx`);
        }}
        onImportExcel={async (file) => {
          try {
            const data = await importFromExcel(file);
            alert(`Đã import ${data.length} bản ghi từ Excel. Vui lòng kiểm tra dữ liệu.`);
          } catch (error) {
            alert('Lỗi khi import Excel (导入Excel时出错): ' + (error as Error).message);
          }
        }}
        onReset={() => {
          setSearchText('');
          setSelectedFilters({});
          const today = new Date();
          const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          setDateFrom(firstDayOfMonth.toISOString().split('T')[0]);
          setDateTo(today.toISOString().split('T')[0]);
        }}
        filterFields={[
          {
            key: 'stores',
            label: 'Cửa hàng (店铺)',
            type: 'checkbox',
            options: filteredStoresForUser.map(s => ({ value: s.id, label: s.name }))
          },
          {
            key: 'hosts',
            label: 'Host (主播)',
            type: 'checkbox',
            options: Array.from(new Set(reports.map(r => r.hostName).filter(Boolean))).map(host => ({ value: host, label: host }))
          },
          {
            key: 'shifts',
            label: 'Ca (班次)',
            type: 'checkbox',
            options: [
              { value: 'Sáng', label: 'Sáng (早班)' },
              { value: 'Chiều', label: 'Chiều (中班)' },
              { value: 'Tối', label: 'Tối (晚班)' }
            ]
          },
          {
            key: 'reporters',
            label: 'Người báo cáo (报告人)',
            type: 'checkbox',
            options: Array.from(new Set(reports.map(r => r.reporter).filter(Boolean))).map(reporter => ({ value: reporter!, label: reporter! }))
          },
          {
            key: 'customerGroups',
            label: 'Nhóm KH (客户群)',
            type: 'checkbox',
            options: Array.from(new Set(reports.map(r => r.customerGroup).filter(Boolean))).map(group => ({ value: group!, label: group! }))
          },
          {
            key: 'sources',
            label: 'Nguồn tới (来源)',
            type: 'checkbox',
            options: Array.from(new Set(reports.map(r => r.source).filter(Boolean))).map(source => ({ value: source!, label: source! }))
          },
          {
            key: 'salesPersons',
            label: 'NV sale (销售员)',
            type: 'checkbox',
            options: Array.from(new Set(reports.map(r => r.salesPerson).filter(Boolean))).map(sales => ({ value: sales!, label: sales! }))
          },
          {
            key: 'callCounts',
            label: 'Lần gọi (呼叫次数)',
            type: 'checkbox',
            options: Array.from(new Set(reports.map(r => r.callCount).filter(c => c !== undefined))).sort((a, b) => Number(a || 0) - Number(b || 0)).map(count => ({ value: count!.toString(), label: count!.toString() }))
          },
          {
            key: 'statuses',
            label: 'Trạng thái (状态)',
            type: 'checkbox',
            options: Array.from(new Set(reports.map(r => r.status).filter(Boolean))).map(status => ({ value: status!, label: status! }))
          }
        ]}
        selectedFilters={selectedFilters}
        onFilterChange={(field, values) => {
          setSelectedFilters(prev => ({ ...prev, [field]: values }));
        }}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onQuickDateSelect={(from, to) => {
          setDateFrom(from);
          setDateTo(to);
        }}
      />

      {/* Detailed Table */}
      <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800">Bảng Chi Tiết (详细表格) ({filteredData.length} bản ghi (条记录))</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-center">
            <thead className="text-xs text-white uppercase bg-brand-navy border-b">
              <tr>
                <th className="px-3 py-2 border-r whitespace-nowrap sticky left-0 bg-brand-navy z-10">Ngày (日期)</th>
                <th className="px-3 py-2 border-r whitespace-nowrap">Cửa hàng (店铺)</th>
                <th className="px-3 py-2 border-r whitespace-nowrap">Host (主播)</th>
                <th className="px-3 py-2 border-r whitespace-nowrap">Ca (班次)</th>
                <th className="px-3 py-2 border-r whitespace-nowrap">Thời gian (时间)</th>
                <th className="px-3 py-2 border-r whitespace-nowrap">Thời lượng (时长)</th>
                <th className="px-3 py-2 border-r whitespace-nowrap">Người báo cáo (报告人)</th>
                <th className="px-3 py-2 border-r whitespace-nowrap text-blue-200">GMV (交易额)</th>
                <th className="px-3 py-2 border-r whitespace-nowrap">Tổng GMV (总交易额)</th>
                <th className="px-3 py-2 border-r whitespace-nowrap text-red-200">CPQC (广告费)</th>
                <th className="px-3 py-2 border-r whitespace-nowrap">GPM (每千次展示费用)</th>
                <th className="px-3 py-2 border-r whitespace-nowrap">ROI (%) (投资回报率)</th>
                <th className="px-3 py-2 border-r whitespace-nowrap">Đơn hàng (订单数)</th>
                <th className="px-3 py-2 border-r whitespace-nowrap">Giá TB (平均价格)</th>
                <th className="px-3 py-2 border-r whitespace-nowrap">Tỉ lệ chuyển đổi (%) (转化率)</th>
                <th className="px-3 py-2 border-r whitespace-nowrap">Click SP (商品点击量)</th>
                <th className="px-3 py-2 border-r whitespace-nowrap">Tỉ lệ Click SP (%) (商品点击率)</th>
                <th className="px-3 py-2 border-r whitespace-nowrap">CTR (%) (点击率)</th>
                <th className="px-3 py-2 border-r whitespace-nowrap">Tổng lượt xem (总观看量)</th>
                <th className="px-3 py-2 border-r whitespace-nowrap">Người xem (观众)</th>
                <th className="px-3 py-2 border-r whitespace-nowrap">TG xem TB (平均观看时长)</th>
                <th className="px-3 py-2 border-r whitespace-nowrap">FL mới (新增粉丝)</th>
                <th className="px-3 py-2 border-r whitespace-nowrap">Đánh giá (评估)</th>
                <th className="px-3 py-2 whitespace-nowrap sticky right-0 bg-brand-navy z-10">Thao tác (操作)</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr><td colSpan={24} className="py-8 text-gray-400">Chưa có dữ liệu (暂无数据)</td></tr>
              ) : (
                filteredData.map((row) => {
                  const gmv = Number(row.gmv);
                  const ad = Number(row.adCost);
                  const profit = gmv - ad;
                  const roiVal = calculateROI(gmv, ad);
                  const storeName = stores.find(s => s.id === row.channelId)?.name || 'Unknown';
                  return (
                    <tr key={row.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 border-r font-medium sticky left-0 bg-white z-5">{row.date}</td>
                      <td className="px-3 py-2 border-r text-gray-600 text-xs">{storeName}</td>
                      <td className="px-3 py-2 border-r font-medium text-xs">{row.hostName}</td>
                      <td className="px-3 py-2 border-r text-xs">
                        {row.shift ? (
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            row.shift === 'Sáng' ? 'bg-yellow-100 text-yellow-800' :
                            row.shift === 'Chiều' ? 'bg-orange-100 text-orange-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {row.shift}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-2 border-r text-xs text-gray-500">
                        {row.startTime} - {row.endTime}
                      </td>
                      <td className="px-3 py-2 border-r text-xs text-gray-600">{row.duration || '-'}</td>
                      <td className="px-3 py-2 border-r text-xs text-gray-600">{row.reporter || '-'}</td>
                      <td className="px-3 py-2 border-r font-bold text-blue-600 text-xs">{formatCurrency(gmv)}</td>
                      <td className="px-3 py-2 border-r font-medium text-xs">{formatCurrency(Number(row.totalGmv) || 0)}</td>
                      <td className="px-3 py-2 border-r font-bold text-red-600 text-xs">{formatCurrency(ad)}</td>
                      <td className="px-3 py-2 border-r text-xs">{row.gpm ? formatCurrency(Number(row.gpm)) : '-'}</td>
                      <td className="px-3 py-2 border-r font-medium text-xs">{formatROI(roiVal)}</td>
                      <td className="px-3 py-2 border-r text-xs">{row.orders || '-'}</td>
                      <td className="px-3 py-2 border-r text-xs">{row.averagePrice ? formatCurrency(Number(row.averagePrice)) : '-'}</td>
                      <td className="px-3 py-2 border-r text-xs">{row.conversionRate ? Number(row.conversionRate).toFixed(2) + '%' : '-'}</td>
                      <td className="px-3 py-2 border-r text-xs">{row.productClicks || '-'}</td>
                      <td className="px-3 py-2 border-r text-xs">{row.productClickRate ? Number(row.productClickRate).toFixed(2) + '%' : '-'}</td>
                      <td className="px-3 py-2 border-r text-xs">{row.ctr ? Number(row.ctr).toFixed(2) + '%' : '-'}</td>
                      <td className="px-3 py-2 border-r text-xs">{row.totalViews ? Number(row.totalViews).toLocaleString() : '-'}</td>
                      <td className="px-3 py-2 border-r text-xs">{row.viewers ? Number(row.viewers).toLocaleString() : '-'}</td>
                      <td className="px-3 py-2 border-r text-xs">{row.avgWatchTime || '-'}</td>
                      <td className="px-3 py-2 border-r text-xs">{row.newFollowers ? Number(row.newFollowers).toLocaleString() : '-'}</td>
                      <td className="px-3 py-2 border-r">
                        <span className={`px-2 py-1 rounded text-xs font-bold border ${getStatusColor(roiVal)}`}>
                          {roiVal >= 4.0 ? 'TỐT (良好)' : roiVal >= 2.0 ? 'KHÁ (一般)' : 'CẦN TỐI ƯU (需优化)'}
                        </span>
                      </td>
                      <td className="px-3 py-2 sticky right-0 bg-white z-5">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => handleViewReport(row)}
                            className="text-green-600 hover:text-green-800 font-medium text-xs border border-green-200 rounded px-2 py-1 bg-green-50 hover:bg-green-100"
                            title="Xem chi tiết (查看详情)"
                          >
                            查看
                          </button>
                          <button
                            onClick={() => handleEditReport(row)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 rounded px-2 py-1 bg-blue-50 hover:bg-blue-100"
                            title="Sửa"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => row.id && setReportToDelete(row.id)}
                            className="text-red-600 hover:text-red-800 font-medium text-xs border border-red-200 rounded px-2 py-1 bg-red-50 hover:bg-red-100"
                            title="Xóa (删除)"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

