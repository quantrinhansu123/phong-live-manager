
import React, { useState } from 'react';
import Header from './components/Layout/Header';
import SummaryCard from './components/Dashboard/SummaryCard';
import GrowthCharts from './components/Dashboard/GrowthCharts';
import TeamView from './components/Dashboard/TeamView';
import IndividualView from './components/Dashboard/IndividualView';
import KPIDashboard from './components/Dashboard/KPIDashboard';
import { DashboardTab, ViewLevel } from './types';
import { MOCK_SUMMARY_CARDS, MOCK_KPI_SUMMARY } from './services/mockData';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>(DashboardTab.GROWTH);
  const [activeView, setActiveView] = useState<ViewLevel>(ViewLevel.COMPANY);

  const getSummaryCards = () => {
    return activeTab === DashboardTab.KPI ? MOCK_KPI_SUMMARY : MOCK_SUMMARY_CARDS;
  };

  return (
    <div className="min-h-screen pb-20 bg-[#f8fafc]">
      <Header />
      
      <main className="max-w-[1400px] mx-auto px-6">
        {/* Tab Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-2">
          <button 
            onClick={() => setActiveTab(DashboardTab.GROWTH)}
            className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${activeTab === DashboardTab.GROWTH ? 'bg-green-50 border-green-300 shadow-md ring-2 ring-green-100' : 'bg-white hover:bg-gray-50 border-gray-200'}`}
          >
            <div className={`p-3 rounded-xl text-white text-xl shadow-sm ${activeTab === DashboardTab.GROWTH ? 'bg-[#50a050]' : 'bg-slate-300'}`}>📈</div>
            <div className="text-left">
              <h4 className={`font-bold text-sm ${activeTab === DashboardTab.GROWTH ? 'text-slate-800' : 'text-slate-400'}`}>Dashboard Tăng trưởng</h4>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${activeTab === DashboardTab.GROWTH ? 'text-green-600' : 'text-slate-400'}`}>Ưu tiên cao</p>
            </div>
          </button>
          
          <button 
            onClick={() => setActiveTab(DashboardTab.KPI)}
            className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${activeTab === DashboardTab.KPI ? 'bg-emerald-50 border-emerald-300 shadow-md ring-2 ring-emerald-100' : 'bg-white hover:bg-gray-50 border-gray-200'}`}
          >
            <div className={`p-3 rounded-xl text-white text-xl shadow-sm ${activeTab === DashboardTab.KPI ? 'bg-[#2e8b57]' : 'bg-slate-300'}`}>📊</div>
            <div className="text-left">
              <h4 className={`font-bold text-sm ${activeTab === DashboardTab.KPI ? 'text-slate-800' : 'text-slate-400'}`}>Dashboard KPI</h4>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${activeTab === DashboardTab.KPI ? 'text-emerald-600' : 'text-slate-400'}`}>Theo mục tiêu</p>
            </div>
          </button>

          <button 
            onClick={() => setActiveTab(DashboardTab.OKR)}
            className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${activeTab === DashboardTab.OKR ? 'bg-green-50 border-green-300 shadow-md ring-2 ring-green-100' : 'bg-white hover:bg-gray-50 border-gray-200'}`}
          >
            <div className={`p-3 rounded-xl text-white text-xl shadow-sm ${activeTab === DashboardTab.OKR ? 'bg-green-600' : 'bg-slate-300'}`}>🎯</div>
            <div className="text-left">
              <h4 className={`font-bold text-sm ${activeTab === DashboardTab.OKR ? 'text-slate-800' : 'text-slate-400'}`}>Dashboard OKR</h4>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${activeTab === DashboardTab.OKR ? 'text-green-600' : 'text-slate-400'}`}>Chiến lược</p>
            </div>
          </button>
        </div>

        {/* View Level Toggles */}
        <div className="flex items-center gap-2 mb-6 border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <button 
            onClick={() => setActiveView(ViewLevel.COMPANY)}
            className={`px-8 py-3 text-[11px] font-black uppercase tracking-widest rounded-t-xl transition-all border-x border-t ${activeView === ViewLevel.COMPANY ? 'bg-white text-[#2e8b57] -mb-[1px] border-b-transparent shadow-[0_-2px_10px_rgba(0,0,0,0.05)]' : 'bg-slate-100 text-slate-400 border-transparent hover:bg-slate-200'}`}
          >
            CẤP CÔNG TY
          </button>
          <button 
            onClick={() => setActiveView(ViewLevel.TEAM)}
            className={`px-8 py-3 text-[11px] font-black uppercase tracking-widest rounded-t-xl transition-all border-x border-t ${activeView === ViewLevel.TEAM ? 'bg-white text-[#2e8b57] -mb-[1px] border-b-transparent shadow-[0_-2px_10px_rgba(0,0,0,0.05)]' : 'bg-slate-100 text-slate-400 border-transparent hover:bg-slate-200'}`}
          >
            CẤP BỘ PHẬN (TEAM)
          </button>
          <button 
            onClick={() => setActiveView(ViewLevel.INDIVIDUAL)}
            className={`px-8 py-3 text-[11px] font-black uppercase tracking-widest rounded-t-xl transition-all border-x border-t ${activeView === ViewLevel.INDIVIDUAL ? 'bg-white text-[#2e8b57] -mb-[1px] border-b-transparent shadow-[0_-2px_10px_rgba(0,0,0,0.05)]' : 'bg-slate-100 text-slate-400 border-transparent hover:bg-slate-200'}`}
          >
            CẤP CÁ NHÂN
          </button>
        </div>

        {/* Summary Row (Dynamic) */}
        {activeTab !== DashboardTab.KPI && (
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
             {getSummaryCards().map((card, i) => (
               <SummaryCard key={i} data={card} />
             ))}
           </div>
        )}

        {/* Content Area */}
        {activeTab === DashboardTab.GROWTH && (
          <div className="space-y-10 animate-in fade-in duration-700">
            {activeView === ViewLevel.COMPANY && (
              <>
                <GrowthCharts />
                {/* Area C - Detailed Data Table */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mt-10">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="text-xs font-black text-[#50a050] uppercase tracking-widest">BẢNG SỐ LIỆU TĂNG TRƯỞNG DOANH THU THEO THÁNG</h3>
                    <div className="flex gap-2">
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase"><div className="w-2 h-2 rounded-full bg-red-500"></div> Cảnh báo</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                          <th className="p-4 border-r border-slate-200 font-black uppercase tracking-tighter">Kỳ (Tháng)</th>
                          <th className="p-4 border-r border-slate-200 font-black uppercase tracking-tighter">Tổng Doanh Thu</th>
                          <th className="p-4 border-r border-slate-200 font-black uppercase tracking-tighter">Xu hướng %</th>
                          <th className="p-4 border-r border-slate-200 font-black uppercase tracking-tighter">Doanh thu Lumora</th>
                          <th className="p-4 border-r border-slate-200 font-black uppercase tracking-tighter">Xu hướng %</th>
                          <th className="p-4 border-r border-slate-200 font-black uppercase tracking-tighter">Tỷ lệ Ads/DT</th>
                          <th className="p-4 border-r border-slate-200 font-black uppercase tracking-tighter">Xu hướng %</th>
                          <th className="p-4 font-black uppercase tracking-tighter">Tỷ lệ LN/DT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 border-r border-slate-100 font-bold text-slate-700">Tháng 9</td>
                          <td className="p-4 border-r border-slate-100 font-black text-slate-800">150 tỷ</td>
                          <td className="p-4 border-r border-slate-100 text-slate-400 italic">--</td>
                          <td className="p-4 border-r border-slate-100">80 tỷ</td>
                          <td className="p-4 border-r border-slate-100 text-slate-400 italic">--</td>
                          <td className="p-4 border-r border-slate-100">28%</td>
                          <td className="p-4 border-r border-slate-100 text-slate-400 italic">--</td>
                          <td className="p-4 font-bold text-emerald-600">25%</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors bg-red-50">
                          <td className="p-4 border-r border-slate-100 font-bold text-slate-700">Tháng 10</td>
                          <td className="p-4 border-r border-slate-100 font-black text-slate-800">135 tỷ</td>
                          <td className="p-4 border-r border-slate-100 font-black text-red-600">-10%</td>
                          <td className="p-4 border-r border-slate-100">72 tỷ</td>
                          <td className="p-4 border-r border-slate-100 font-black text-red-600">-10%</td>
                          <td className="p-4 border-r border-slate-100 font-black text-orange-600">31%</td>
                          <td className="p-4 border-r border-slate-100 font-black text-orange-600">+10%</td>
                          <td className="p-4 font-bold text-red-600">8%</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 border-r border-slate-100 font-bold text-slate-700">Tháng 11</td>
                          <td className="p-4 border-r border-slate-100 font-black text-slate-800">175 tỷ</td>
                          <td className="p-4 border-r border-slate-100 font-black text-emerald-600">+29%</td>
                          <td className="p-4 border-r border-slate-100">100 tỷ</td>
                          <td className="p-4 border-r border-slate-100 font-black text-emerald-600">+38%</td>
                          <td className="p-4 border-r border-slate-100">30%</td>
                          <td className="p-4 border-r border-slate-100 text-emerald-600 font-bold">-3%</td>
                          <td className="p-4 font-bold text-emerald-600">32%</td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 border-r border-slate-100 font-bold text-slate-700">Tháng 12</td>
                          <td className="p-4 border-r border-slate-100 font-black text-slate-800">180 tỷ</td>
                          <td className="p-4 border-r border-slate-100 font-black text-emerald-600">+3%</td>
                          <td className="p-4 border-r border-slate-100">106 tỷ</td>
                          <td className="p-4 border-r border-slate-100 font-black text-emerald-600">+6%</td>
                          <td className="p-4 border-r border-slate-100 font-black text-red-600">33%</td>
                          <td className="p-4 border-r border-slate-100 font-black text-red-600">+10%</td>
                          <td className="p-4 font-bold text-emerald-600">30%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activeView === ViewLevel.TEAM && <TeamView />}
            {activeView === ViewLevel.INDIVIDUAL && <IndividualView />}
          </div>
        )}

        {activeTab === DashboardTab.KPI && (
          <KPIDashboard level={activeView} />
        )}

        {activeTab === DashboardTab.OKR && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-white border border-slate-200 rounded-3xl border-dashed">
            <span className="text-6xl mb-6">🎯</span>
            <h2 className="text-2xl font-black text-[#50a050]">OKR DASHBOARD</h2>
            <p className="text-sm max-w-sm text-center mt-2 leading-relaxed">Phân hệ quản trị mục tiêu (Objectives and Key Results) đang được chuẩn bị dữ liệu chiến lược.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
