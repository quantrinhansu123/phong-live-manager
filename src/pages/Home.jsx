import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  Edit3,
  ArrowRight,
  FileText,
} from "lucide-react";

function Home() {
  const [userRole, setUserRole] = useState("user");

  useEffect(() => {
    // Get user role from localStorage
    const role = localStorage.getItem("userRole") || "user";
    setUserRole(role);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Hệ thống quản trị toàn diện
          </h2>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <a
            href="/bao-cao-chi-tiet"
            className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border border-gray-100 hover:border-blue-200 flex items-start gap-4"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition flex-shrink-0">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-grow">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Báo cáo chi tiết
              </h3>
              <p className="text-gray-500 text-sm mb-3">
                Xem báo cáo chi tiết về hiệu suất
              </p>
              <div className="text-blue-600 font-medium flex items-center text-sm">
                Truy cập
                <ArrowRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition" />
              </div>
            </div>
          </a>

          <a
            href="/bao-cao-marketing"
            className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border border-gray-100 hover:border-green-200 flex items-start gap-4"
          >
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-grow">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Báo cáo Marketing
              </h3>
              <p className="text-gray-500 text-sm mb-3">
                Phân tích và báo cáo marketing
              </p>
              <div className="text-green-600 font-medium flex items-center text-sm">
                Truy cập
                <ArrowRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition" />
              </div>
            </div>
          </a>

          <a
            href="/bao-cao-hieu-suat-kpi"
            className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border border-gray-100 hover:border-indigo-200 flex items-start gap-4"
          >
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition flex-shrink-0">
              <BarChart3 className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-grow">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Báo cáo hiệu suất KPI
              </h3>
              <p className="text-gray-500 text-sm mb-3">Theo dõi chỉ số KPI</p>
              <div className="text-indigo-600 font-medium flex items-center text-sm">
                Truy cập
                <ArrowRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition" />
              </div>
            </div>
          </a>

          <a
            href="/van-don"
            className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border border-gray-100 hover:border-teal-200 flex items-start gap-4"
          >
            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center group-hover:bg-teal-100 transition flex-shrink-0">
              <FileText className="w-6 h-6 text-teal-600" />
            </div>
            <div className="flex-grow">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Quản lý vận đơn
              </h3>
              <p className="text-gray-500 text-sm mb-3">
                Theo dõi và quản lý vận đơn
              </p>
              <div className="text-teal-600 font-medium flex items-center text-sm">
                Truy cập
                <ArrowRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition" />
              </div>
            </div>
          </a>

          {userRole === "admin" && (
            <a
              href="/nhan-su"
              className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border border-gray-100 hover:border-purple-200 flex items-start gap-4"
            >
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition flex-shrink-0">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-grow">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Quản lý nhân sự
                </h3>
                <p className="text-gray-500 text-sm mb-3">
                  Quản lý và theo dõi nhân sự
                </p>
                <div className="text-purple-600 font-medium flex items-center text-sm">
                  Truy cập
                  <ArrowRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition" />
                </div>
              </div>
            </a>
          )}

          <a
            href="/gui-bao-cao"
            className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border border-gray-100 hover:border-orange-200 flex items-start gap-4"
          >
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center group-hover:bg-orange-100 transition flex-shrink-0">
              <Edit3 className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-grow">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Gửi báo cáo
              </h3>
              <p className="text-gray-500 text-sm mb-3">
                Gửi báo cáo công việc
              </p>
              <div className="text-orange-600 font-medium flex items-center text-sm">
                Truy cập
                <ArrowRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition" />
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

export default Home;
