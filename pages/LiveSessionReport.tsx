import React, { useState, useMemo, useEffect } from 'react';
import { MOCK_STORES, fetchLiveReports, createLiveReport, fetchPersonnel } from '../services/dataService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Line } from 'recharts';
import { LiveReportModal } from '../components/LiveReportModal';
import { LiveReport, Personnel } from '../types';

export const LiveSessionReport: React.FC = () => {
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [reports, setReports] = useState<LiveReport[]>([]);
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Date range filter for personnel summary
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [dateFrom, setDateFrom] = useState<string>(firstDayOfMonth.toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState<string>(today.toISOString().split('T')[0]);

  // Fetch data on mount
  const loadData = async () => {
    setIsLoading(true);
    const [reportData, personnelData] = await Promise.all([
      fetchLiveReports(),
      fetchPersonnel()
    ]);
    setReports(reportData);
    setPersonnelList(personnelData);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateReport = async (newReport: Omit<LiveReport, 'id'>) => {
    await createLiveReport(newReport);
    await loadData(); // Reload data after creation
  };

  // Filter Data
  const filteredData = useMemo(() => {
    return reports.filter(item => {
      const matchStore = selectedStore === 'all' || item.channelId === selectedStore;
      const matchDate = dateFilter ? item.date === dateFilter : true;
      return matchStore && matchDate;
    });
  }, [reports, selectedStore, dateFilter]);

  // Calculations for KPI Cards
  const metrics = useMemo(() => {
    let totalGMV = 0;
    let totalAdCost = 0;

    filteredData.forEach(item => {
      totalGMV += Number(item.gmv);
      totalAdCost += Number(item.adCost);
    });

    const roi = totalAdCost > 0 ? ((totalGMV - totalAdCost) / totalAdCost) * 100 : 0;

    return { totalGMV, totalAdCost, roi };
  }, [filteredData]);

  // Chart Data Aggregation (by Date)
  const chartData = useMemo(() => {
    const map: Record<string, any> = {};
    filteredData.forEach(item => {
      if (!map[item.date]) {
        map[item.date] = { date: item.date, gmv: 0, adCost: 0, profit: 0 };
      }
      map[item.date].gmv += Number(item.gmv);
      map[item.date].adCost += Number(item.adCost);
      map[item.date].profit += (Number(item.gmv) - Number(item.adCost));
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);
  const formatPercent = (val: number) => `${val.toFixed(2)}%`;

  const getStatusColor = (roi: number) => {
    if (roi >= 400) return 'bg-green-100 text-green-800 border-green-200';
    if (roi >= 200) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-brand-red border-red-200';
  };

  // Personnel Summary by Date Range
  const personnelSummary = useMemo(() => {
    const summaryMap: Record<string, {
      person: Personnel;
      totalGMV: number;
      totalAdCost: number;
      reportCount: number;
      avgROI: number;
    }> = {};

    // Filter reports by date range
    const dateRangeReports = reports.filter(report => {
      const reportDate = new Date(report.date);
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // Include full end date
      return reportDate >= fromDate && reportDate <= toDate;
    });

    // Group by personnel (reporter)
    dateRangeReports.forEach(report => {
      if (!report.reporter) return;

      // Find matching personnel
      const matchingPerson = personnelList.find(person => {
        const reporterName = report.reporter!.toLowerCase();
        const personName = person.fullName.toLowerCase();
        const personEmail = person.email?.toLowerCase() || '';
        return reporterName.includes(personName) || 
               personName.includes(reporterName) ||
               reporterName === personEmail;
      });

      if (matchingPerson) {
        const personId = matchingPerson.id || matchingPerson.fullName;
        if (!summaryMap[personId]) {
          summaryMap[personId] = {
            person: matchingPerson,
            totalGMV: 0,
            totalAdCost: 0,
            reportCount: 0,
            avgROI: 0
          };
        }

        const gmv = Number(report.gmv) || 0;
        const adCost = Number(report.adCost) || 0;

        summaryMap[personId].totalGMV += gmv;
        summaryMap[personId].totalAdCost += adCost;
        summaryMap[personId].reportCount += 1;
      }
    });

    // Calculate average ROI for each person
    return Object.values(summaryMap).map(item => ({
      ...item,
      avgROI: item.totalAdCost > 0 ? ((item.totalGMV - item.totalAdCost) / item.totalAdCost) * 100 : 0
    })).sort((a, b) => b.totalGMV - a.totalGMV);
  }, [reports, personnelList, dateFrom, dateTo]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans space-y-6">
      <LiveReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateReport}
      />

      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 uppercase">Quản lý Live</h2>
        <div className="flex gap-2 flex-wrap items-center">
          <select
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-brand-red bg-white shadow-sm"
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
          >
            {MOCK_STORES.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
          <input
            type="date"
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-brand-red bg-white shadow-sm"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-brand-red hover:bg-red-700 text-white px-4 py-2 rounded shadow text-sm font-bold flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nhập Báo Cáo
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Đang tải dữ liệu...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded shadow-sm border-l-4 border-blue-500">
              <p className="text-xs text-gray-500 uppercase font-bold">Tổng GMV</p>
              <p className="text-xl font-bold text-gray-800 mt-1">{formatCurrency(metrics.totalGMV)}</p>
            </div>
            <div className="bg-white p-4 rounded shadow-sm border-l-4 border-brand-red">
              <p className="text-xs text-gray-500 uppercase font-bold">Tổng Chi Phí QC</p>
              <p className="text-xl font-bold text-brand-red mt-1">{formatCurrency(metrics.totalAdCost)}</p>
            </div>
            <div className="bg-white p-4 rounded shadow-sm border-l-4 border-green-500">
              <p className="text-xs text-gray-500 uppercase font-bold">ROI Tổng</p>
              <p className="text-xl font-bold text-green-600 mt-1">{formatPercent(metrics.roi)}</p>
            </div>
          </div>

          {/* Charts */}
          <div className="bg-white p-4 rounded shadow-sm border border-gray-200 h-80">
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-4">Biểu đồ Hiệu Quả (Doanh thu vs Chi phí)</h3>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(t) => t.split('-').slice(1).join('/')} />
                <YAxis yAxisId="left" />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Bar yAxisId="left" dataKey="gmv" name="Doanh số (GMV)" fill="#3b82f6" barSize={30} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="adCost" name="Chi phí QC" fill="#ef4444" barSize={30} radius={[4, 4, 0, 0]} />
                <Line yAxisId="left" type="monotone" dataKey="profit" name="Lợi nhuận tạm tính" stroke="#10b981" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Personnel Summary Table */}
          <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="text-lg font-bold text-gray-800">Báo Cáo Tổng Kết Nhân Viên</h3>
              <div className="flex gap-2 items-center flex-wrap">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Từ ngày:</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-brand-red bg-white shadow-sm"
                />
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Đến ngày:</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-brand-red bg-white shadow-sm"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 border-r text-left">Nhân viên</th>
                    <th className="px-6 py-3 border-r text-left">Phòng ban</th>
                    <th className="px-6 py-3 border-r text-right">Tổng GMV</th>
                    <th className="px-6 py-3 border-r text-right">Tổng Chi phí QC</th>
                    <th className="px-6 py-3 border-r text-right">ROI TB</th>
                    <th className="px-6 py-3 border-r text-center">Số báo cáo</th>
                    <th className="px-6 py-3 text-right">Lợi nhuận</th>
                  </tr>
                </thead>
                <tbody>
                  {personnelSummary.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">
                        Chưa có dữ liệu trong khoảng thời gian này
                      </td>
                    </tr>
                  ) : (
                    personnelSummary.map((item) => {
                      const profit = item.totalGMV - item.totalAdCost;
                      return (
                        <tr key={item.person.id || item.person.fullName} className="border-b hover:bg-gray-50">
                          <td className="px-6 py-4 border-r font-bold text-gray-800">
                            {item.person.fullName}
                            {item.person.role === 'admin' && (
                              <span className="ml-2 bg-purple-100 text-purple-800 text-xs px-1.5 rounded border border-purple-200">Admin</span>
                            )}
                          </td>
                          <td className="px-6 py-4 border-r">
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${
                              item.person.department === 'Live' ? 'bg-red-50 text-red-700 border-red-200' :
                              item.person.department === 'Media' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-gray-50 text-gray-600 border-gray-200'
                            }`}>
                              {item.person.department || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 border-r text-right font-bold text-blue-600">
                            {formatCurrency(item.totalGMV)}
                          </td>
                          <td className="px-6 py-4 border-r text-right font-bold text-red-600">
                            {formatCurrency(item.totalAdCost)}
                          </td>
                          <td className="px-6 py-4 border-r text-right">
                            <span className={`px-2 py-1 rounded text-xs font-bold border ${getStatusColor(item.avgROI)}`}>
                              {formatPercent(item.avgROI)}
                            </span>
                          </td>
                          <td className="px-6 py-4 border-r text-center font-medium text-gray-600">
                            {item.reportCount}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-green-600">
                            {formatCurrency(profit)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Chi tiết Báo Cáo Live</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-center">
                <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 border-r whitespace-nowrap">Ngày</th>
                    <th className="px-4 py-3 border-r whitespace-nowrap">Kênh Live</th>
                    <th className="px-4 py-3 border-r whitespace-nowrap">Host</th>
                    <th className="px-4 py-3 border-r whitespace-nowrap">Thời gian</th>
                    <th className="px-4 py-3 border-r text-blue-700 whitespace-nowrap">GMV</th>
                    <th className="px-4 py-3 border-r text-red-700 whitespace-nowrap">CPQC</th>
                    <th className="px-4 py-3 border-r whitespace-nowrap">ROI (%)</th>
                    <th className="px-4 py-3 whitespace-nowrap">Đánh giá</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length === 0 ? (
                    <tr><td colSpan={8} className="py-8 text-gray-400">Chưa có dữ liệu</td></tr>
                  ) : (
                    filteredData.map((row) => {
                      const gmv = Number(row.gmv);
                      const ad = Number(row.adCost);
                      const profit = gmv - ad;
                      const roiVal = ad > 0 ? (profit / ad) * 100 : 0;
                      return (
                        <tr key={row.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 border-r font-medium">{row.date}</td>
                          <td className="px-4 py-3 border-r text-gray-600">{MOCK_STORES.find(s => s.id === row.channelId)?.name || 'Unknown'}</td>
                          <td className="px-4 py-3 border-r font-medium">{row.hostName}</td>
                          <td className="px-4 py-3 border-r text-xs text-gray-500">
                            {row.startTime} - {row.endTime}<br />
                            ({row.duration})
                          </td>
                          <td className="px-4 py-3 border-r font-bold text-blue-600">{formatCurrency(gmv)}</td>
                          <td className="px-4 py-3 border-r font-bold text-red-600">{formatCurrency(ad)}</td>
                          <td className="px-4 py-3 border-r font-medium">{roiVal.toFixed(1)}%</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-bold border ${getStatusColor(roiVal)}`}>
                              {roiVal >= 400 ? 'TỐT' : roiVal >= 200 ? 'KHÁ' : 'CẦN TỐI ƯU'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};