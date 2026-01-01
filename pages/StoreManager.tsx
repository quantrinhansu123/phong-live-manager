import React, { useState } from 'react';
import { MOCK_STORES } from '../services/dataService';
import { StoreDetailModal } from '../components/StoreDetailModal';
import { Store } from '../types';

export const StoreManager: React.FC = () => {
    const [stores, setStores] = useState(MOCK_STORES.filter(s => s.id !== 'all'));
    const [newStoreName, setNewStoreName] = useState('');
    const [selectedStore, setSelectedStore] = useState<Store | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

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

    return (
        <div className="p-6 bg-gray-50 min-h-screen font-sans">
            <StoreDetailModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                store={selectedStore}
            />

             <h2 className="text-2xl font-bold text-gray-800 uppercase mb-6">Quản lý Cửa Hàng</h2>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* List */}
                <div className="bg-white rounded shadow-sm border border-gray-200">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="text-lg font-bold text-gray-800">Danh sách Cửa Hàng</h3>
                    </div>
                    <ul className="divide-y divide-gray-200">
                        {stores.map(store => (
                            <li 
                                key={store.id} 
                                className="p-4 flex justify-between items-center hover:bg-gray-50 cursor-pointer transition-colors"
                                onClick={() => handleStoreClick(store)}
                            >
                                <div className="flex-1">
                                    <span className="font-medium text-gray-700 block">{store.name}</span>
                                    <span className="text-xs text-gray-400 font-mono mt-1">{store.id}</span>
                                </div>
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Add Form */}
                <div className="bg-white rounded shadow-sm border border-gray-200 h-fit">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <h3 className="text-lg font-bold text-gray-800">Thêm Cửa Hàng Mới</h3>
                    </div>
                    <div className="p-6">
                        <form onSubmit={handleAddStore}>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="storeName">
                                    Tên Cửa Hàng
                                </label>
                                <input 
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-brand-red" 
                                    id="storeName" 
                                    type="text" 
                                    placeholder="Ví dụ: Phong Live Đà Nẵng"
                                    value={newStoreName}
                                    onChange={(e) => setNewStoreName(e.target.value)}
                                />
                            </div>
                            <button 
                                className="bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full transition-colors" 
                                type="submit"
                            >
                                Thêm Cửa Hàng
                            </button>
                        </form>
                    </div>
                </div>
             </div>
        </div>
    );
};