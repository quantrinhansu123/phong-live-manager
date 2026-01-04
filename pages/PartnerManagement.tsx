import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchPartners, createPartner, updatePartner, deletePartner, fetchStores, createStore, updateStore } from '../services/dataService';
import { FilterBar } from '../components/FilterBar';
import { exportToExcel, importFromExcel } from '../utils/excelUtils';
import { Partner, Store } from '../types';
import { getCurrentUserRole, getCurrentUserId, isAdmin } from '../utils/permissionUtils';

export const PartnerManagement: React.FC = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [partnerToDelete, setPartnerToDelete] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
  const [viewingPartner, setViewingPartner] = useState<Partner | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [partnerData, storeData] = await Promise.all([
        fetchPartners(),
        fetchStores()
      ]);
      setPartners(partnerData);
      setStores(storeData.filter(s => s.id !== 'all'));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPartners = async () => {
    const data = await fetchPartners();
    setPartners(data);
  };

  // Tự động tạo mã đối tác
  const generatePartnerCode = (name: string): string => {
    const now = Date.now();
    const namePrefix = name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 3);
    return `${namePrefix}${now.toString().slice(-6)}`;
  };

  // Tự động tạo mật khẩu
  const generatePassword = (): string => {
    const length = 8;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const handleCreatePartner = async (partner: Omit<Partner, 'id' | 'code'> & { password?: string }) => {
    if (!partner.email || !partner.email.trim()) {
      alert('Vui lòng nhập email (dùng làm tài khoản)');
      return;
    }
    
    const code = generatePartnerCode(partner.name);
    // Nếu có mật khẩu nhập vào thì dùng, không thì tự động tạo
    const password = partner.password && partner.password.trim() ? partner.password.trim() : generatePassword();
    const newPartner = await createPartner({ ...partner, code, password });
    const partnerId = newPartner.name || `local_partner_${Date.now()}`;
    
    // Cập nhật partnerId cho các cửa hàng được liên kết
    if (partner.storeIds && partner.storeIds.length > 0) {
      for (const storeId of partner.storeIds) {
        await updateStore(storeId, { partnerId });
      }
    }
    
    await loadData();
    setIsModalOpen(false);
    alert(`Đã thêm đối tác thành công!\n\nTài khoản: ${partner.email}\nMật khẩu: ${password}\n\nVui lòng lưu lại thông tin này!`);
  };

  const handleUpdatePartner = async (id: string, partner: Partial<Omit<Partner, 'id' | 'code'>>) => {
    try {
      if (!id) {
        throw new Error('ID đối tác không hợp lệ (无效的合作伙伴ID)');
      }

      // Lấy thông tin đối tác hiện tại để so sánh
      const currentPartner = partners.find(p => p.id === id);
      if (!currentPartner) {
        throw new Error('Không tìm thấy đối tác để cập nhật (找不到要更新的合作伙伴)');
      }

      const oldStoreIds = currentPartner?.storeIds || [];
      const newStoreIds = partner.storeIds || [];
      
      await updatePartner(id, partner);
      
      // Xóa partnerId từ các cửa hàng không còn được liên kết
      const removedStoreIds = oldStoreIds.filter(sid => !newStoreIds.includes(sid));
      for (const storeId of removedStoreIds) {
        try {
          await updateStore(storeId, { partnerId: undefined });
        } catch (error) {
          console.error(`Error removing partnerId from store ${storeId}:`, error);
        }
      }
      
      // Thêm partnerId cho các cửa hàng mới được liên kết
      const addedStoreIds = newStoreIds.filter(sid => !oldStoreIds.includes(sid));
      for (const storeId of addedStoreIds) {
        try {
          await updateStore(storeId, { partnerId: id });
        } catch (error) {
          console.error(`Error adding partnerId to store ${storeId}:`, error);
        }
      }
      
      await loadData();
      setEditingPartner(null);
      alert('Đã cập nhật đối tác thành công! (已成功更新合作伙伴!)');
    } catch (error) {
      console.error('Error updating partner:', error);
      const errorMessage = error instanceof Error ? error.message : 'Lỗi khi cập nhật đối tác';
      alert(`${errorMessage} (更新合作伙伴时出错)`);
      throw error; // Re-throw để handleSubmit có thể bắt được
    }
  };

  const handleDeletePartner = async (id: string) => {
    // Xóa partnerId từ các cửa hàng được liên kết
    const partnerToDelete = partners.find(p => p.id === id);
    if (partnerToDelete?.storeIds && partnerToDelete.storeIds.length > 0) {
      for (const storeId of partnerToDelete.storeIds) {
        await updateStore(storeId, { partnerId: undefined });
      }
    }
    
    await deletePartner(id);
    await loadPartners();
    setPartnerToDelete(null);
    alert('Đã xóa đối tác thành công!');
  };

  // Filter data
  const filteredPartners = partners.filter(partner => {
    // For partners, only show themselves
    const currentUserRole = getCurrentUserRole();
    const currentUserId = getCurrentUserId();
    if (currentUserRole === 'partner' && !isAdmin() && currentUserId) {
      if (partner.id !== currentUserId) {
        return false;
      }
    }
    
    // Search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      const matchSearch = 
        partner.name.toLowerCase().includes(searchLower) ||
        partner.code?.toLowerCase().includes(searchLower) ||
        partner.contactPerson.toLowerCase().includes(searchLower) ||
        partner.phoneNumber.includes(searchLower) ||
        partner.email?.toLowerCase().includes(searchLower) ||
        partner.taxCode?.includes(searchLower);
      if (!matchSearch) return false;
    }

    // Type filter
    if (selectedFilters.types && selectedFilters.types.length > 0) {
      if (!selectedFilters.types.includes(partner.type)) return false;
    }

    // Status filter
    if (selectedFilters.statuses && selectedFilters.statuses.length > 0) {
      if (!selectedFilters.statuses.includes(partner.status)) return false;
    }

    return true;
  });

  const partnerTypes = ['Supplier', 'Service', 'Platform', '代运营', '合伙', 'Other'];
  const statuses = ['Active', 'Inactive'];

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 uppercase">Quản Lý Đối Tác (合作伙伴管理)</h2>
        {isAdmin() && (
          <button
            onClick={() => {
              setEditingPartner(null);
              setIsModalOpen(true);
            }}
            className="bg-brand-navy hover:bg-brand-darkNavy text-white px-4 py-2 rounded shadow text-sm font-bold flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Thêm Đối Tác Mới (添加新合作伙伴)
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <FilterBar
        onSearch={setSearchText}
        onExportExcel={() => {
          const exportData = filteredPartners.map(partner => ({
            'Tên đối tác': partner.name,
            'Mã đối tác': partner.code || '',
            'Loại': partner.type,
            'Người liên hệ': partner.contactPerson,
            'Số điện thoại': partner.phoneNumber,
            'Email': partner.email || '',
            'Mật khẩu': partner.password || '',
            'Địa chỉ': partner.address || '',
            'Mã số thuế': partner.taxCode || '',
            'Số tài khoản': partner.bankAccount || '',
            'Tên ngân hàng': partner.bankName || '',
            'Trạng thái': partner.status,
            'Ghi chú': partner.notes || '',
          }));
          exportToExcel(exportData, `partners-${new Date().toISOString().split('T')[0]}.xlsx`);
        }}
        onImportExcel={async (file) => {
          try {
            const data = await importFromExcel(file);
            alert(`Đã import ${data.length} đối tác từ Excel. Vui lòng kiểm tra dữ liệu.`);
            // TODO: Implement import logic
          } catch (error) {
            alert('Lỗi khi import Excel: ' + (error as Error).message);
          }
        }}
        onReset={() => {
          setSearchText('');
          setSelectedFilters({});
        }}
        filterFields={[
          {
            key: 'types',
            label: 'Loại đối tác (合作伙伴类型)',
            type: 'checkbox',
            options: partnerTypes.map(type => ({ value: type, label: type }))
          },
          {
            key: 'statuses',
            label: 'Trạng thái (状态)',
            type: 'checkbox',
            options: statuses.map(status => ({ value: status, label: status }))
          }
        ]}
        selectedFilters={selectedFilters}
        onFilterChange={(field, values) => {
          setSelectedFilters(prev => ({ ...prev, [field]: values }));
        }}
        dateFrom=""
        dateTo=""
        onDateFromChange={() => {}}
        onDateToChange={() => {}}
        onQuickDateSelect={() => {}}
      />

      {/* Partner Modal */}
      {isModalOpen && (
        <PartnerModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingPartner(null);
          }}
          onSubmit={editingPartner && editingPartner.id
            ? (data) => handleUpdatePartner(editingPartner.id, data)
            : handleCreatePartner
          }
          initialData={editingPartner || undefined}
          stores={stores}
          onStoresChange={loadData}
        />
      )}

      {/* View Partner Modal */}
      {viewingPartner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] overflow-y-auto p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl m-4 p-6 relative">
            <button 
              onClick={() => setViewingPartner(null)} 
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-2xl font-bold text-gray-800 mb-6 uppercase border-b pb-2">
              Chi Tiết Đối Tác (合作伙伴详情)
            </h2>

            <div className="space-y-6">
              {/* Thông tin cơ bản */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Tên đối tác (合作伙伴名称)</p>
                  <p className="text-lg font-bold text-gray-800">{viewingPartner.name}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Mã đối tác (合作伙伴代码)</p>
                  <p className="text-lg font-bold text-gray-800">{viewingPartner.code || 'Chưa có mã (暂无代码)'}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Loại đối tác (合作伙伴类型)</p>
                  <p className="text-lg font-bold text-gray-800">
                    {viewingPartner.type === '代运营' ? '代运营 (Dịch vụ vận hành thay)' :
                     viewingPartner.type === '合伙' ? '合伙 (Đối tác/Partnership)' :
                     viewingPartner.type}
                  </p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Trạng thái (状态)</p>
                  <span className={`px-3 py-1 rounded text-sm font-bold ${
                    viewingPartner.status === 'Active' 
                      ? 'bg-green-100 text-green-800 border border-green-300' 
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}>
                    {viewingPartner.status === 'Active' ? 'Hoạt động (活跃)' : 'Ngừng hoạt động (暂停)'}
                  </span>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Người liên hệ (联系人)</p>
                  <p className="text-lg font-bold text-gray-800">{viewingPartner.contactPerson}</p>
                </div>
                <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Số điện thoại (电话)</p>
                  <p className="text-lg font-bold text-gray-800">{viewingPartner.phoneNumber}</p>
                </div>
                {viewingPartner.email && (
                  <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Email (邮箱)</p>
                    <p className="text-lg font-bold text-gray-800">{viewingPartner.email}</p>
                  </div>
                )}
                {viewingPartner.password && (
                  <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Mật khẩu (密码)</p>
                    <p className="text-lg font-bold text-gray-800 font-mono">{viewingPartner.password}</p>
                  </div>
                )}
                {viewingPartner.address && (
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Địa chỉ (地址)</p>
                    <p className="text-lg font-bold text-gray-800">{viewingPartner.address}</p>
                  </div>
                )}
              </div>

              {/* Danh sách cửa hàng */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Danh Sách Cửa Hàng Liên Kết (关联店铺列表)</h3>
                {viewingPartner.storeIds && viewingPartner.storeIds.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {viewingPartner.storeIds.map(storeId => {
                      const store = stores.find(s => s.id === storeId);
                      return store ? (
                        <div key={storeId} className="bg-white p-3 rounded border border-blue-200 flex items-center justify-between">
                          <span className="font-medium text-gray-800">{store.name}</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs border border-blue-300">
                            Liên kết (关联)
                          </span>
                        </div>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Chưa có cửa hàng nào được liên kết (暂无关联店铺)</p>
                )}
              </div>

              {/* Ghi chú */}
              {viewingPartner.notes && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Ghi chú (备注)</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{viewingPartner.notes}</p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t flex justify-between items-center">
              <Link
                to="/stores"
                onClick={() => setViewingPartner(null)}
                className="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Quản lý cửa hàng (店铺管理)
              </Link>
              <div className="flex gap-3">
                <button 
                  onClick={() => setViewingPartner(null)} 
                  className="px-6 py-2 border rounded text-gray-600 hover:bg-gray-50"
                >
                  Đóng (关闭)
                </button>
                <button
                  onClick={() => {
                    setViewingPartner(null);
                    setEditingPartner(viewingPartner);
                    setIsModalOpen(true);
                  }}
                  className="px-6 py-2 bg-brand-navy text-white rounded font-bold hover:bg-brand-darkNavy"
                >
                  Sửa (编辑)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {partnerToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80]">
          <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Xác nhận xóa? (确认删除?)</h3>
            <p className="text-sm text-gray-500 mb-6">Bạn có chắc chắn muốn xóa đối tác này không? Hành động này không thể hoàn tác. (您确定要删除此合作伙伴吗? 此操作无法撤销。)</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setPartnerToDelete(null)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-800">Hủy (取消)</button>
              <button onClick={() => handleDeletePartner(partnerToDelete)} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Xóa (删除)</button>
            </div>
          </div>
        </div>
      )}

      {/* Partners Table */}
      <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800">Danh Sách Đối Tác (合作伙伴列表) ({filteredPartners.length} đối tác)</h3>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Đang tải dữ liệu... (正在加载数据...)</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-white uppercase bg-brand-navy border-b">
                <tr>
                  <th className="px-4 py-3 text-left">Tên đối tác (合作伙伴名称)</th>
                  <th className="px-4 py-3 text-left">Mã (代码)</th>
                  <th className="px-4 py-3 text-left">Loại (类型)</th>
                  <th className="px-4 py-3 text-left">Người liên hệ (联系人)</th>
                  <th className="px-4 py-3 text-left">Số điện thoại (电话)</th>
                  <th className="px-4 py-3 text-left">Email (邮箱)</th>
                  <th className="px-4 py-3 text-left">Mật khẩu (密码)</th>
                  <th className="px-4 py-3 text-left">Cửa hàng (店铺)</th>
                  <th className="px-4 py-3 text-left">Trạng thái (状态)</th>
                  <th className="px-4 py-3 text-center">Thao tác (操作)</th>
                </tr>
              </thead>
              <tbody>
                {filteredPartners.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-gray-400">
                      Chưa có đối tác nào (暂无合作伙伴)
                    </td>
                  </tr>
                ) : (
                  filteredPartners.map((partner) => (
                    <tr key={partner.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-gray-800">{partner.name}</td>
                      <td className="px-4 py-3 text-gray-600">{partner.code || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          partner.type === 'Supplier' ? 'bg-blue-100 text-blue-800' :
                          partner.type === 'Service' ? 'bg-green-100 text-green-800' :
                          partner.type === 'Platform' ? 'bg-purple-100 text-purple-800' :
                          partner.type === '代运营' ? 'bg-orange-100 text-orange-800' :
                          partner.type === '合伙' ? 'bg-pink-100 text-pink-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {partner.type === '代运营' ? '代运营 (Dịch vụ vận hành thay)' :
                           partner.type === '合伙' ? '合伙 (Đối tác/Partnership)' :
                           partner.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{partner.contactPerson}</td>
                      <td className="px-4 py-3 text-gray-600">{partner.phoneNumber}</td>
                      <td className="px-4 py-3 text-gray-600">{partner.email || '-'}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono">{partner.password || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {partner.storeIds && partner.storeIds.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {partner.storeIds.map(storeId => {
                              const store = stores.find(s => s.id === storeId);
                              return store ? (
                                <span key={storeId} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs border border-blue-200">
                                  {store.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          partner.status === 'Active' 
                            ? 'bg-green-100 text-green-800 border border-green-300' 
                            : 'bg-red-100 text-red-800 border border-red-300'
                        }`}>
                          {partner.status === 'Active' ? 'Hoạt động (活跃)' : 'Ngừng hoạt động (暂停)'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-1 flex-wrap">
                          <button
                            onClick={() => {
                              setViewingPartner(partner);
                            }}
                            className="text-green-600 hover:text-green-800 font-medium text-xs border border-green-200 rounded px-2 py-1 bg-green-50 hover:bg-green-100"
                            title="Xem (查看)"
                          >
                            查看
                          </button>
                          <Link
                            to="/stores"
                            className="text-purple-600 hover:text-purple-800 font-medium text-xs border border-purple-200 rounded px-2 py-1 bg-purple-50 hover:bg-purple-100 text-center"
                            title="Quản lý cửa hàng (店铺管理)"
                          >
                            店铺
                          </Link>
                          {isAdmin() && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingPartner(partner);
                                  setIsModalOpen(true);
                                }}
                                className="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 rounded px-2 py-1 bg-blue-50 hover:bg-blue-100"
                                title="Sửa (编辑)"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => partner.id && setPartnerToDelete(partner.id)}
                                className="text-red-600 hover:text-red-800 font-medium text-xs border border-red-200 rounded px-2 py-1 bg-red-50 hover:bg-red-100"
                                title="Xóa (删除)"
                              >
                                删除
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Partner Modal Component
interface PartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Partner, 'id' | 'code'> & { password?: string }) => Promise<void>;
  initialData?: Partner;
  stores: Store[];
  onStoresChange?: () => Promise<void>;
}

