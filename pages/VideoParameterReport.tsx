import React, { useState, useMemo, useEffect, useRef } from 'react';
import { VIDEO_CONFIG_DATA, MOCK_VIDEO_METRICS, MOCK_STORES, fetchVideoMetrics } from '../services/dataService';
import { VideoMetric } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import * as XLSX from 'xlsx';

export const VideoParameterReport: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'config'>('metrics');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [videos, setVideos] = useState<VideoMetric[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchVideoMetrics();
      // Fallback to mock data if DB is empty (likely due to invalid connection/permissions in this demo)
      if (data.length === 0) {
        console.warn("Using Mock Data because DB returned empty");
        setVideos(MOCK_VIDEO_METRICS);
      } else {
        setVideos(data);
      }
    };
    loadData();
  }, []);

  const filteredVideos = useMemo(() => {
    return videos.filter(v => selectedStore === 'all' || v.storeId === selectedStore);
  }, [selectedStore, videos]);

  const handleDownloadExcel = () => {
    if (selectedStore === 'all') {
      alert('Vui lòng chọn cửa hàng trước khi tải xuống');
      return;
    }

    const store = MOCK_STORES.find(s => s.id === selectedStore);
    const storeVideos = filteredVideos;

    // Create workbook with new columns
    const excelData = storeVideos.map(video => ({
      '视频名称': video.title,
      '发布时间': video.uploadDate,
      '时长': '5:30',
      'GMV': video.sales,
      '直接 GMV': Math.floor(video.sales * 0.6),
      '观看人次': video.views,
      '成交件数': Math.floor(video.sales / 10000),
      '点击率': '2.5%',
      '完播率': '85%',
      '新增粉丝数': Math.floor(video.views / 50),
      '商品 ID': `PROD${video.id}`
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Video');
    
    // Auto-size columns
    ws['!cols'] = [
      { wch: 25 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 }
    ];

    XLSX.writeFile(wb, `video_report_${store?.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadTemplate = () => {
    const store = MOCK_STORES.find(s => s.id === selectedStore);
    
    // Create template data with correct column headers
    const templateData = [
      {
        '视频名称': 'Ví dụ: Video sale mùa hè',
        '发布时间': new Date().toISOString().split('T')[0],
        '时长': '5:30',
        'GMV': 500000,
        '直接 GMV': 300000,
        '观看人次': 5000,
        '成交件数': 50,
        '点击率': '2.5%',
        '完播率': '85%',
        '新增粉丝数': 150,
        '商品 ID': 'PROD001'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Video');
    
    // Auto-size columns
    ws['!cols'] = [
      { wch: 25 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 }
    ];

    XLSX.writeFile(wb, `template_video_${store?.name || 'phong-live'}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleUploadExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (selectedStore === 'all') {
      alert('Vui lòng chọn cửa hàng trước khi tải lên');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Map Excel columns to VideoMetric
        const newVideos = jsonData.map((row: any, index: number) => ({
          id: `temp-${Date.now()}-${index}`,
          storeId: selectedStore,
          title: row['视频名称'] || '',
          platform: 'TikTok',
          uploadDate: row['发布时间'] || new Date().toISOString().split('T')[0],
          personInCharge: 'Nhân viên',
          views: parseInt(row['观看人次'] || '0'),
          sales: parseInt(row['GMV'] || '0'),
          revenue: parseInt(row['GMV'] || '0'),
          owner: 'Nhân viên',
          date: row['发布时间'] || new Date().toISOString().split('T')[0]
        }));

        // Add new videos to existing list
        setVideos([...videos, ...newVideos]);
        alert(`Tải lên thành công! ${newVideos.length} video đã được thêm.`);
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Error reading Excel:', error);
        alert('Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // KPI Calculation
  const monthlyTarget = 100; // Mock target videos per month
  const currentCount = filteredVideos.length;
  const progressPercent = Math.min((currentCount / monthlyTarget) * 100, 100);

  // Week Total Views Calculation
  const totalViews = filteredVideos.reduce((sum, v) => sum + v.views, 0);
  const totalSales = filteredVideos.reduce((sum, v) => sum + v.sales, 0);
  
  // Chart data - Group by date
  const chartData = filteredVideos.reduce((acc: any[], video) => {
    const existing = acc.find(item => item.date === video.uploadDate);
    if (existing) {
      existing.views += video.views;
      existing.sales += video.sales;
      existing.videos += 1;
    } else {
      acc.push({
        date: video.uploadDate,
        views: video.views,
        sales: video.sales,
        videos: 1
      });
    }
    return acc;
  }, []).sort((a, b) => a.date.localeCompare(b.date));

  // Performance by person
  const performanceByPerson = filteredVideos.reduce((acc: any[], video) => {
    const existing = acc.find(item => item.name === video.personInCharge);
    if (existing) {
      existing.views += video.views;
      existing.sales += video.sales;
      existing.videos += 1;
    } else {
      acc.push({
        name: video.personInCharge,
        views: video.views,
        sales: video.sales,
        videos: 1
      });
    }
    return acc;
  }, []).sort((a, b) => b.views - a.views);

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 uppercase">Quản lý & Báo cáo Video</h2>
        <select
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-brand-red bg-white shadow-sm"
          value={selectedStore}
          onChange={(e) => setSelectedStore(e.target.value)}
        >
          {MOCK_STORES.map(store => (
            <option key={store.id} value={store.id}>{store.name}</option>
          ))}
        </select>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
          <h3 className="text-xs text-gray-500 mb-1">场观总数</h3>
          <p className="text-3xl font-bold text-blue-600">{new Intl.NumberFormat('vi-VN').format(totalViews)}</p>
          <p className="text-xs text-gray-400 mt-1">总场观</p>
        </div>

        <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
          <h3 className="text-xs text-gray-500 mb-1">新增粉丝数</h3>
          <p className="text-3xl font-bold text-pink-600">{new Intl.NumberFormat('vi-VN').format(Math.floor(totalViews / 50))}</p>
          <p className="text-xs text-gray-400 mt-1">粉丝增量</p>
        </div>

        <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
          <h3 className="text-xs text-gray-500 mb-1">成交量</h3>
          <p className="text-3xl font-bold text-blue-500">{new Intl.NumberFormat('vi-VN').format(Math.floor(totalSales / 10000))}</p>
          <p className="text-xs text-gray-400 mt-1">总成交</p>
        </div>

        <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
          <h3 className="text-xs text-gray-500 mb-1">GMV</h3>
          <p className="text-3xl font-bold text-orange-600">{new Intl.NumberFormat('vi-VN').format(totalSales)}</p>
          <p className="text-xs text-gray-400 mt-1">总销售额</p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">场观趋势 & 销售数据</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{fontSize: 12}} />
              <YAxis yAxisId="left" tick={{fontSize: 12}} />
              <YAxis yAxisId="right" orientation="right" tick={{fontSize: 12}} />
              <Tooltip />
              <Line yAxisId="left" type="monotone" dataKey="views" stroke="#3B82F6" strokeWidth={2} name="场观" />
              <Line yAxisId="right" type="monotone" dataKey="sales" stroke="#F59E0B" strokeWidth={2} name="GMV" />
              <Bar yAxisId="left" dataKey="videos" fill="#EC4899" name="视频数" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">主播排行</h3>
          </div>
          <div className="space-y-3">
            {performanceByPerson.slice(0, 10).map((person, index) => {
              const maxViews = performanceByPerson[0]?.views || 1;
              const percentage = (person.views / maxViews) * 100;
              return (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-gray-700">{index + 1}. {person.name}</span>
                    <span className="text-blue-600 font-semibold">{new Intl.NumberFormat('vi-VN').format(person.views)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{person.videos} videos</span>
                    <span>GMV: {new Intl.NumberFormat('vi-VN').format(person.sales)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Excel Upload Section */}
      <div className="bg-white p-6 rounded shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Excel 数据管理</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={handleDownloadTemplate}
            disabled={selectedStore === 'all'}
            className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition shadow disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            📥 下载Excel模板
          </button>
          
          <div className="relative">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleUploadExcel}
              ref={fileInputRef}
              disabled={selectedStore === 'all'}
              className="hidden"
              id="excel-upload"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={selectedStore === 'all'}
              className="w-full bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 transition shadow disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              📤 上传Excel数据
            </button>
          </div>

          <button 
            onClick={handleDownloadExcel}
            disabled={selectedStore === 'all'}
            className="bg-gray-900 text-white px-6 py-3 rounded hover:bg-gray-800 transition shadow disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            ⬇️ 导出当前数据
          </button>
        </div>
        
        <p className="text-xs text-gray-500 text-center mt-3">
          {selectedStore === 'all' ? '请先选择门店' : `当前门店: ${MOCK_STORES.find(s => s.id === selectedStore)?.name}`}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'metrics' ? 'border-brand-red text-brand-red' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Danh sách Video & Đánh giá
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'config' ? 'border-brand-red text-brand-red' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Cấu hình thông số
          </button>
        </nav>
      </div>

      {activeTab === 'metrics' && (
        <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3">视频名称</th>
                  <th className="px-4 py-3">发布时间</th>
                  <th className="px-4 py-3">时长</th>
                  <th className="px-4 py-3 text-right">GMV</th>
                  <th className="px-4 py-3 text-right">直接 GMV</th>
                  <th className="px-4 py-3 text-right">观看人次</th>
                  <th className="px-4 py-3 text-right">成交件数</th>
                  <th className="px-4 py-3 text-right">点击率</th>
                  <th className="px-4 py-3 text-right">完播率</th>
                  <th className="px-4 py-3 text-right">新增粉丝数</th>
                  <th className="px-4 py-3">商品 ID</th>
                </tr>
              </thead>
              <tbody>
                {filteredVideos.map((video) => {
                  // Evaluation Logic: > 10k views is Green
                  const isGoodPerformance = video.views > 10000;
                  return (
                    <tr key={video.id} className={`border-b hover:bg-gray-50 ${isGoodPerformance ? 'bg-green-50' : ''}`}>
                      <td className="px-4 py-4 font-medium text-gray-900">{video.title}</td>
                      <td className="px-4 py-4 text-gray-600">{video.uploadDate}</td>
                      <td className="px-4 py-4 text-gray-600">5:30</td>
                      <td className="px-4 py-4 text-right font-bold text-green-600">{new Intl.NumberFormat('vi-VN').format(video.sales)}</td>
                      <td className="px-4 py-4 text-right text-gray-600">{new Intl.NumberFormat('vi-VN').format(Math.floor(video.sales * 0.6))}</td>
                      <td className="px-4 py-4 text-right font-semibold">{new Intl.NumberFormat('vi-VN').format(video.views)}</td>
                      <td className="px-4 py-4 text-right">{Math.floor(video.sales / 10000)}</td>
                      <td className="px-4 py-4 text-right">2.5%</td>
                      <td className="px-4 py-4 text-right">85%</td>
                      <td className="px-4 py-4 text-right">{Math.floor(video.views / 50)}</td>
                      <td className="px-4 py-4 text-gray-600">PROD{video.id}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="bg-white rounded shadow-sm border border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-bold text-gray-800">Cấu hình đẩy excel báo cáo video</h3>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
                <tr>
                  <th scope="col" className="px-6 py-3 border-r">Hạng mục</th>
                  <th scope="col" className="px-6 py-3 border-r">Định dạng</th>
                  <th scope="col" className="px-6 py-3">Công thức</th>
                </tr>
              </thead>
              <tbody>
                {VIDEO_CONFIG_DATA.map((item, index) => (
                  <tr key={item.id} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4 font-medium text-gray-900 border-r">{item.category}</td>
                    <td className="px-6 py-4 text-gray-500 border-r italic">{item.format || '-'}</td>
                    <td className="px-6 py-4">
                      {item.sourceType === 'manual' && <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded border border-yellow-300">Nhập tay</span>}
                      {item.sourceType === 'excel' && <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded border border-blue-300">Lấy từ excel</span>}
                      {item.sourceType === 'formula' && <span className="text-gray-600 block text-xs font-mono bg-gray-100 p-1 rounded">{item.formula}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};