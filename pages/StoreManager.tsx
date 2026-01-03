import React, { useState, useEffect } from 'react';
import { fetchStores, createStore, updateStore, deleteStore, fetchPartners, fetchPersonnel } from '../services/dataService';
import { StoreDetailModal } from '../components/StoreDetailModal';
import { Store, Partner, Personnel } from '../types';

export const StoreManager: React.FC = () => {
    const [stores, setStores] = useState<Store[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [personnel, setPersonnel] = useState<Personnel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddFormOpen, setIsAddFormOpen] = useState(false);
    const [newStoreName, setNewStoreName] = useState('');
    const [newStorePartnerId, setNewStorePartnerId] = useState<string>('');
    const [newStoreType, setNewStoreType] = useState<'own' | 'partner'>('own');
    const [newStorePersonnelIds, setNewStorePersonnelIds] = useState<string[]>([]);
    const [editingStore, setEditingStore] = useState<Store | null>(null);
    const [selectedStore, setSelectedStore] = useState<Store | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [storeToDelete, setStoreToDelete] = useState<string | null>(null);

    useEffect(() => {
        loadStores();
    }, []);

    const loadStores = async () => {
        setIsLoading(true);
        try {
            const [storeData, partnerData, personnelData] = await Promise.all([
                fetchStores(),
                fetchPartners(),
                fetchPersonnel()
            ]);
            setStores(storeData.filter(s => s.id !== 'all'));
            setPartners(partnerData);
            setPersonnel(personnelData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddStore = async () => {
        if(!newStoreName.trim()) {
            alert('Vui lòng nhập tên cửa hàng');
            return;
        }
        
        const storeNameToAdd = newStoreName.trim();
        try {
            await createStore({ 
                name: storeNameToAdd,
                partnerId: newStorePartnerId || undefined,
                storeType: newStoreType,
                personnelIds: newStorePersonnelIds.length > 0 ? newStorePersonnelIds : undefined
            });
            setNewStoreName('');
            setNewStorePartnerId('');
            setNewStoreType('own');
            setNewStorePersonnelIds([]);
            setIsAddFormOpen(false);
            await loadStores();
            alert(`Đã thêm cửa hàng: ${storeNameToAdd}`);
        } catch (error) {
            console.error('Error adding store:', error);
            alert('Có lỗi xảy ra khi thêm cửa hàng');
        }
    };

    const handleStoreClick = (store: Store) => {
        setSelectedStore(store);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedStore(null);
    };

    const handleStartEdit = (store: Store) => {
        setEditingStore(store);
        setNewStoreName(store.name);
        setNewStorePartnerId(store.partnerId || '');
        setNewStoreType(store.storeType || 'own');
        setNewStorePersonnelIds(store.personnelIds || []);
    };

    const handleCancelEdit = () => {
        setEditingStore(null);
        setNewStoreName('');
        setNewStorePartnerId('');
        setNewStoreType('own');
        setNewStorePersonnelIds([]);
        setIsAddFormOpen(false);
    };

    const handleUpdateStore = async () => {
        if (!editingStore || !newStoreName.trim()) {
            alert('Vui lòng nhập tên cửa hàng');
            return;
        }
        
        const storeNameToUpdate = newStoreName.trim();
        try {
            await updateStore(editingStore.id, { 
                name: storeNameToUpdate,
                partnerId: newStorePartnerId || undefined,
                storeType: newStoreType,
                personnelIds: newStorePersonnelIds.length > 0 ? newStorePersonnelIds : undefined
            });
            handleCancelEdit();
            await loadStores();
            alert(`Đã cập nhật cửa hàng: ${storeNameToUpdate}`);
        } catch (error) {
            console.error('Error updating store:', error);
            alert('Có lỗi xảy ra khi cập nhật cửa hàng');
        }
    };

    const handleDeleteStore = (storeId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setStoreToDelete(storeId);
    };

    const confirmDeleteStore = async () => {
        if (storeToDelete) {
            try {
                await deleteStore(storeToDelete);
                setStoreToDelete(null);
                await loadStores();
                alert('Đã xóa cửa hàng');
            } catch (error) {
                console.error('Error deleting store:', error);
                alert('Có lỗi xảy ra khi xóa cửa hàng');
            }
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen font-sans">
            <StoreDetailModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                store={selectedStore}
            />

             <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 uppercase">Quản lý Cửa Hàng (店铺管理)</h2>
                <button
                    onClick={() => {
                        setIsAddFormOpen(true);
                        setEditingStore(null);
                        setNewStoreName('');
                        setNewStorePartnerId('');
                        setNewStoreType('own');
                        setNewStorePersonnelIds([]);
                    }}
                    className="bg-brand-navy hover:bg-brand-darkNavy text-white px-4 py-2 rounded shadow text-sm font-bold flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Thêm Cửa Hàng Mới
                </button>
             </div>

             {/* Table */}
             <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-white uppercase bg-brand-navy border-b">
                            <tr>
                                <th className="px-4 py-3 text-left">Tên cửa hàng</th>
                                <th className="px-4 py-3 text-left">Loại</th>
                                <th className="px-4 py-3 text-left">Đối tác</th>
                                <th className="px-4 py-3 text-left">Nhân sự phụ trách</th>
                                <th className="px-4 py-3 text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Store Rows */}
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-gray-500">Đang tải...</td>
                                </tr>
                            ) : stores.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-gray-400">Chưa có cửa hàng nào</td>
                                </tr>
                            ) : (
                                stores.map(store => (
                                    <tr key={store.id} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-3 font-bold text-gray-800">{store.name}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                store.storeType === 'own' 
                                                    ? 'bg-green-100 text-green-800 border border-green-300' 
                                                    : 'bg-blue-100 text-blue-800 border border-blue-300'
                                            }`}>
                                                {store.storeType === 'own' ? 'Của mình' : 'Đối tác phụ trách'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {store.partnerId ? (
                                                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs border border-blue-200">
                                                    {partners.find(p => p.id === store.partnerId)?.name || store.partnerId}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {store.personnelIds && store.personnelIds.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {store.personnelIds.map(personnelId => {
                                                        const person = personnel.find(p => p.id === personnelId);
                                                        return person ? (
                                                            <span key={personnelId} className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs border border-purple-200">
                                                                {person.fullName}
                                                            </span>
                                                        ) : null;
                                                    })}
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-center gap-1">
                                                <button
                                                    onClick={() => handleStoreClick(store)}
                                                    className="text-green-600 hover:text-green-800 font-medium text-xs border border-green-200 rounded px-2 py-1 bg-green-50 hover:bg-green-100"
                                                    title="Xem chi tiết"
                                                >
                                                    Xem
                                                </button>
                                                <button
                                                    onClick={() => handleStartEdit(store)}
                                                    className="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 rounded px-2 py-1 bg-blue-50 hover:bg-blue-100"
                                                    title="Sửa"
                                                >
                                                    Sửa
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteStore(store.id, e)}
                                                    className="text-red-600 hover:text-red-800 font-medium text-xs border border-red-200 rounded px-2 py-1 bg-red-50 hover:bg-red-100"
                                                    title="Xóa"
                                                >
                                                    Xóa
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
             </div>

            {/* Add/Edit Store Modal */}
            {(isAddFormOpen || editingStore) && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] overflow-y-auto">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4 p-6 relative">
                        <button 
                            onClick={handleCancelEdit} 
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <h2 className="text-xl font-bold text-gray-800 mb-6 uppercase border-b pb-2">
                            {editingStore ? 'Sửa Cửa Hàng' : 'Thêm Cửa Hàng Mới'}
                        </h2>

                        <form onSubmit={(e) => { e.preventDefault(); editingStore ? handleUpdateStore() : handleAddStore(); }} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Tên cửa hàng *</label>
                                <input
                                    required
                                    type="text"
                                    value={newStoreName}
                                    onChange={(e) => setNewStoreName(e.target.value)}
                                    placeholder="Nhập tên cửa hàng"
                                    className="w-full border rounded px-3 py-2 focus:ring-brand-navy focus:border-brand-navy"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Loại</label>
                                <select
                                    value={newStoreType}
                                    onChange={(e) => setNewStoreType(e.target.value as 'own' | 'partner')}
                                    className="w-full border rounded px-3 py-2 bg-white focus:ring-brand-navy focus:border-brand-navy"
                                >
                                    <option value="own">Của mình</option>
                                    <option value="partner">Đối tác phụ trách</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Đối tác</label>
                                <select
                                    value={newStorePartnerId}
                                    onChange={(e) => setNewStorePartnerId(e.target.value)}
                                    className="w-full border rounded px-3 py-2 bg-white focus:ring-brand-navy focus:border-brand-navy"
                                >
                                    <option value="">-- Chọn đối tác --</option>
                                    {partners.map(partner => (
                                        <option key={partner.id} value={partner.id}>
                                            {partner.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Nhân sự phụ trách</label>
                                <div className="border rounded px-3 py-2 bg-white max-h-32 overflow-y-auto">
                                    {personnel.length === 0 ? (
                                        <p className="text-xs text-gray-500">Chưa có nhân sự</p>
                                    ) : (
                                        personnel.map(person => (
                                            <label key={person.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50">
                                                <input
                                                    type="checkbox"
                                                    checked={newStorePersonnelIds.includes(person.id || '')}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setNewStorePersonnelIds([...newStorePersonnelIds, person.id || '']);
                                                        } else {
                                                            setNewStorePersonnelIds(newStorePersonnelIds.filter(id => id !== person.id));
                                                        }
                                                    }}
                                                    className="rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
                                                />
                                                <span className="text-sm text-gray-700">{person.fullName} ({person.department})</span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 border-t flex justify-end gap-3">
                                <button 
                                    type="button" 
                                    onClick={handleCancelEdit} 
                                    className="px-6 py-2 border rounded text-gray-600 hover:bg-gray-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-2 bg-brand-navy text-white rounded font-bold hover:bg-brand-darkNavy"
                                >
                                    {editingStore ? 'Cập nhật' : 'Thêm mới'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {storeToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80]">
                    <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Xác nhận xóa? (确认删除?)</h3>
                        <p className="text-sm text-gray-500 mb-6">Bạn có chắc chắn muốn xóa cửa hàng này không? Hành động này không thể hoàn tác. (您确定要删除此店铺吗? 此操作无法撤销。)</p>
                        <div className="flex justify-center gap-3">
                            <button onClick={() => setStoreToDelete(null)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-800">Hủy (取消)</button>
                            <button onClick={confirmDeleteStore} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Xóa (删除)</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};