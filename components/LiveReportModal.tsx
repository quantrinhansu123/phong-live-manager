import React, { useState, useEffect } from 'react';
import { MOCK_STORES } from '../services/dataService';
import { LiveReport } from '../types';

interface LiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<LiveReport, 'id'>) => Promise<void>;
}

export const LiveReportModal: React.FC<LiveReportModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<Omit<LiveReport, 'id'>>({
    date: new Date().toISOString().split('T')[0],
    channelId: MOCK_STORES[1]?.id || '', // Default to first store
    startTime: '08:00',
    endTime: '12:00',
    hostName: '',
    duration: '',
    gmv: 0,
    totalGmv: 0,
    adCost: 0,
    // Initialize new fields
    conversionRate: 0,
    averagePrice: 0,
    productClickRate: 0,
    ctr: 0,
    gpm: 0,
    orders: 0,
    viewers: 0,
    totalViews: 0,
    avgWatchTime: '',
    productClicks: 0,
    newFollowers: 0,
    reporter: localStorage.getItem('currentUser') || ''
  });

  const [loading, setLoading] = useState(false);

  // Auto calculate duration when times change
  useEffect(() => {
    if (isOpen) {
      // Update reporter in case user changed
      setFormData(prev => ({ ...prev, reporter: localStorage.getItem('currentUser') || '' }));
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.startTime && formData.endTime) {
      const start = new Date(`2000-01-01T${formData.startTime}`);
      const end = new Date(`2000-01-01T${formData.endTime}`);
      let diff = (end.getTime() - start.getTime()) / 1000 / 60; // minutes
      if (diff < 0) diff += 24 * 60; // handle overnight

      const hours = Math.floor(diff / 60);
      const minutes = diff % 60;
      setFormData(prev => ({ ...prev, duration: `${hours}h ${minutes}m` }));
    }
  }, [formData.startTime, formData.endTime]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? 0 : Number(value)) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
      // Reset form but keep date/store for convenience
      setFormData(prev => ({
        ...prev,
        gmv: 0,
        totalGmv: 0,
        adCost: 0,
        conversionRate: 0,
        orders: 0,
        viewers: 0,
        totalViews: 0,
        reporter: localStorage.getItem('currentUser') || ''
      }));
    } catch (err) {
      alert("Lỗi khi lưu báo cáo");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl m-4 p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <h2 className="text-xl font-bold text-gray-800 mb-6 uppercase border-b pb-2">Nhập Báo Cáo Live (输入直播报告)</h2>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Section 1: Thông tin cơ bản */}
          <div className="bg-gray-50 p-4 rounded border border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 uppercase mb-3 border-b border-gray-300 pb-1">1. Thông tin chung (基本信息)</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Ngày (开始日期)</label>
                <input required type="date" name="date" value={formData.date} onChange={handleChange} className="w-full border rounded px-3 py-2 focus:ring-brand-red focus:border-brand-red" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Kênh Live (KÊNH LIVE)</label>
                <select name="channelId" value={formData.channelId} onChange={handleChange} className="w-full border rounded px-3 py-2 bg-white">
                  {MOCK_STORES.filter(s => s.id !== 'all').map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Bắt đầu (时间)</label>
                <input required type="time" name="startTime" value={formData.startTime} onChange={handleChange} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Kết thúc (时间)</label>
                <input required type="time" name="endTime" value={formData.endTime} onChange={handleChange} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Host (主播)</label>
                <input required type="text" name="hostName" value={formData.hostName} onChange={handleChange} placeholder="Tên Host (主播名称)" className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Thời lượng (直播时长)</label>
                <input readOnly type="text" name="duration" value={formData.duration} className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Người báo cáo (NGƯỜI BÁO CÁO)</label>
                <input required type="text" name="reporter" value={formData.reporter || ''} onChange={handleChange} placeholder="Tên người nhập (输入人姓名)" className="w-full border rounded px-3 py-2 focus:border-brand-red" />
              </div>
            </div>
          </div>

          {/* Section 2: Tài chính */}
          <div className="bg-red-50 p-4 rounded border border-red-200">
            <h3 className="text-sm font-bold text-red-800 uppercase mb-3 border-b border-red-300 pb-1">2. Tài chính & Hiệu quả (财务与效果)</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">GMV (交易额)</label>
                <input required type="number" name="gmv" value={formData.gmv} onChange={handleChange} min="0" className="w-full border rounded px-3 py-2 font-bold text-blue-600" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tổng GMV (总交易额)</label>
                <input required type="number" name="totalGmv" value={formData.totalGmv} onChange={handleChange} min="0" className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Chi phí QC (推广费)</label>
                <input required type="number" name="adCost" value={formData.adCost} onChange={handleChange} min="0" className="w-full border rounded px-3 py-2 font-bold text-red-600" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">GPM (直播千次金额)</label>
                <input type="number" name="gpm" value={formData.gpm} onChange={handleChange} className="w-full border rounded px-3 py-2" />
              </div>
            </div>
          </div>

          {/* Section 3: Chỉ số chi tiết */}
          <div className="bg-blue-50 p-4 rounded border border-blue-200">
            <h3 className="text-sm font-bold text-blue-800 uppercase mb-3 border-b border-blue-300 pb-1">3. Chỉ số chi tiết (详细指标)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Số lượt bán (订单数)</label>
                <input type="number" name="orders" value={formData.orders} onChange={handleChange} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Giá TB (平均价格)</label>
                <input type="number" name="averagePrice" value={formData.averagePrice} onChange={handleChange} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tỉ lệ chuyển đổi (转化率 %)</label>
                <input type="number" name="conversionRate" value={formData.conversionRate} onChange={handleChange} step="0.01" className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Click SP (产品点击次数)</label>
                <input type="number" name="productClicks" value={formData.productClicks} onChange={handleChange} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tỉ lệ Click SP (点击率 %)</label>
                <input type="number" name="productClickRate" value={formData.productClickRate} onChange={handleChange} step="0.01" className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">CTR vào phòng (进房率 %)</label>
                <input type="number" name="ctr" value={formData.ctr} onChange={handleChange} step="0.01" className="w-full border rounded px-3 py-2" />
              </div>
            </div>
          </div>

          {/* Section 4: Lượng xem & Follow */}
          <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
            <h3 className="text-sm font-bold text-yellow-800 uppercase mb-3 border-b border-yellow-300 pb-1">4. Người xem & Tương tác (观看与互动)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tổng lượt xem (直播观看次数)</label>
                <input type="number" name="totalViews" value={formData.totalViews} onChange={handleChange} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Người xem (场观人数)</label>
                <input type="number" name="viewers" value={formData.viewers} onChange={handleChange} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">TG xem TB (平均观看时长)</label>
                <input type="text" name="avgWatchTime" value={formData.avgWatchTime} onChange={handleChange} placeholder="VD: 1:30" className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">FL mới (关注人数)</label>
                <input type="number" name="newFollowers" value={formData.newFollowers} onChange={handleChange} className="w-full border rounded px-3 py-2" />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2 border rounded text-gray-600 hover:bg-gray-50">Hủy (取消)</button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2 bg-brand-red text-white rounded font-bold hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Đang lưu... (保存中...)' : 'Lưu Báo Cáo (保存报告)'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};