import React, { useState } from 'react';
import { MOCK_STORES } from '../services/dataService';
import { StoreDetailModal } from '../components/StoreDetailModal';
import { Store } from '../types';

export const StoreManager: React.FC = () => {
    const [stores, setStores] = useState(MOCK_STORES.filter(s => s.id !== 'all'));
    const [newStoreName, setNewStoreName] = useState('');
    const [selectedStore, setSelectedStore] = useState<Store | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStore, setEditingStore] = useState<Store | null>(null);
    const [storeToDelete, setStoreToDelete] = useState<string | null>(null);

    const handleAddStore = (e: React.FormEvent) => {
        e.preventDefault();
        if(!newStoreName.trim()) return;
        
        const newStore = {
            id: `store_${Date.now()}`,
            name: newStoreName
        };
        setStores([...stores, newStore]);
        setNewStoreName('');
        alert(`Đã thêm cửa hàng: ${newStore.name}`);
    };

    const handleStoreClick = (store: Store) => {
        setSelectedStore(store);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedStore(null);
    };

    const handleEditStore = (store: Store, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingStore(store);
        setNewStoreName(store.name);
    };

    const handleUpdateStore = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStore || !newStoreName.trim()) return;
        
        setStores(stores.map(s => 
            s.id === editingStore.id ? { ...s, name: newStoreName } : s
        ));
        setNewStoreName('');
        setEditingStore(null);
        alert(`Đã cập nhật cửa hàng: ${newStoreName}`);
    };

    const handleDeleteStore = (storeId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setStoreToDelete(storeId);
    };

    const confirmDeleteStore = () => {
        if (storeToDelete) {
            setStores(stores.filter(s => s.id !== storeToDelete));
            setStoreToDelete(null);
            alert('Đã xóa cửa hàng');
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen font-sans">
            <StoreDetailModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                store={selectedStore}
            />

             <h2 className="text-2xl font-bold text-gray-800 uppercase mb-6">Quản lý Cửa Hàng (店铺管理)</h2>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* List */}
                <div className="bg-white rounded shadow-sm border border-gray-200">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="text-lg font-bold text-gray-800">Danh sách Cửa Hàng (店铺列表)</h3>
                    </div>
                    <ul className="divide-y divide-gray-200">
                        {stores.map(store => (
                            <li 
                                key={store.id} 
                                className="p-4 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex justify-between items-center">
                                    <div 
                                        className="flex-1 cursor-pointer"
                                        onClick={() => handleStoreClick(store)}
                                    >
                                        <span className="font-medium text-gray-700 block">{store.name}</span>
                                        <span className="text-xs text-gray-400 font-mono mt-1">{store.id}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => handleStoreClick(store)}
                                            className="text-green-600 hover:text-green-800 font-medium text-xs border border-green-200 rounded px-2 py-1 bg-green-50 hover:bg-green-100"
                                            title="Xem chi tiết"
                                        >
                                            Xem (查看)
                                        </button>
                                        <button
                                            onClick={(e) => handleEditStore(store, e)}
                                            className="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 rounded px-2 py-1 bg-blue-50 hover:bg-blue-100"
                                            title="Sửa"
                                        >
                                            Sửa (编辑)
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteStore(store.id, e)}
                                            className="text-red-600 hover:text-red-800 font-medium text-xs border border-red-200 rounded px-2 py-1 bg-red-50 hover:bg-red-100"
                                            title="Xóa"
                                        >
                                            Xóa (删除)
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Add Form */}
                <div className="bg-white rounded shadow-sm border border-gray-200 h-fit">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="text-lg font-bold text-gray-800">Thêm Cửa Hàng Mới (添加新店铺)</h3>
                    </div>
                    <div className="p-6">
                        <form onSubmit={editingStore ? handleUpdateStore : handleAddStore}>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="storeName">
                                    Tên Cửa Hàng (店铺名称)
                                </label>
                                <input 
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-brand-red" 
                                    id="storeName" 
                                    type="text" 
                                    placeholder="Ví dụ: Phong Live Đà Nẵng (例如: Phong Live 岘港)"
                                    value={newStoreName}
                                    onChange={(e) => setNewStoreName(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2">
                                {editingStore && (
                                    <button 
                                        type="button"
                                        onClick={() => { setEditingStore(null); setNewStoreName(''); }}
                                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded transition-colors"
                                    >
                                        Hủy (取消)
                                    </button>
                                )}
                                <button 
                                    className={`${editingStore ? 'flex-1' : 'w-full'} bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors`}
                                    type="submit"
                                >
                                    {editingStore ? 'Cập nhật (更新)' : 'Thêm Cửa Hàng (添加店铺)'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
             </div>

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