import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPersonnel, fetchPartners } from '../services/dataService';

export const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const [personnel, partners] = await Promise.all([
                fetchPersonnel(),
                fetchPartners()
            ]);

            // Tìm user trong Personnel trước
            let user = personnel.find(p => p.email?.toLowerCase() === email.trim().toLowerCase());
            let userType: 'personnel' | 'partner' = 'personnel';

            // Nếu không tìm thấy trong Personnel, tìm trong Partners
            if (!user) {
                const partner = partners.find(p => p.email?.toLowerCase() === email.trim().toLowerCase());
                
                if (partner) {
                    // Kiểm tra xem partner có password không
                    if (!partner.password || partner.password.trim() === '') {
                        setError('Đối tác này chưa có mật khẩu! Vui lòng liên hệ admin để thiết lập mật khẩu. (此合作伙伴尚未设置密码! 请联系管理员设置密码。)');
                        setLoading(false);
                        return;
                    }
                    user = {
                        id: partner.id,
                        fullName: partner.name,
                        email: partner.email,
                        password: partner.password,
                        role: 'partner' as any, // Partner có role là 'partner'
                        department: '' // Partner không có department
                    };
                    userType = 'partner';
                }
            }

            if (user) {
                // Check password (trim whitespace for comparison)
                const userPassword = user.password?.trim() || '';
                const inputPassword = password.trim();
                
                // Debug removed for production
                
                if (userPassword === inputPassword && userPassword !== '') {
                    localStorage.setItem('currentUser', user.fullName);
                    localStorage.setItem('currentUserId', user.id || '');
                    // Map role: 'admin' -> 'admin', 'user' -> 'employee', 'partner' -> 'partner'
                    let roleToStore = 'employee';
                    if (userType === 'partner') {
                        roleToStore = 'partner';
                    } else if (user.role === 'admin') {
                        roleToStore = 'admin';
                    } else {
                        roleToStore = 'employee';
                    }
                    localStorage.setItem('currentUserRole', roleToStore);
                    localStorage.setItem('currentUserDepartment', user.department || '');
                    navigate('/');
                    window.location.reload();
                    return;
                } else {
                    setError('Mật khẩu không đúng! (密码不正确!)');
                }
            } else {
                setError('Email không tồn tại trong hệ thống! (系统中不存在此邮箱!)');
            }
        } catch (err) {
            setError('Lỗi kết nối, vui lòng thử lại. (连接错误，请重试。)');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded shadow-md w-full max-w-sm">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6 uppercase">Đăng nhập hệ thống (系统登录)</h2>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            Email đăng nhập (登录邮箱)
                        </label>
                        <input
                            type="email"
                            id="email"
                            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy"
                            placeholder="admin@phonglive.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                            Mật khẩu (密码)
                        </label>
                        <input
                            type="password"
                            id="password"
                            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy"
                            placeholder="••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full bg-brand-navy text-white font-bold py-2 px-4 rounded hover:bg-brand-darkNavy transition duration-200 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'Đang kiểm tra... (检查中...)' : 'Vào hệ thống (进入系统)'}
                    </button>
                </form>
            </div>
        </div>
    );
};
