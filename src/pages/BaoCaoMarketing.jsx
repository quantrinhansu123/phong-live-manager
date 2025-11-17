import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";
import FilterPanel from "../components/FilterPanel";
import { Pagination } from "../components/shared/Pagination";

export default function BaoCaoMarketing() {
  const [userTeam, setUserTeam] = useState("");
  const [userRole, setUserRole] = useState("user");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");

  const [firebaseReports, setFirebaseReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingStatus, setEditingStatus] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [editingReport, setEditingReport] = useState(null);
  const [deletingReport, setDeletingReport] = useState(null);
  const [openStatusDropdown, setOpenStatusDropdown] = useState(null);

  // Dropdown data from database
  const [products, setProducts] = useState([]);
  const [teams, setTeams] = useState([]);
  const [markets, setMarkets] = useState([]);
  // Custom input states
  const [showCustomProduct, setShowCustomProduct] = useState(false);
  const [showCustomTeam, setShowCustomTeam] = useState(false);
  const [showCustomMarket, setShowCustomMarket] = useState(false);
  const [customProduct, setCustomProduct] = useState("");
  const [customTeam, setCustomTeam] = useState("");
  const [customMarket, setCustomMarket] = useState("");

  // State for HR data
  const [hrData, setHrData] = useState([]);
  const [hrLoading, setHrLoading] = useState(false);

  // Filter / pagination / UI states
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    products: [],
    shifts: [],
    markets: [],
    teams: [],
    searchText: "",
  });
  const [quickSelectValue, setQuickSelectValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  const [availableFilters, setAvailableFilters] = useState({
    products: [],
    shifts: ["Giữa ca", "Hết ca"],
    markets: [],
    teams: [],
  });

  const columnsConfig = [
    { key: "stt", label: "STT" },
    { key: "name", label: "Tên" },
    { key: "email", label: "Email" },
    { key: "date", label: "Ngày" },
    { key: "ca", label: "Ca" },
    { key: "product", label: "Sản phẩm" },
    { key: "market", label: "Thị trường" },
    { key: "tkqc", label: "TKQC" },
    { key: "cpqc", label: "CPQC" },
    { key: "mess_cmt", label: "Mess/Cmt" },
    { key: "orders", label: "Số đơn" },
    { key: "revenue", label: "Doanh số" },
    { key: "actions", label: "Hành động" },
  ];

  const [visibleColumns, setVisibleColumns] = useState(() => {
    const obj = {};
    columnsConfig.forEach((c) => {
      obj[c.key] = true;
    });
    return obj;
  });

  const handleVisibleColumnsChange = (next) => setVisibleColumns(next);

  const leftKeys = [
    "stt",
    "name",
    "email",
    "date",
    "ca",
    "product",
    "market",
    "tkqc",
  ];
  const leftColSpan = leftKeys.reduce(
    (acc, k) => acc + (visibleColumns?.[k] !== false ? 1 : 0),
    0
  );

  // Handle filter changes
  const handleFilterChange = (type, value) => {
    setFilters((prev) => ({
      ...prev,
      [type]: value,
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      products: [],
      shifts: [],
      markets: [],
      teams: [],
      searchText: "",
    });
    setQuickSelectValue("");
    setCurrentPage(1);
  };

  const hasActiveFilters = () => {
    return (
      filters.searchText ||
      filters.startDate ||
      filters.endDate ||
      filters.products.length > 0 ||
      filters.shifts.length > 0 ||
      filters.markets.length > 0 ||
      filters.teams.length > 0
    );
  };

  // Fetch user info from localStorage
  useEffect(() => {
    // Get user info from localStorage
    const userRole = localStorage.getItem("userRole") || "user";
    const userEmail = localStorage.getItem("userEmail") || "";
    const userTeam = localStorage.getItem("userTeam") || "";

    setUserEmail(userEmail || "");
    setUserRole(userRole || "user");
    setUserTeam(userTeam || "");
  }, []);

  // Fetch HR data for team-based filtering
  const fetchHrData = async () => {
    try {
      setHrLoading(true);
      const response = await fetch(
        "https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/datasheet/Nh%C3%A2n_s%E1%BB%B1.json"
      );

      if (response.ok) {
        const data = await response.json();
        const hrArray = Object.entries(data).map(([id, item]) => ({
          id,
          ...item,
        }));
        setHrData(hrArray);
      } else {
        setHrData([]);
      }
    } catch (err) {
      console.error("Error fetching HR data:", err);
      toast.error("Lỗi khi tải dữ liệu nhân sự");
    } finally {
      setHrLoading(false);
    }
  };

  // Fetch Firebase reports
  const fetchFirebaseReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/datasheet/B%C3%A1o_c%C3%A1o_MKT.json"
      );

      if (response.ok) {
        const data = await response.json();
        let reportsArray = Object.entries(data).map(([id, report]) => ({
          id,
          // Map Firebase fields to component fields
          name: report["Tên"] || report.name,
          email: report["Email"] || report.email,
          date: report["Ngày"] || report.date,
          shift: report["ca"] || report.shift,
          product: report["Sản_phẩm"] || report.product,
          market: report["Thị_trường"] || report.market,
          tkqc: report["TKQC"] || report.tkqc,
          cpqc: report["CPQC"] || report.cpqc || 0,
          mess_cmt: report["Số_Mess_Cmt"] || report.mess_cmt || 0,
          orders: report["Số đơn"] || report.orders || 0,
          revenue:
            report["Doanh số"] || report["DS chốt"] || report.revenue || 0,
          team: report["Team"] || report.team,
          status: report.status || "pending",
          // Keep original data for updates
          originalData: report,
        }));

        // Apply role-based filtering
        if (userRole === "admin") {
          // Admin sees all reports - no filtering needed
        } else if (userRole === "leader" && userTeam) {
          // Leader sees reports from their team members
          const teamMembers = hrData
            .filter((hr) => {
              const team = hr["Team"] || hr["Team Sale_mar"] || "";
              return team.toLowerCase().includes(userTeam.toLowerCase());
            })
            .map((hr) => ({
              name: hr["Họ Và Tên"] || "",
              email: hr.email || "",
            }))
            .filter(
              (member) =>
                member.name.trim() !== "" || member.email.trim() !== ""
            );

          reportsArray = reportsArray.filter((report) => {
            return teamMembers.some(
              (member) =>
                (member.name &&
                  report.name &&
                  report.name
                    .toLowerCase()
                    .includes(member.name.toLowerCase())) ||
                (member.email &&
                  report.email &&
                  report.email.toLowerCase() === member.email.toLowerCase())
            );
          });
        } else {
          // Regular user sees only their own reports
          reportsArray = reportsArray.filter(
            (report) =>
              (report.name &&
                userName &&
                report.name.toLowerCase().includes(userName.toLowerCase())) ||
              (report.email &&
                userEmail &&
                report.email.toLowerCase() === userEmail.toLowerCase())
          );
        }

        reportsArray.sort(
          (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
        );
        setFirebaseReports(reportsArray);
      } else {
        setFirebaseReports([]);
      }
    } catch (err) {
      console.error("Error fetching Firebase reports:", err);
      toast.error("Lỗi khi tải dữ liệu báo cáo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHrData();
  }, []);

  useEffect(() => {
    if (hrData.length > 0) {
      fetchFirebaseReports();
    }
  }, [hrData, userRole, userTeam, userEmail, userName]);

  // Load filter data when Firebase reports change
  useEffect(() => {
    loadProductsFromFirebase();
    loadTeamsFromFirebase();
    loadMarketsFromFirebase();
  }, [firebaseReports]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openStatusDropdown && !event.target.closest(".relative")) {
        setOpenStatusDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openStatusDropdown]);

  // Load unique products from Firebase reports only
  const loadProductsFromFirebase = () => {
    try {
      const productsSet = new Set();

      // Load from Firebase reports only
      firebaseReports.forEach((item) => {
        if (item.product && String(item.product).trim()) {
          productsSet.add(String(item.product).trim());
        }
      });

      setProducts(Array.from(productsSet).sort());
      setAvailableFilters((prev) => ({
        ...prev,
        products: Array.from(productsSet).sort(),
      }));
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  // Load unique teams from Firebase reports only
  const loadTeamsFromFirebase = async () => {
    try {
      const teamsSet = new Set();

      // Load from Firebase reports only
      firebaseReports.forEach((item) => {
        if (item.team && String(item.team).trim()) {
          teamsSet.add(String(item.team).trim());
        }
      });

      setTeams(Array.from(teamsSet).sort());
      setAvailableFilters((prev) => ({
        ...prev,
        teams: Array.from(teamsSet).sort(),
      }));
    } catch (error) {
      console.error("Error loading teams:", error);
    }
  };

  // Load unique markets from Firebase reports only
  const loadMarketsFromFirebase = () => {
    try {
      const marketsSet = new Set();

      // Load from Firebase reports only
      firebaseReports.forEach((item) => {
        if (item.market && String(item.market).trim()) {
          marketsSet.add(String(item.market).trim());
        }
      });

      setMarkets(Array.from(marketsSet).sort());
      setAvailableFilters((prev) => ({
        ...prev,
        markets: Array.from(marketsSet).sort(),
      }));
    } catch (error) {
      console.error("Error loading markets:", error);
    }
  };

  // Update report status
  const handleUpdateStatus = async () => {
    if (!editingStatus || !newStatus) return;

    try {
      const response = await fetch(
        `https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/datasheet/B%C3%A1o_c%C3%A1o_MKT/${editingStatus.id}.json`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        toast.success("Cập nhật trạng thái thành công");

        // Update local state
        setFirebaseReports((prev) =>
          prev.map((report) =>
            report.id === editingStatus.id
              ? { ...report, status: newStatus }
              : report
          )
        );

        // Close modal
        setEditingStatus(null);
        setNewStatus("");
      } else {
        throw new Error("Failed to update status");
      }
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("Lỗi khi cập nhật trạng thái");
    }
  };

  // Quick update status directly from dropdown
  const handleQuickStatusChange = async (reportId, newStatus) => {
    try {
      const response = await fetch(
        `https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/datasheet/B%C3%A1o_c%C3%A1o_MKT/${reportId}.json`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        toast.success("Cập nhật trạng thái thành công");

        // Update local state
        setFirebaseReports((prev) =>
          prev.map((report) =>
            report.id === reportId ? { ...report, status: newStatus } : report
          )
        );

        // Close dropdown
        setOpenStatusDropdown(null);
      } else {
        throw new Error("Failed to update status");
      }
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("Lỗi khi cập nhật trạng thái");
    }
  };

  // Toggle status dropdown
  const toggleStatusDropdown = (reportId) => {
    setOpenStatusDropdown(openStatusDropdown === reportId ? null : reportId);
  };

  // Open edit status modal
  const openEditStatus = (report) => {
    setEditingStatus(report);
    setNewStatus(report.status || "pending");
  };

  // Close edit status modal
  const closeEditStatus = () => {
    setEditingStatus(null);
    setNewStatus("");
  };

  // Open edit report modal
  const openEditReport = (report) => {
    setEditingReport({ ...report });
    // Reset custom input states
    setShowCustomProduct(false);
    setShowCustomTeam(false);
    setShowCustomMarket(false);
    setCustomProduct("");
    setCustomTeam("");
    setCustomMarket("");
  };

  // Close edit report modal
  const closeEditReport = () => {
    setEditingReport(null);
    setShowCustomProduct(false);
    setShowCustomTeam(false);
    setShowCustomMarket(false);
    setCustomProduct("");
    setCustomTeam("");
    setCustomMarket("");
  };

  // Update report
  const handleUpdateReport = async () => {
    if (!editingReport) return;

    try {
      // Use custom values if provided
      const finalProduct = showCustomProduct
        ? customProduct
        : editingReport.product;
      const finalTeam = showCustomTeam ? customTeam : editingReport.team;
      const finalMarket = showCustomMarket
        ? customMarket
        : editingReport.market;

      const updateData = {
        Tên: editingReport.name,
        Email: editingReport.email,
        Ngày: editingReport.date,
        ca: editingReport.shift,
        Sản_phẩm: finalProduct,
        Thị_trường: finalMarket,
        TKQC: editingReport.tkqc,
        CPQC: Number(editingReport.cpqc) || 0,
        Số_Mess_Cmt: Number(editingReport.mess_cmt) || 0,
        "Số đơn": Number(editingReport.orders) || 0,
        "Doanh số": Number(editingReport.revenue) || 0,
        Team: finalTeam,
        status: editingReport.status || "pending",
      };

      const response = await fetch(
        `https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/datasheet/B%C3%A1o_c%C3%A1o_MKT/${editingReport.id}.json`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        }
      );

      if (response.ok) {
        toast.success("Cập nhật báo cáo thành công");

        // Update local state
        setFirebaseReports((prev) =>
          prev.map((report) =>
            report.id === editingReport.id
              ? { ...report, ...updateData }
              : report
          )
        );

        closeEditReport();
        await fetchFirebaseReports();
      } else {
        throw new Error("Failed to update report");
      }
    } catch (err) {
      console.error("Error updating report:", err);
      toast.error("Lỗi khi cập nhật báo cáo");
    }
  };

  // Open delete confirmation modal
  const openDeleteConfirm = (report) => {
    setDeletingReport(report);
  };

  // Close delete confirmation modal
  const closeDeleteConfirm = () => {
    setDeletingReport(null);
  };

  // Delete report
  const handleDeleteReport = async () => {
    if (!deletingReport) return;

    try {
      const response = await fetch(
        `https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/datasheet/B%C3%A1o_c%C3%A1o_MKT/${deletingReport.id}.json`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        toast.success("Xóa báo cáo thành công");

        // Update local state
        setFirebaseReports((prev) =>
          prev.filter((report) => report.id !== deletingReport.id)
        );
        closeDeleteConfirm();
      } else {
        throw new Error("Failed to delete report");
      }
    } catch (err) {
      console.error("Error deleting report:", err);
      toast.error("Lỗi khi xóa báo cáo");
    }
  };

  // Filter Firebase reports
  const filteredFirebaseReports = useMemo(() => {
    let filtered = [...firebaseReports];

    // Search by text (name, email, TKQC)
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter(
        (report) =>
          (report.name && report.name.toLowerCase().includes(searchLower)) ||
          (report.email && report.email.toLowerCase().includes(searchLower)) ||
          String(report.tkqc || "")
            .toLowerCase()
            .includes(searchLower)
      );
    }

    // Date filter
    if (filters.startDate || filters.endDate) {
      filtered = filtered.filter((report) => {
        if (!report.date) return false;
        const reportDate = new Date(report.date);

        if (filters.startDate) {
          const start = new Date(filters.startDate);
          start.setHours(0, 0, 0, 0);
          if (reportDate < start) return false;
        }

        if (filters.endDate) {
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          if (reportDate > end) return false;
        }

        return true;
      });
    }

    // Product filter
    if (filters.products && filters.products.length > 0) {
      filtered = filtered.filter((report) =>
        filters.products.includes(report.product)
      );
    }

    // Shift filter
    if (filters.shifts && filters.shifts.length > 0) {
      filtered = filtered.filter((report) =>
        filters.shifts.includes(report.shift)
      );
    }

    // Market filter
    if (filters.markets && filters.markets.length > 0) {
      filtered = filtered.filter((report) =>
        filters.markets.includes(report.market)
      );
    }

    // Team filter
    if (filters.teams && filters.teams.length > 0) {
      filtered = filtered.filter((report) =>
        filters.teams.includes(report.team)
      );
    }

    return filtered;
  }, [firebaseReports, filters]);

  // Paginated reports for display
  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredFirebaseReports.slice(startIndex, endIndex);
  }, [filteredFirebaseReports, currentPage, itemsPerPage]);

  // Calculate totals for filtered reports
  const totals = useMemo(() => {
    return filteredFirebaseReports.reduce(
      (acc, report) => {
        acc.cpqc += Number(report.cpqc) || 0;
        acc.mess_cmt += Number(report.mess_cmt) || 0;
        acc.orders += Number(report.orders) || 0;
        acc.revenue += Number(report.revenue) || 0;
        return acc;
      },
      { cpqc: 0, mess_cmt: 0, orders: 0, revenue: 0 }
    );
  }, [filteredFirebaseReports]);

  // Pagination calculations
  const totalItems = filteredFirebaseReports.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Determine if user can edit/delete reports
  const canEditStatus = true;

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN");
    } catch (e) {
      return dateString;
    }
  };

  // Format date for filter (YYYY-MM-DD)
  const formatDateForFilter = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleQuickDateSelect = (e) => {
    const value = e.target.value;
    setQuickSelectValue(value);
    if (!value) return;

    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (value) {
      case "today":
        startDate = new Date(today);
        endDate = new Date(today);
        break;
      case "yesterday":
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 1);
        endDate = new Date(startDate);
        break;
      case "last-week": {
        const lastWeekMonday = new Date(today);
        const daysToSubtract = ((today.getDay() + 6) % 7) + 7;
        lastWeekMonday.setDate(today.getDate() - daysToSubtract);

        const lastWeekEnd = new Date(lastWeekMonday);
        lastWeekEnd.setDate(lastWeekMonday.getDate() + 6);

        startDate = lastWeekMonday;
        endDate = lastWeekEnd;
        break;
      }
      case "this-week": {
        const thisWeekMonday = new Date(today);
        const daysToSubtract = (today.getDay() + 6) % 7;
        thisWeekMonday.setDate(today.getDate() - daysToSubtract);

        const thisWeekEnd = new Date(thisWeekMonday);
        thisWeekEnd.setDate(thisWeekMonday.getDate() + 6);

        startDate = thisWeekMonday;
        endDate = thisWeekEnd;
        break;
      }
      case "next-week": {
        const nextWeekMonday = new Date(today);
        let daysToAdd = (8 - today.getDay()) % 7;
        if (daysToAdd === 0) daysToAdd = 7;
        nextWeekMonday.setDate(today.getDate() + daysToAdd);

        const nextWeekEnd = new Date(nextWeekMonday);
        nextWeekEnd.setDate(nextWeekMonday.getDate() + 6);

        startDate = nextWeekMonday;
        endDate = nextWeekEnd;
        break;
      }
      case "this-month":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      default:
        if (value.startsWith("month-")) {
          const month = parseInt(value.split("-")[1]) - 1;
          startDate = new Date(today.getFullYear(), month, 1);
          endDate = new Date(today.getFullYear(), month + 1, 0);
        } else if (value.startsWith("q")) {
          const quarter = parseInt(value.slice(1));
          const quarterStartMonth = (quarter - 1) * 3;
          startDate = new Date(today.getFullYear(), quarterStartMonth, 1);
          endDate = new Date(today.getFullYear(), quarterStartMonth + 3, 0);
        }
        break;
    }

    setFilters((prev) => ({
      ...prev,
      startDate: formatDateForFilter(startDate),
      endDate: formatDateForFilter(endDate),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải báo cáo Marketing...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto px-8 py-8 bg-white">
        {/* Header - Nằm ngoài div chứa bảng */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="text-sm text-gray-600 hover:text-gray-800 flex-shrink-0 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </Link>
          <h2 className="text-2xl font-bold text-primary uppercase text-center flex-1">
            Báo cáo Marketing
          </h2>
          <button
            onClick={fetchFirebaseReports}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-700 transition flex-shrink-0 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Search bar - Nằm ngoài div chứa bảng */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <input
              type="text"
              value={filters.searchText || ""}
              onChange={(e) => handleFilterChange("searchText", e.target.value)}
              placeholder="Tìm kiếm tên, email, TKQC..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* FilterPanel - Nằm ngoài div chứa bảng */}
        <FilterPanel
          activeTab={"firebase"}
          filters={filters}
          handleFilterChange={handleFilterChange}
          quickSelectValue={quickSelectValue}
          handleQuickDateSelect={handleQuickDateSelect}
          availableFilters={availableFilters}
          userRole={userRole}
          hasActiveFilters={hasActiveFilters}
          clearAllFilters={clearAllFilters}
          variant="topbar"
          columnsConfig={columnsConfig}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={handleVisibleColumnsChange}
        />

        {/* Bảng và nội dung liên quan - Có background và border */}
        <div className="bg-white rounded-lg shadow-md border border-gray-300 overflow-hidden mt-6">
          {firebaseReports.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Chưa có báo cáo</p>
              <p className="text-gray-400 text-sm mt-2">
                Hãy gửi báo cáo mới từ form "Gửi báo cáo"
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-gray-600 px-6 pt-4">
                Hiển thị:{" "}
                <span className="font-semibold text-primary">
                  {paginatedReports.length}
                </span>{" "}
                / {totalItems} báo cáo (Trang {currentPage} / {totalPages})
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                  <thead className="bg-secondary">
                    <tr>
                      {visibleColumns?.stt !== false && (
                        <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">
                          STT
                        </th>
                      )}
                      {visibleColumns?.name !== false && (
                        <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">
                          Tên
                        </th>
                      )}
                      {visibleColumns?.email !== false && (
                        <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">
                          Email
                        </th>
                      )}
                      {visibleColumns?.date !== false && (
                        <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">
                          Ngày
                        </th>
                      )}
                      {visibleColumns?.ca !== false && (
                        <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">
                          Ca
                        </th>
                      )}
                      {visibleColumns?.product !== false && (
                        <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">
                          Sản phẩm
                        </th>
                      )}
                      {visibleColumns?.market !== false && (
                        <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">
                          Thị trường
                        </th>
                      )}
                      {visibleColumns?.tkqc !== false && (
                        <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">
                          TKQC
                        </th>
                      )}
                      {visibleColumns?.cpqc !== false && (
                        <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">
                          CPQC
                        </th>
                      )}
                      {visibleColumns?.mess_cmt !== false && (
                        <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">
                          Mess/Cmt
                        </th>
                      )}
                      {visibleColumns?.orders !== false && (
                        <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">
                          Số đơn
                        </th>
                      )}
                      {visibleColumns?.revenue !== false && (
                        <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">
                          Doanh số
                        </th>
                      )}
                      {canEditStatus && visibleColumns?.actions !== false && (
                        <th className="px-2 py-2 text-center text-sm font-semibold text-white uppercase tracking-wider border border-gray-400 whitespace-nowrap">
                          Hành động
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {/* Total row */}
                    <tr className="bg-green-700 font-semibold border-b-4 border-yellow-500">
                      <td
                        colSpan={leftColSpan}
                        className="px-2 py-3 text-left pl-5 text-sm font-bold text-white border border-gray-300"
                      >
                        TỔNG CỘNG
                      </td>
                      {visibleColumns?.cpqc !== false && (
                        <td className="px-2 py-3 whitespace-nowrap text-sm font-bold text-right text-white border border-gray-300">
                          {totals.cpqc.toLocaleString("vi-VN")} đ
                        </td>
                      )}
                      {visibleColumns?.mess_cmt !== false && (
                        <td className="px-2 py-3 whitespace-nowrap text-sm font-bold text-right text-white border border-gray-300">
                          {totals.mess_cmt.toLocaleString("vi-VN")}
                        </td>
                      )}
                      {visibleColumns?.orders !== false && (
                        <td className="px-2 py-3 whitespace-nowrap text-sm font-bold text-right text-white border border-gray-300">
                          {totals.orders.toLocaleString("vi-VN")}
                        </td>
                      )}
                      {visibleColumns?.revenue !== false && (
                        <td className="px-2 py-3 whitespace-nowrap text-sm font-bold text-right text-white border border-gray-300">
                          {totals.revenue.toLocaleString("vi-VN")} đ
                        </td>
                      )}
                      {canEditStatus && visibleColumns?.actions !== false && (
                        <td className="px-2 py-3 whitespace-nowrap text-sm font-medium border border-gray-300 text-center">
                          -
                        </td>
                      )}
                    </tr>
                    {paginatedReports.map((report, index) => {
                      const actualIndex =
                        (currentPage - 1) * itemsPerPage + index + 1;
                      return (
                        <tr key={report.id} className="hover:bg-gray-50">
                          {visibleColumns?.stt !== false && (
                            <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                              {actualIndex}
                            </td>
                          )}
                          {visibleColumns?.name !== false && (
                            <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                              {report.name}
                            </td>
                          )}
                          {visibleColumns?.email !== false && (
                            <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-600 border border-gray-300">
                              {report.email}
                            </td>
                          )}
                          {visibleColumns?.date !== false && (
                            <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                              {formatDate(report.date)}
                            </td>
                          )}
                          {visibleColumns?.ca !== false && (
                            <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                              {report.shift}
                            </td>
                          )}
                          {visibleColumns?.product !== false && (
                            <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                              {report.product}
                            </td>
                          )}
                          {visibleColumns?.market !== false && (
                            <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                              {report.market}
                            </td>
                          )}
                          {visibleColumns?.tkqc !== false && (
                            <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-600 border border-gray-300">
                              {report.tkqc}
                            </td>
                          )}
                          {visibleColumns?.cpqc !== false && (
                            <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-right text-gray-900 border border-gray-300">
                              {report.cpqc?.toLocaleString("vi-VN")}đ
                            </td>
                          )}
                          {visibleColumns?.mess_cmt !== false && (
                            <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-right text-gray-900 border border-gray-300">
                              {report.mess_cmt?.toLocaleString("vi-VN")}
                            </td>
                          )}
                          {visibleColumns?.orders !== false && (
                            <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-right text-gray-900 border border-gray-300">
                              {report.orders?.toLocaleString("vi-VN")}
                            </td>
                          )}
                          {visibleColumns?.revenue !== false && (
                            <td className="px-2 py-2 whitespace-nowrap text-sm font-semibold text-right text-primary border border-gray-300">
                              {report.revenue?.toLocaleString("vi-VN")}đ
                            </td>
                          )}
                          {canEditStatus &&
                            visibleColumns?.actions !== false && (
                              <td className="px-2 py-2 whitespace-nowrap text-sm font-medium border border-gray-300 text-center">
                                <div className="flex gap-2 justify-center">
                                  <button
                                    onClick={() => openEditReport(report)}
                                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-xs"
                                    title="Sửa báo cáo"
                                  >
                                    Sửa
                                  </button>
                                  <button
                                    onClick={() => openDeleteConfirm(report)}
                                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-xs"
                                    title="Xóa báo cáo"
                                  >
                                    Xóa
                                  </button>
                                </div>
                              </td>
                            )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredFirebaseReports.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">
                    Không có dữ liệu phù hợp với bộ lọc
                  </p>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Edit Status Modal */}
        {editingStatus && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4 text-gray-800">
                Cập nhật trạng thái báo cáo
              </h3>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Báo cáo của:{" "}
                  <span className="font-semibold">{editingStatus.name}</span>
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Ngày:{" "}
                  <span className="font-semibold">
                    {formatDate(editingStatus.date)}
                  </span>
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Sản phẩm:{" "}
                  <span className="font-semibold">{editingStatus.product}</span>
                </p>

                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trạng thái mới
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Chờ xử lý</option>
                  <option value="synced">Đã sync</option>
                  <option value="error">Lỗi</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleUpdateStatus}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Lưu
                </button>
                <button
                  onClick={closeEditStatus}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Report Modal */}
        {editingReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 rounded-t-lg sticky top-0 z-10">
                <h3 className="text-xl font-bold text-white">
                  ✏️ Chỉnh sửa báo cáo Marketing
                </h3>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tên */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editingReport.name || ""}
                      onChange={(e) =>
                        setEditingReport({
                          ...editingReport,
                          name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nhập tên"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={editingReport.email || ""}
                      onChange={(e) =>
                        setEditingReport({
                          ...editingReport,
                          email: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nhập email"
                    />
                  </div>

                  {/* Ngày */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ngày <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={editingReport.date || ""}
                      onChange={(e) =>
                        setEditingReport({
                          ...editingReport,
                          date: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Ca */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ca <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editingReport.shift || ""}
                      onChange={(e) =>
                        setEditingReport({
                          ...editingReport,
                          shift: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">-- Chọn ca --</option>
                      <option value="Giữa ca">Giữa ca</option>
                      <option value="Hết ca">Hết ca</option>
                    </select>
                  </div>

                  {/* Sản phẩm */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sản phẩm <span className="text-red-500">*</span>
                    </label>
                    {showCustomProduct ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customProduct}
                          onChange={(e) => setCustomProduct(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Nhập sản phẩm mới"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomProduct(false);
                            setCustomProduct("");
                          }}
                          className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <select
                        value={editingReport.product || ""}
                        onChange={(e) => {
                          if (e.target.value === "__custom__") {
                            setShowCustomProduct(true);
                            setEditingReport({ ...editingReport, product: "" });
                          } else {
                            setEditingReport({
                              ...editingReport,
                              product: e.target.value,
                            });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">-- Chọn sản phẩm --</option>
                        {products.map((product) => (
                          <option key={product} value={product}>
                            {product}
                          </option>
                        ))}
                        <option value="__custom__">➕ Thêm mới</option>
                      </select>
                    )}
                  </div>

                  {/* Thị trường */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Thị trường <span className="text-red-500">*</span>
                    </label>
                    {showCustomMarket ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customMarket}
                          onChange={(e) => setCustomMarket(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Nhập thị trường mới"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomMarket(false);
                            setCustomMarket("");
                          }}
                          className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <select
                        value={editingReport.market || ""}
                        onChange={(e) => {
                          if (e.target.value === "__custom__") {
                            setShowCustomMarket(true);
                            setEditingReport({ ...editingReport, market: "" });
                          } else {
                            setEditingReport({
                              ...editingReport,
                              market: e.target.value,
                            });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">-- Chọn thị trường --</option>
                        {markets.map((market) => (
                          <option key={market} value={market}>
                            {market}
                          </option>
                        ))}
                        <option value="__custom__">➕ Thêm mới</option>
                      </select>
                    )}
                  </div>

                  {/* TKQC */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      TKQC <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editingReport.tkqc || ""}
                      onChange={(e) =>
                        setEditingReport({
                          ...editingReport,
                          tkqc: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nhập TKQC"
                    />
                  </div>

                  {/* Team */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team
                    </label>
                    {showCustomTeam ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customTeam}
                          onChange={(e) => setCustomTeam(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Nhập team mới"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomTeam(false);
                            setCustomTeam("");
                          }}
                          className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <select
                        value={editingReport.team || ""}
                        onChange={(e) => {
                          if (e.target.value === "__custom__") {
                            setShowCustomTeam(true);
                            setEditingReport({ ...editingReport, team: "" });
                          } else {
                            setEditingReport({
                              ...editingReport,
                              team: e.target.value,
                            });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">-- Chọn team --</option>
                        {teams.map((team) => (
                          <option key={team} value={team}>
                            {team}
                          </option>
                        ))}
                        <option value="__custom__">➕ Thêm mới</option>
                      </select>
                    )}
                  </div>

                  {/* CPQC */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chi phí QC (đ)
                    </label>
                    <input
                      type="number"
                      value={editingReport.cpqc || 0}
                      onChange={(e) =>
                        setEditingReport({
                          ...editingReport,
                          cpqc: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>

                  {/* Mess/Cmt */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mess/Comment
                    </label>
                    <input
                      type="number"
                      value={editingReport.mess_cmt || 0}
                      onChange={(e) =>
                        setEditingReport({
                          ...editingReport,
                          mess_cmt: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>

                  {/* Số đơn */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Số đơn
                    </label>
                    <input
                      type="number"
                      value={editingReport.orders || 0}
                      onChange={(e) =>
                        setEditingReport({
                          ...editingReport,
                          orders: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>

                  {/* Doanh số */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Doanh số (đ)
                    </label>
                    <input
                      type="number"
                      value={editingReport.revenue || 0}
                      onChange={(e) =>
                        setEditingReport({
                          ...editingReport,
                          revenue: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Required fields note */}
                <p className="text-sm text-gray-500 mt-4">
                  <span className="text-red-500">*</span> Các trường bắt buộc
                </p>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end gap-3 sticky bottom-0">
                <button
                  onClick={closeEditReport}
                  className="px-5 py-2.5 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors"
                >
                  ✗ Hủy
                </button>
                <button
                  onClick={handleUpdateReport}
                  className="px-5 py-2.5 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors"
                >
                  ✓ Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-600 to-pink-600 px-6 py-4 rounded-t-lg">
                <h3 className="text-xl font-bold text-white">
                  ⚠️ Xác nhận xóa báo cáo
                </h3>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-gray-700 mb-4">
                  Bạn có chắc chắn muốn xóa báo cáo này không?
                </p>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
                  <p className="text-sm">
                    <span className="font-semibold text-gray-700">Tên:</span>{" "}
                    <span className="text-gray-900">{deletingReport.name}</span>
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold text-gray-700">Email:</span>{" "}
                    <span className="text-gray-900">
                      {deletingReport.email}
                    </span>
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold text-gray-700">Ngày:</span>{" "}
                    <span className="text-gray-900">
                      {formatDate(deletingReport.date)}
                    </span>
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold text-gray-700">
                      Sản phẩm:
                    </span>{" "}
                    <span className="text-gray-900">
                      {deletingReport.product}
                    </span>
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold text-gray-700">
                      Doanh số:
                    </span>{" "}
                    <span className="text-primary font-semibold">
                      {deletingReport.revenue?.toLocaleString("vi-VN")}đ
                    </span>
                  </p>
                </div>

                <p className="text-red-600 font-medium text-sm mt-4">
                  ⚠️ Hành động này không thể hoàn tác!
                </p>
              </div>

              {/* Actions */}
              <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end gap-3">
                <button
                  onClick={closeDeleteConfirm}
                  className="px-5 py-2.5 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors"
                >
                  ✗ Hủy
                </button>
                <button
                  onClick={handleDeleteReport}
                  className="px-5 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  🗑️ Xóa báo cáo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