const PartnerModal: React.FC<PartnerModalProps> = ({ isOpen, onClose, onSubmit, initialData, stores, onStoresChange }) => {
  const [formData, setFormData] = useState<Omit<Partner, 'id' | 'code' | 'password'> & { password?: string }>({
    name: '',
    type: 'Supplier',
    contactPerson: '',
    phoneNumber: '',
    email: '',
    address: '',
    storeIds: [],
    notes: '',
    status: 'Active',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [storeSearchText, setStoreSearchText] = useState('');
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name,
          type: initialData.type,
          contactPerson: initialData.contactPerson,
          phoneNumber: initialData.phoneNumber,
          email: initialData.email || '',
          address: initialData.address || '',
          storeIds: initialData.storeIds || [],
          notes: initialData.notes || '',
          status: initialData.status,
          password: initialData.password || '',
        } as any);
      } else {
        setFormData({
          name: '',
          type: 'Supplier',
          contactPerson: '',
          phoneNumber: '',
          email: '',
          address: '',
          storeIds: [],
          notes: '',
          status: 'Active',
          password: '',
        } as any);
      }
      setStoreSearchText('');
      setShowStoreDropdown(false);
    }
  }, [isOpen, initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStoreSelect = (storeId: string) => {
    if (storeId && storeId !== '') {
      setFormData(prev => {
        const currentIds = prev.storeIds || [];
        // Toggle: Nếu đã chọn thì bỏ chọn, nếu chưa chọn thì thêm vào
        if (currentIds.includes(storeId)) {
          return { ...prev, storeIds: currentIds.filter(id => id !== storeId) };
        } else {
          return { ...prev, storeIds: [...currentIds, storeId] };
        }
      });
      // Không xóa search text và không đóng dropdown để có thể chọn tiếp nhiều cửa hàng
      // setStoreSearchText('');
    }
  };

  const handleRemoveStore = (storeId: string) => {
    setFormData(prev => {
      const currentIds = prev.storeIds || [];
      return { ...prev, storeIds: currentIds.filter(id => id !== storeId) };
    });
  };

  // Handle create new store
  const handleCreateNewStore = async () => {
    if (!storeSearchText.trim()) {
      alert('Vui lòng nhập tên cửa hàng (请输入店铺名称)');
      return;
    }

    const newStoreName = storeSearchText.trim();
    
    // Check if store already exists (case insensitive)
    const existingStore = stores.find(s => s.name.toLowerCase() === newStoreName.toLowerCase());
    if (existingStore) {
      // Store exists, just select it
      handleStoreSelect(existingStore.id);
      setStoreSearchText('');
      return;
    }

    try {
      // Create new store with type 'partner'
      const newStore = await createStore({
        name: newStoreName,
        storeType: 'partner'
      });
      
      const newStoreId = newStore.name || `local_store_${Date.now()}`;
      
      // Add to selected stores
      setFormData(prev => ({
        ...prev,
        storeIds: [...(prev.storeIds || []), newStoreId]
      }));
      
      // Clear search text
      setStoreSearchText('');
      
      // Reload stores if callback provided
      if (onStoresChange) {
        await onStoresChange();
      }
      
      alert(`Đã tạo và thêm cửa hàng "${newStoreName}" (已创建并添加店铺 "${newStoreName}")`);
    } catch (error) {
      console.error('Error creating store:', error);
      alert('Lỗi khi tạo cửa hàng mới (创建新店铺时出错): ' + (error as Error).message);
    }
  };

  // Filter stores: hiển thị tất cả cửa hàng từ danh sách
  const availableStores = stores;

  // Filter stores theo search text
  const filteredAvailableStores = availableStores.filter(store => {
    // Loại bỏ các cửa hàng đã được chọn
    if ((formData.storeIds || []).includes(store.id)) return false;
    
    // Nếu có text tìm kiếm, filter theo text
    if (storeSearchText) {
      const searchLower = storeSearchText.toLowerCase();
      return store.name.toLowerCase().includes(searchLower);
    }
    
    // Nếu không có text, hiển thị tất cả
    return true;
  });

  // Check if search text doesn't match any store (for creating new store)
  const canCreateNewStore = storeSearchText.trim().length > 0 && 
    !availableStores.some(store => store.name.toLowerCase() === storeSearchText.trim().toLowerCase());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Lấy password từ formData
      const submitData = { ...formData } as any;
      if (!initialData) {
        // Khi tạo mới: password là bắt buộc (nếu trống sẽ tự động tạo)
        submitData.password = (formData as any).password || '';
      } else {
        // Khi edit: chỉ gửi password nếu có giá trị mới (không trống)
        if ((formData as any).password && (formData as any).password.trim()) {
          submitData.password = (formData as any).password.trim();
        } else {
          // Nếu trống, không gửi password để giữ nguyên password cũ
          delete submitData.password;
        }
      }
      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error('Error submitting partner form:', error);
      const errorMessage = error instanceof Error ? error.message : 'Lỗi khi lưu đối tác';
      alert(`${errorMessage} (保存合作伙伴时出错)`);
      // Không đóng modal nếu có lỗi để người dùng có thể sửa lại
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl m-4 p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-bold text-gray-800 mb-6 uppercase border-b pb-2">
          {initialData ? 'Cập nhật Đối Tác (更新合作伙伴)' : 'Thêm Đối Tác Mới (添加新合作伙伴)'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tên đối tác * (合作伙伴名称 *)</label>
              <input
                required
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 focus:ring-brand-navy focus:border-brand-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Loại đối tác * (合作伙伴类型 *)</label>
              <select
                required
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 bg-white focus:ring-brand-navy focus:border-brand-navy"
              >
                <option value="Supplier">Nhà cung cấp (供应商)</option>
                <option value="Service">Dịch vụ (服务)</option>
                <option value="Platform">Nền tảng (平台)</option>
                <option value="代运营">代运营 (Dịch vụ vận hành thay)</option>
                <option value="合伙">合伙 (Đối tác/Partnership)</option>
                <option value="Other">Khác (其他)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Trạng thái * (状态 *)</label>
              <select
                required
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 bg-white focus:ring-brand-navy focus:border-brand-navy"
              >
                <option value="Active">Hoạt động (活跃)</option>
                <option value="Inactive">Ngừng hoạt động (暂停)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Người liên hệ * (联系人 *)</label>
              <input
                required
                type="text"
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 focus:ring-brand-navy focus:border-brand-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Số điện thoại (电话)</label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 focus:ring-brand-navy focus:border-brand-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email (Tài khoản) * (邮箱 (账号) *)</label>
              <input
                required
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email sẽ được dùng làm tài khoản đăng nhập (邮箱将用作登录账号)"
                className="w-full border rounded px-3 py-2 focus:ring-brand-navy focus:border-brand-navy"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mật khẩu (密码) {!initialData && <span className="text-red-500">*</span>}</label>
              <input
                type="text"
                name="password"
                value={(formData as any).password || ''}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, password: e.target.value } as any));
                }}
                placeholder={initialData ? "Nhập mật khẩu mới (输入新密码)" : "Để trống để tự động tạo mật khẩu (留空以自动生成密码)"}
                className="w-full border rounded px-3 py-2 focus:ring-brand-navy focus:border-brand-navy"
                required={!initialData}
              />
              {!initialData && (
                <p className="text-xs text-gray-500 mt-1">Nếu để trống, mật khẩu sẽ được tự động tạo (如果留空，密码将自动生成)</p>
              )}
              {initialData && (
                <p className="text-xs text-gray-500 mt-1">Để trống nếu không muốn thay đổi mật khẩu (留空则不更改密码)</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Địa chỉ (地址)</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 focus:ring-brand-navy focus:border-brand-navy"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Cửa hàng liên kết (关联店铺)</label>
              <div className="space-y-3">
                {/* Searchable input để tìm và chọn cửa hàng */}
                <div className="relative">
                  <input
                    type="text"
                    value={storeSearchText}
                    onChange={(e) => {
                      setStoreSearchText(e.target.value);
                      setShowStoreDropdown(true);
                    }}
                    onFocus={() => setShowStoreDropdown(true)}
                    onBlur={() => {
                      // Delay để cho phép click vào item - tăng thời gian để dễ chọn nhiều cửa hàng
                      setTimeout(() => setShowStoreDropdown(false), 300);
                    }}
                    placeholder="Gõ để tìm cửa hàng... (输入搜索店铺...)"
                    className="w-full border rounded px-3 py-2 focus:ring-brand-navy focus:border-brand-navy"
                  />
                  {/* Dropdown list khi focus hoặc có text */}
                  {showStoreDropdown && (filteredAvailableStores.length > 0 || canCreateNewStore) && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-64 overflow-y-auto">
                      <div className="p-2 border-b border-gray-200 bg-gray-50 sticky top-0">
                        <p className="text-xs text-gray-600 font-medium">
                          {formData.storeIds && formData.storeIds.length > 0 
                            ? `Đã chọn ${formData.storeIds.length} cửa hàng (已选择${formData.storeIds.length}个店铺)`
                            : 'Click để chọn cửa hàng (点击选择店铺)'}
                        </p>
                      </div>
                      {filteredAvailableStores.map(store => {
                        const isSelected = (formData.storeIds || []).includes(store.id);
                        return (
                          <div
                            key={store.id}
                            onMouseDown={(e) => {
                              e.preventDefault(); // Prevent blur before click
                              handleStoreSelect(store.id);
                              // Không đóng dropdown để có thể chọn tiếp nhiều cửa hàng
                            }}
                            className={`px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 ${isSelected ? 'bg-blue-100' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                readOnly
                                className="w-4 h-4 text-brand-navy bg-gray-100 border-gray-300 rounded focus:ring-brand-navy cursor-pointer"
                              />
                              <span className="text-sm text-gray-700 flex-1">{store.name}</span>
                              {isSelected && (
                                <span className="text-xs text-blue-600 font-medium">✓</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {/* Option to create new store */}
                      {canCreateNewStore && (
                        <div
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleCreateNewStore();
                          }}
                          className="px-3 py-2 hover:bg-green-50 cursor-pointer border-t border-gray-200 bg-green-50"
                        >
                          <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="text-sm text-green-700 font-medium flex-1">
                              Tạo cửa hàng mới: "{storeSearchText}" (创建新店铺: "{storeSearchText}")
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {showStoreDropdown && storeSearchText && filteredAvailableStores.length === 0 && !canCreateNewStore && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg p-3">
                      <p className="text-sm text-gray-500">Không tìm thấy cửa hàng nào (未找到店铺)</p>
                    </div>
                  )}
                </div>

                {/* Danh sách cửa hàng đã chọn */}
                {formData.storeIds && formData.storeIds.length > 0 && (
                  <div className="border rounded p-3 bg-gray-50 max-h-40 overflow-y-auto">
                    <p className="text-xs text-gray-600 mb-2 font-medium">Cửa hàng đã chọn: (已选店铺:)</p>
                    <div className="space-y-1">
                      {formData.storeIds.map(storeId => {
                        const store = stores.find(s => s.id === storeId);
                        return store ? (
                          <div key={storeId} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                            <span className="text-sm text-gray-700">{store.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveStore(storeId)}
                              className="text-red-600 hover:text-red-800 text-xs px-2 py-1 hover:bg-red-50 rounded"
                            >
                              删除
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Ghi chú (备注)</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full border rounded px-3 py-2 focus:ring-brand-navy focus:border-brand-navy"
            />
          </div>

          <div className="pt-4 border-t flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2 border rounded text-gray-600 hover:bg-gray-50">
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2 bg-brand-navy text-white rounded font-bold hover:bg-brand-darkNavy disabled:opacity-50"
            >
              {loading ? 'Đang lưu... (正在保存...)' : initialData ? 'Cập nhật (更新)' : 'Thêm mới (新增)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

