import React, { useState, useEffect, useMemo } from 'react';
import { fetchPersonnel, createPersonnel, updatePersonnel, deletePersonnel, fetchLiveReports, MOCK_VIDEO_METRICS } from '../services/dataService';
import { Personnel as PersonnelType, LiveReport } from '../types';

export const Personnel: React.FC = () => {
  const [personnelList, setPersonnelList] = useState<PersonnelType[]>([]);
  const [liveReports, setLiveReports] = useState<LiveReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'salary'>('list');
  
  // Filter state for salary tab
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
  );

  // Modal State
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<PersonnelType | null>(null); // For Details View
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Form State
  const initialFormState = {
    id: '',
    fullName: '',
    department: '',
    position: '',
    phoneNumber: '',
    email: '',
    password: '',
    role: 'user' as 'user' | 'admin',
    baseSalary: 0,
    monthlyKPITarget: 0
  };
  const [formData, setFormData] = useState<PersonnelType>(initialFormState);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [people, reports] = await Promise.all([
        fetchPersonnel(),
        fetchLiveReports()
      ]);
      setPersonnelList(people);
      setLiveReports(reports);
    } catch (e) {
      console.error("Failed to load personnel", e);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setIsEditing(false);
    setShowForm(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEdit = (person: PersonnelType) => {
    setFormData({
      ...person,
      password: person.password || '' // Edit mode might blank out password or keep it, simple approach: show it
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await deletePersonnel(id);
    setShowDeleteConfirm(null);
    await loadData();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email) return;

    try {
      if (isEditing && formData.id) {
        await updatePersonnel(formData.id, formData);
      } else {
        // New user
        // Use Email as username logic if needed, but here we just store email
        await createPersonnel(formData);
      }
      resetForm();
      await loadData();
    } catch (error) {
      alert("Có lỗi xảy ra khi lưu thông tin.");
    }
  };

  // Tính toán doanh số và KPI theo tháng
  const salaryKPIData = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    
    return personnelList.map(person => {
      // Lấy doanh số thực từ LiveReport dựa trên reporter
      const personReports = liveReports.filter(report => {
        if (!report.reporter) return false;
        // So khớp theo tên hoặc email
        const reporterName = report.reporter.toLowerCase();
        const personName = person.fullName.toLowerCase();
        const personEmail = person.email?.toLowerCase() || '';
        
        return reporterName.includes(personName) || 
               personName.includes(reporterName) ||
               reporterName === personEmail;
      });

      // Lọc theo tháng được chọn
      const selectedMonthReports = personReports.filter(report => {
        const reportDate = new Date(report.date);
        return reportDate.getMonth() + 1 === month && 
               reportDate.getFullYear() === year;
      });

      // Tính tổng doanh số thực
      const actualRevenue = selectedMonthReports.reduce((sum, report) => {
        return sum + (Number(report.gmv) || 0);
      }, 0);

      // Tính phần trăm tiến độ
      const kpiTarget = person.monthlyKPITarget || 0;
      const progressPercent = kpiTarget > 0 ? (actualRevenue / kpiTarget) * 100 : 0;

      return {
        person,
        actualRevenue,
        kpiTarget,
        progressPercent,
        reportCount: selectedMonthReports.length
      };
    });
  }, [personnelList, liveReports, selectedMonth]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);

  // --- RENDER ---
  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 uppercase">Quản lý Nhân Sự (人事管理)</h2>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-brand-red text-white px-4 py-2 rounded shadow hover:bg-red-700 transition font-bold text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Thêm Nhân Sự (添加人员)
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 bg-white rounded-t-lg">
        <div className="flex">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-6 py-3 font-medium text-sm transition-colors rounded-t-lg ${
              activeTab === 'list'
                ? 'border-b-2 border-brand-red text-brand-red bg-red-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            Danh sách Nhân sự (人员名单)
          </button>
          <button
            onClick={() => setActiveTab('salary')}
            className={`px-6 py-3 font-medium text-sm transition-colors rounded-t-lg ${
              activeTab === 'salary'
                ? 'border-b-2 border-brand-red text-brand-red bg-red-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            Lương & KPIs theo tháng (月薪和KPI)
          </button>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-lg font-bold uppercase text-gray-800">{isEditing ? 'Cập nhật thông tin (更新信息)' : 'Thêm nhân sự mới (添加新人员)'}</h3>
              <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic Info */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Thông tin cơ bản (基本信息)</label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Họ và tên (姓名) <span className="text-red-500">*</span></label>
                  <input required name="fullName" value={formData.fullName} onChange={handleInputChange} className="w-full border rounded px-3 py-2 mt-1 focus:ring-brand-red focus:border-brand-red" placeholder="Nguyễn Văn A" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Số điện thoại (电话号码)</label>
                  <input name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} className="w-full border rounded px-3 py-2 mt-1" placeholder="09xxx..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phòng ban (部门)</label>
                  <select name="department" value={formData.department} onChange={handleInputChange} className="w-full border rounded px-3 py-2 mt-1 bg-white">
                    <option value="">Chọn phòng ban (选择部门)</option>
                    <option value="Live">Team Live</option>
                    <option value="Media">Team Media/Video</option>
                    <option value="Sale">Team Sale</option>
                    <option value="HR">Hành chính/Nhân sự</option>
                    <option value="Management">Ban Giám Đốc</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Vị trí chức danh (职位)</label>
                  <input name="position" value={formData.position} onChange={handleInputChange} className="w-full border rounded px-3 py-2 mt-1" placeholder="Ví dụ: Host, Editor... (例如: 主播, 编辑...)" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Lương cứng (固定工资) (VND)</label>
                  <input 
                    type="number" 
                    name="baseSalary" 
                    value={formData.baseSalary || 0} 
                    onChange={(e) => {
                      const value = e.target.value === '' ? 0 : Number(e.target.value);
                      setFormData(prev => ({ ...prev, baseSalary: value }));
                    }} 
                    className="w-full border rounded px-3 py-2 mt-1" 
                    placeholder="0" 
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mục tiêu KPI tháng (月度KPI目标) (VND)</label>
                  <input 
                    type="number" 
                    name="monthlyKPITarget" 
                    value={formData.monthlyKPITarget || 0} 
                    onChange={(e) => {
                      const value = e.target.value === '' ? 0 : Number(e.target.value);
                      setFormData(prev => ({ ...prev, monthlyKPITarget: value }));
                    }} 
                    className="w-full border rounded px-3 py-2 mt-1" 
                    placeholder="0" 
                    min="0"
                  />
                </div>

                {/* Account Info */}
                <div className="col-span-2 mt-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tài khoản đăng nhập (登录账户)</label>
                  <div className="bg-blue-50 p-4 rounded border border-blue-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email (Tên đăng nhập) (用户名) <span className="text-red-500">*</span></label>
                      <input required type="email" name="email" value={formData.email || ''} onChange={handleInputChange} className="w-full border rounded px-3 py-2 mt-1" placeholder="email@phonglive.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Mật khẩu (密码) <span className="text-red-500">*</span></label>
                      <input required type="text" name="password" value={formData.password || ''} onChange={handleInputChange} className="w-full border rounded px-3 py-2 mt-1 bg-white" placeholder="Nhập mật khẩu (输入密码)" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phân quyền (权限)</label>
                      <select name="role" value={formData.role || 'user'} onChange={handleInputChange} className="w-full border rounded px-3 py-2 mt-1 bg-white">
                        <option value="user">Nhân viên (员工) (User)</option>
                        <option value="admin">Quản trị viên (管理员) (Admin)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={resetForm} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50">Hủy (取消)</button>
                <button type="submit" className="px-6 py-2 bg-brand-red text-white rounded font-bold hover:bg-red-700">
                  {isEditing ? 'Cập nhật (更新)' : 'Tạo mới (新建)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80]">
          <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Xác nhận xóa? (确认删除?)</h3>
            <p className="text-sm text-gray-500 mb-6">Bạn có chắc chắn muốn xóa nhân sự này không? Hành động này không thể hoàn tác. (您确定要删除此人员吗? 此操作无法撤销。)</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-800">Hủy (取消)</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Xóa (删除)</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {activeTab === 'list' && (
        <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">Đang tải danh sách nhân sự... (正在加载人员列表...)</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 border-r">Họ và tên</th>
                    <th className="px-6 py-3 border-r">Email (Login)</th>
                    <th className="px-6 py-3 border-r">Phòng ban</th>
                    <th className="px-6 py-3 border-r">Vị trí</th>
                    <th className="px-6 py-3 border-r">SĐT</th>
                    <th className="px-6 py-3 border-r">Lương cứng (固定工资)</th>
                    <th className="px-6 py-3 text-center">Thao tác (操作)</th>
                  </tr>
                </thead>
                <tbody>
                  {personnelList.length === 0 ? (
                    <tr><td colSpan={7} className="py-8 text-center text-gray-400">Chưa có nhân sự nào (暂无人员)</td></tr>
                  ) : (
                    personnelList.map((person) => (
                      <tr key={person.id} className="border-b hover:bg-gray-50 group">
                        <td className="px-6 py-4 font-bold text-gray-800 border-r flex items-center gap-2">
                          {person.fullName}
                          {person.role === 'admin' && <span className="bg-purple-100 text-purple-800 text-xs px-1.5 rounded border border-purple-200">Admin</span>}
                        </td>
                        <td className="px-6 py-4 border-r text-gray-600">{person.email || '-'}</td>
                        <td className="px-6 py-4 border-r">
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${person.department === 'Live' ? 'bg-red-50 text-red-700 border-red-200' :
                              person.department === 'Media' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                'bg-gray-50 text-gray-600 border-gray-200'
                            }`}>
                            {person.department}
                          </span>
                        </td>
                        <td className="px-6 py-4 border-r">{person.position}</td>
                        <td className="px-6 py-4 border-r font-mono text-gray-600">{person.phoneNumber}</td>
                        <td className="px-6 py-4 border-r font-bold text-green-600">
                          {person.baseSalary ? formatCurrency(person.baseSalary) : '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleEdit(person)}
                              className="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 rounded px-2 py-1 bg-blue-50 hover:bg-blue-100"
                            >
                            Sửa (编辑)
                          </button>
                          <button
                            onClick={() => person.id && setShowDeleteConfirm(person.id)}
                            className="text-red-600 hover:text-red-800 font-medium text-xs border border-red-200 rounded px-2 py-1 bg-red-50 hover:bg-red-100"
                          >
                            Xóa (删除)
                            </button>
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
      )}

      {/* Salary & KPI Tab */}
      {activeTab === 'salary' && (
        <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">Đang tải dữ liệu... (正在加载数据...)</div>
          ) : (
            <div className="overflow-x-auto">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    Lương & KPIs theo tháng (月薪和KPI) - {new Date(selectedMonth + '-01').toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Doanh số được tính từ các báo cáo Live của nhân viên</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Chọn tháng:</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-brand-red bg-white shadow-sm"
                  />
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 border-r text-left">Họ và tên</th>
                    <th className="px-6 py-3 border-r text-left">Phòng ban</th>
                    <th className="px-6 py-3 border-r text-right">Lương cứng (固定工资)</th>
                    <th className="px-6 py-3 border-r text-right">Mục tiêu KPI (KPI目标)</th>
                    <th className="px-6 py-3 border-r text-right">Doanh số thực (实际营收)</th>
                    <th className="px-6 py-3 border-r text-center">Tiến độ (进度)</th>
                    <th className="px-6 py-3 text-center">Số báo cáo (报告数)</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryKPIData.length === 0 ? (
                    <tr><td colSpan={7} className="py-8 text-center text-gray-400">Chưa có dữ liệu (暂无数据)</td></tr>
                  ) : (
                    salaryKPIData.map((item) => {
                      const { person, actualRevenue, kpiTarget, progressPercent, reportCount } = item;
                      const progressColor = progressPercent >= 100 
                        ? 'bg-green-100 text-green-800 border-green-300' 
                        : progressPercent >= 50 
                        ? 'bg-yellow-100 text-yellow-800 border-yellow-300' 
                        : 'bg-red-100 text-red-800 border-red-300';
                      
                      return (
                        <tr key={person.id} className="border-b hover:bg-gray-50">
                          <td className="px-6 py-4 border-r font-bold text-gray-800">
                            {person.fullName}
                            {person.role === 'admin' && (
                              <span className="ml-2 bg-purple-100 text-purple-800 text-xs px-1.5 rounded border border-purple-200">Admin</span>
                            )}
                          </td>
                          <td className="px-6 py-4 border-r">
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${
                              person.department === 'Live' ? 'bg-red-50 text-red-700 border-red-200' :
                              person.department === 'Media' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-gray-50 text-gray-600 border-gray-200'
                            }`}>
                              {person.department || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 border-r text-right font-bold text-green-600">
                            {person.baseSalary ? formatCurrency(person.baseSalary) : '-'}
                          </td>
                          <td className="px-6 py-4 border-r text-right font-medium text-blue-600">
                            {kpiTarget > 0 ? formatCurrency(kpiTarget) : '-'}
                          </td>
                          <td className="px-6 py-4 border-r text-right font-bold text-purple-600">
                            {formatCurrency(actualRevenue)}
                          </td>
                          <td className="px-6 py-4 border-r">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`px-3 py-1 rounded text-xs font-bold border ${progressColor}`}>
                                {progressPercent.toFixed(1)}%
                              </span>
                              {kpiTarget > 0 && (
                                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${
                                      progressPercent >= 100 ? 'bg-green-500' :
                                      progressPercent >= 50 ? 'bg-yellow-500' :
                                      'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center font-medium text-gray-600">
                            {reportCount}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};