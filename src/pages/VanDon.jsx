import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Pagination } from "../components/shared/Pagination";
// Removed Firebase SDK usage. Will use REST endpoints directly.
import FilterPanel from "../components/FilterPanel";
import { ArrowLeft } from "lucide-react";

export default function VanDon() {
  // Get user info from localStorage
  const userRole = localStorage.getItem("userRole") || "user";
  const userEmail = localStorage.getItem("userEmail") || "";
  const userTeam = localStorage.getItem("userTeam") || "";

  // Filters state
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    products: [],
    shifts: [],
    // markets removed per request
    teams: [],
    paymentMethod: [],
    searchText: "",
  });

  // Quick select and available filters for the sidebar
  const [quickSelectValue, setQuickSelectValue] = useState("");
  const [availableFilters, setAvailableFilters] = useState({
    products: [],
    shifts: ["Giữa ca", "Hết ca"],
    // markets intentionally omitted for this page
    teams: [],
    paymentMethods: [],
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [editingFullOrder, setEditingFullOrder] = useState(null);
  const [editFormData, setEditFormData] = useState({
    "Mã đơn hàng": "",
    "Name*": "",
    "Phone*": "",
    Add: "",
    City: "",
    State: "",
    "Mặt hàng": "",
    "Số lượng mặt hàng 1": "",
    "Giá bán": "",
    "Tổng tiền VNĐ": "",
    "Nhân viên Marketing": "",
    "Nhân viên Sale": "",
    Team: "",
    Ca: "",
    "Ngày lên đơn": "",
    "Trạng thái đơn": "",
    "Hình thức thanh toán": "",
  });
  const itemsPerPage = 50;

  // Status dropdown state
  const [openStatusDropdown, setOpenStatusDropdown] = useState(null);

  // Local data state to avoid reloading from Firebase
  const [localF3Data, setLocalF3Data] = useState([]);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    stt: true,
    orderCode: true,
    customerName: true,
    phone: true,
    address: true,
    product: true,
    quantity: true,
    price: true,
    totalVND: true,
    marketing: true,
    sale: true,
    team: true,
    shift: true,
    orderDate: true,
    status: true,
    paymentMethod: true,
  });

  // Configuration for columns shown in the FilterPanel
  const columnsConfig = [
    { key: "stt", label: "STT" },
    { key: "orderCode", label: "Mã đơn hàng" },
    { key: "customerName", label: "Tên khách hàng" },
    { key: "phone", label: "Điện thoại" },
    { key: "address", label: "Địa chỉ" },
    { key: "product", label: "Mặt hàng" },
    { key: "quantity", label: "Số lượng" },
    { key: "price", label: "Giá bán" },
    { key: "totalVND", label: "Tổng tiền VNĐ" },
    { key: "marketing", label: "NV Marketing" },
    { key: "sale", label: "NV Sale" },
    { key: "team", label: "Team" },
    { key: "shift", label: "Ca" },
    { key: "orderDate", label: "Ngày lên đơn" },
    { key: "status", label: "Trạng thái đơn" },
    { key: "paymentMethod", label: "Hình thức TT" },
  ];

  // Column order state for drag and drop
  const [columnOrder, setColumnOrder] = useState([
    "stt",
    "orderCode",
    "customerName",
    "phone",
    "address",
    "product",
    "quantity",
    "price",
    "totalVND",
    "marketing",
    "sale",
    "team",
    "shift",
    "orderDate",
    "status",
    "paymentMethod",
  ]);

  // Drag and drop handlers
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [isReordering, setIsReordering] = useState(false);

  const [showSuccessRipple, setShowSuccessRipple] = useState(false);
  const [ripplePosition, setRipplePosition] = useState({ x: 0, y: 0 });
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({
    column: "orderDate",
    direction: "desc",
  });

  // Check if user can edit status - All roles can edit
  const canEditStatus = true;

  // Check if user can edit full order details - All roles can edit
  const canEditFullOrder = true;

  // Helper function to get status styling
  const getStatusStyle = (status) => {
    switch (status) {
      case "Đơn hợp lệ":
        return "bg-green-100 text-green-800";
      case "Đơn hủy":
        return "bg-red-100 text-red-800";
      case "Đơn chờ xử lý":
        return "bg-yellow-100 text-yellow-800";
      case "Chưa xác định":
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Log change function
  const logChange = async (
    orderId,
    changeType,
    oldValue,
    newValue,
    orderData = null
  ) => {
    try {
      const changeLogsUrl =
        "https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/ChangeLog.json";

      const logData = {
        orderId,
        changeType, // 'status_change', 'full_update', 'revert_status', 'revert_full_update'
        oldValue,
        newValue,
        userEmail,
        userRole,
        timestamp: new Date().toISOString(),
        orderCode: orderData ? orderData["Mã đơn hàng"] : null,
        customerName: orderData
          ? orderData["Name*"] || orderData["Tên lên đơn"]
          : null,
        reverted: false, // Thêm trường để track trạng thái hoàn tác
      };

      await fetch(changeLogsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(logData),
      });
    } catch (error) {
      console.error("Error logging change:", error);
      // Don't throw error to avoid breaking the main update flow
    }
  };

  // Helper to get column cell string value by columnKey (used for A-Z filtering)
  const getColumnValue = (item, columnKey) => {
    switch (columnKey) {
      case "stt":
        return "";
      case "orderCode":
        return item["Mã đơn hàng"] || "";
      case "customerName":
        return item["Name*"] || item["Tên lên đơn"] || "";
      case "phone":
        return item["Phone*"] || "";
      case "address":
        return [item["Add"], item["City"], item["State"]]
          .filter(Boolean)
          .join(", ");
      case "product":
        return item["Mặt hàng"] || item["Tên mặt hàng 1"] || "";
      case "quantity":
        return String(item["Số lượng mặt hàng 1"] || "");
      case "price":
        return String(item["Giá bán"] || "");
      case "totalVND":
        return String(item["Tổng tiền VNĐ"] || "");
      case "marketing":
        return item["Nhân viên Marketing"] || "";
      case "sale":
        return item["Nhân viên Sale"] || "";
      case "team":
        return item["Team"] || "";
      case "shift":
        return item["Ca"] || "";
      case "orderDate":
        return item["Ngày lên đơn"]
          ? new Date(item["Ngày lên đơn"]).toLocaleDateString("vi-VN")
          : "";
      case "status":
        return item["Trạng thái đơn"] || "";
      case "paymentMethod":
        return item["Hình thức thanh toán"] || "";
      default:
        return "";
    }
  };

  const toggleSort = (columnKey) => {
    setSortConfig((prev) => {
      if (prev.column !== columnKey)
        return { column: columnKey, direction: "asc" };
      if (prev.direction === "asc")
        return { column: columnKey, direction: "desc" };
      return { column: null, direction: null };
    });
    setCurrentPage(1);
  };

  // Toggle column visibility
  const toggleColumn = (columnKey) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };

  // Select all columns
  const selectAllColumns = () => {
    const allVisible = {};
    Object.keys(visibleColumns).forEach((key) => {
      allVisible[key] = true;
    });
    setVisibleColumns(allVisible);
  };

  // Deselect all columns
  const deselectAllColumns = () => {
    const allHidden = {};
    Object.keys(visibleColumns).forEach((key) => {
      allHidden[key] = false;
    });
    setVisibleColumns(allHidden);
  };

  // Drag and drop handlers
  const handleDragStart = (e, columnKey) => {
    setDraggedColumn(columnKey);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", columnKey);

    // Create custom drag image
    const dragImage = e.target.cloneNode(true);
    dragImage.style.position = "absolute";
    dragImage.style.top = "-1000px";
    dragImage.style.opacity = "0.8";
    dragImage.style.transform = "rotate(5deg)";
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(
      dragImage,
      e.target.offsetWidth / 2,
      e.target.offsetHeight / 2
    );

    // Add visual feedback for dragged element
    setTimeout(() => {
      const draggedElement = e.target;
      draggedElement.style.opacity = "0.3";
      draggedElement.style.transform = "scale(1.1) rotate(3deg)";
      draggedElement.style.boxShadow = "0 10px 30px rgba(0,0,0,0.4)";
      draggedElement.style.zIndex = "1000";

      // Remove the temporary drag image
      document.body.removeChild(dragImage);
    }, 0);
  };

  const handleDragOver = (e, columnKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    // Set drop target for visual feedback
    if (columnKey !== draggedColumn) {
      setDropTarget(columnKey);
    }
  };

  const handleDragLeave = (e) => {
    // Clear drop target when leaving
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDropTarget(null);
    }
  };

  const handleDrop = (e, targetColumnKey) => {
    e.preventDefault();

    if (!draggedColumn || draggedColumn === targetColumnKey) {
      setDraggedColumn(null);
      setDropTarget(null);
      return;
    }

    // Get drop position for ripple effect
    const rect = e.currentTarget.getBoundingClientRect();
    setRipplePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setShowSuccessRipple(true);

    // Add a small delay for visual feedback
    setTimeout(() => {
      const newOrder = [...columnOrder];
      const draggedIndex = newOrder.indexOf(draggedColumn);
      const targetIndex = newOrder.indexOf(targetColumnKey);

      // Remove dragged column and insert at new position
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedColumn);

      setColumnOrder(newOrder);
      setDraggedColumn(null);
      setDropTarget(null);

      // Reset ripple effect
      setTimeout(() => {
        setShowSuccessRipple(false);
      }, 300);
    }, 150);
  };

  const handleDragEnd = (e) => {
    // Reset visual feedback
    const draggedElement = e.target;
    draggedElement.style.opacity = "";
    draggedElement.style.transform = "";
    draggedElement.style.boxShadow = "";
    draggedElement.style.zIndex = "";

    setDraggedColumn(null);
    setDropTarget(null);
  };

  // Fetch F3 data
  const [f3Data, setF3Data] = useState([]);
  const [humanResources, setHumanResources] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch F3 data from direct URL
        const F3_URL =
          "https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/datasheet/F3.json";
        const f3Response = await fetch(F3_URL);
        const f3DataRaw = await f3Response.json();

        if (Array.isArray(f3DataRaw)) {
          const dataArray = f3DataRaw.map((item, index) => ({
            id: index.toString(),
            ...item,
          }));
          setF3Data(dataArray);
        } else if (f3DataRaw && typeof f3DataRaw === "object") {
          // Handle object format where keys are IDs
          const dataArray = Object.entries(f3DataRaw).map(([key, value]) => ({
            id: key,
            ...value,
          }));
          setF3Data(dataArray);
        } else {
          setF3Data([]);
        }

        // Fetch human resources data from direct URL
        const HR_URL =
          "https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/datasheet/Nh%C3%A2n_s%E1%BB%B1.json";
        const hrResponse = await fetch(HR_URL);
        const hrDataRaw = await hrResponse.json();

        if (Array.isArray(hrDataRaw)) {
          const hrArray = hrDataRaw.map((item, index) => ({
            id: index.toString(),
            ...item,
          }));
          setHumanResources(hrArray);
        } else {
          setHumanResources([]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filtered F3 data with memoization
  const filteredF3Data = useMemo(() => {
    let filtered = [...f3Data];

    // Role-based access control
    if (userRole === "admin") {
      // Admin: see all data
      // No filtering
    } else if (userRole === "leader") {
      // Leader: get list of team members from HR data, then filter orders by those names
      const teamMembers = humanResources
        .filter((hr) => {
          const team = hr["Team"] || hr["Team Sale_mar"] || "";
          return team.toLowerCase().includes(userTeam.toLowerCase());
        })
        .map((hr) => hr["Họ Và Tên"] || hr["Name"] || hr["Tên"] || "")
        .filter((name) => name.trim() !== "");

      filtered = filtered.filter((item) => {
        const marketing = item["Nhân viên Marketing"] || "";
        const sale = item["Nhân viên Sale"] || "";
        const matches = teamMembers.some(
          (member) =>
            marketing.toLowerCase().includes(member.toLowerCase()) ||
            sale.toLowerCase().includes(member.toLowerCase())
        );
        return matches;
      });
    } else if (userRole === "user") {
      // User: only see their own data (match by name in NV Marketing or NV Sale)
      // Find user's real name from HR data using email
      const userRecord = humanResources.find((hr) => hr.email === userEmail);
      const userName = userRecord
        ? userRecord["Họ Và Tên"]
        : userEmail.split("@")[0]; // Fallback to email prefix if not found

      filtered = filtered.filter((item) => {
        const marketing = item["Nhân viên Marketing"] || "";
        const sale = item["Nhân viên Sale"] || "";
        const matches =
          marketing.toLowerCase().includes(userName.toLowerCase()) ||
          sale.toLowerCase().includes(userName.toLowerCase());
        return matches;
      });
    } else {
      // Other roles: no access
      filtered = [];
    }

    // Search text filter (tìm kiếm toàn văn trong tất cả các trường)
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter((item) => {
        // Tìm kiếm trong tất cả các trường có thể có của item
        const allFields = Object.values(item).filter(
          (value) => value != null && value !== ""
        );
        return allFields.some((field) =>
          String(field).toLowerCase().includes(searchLower)
        );
      });
    }

    // Date filter - using 'Ngày lên đơn'
    if (filters.startDate || filters.endDate) {
      filtered = filtered.filter((item) => {
        const dateStr = item["Ngày lên đơn"];
        if (!dateStr) return true; // Keep records without dates

        try {
          // Try parsing as ISO date or Vietnamese format
          let itemDate;
          if (dateStr.includes("/")) {
            const parts = dateStr.split("/");
            if (parts.length !== 3) return true;
            itemDate = new Date(parts[2], parts[1] - 1, parts[0]);
          } else {
            itemDate = new Date(dateStr);
          }

          if (isNaN(itemDate.getTime())) return true;

          if (filters.startDate) {
            const start = new Date(filters.startDate);
            start.setHours(0, 0, 0, 0);
            if (itemDate < start) return false;
          }

          if (filters.endDate) {
            const end = new Date(filters.endDate);
            end.setHours(23, 59, 59, 999);
            if (itemDate > end) return false;
          }

          return true;
        } catch (e) {
          return true;
        }
      });
    }

    // Product filter - match with 'Mặt hàng' or 'Tên mặt hàng 1'
    if (filters.products && filters.products.length > 0) {
      filtered = filtered.filter((item) => {
        const product = item["Mặt hàng"] || item["Tên mặt hàng 1"];
        return filters.products.some(
          (p) =>
            product &&
            String(product)
              .toLowerCase()
              .includes(String(p || "").toLowerCase())
        );
      });
    }

    // Shift filter - match with 'Ca'
    if (filters.shifts && filters.shifts.length > 0) {
      filtered = filtered.filter((item) => filters.shifts.includes(item["Ca"]));
    }

    // Market filter - can be inferred from address or stored separately
    if (filters.markets && filters.markets.length > 0) {
      filtered = filtered.filter((item) => {
        const market = item["Thị trường"] || item["Market"];
        return filters.markets.some(
          (m) =>
            market &&
            String(market)
              .toLowerCase()
              .includes(String(m || "").toLowerCase())
        );
      });
    }

    // Team filter
    if (filters.teams && filters.teams.length > 0) {
      filtered = filtered.filter((item) =>
        filters.teams.includes(item["Team"])
      );
    }

    // Payment method filter (supports array of selected methods)
    if (
      Array.isArray(filters.paymentMethod) &&
      filters.paymentMethod.length > 0
    ) {
      const lowers = filters.paymentMethod.map((p) =>
        String(p || "").toLowerCase()
      );
      filtered = filtered.filter((item) => {
        const method =
          item["Hình thức thanh toán"] || item["Hình thức TT"] || "";
        const m = String(method).toLowerCase();
        return lowers.some((l) => m.includes(l));
      });
    } else if (
      filters.paymentMethod &&
      typeof filters.paymentMethod === "string"
    ) {
      // backward-compat: single-string filter
      const payLower = String(filters.paymentMethod).toLowerCase();
      filtered = filtered.filter((item) => {
        const method =
          item["Hình thức thanh toán"] || item["Hình thức TT"] || "";
        return String(method).toLowerCase().includes(payLower);
      });
    }

    return filtered;
  }, [f3Data, filters, userRole, userEmail, userTeam, humanResources]);

  // Sync local data with filtered data when filters change
  useEffect(() => {
    setLocalF3Data(filteredF3Data);
  }, [filteredF3Data]);

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

  // Paginate filtered data (apply sorting before pagination)
  const paginatedF3Data = useMemo(() => {
    let source = [...localF3Data];

    // Apply sorting if requested
    if (sortConfig && sortConfig.column) {
      const { column, direction } = sortConfig;

      const collator = new Intl.Collator("vi", {
        sensitivity: "base",
        numeric: true,
      });

      source.sort((a, b) => {
        const va = String(getColumnValue(a, column) || "").trim();
        const vb = String(getColumnValue(b, column) || "").trim();

        // Special handling for dates
        if (column === "orderDate") {
          const da = va ? new Date(va) : new Date(0);
          const db = vb ? new Date(vb) : new Date(0);
          return da - db;
        }

        // Try numeric comparison
        const na = Number(va.toString().replace(/[^0-9.-]+/g, ""));
        const nb = Number(vb.toString().replace(/[^0-9.-]+/g, ""));
        if (
          !Number.isNaN(na) &&
          !Number.isNaN(nb) &&
          va.match(/[0-9]/) &&
          vb.match(/[0-9]/)
        ) {
          return na - nb;
        }

        // Fallback to locale string compare
        return collator.compare(va, vb);
      });

      if (direction === "desc") source.reverse();
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return source.slice(startIndex, endIndex);
  }, [localF3Data, currentPage, itemsPerPage, sortConfig]);

  const totalPages = Math.ceil(localF3Data.length / itemsPerPage);

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Calculate summary stats
  const stats = useMemo(
    () => ({
      totalOrders: localF3Data.length,
      totalRevenue: localF3Data.reduce(
        (sum, item) => sum + (item["Tổng tiền VNĐ"] || 0),
        0
      ),
      validOrders: localF3Data.filter(
        (item) => item["Trạng thái đơn"] === "Đơn hợp lệ"
      ).length,
      avgOrderValue:
        localF3Data.length > 0
          ? localF3Data.reduce(
              (sum, item) => sum + (item["Tổng tiền VNĐ"] || 0),
              0
            ) / localF3Data.length
          : 0,
    }),
    [localF3Data]
  );

  const clearFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      products: [],
      shifts: [],
      // markets removed
      teams: [],
      paymentMethod: [],
      searchText: "",
    });
    setCurrentPage(1);
  };

  // Load available filters from f3Data (full dataset, not filtered)
  useEffect(() => {
    if (f3Data.length > 0) {
      const productsSet = new Set();
      const teamsSet = new Set();
      const shiftsSet = new Set();
      const paymentMethodsSet = new Set();

      f3Data.forEach((item) => {
        if (item["Mặt hàng"]) productsSet.add(String(item["Mặt hàng"]).trim());
        if (item["Team"]) teamsSet.add(String(item["Team"]).trim());
        if (item["Ca"]) shiftsSet.add(String(item["Ca"]).trim());
        if (item["Hình thức thanh toán"])
          paymentMethodsSet.add(String(item["Hình thức thanh toán"]).trim());
      });

      setAvailableFilters({
        products: Array.from(productsSet).sort(),
        shifts: Array.from(shiftsSet).sort(),
        teams: Array.from(teamsSet).sort(),
        paymentMethods: Array.from(paymentMethodsSet).sort(),
      });
    }
  }, [f3Data]);

  // Handle filter value change (checkbox toggles and simple values)
  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => {
      // If caller passed a full array, replace directly
      if (Array.isArray(value)) {
        return { ...prev, [filterType]: value };
      }

      // If the existing filter is an array, toggle the single value
      if (Array.isArray(prev[filterType])) {
        const newValues = prev[filterType].includes(value)
          ? prev[filterType].filter((v) => v !== value)
          : [...prev[filterType], value];
        return { ...prev, [filterType]: newValues };
      }

      // Otherwise set simple value
      return { ...prev, [filterType]: value };
    });
    setCurrentPage(1);
  };

  // Handle quick date range selection
  const handleQuickDateSelect = (e) => {
    const value = e.target ? e.target.value : e;
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
      case "last-week":
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        startDate = lastWeekStart;
        endDate = lastWeekEnd;
        break;
      case "this-week":
        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(today.getDate() - today.getDay());
        const thisWeekEnd = new Date(thisWeekStart);
        thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
        startDate = thisWeekStart;
        endDate = thisWeekEnd;
        break;
      case "next-week":
        const nextWeekStart = new Date(today);
        nextWeekStart.setDate(today.getDate() - today.getDay() + 7);
        const nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
        startDate = nextWeekStart;
        endDate = nextWeekEnd;
        break;
      case "this-month":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      default:
        if (value && value.startsWith("month-")) {
          const month = parseInt(value.split("-")[1]) - 1;
          startDate = new Date(today.getFullYear(), month, 1);
          endDate = new Date(today.getFullYear(), month + 1, 0);
        } else if (
          value === "q1" ||
          value === "q2" ||
          value === "q3" ||
          value === "q4"
        ) {
          const year = today.getFullYear();
          if (value === "q1") {
            startDate = new Date(year, 0, 1);
            endDate = new Date(year, 2, 31);
          }
          if (value === "q2") {
            startDate = new Date(year, 3, 1);
            endDate = new Date(year, 5, 30);
          }
          if (value === "q3") {
            startDate = new Date(year, 6, 1);
            endDate = new Date(year, 8, 30);
          }
          if (value === "q4") {
            startDate = new Date(year, 9, 1);
            endDate = new Date(year, 11, 31);
          }
        }
        break;
    }

    setFilters((prev) => ({
      ...prev,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    }));
  };

  // Quick update order status directly from dropdown
  const handleQuickStatusChange = async (orderId, newStatus) => {
    try {
      // Find the current order to get old status
      const currentOrder = localF3Data.find((item) => item.id === orderId);
      const oldStatus = currentOrder ? currentOrder["Trạng thái đơn"] : null;

      // Note: this project stores canonical data in /datasheet/F3.json.
      // The `/f3_data/<id>` path may not exist in this database. We persist
      // changes directly to `/datasheet/F3` below instead.

      // Log the change with full order data for oldValue
      await logChange(
        orderId,
        "status_change",
        currentOrder,
        newStatus,
        currentOrder
      );

      // Also persist status change to datasheet/F3
      try {
        const BASE_URL =
          "https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app";
        const F3_URL = `${BASE_URL}/datasheet/F3.json`;
        const resp = await fetch(F3_URL);
        const f3DataRaw = await resp.json();

        const orderCode = currentOrder
          ? currentOrder["Mã đơn hàng"] || currentOrder["Mã đơn"] || currentOrder["Mã"]
          : null;

        if (Array.isArray(f3DataRaw)) {
          const idx = f3DataRaw.findIndex((item) => {
            if (!item) return false;
            const code =
              item["Mã đơn hàng"] || item["Mã đơn"] || item["Mã Đơn"] || item["OrderCode"] || item["Mã"];
            return code && orderCode && String(code).trim() === String(orderCode).trim();
          });

          if (idx !== -1) {
            const entryUrl = `${BASE_URL}/datasheet/F3/${idx}.json`;
            await fetch(entryUrl, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ "Trạng thái đơn": newStatus }),
            });
          }
        } else if (f3DataRaw && typeof f3DataRaw === "object") {
          const foundKey = Object.keys(f3DataRaw).find((k) => {
            const item = f3DataRaw[k];
            if (!item) return false;
            const code =
              item["Mã đơn hàng"] || item["Mã đơn"] || item["Mã Đơn"] || item["OrderCode"] || item["Mã"];
            return code && orderCode && String(code).trim() === String(orderCode).trim();
          });

          if (foundKey) {
            const entryUrl = `${BASE_URL}/datasheet/F3/${foundKey}.json`;
            await fetch(entryUrl, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ "Trạng thái đơn": newStatus }),
            });
          }
        }
      } catch (e) {
        console.error("Failed to persist status to datasheet/F3 (non-fatal):", e);
      }

      // Update both f3Data and localF3Data
      setF3Data((prevData) =>
        prevData.map((item) =>
          item.id === orderId ? { ...item, "Trạng thái đơn": newStatus } : item
        )
      );
      setLocalF3Data((prevData) =>
        prevData.map((item) =>
          item.id === orderId ? { ...item, "Trạng thái đơn": newStatus } : item
        )
      );

      toast.success("Cập nhật trạng thái đơn thành công");
      setOpenStatusDropdown(null);
    } catch (err) {
      console.error("Error updating order status:", err);
      toast.error("Lỗi khi cập nhật trạng thái đơn");
    }
  };

  // Toggle status dropdown
  const toggleStatusDropdown = (orderId) => {
    setOpenStatusDropdown(openStatusDropdown === orderId ? null : orderId);
  };

  // Open edit full order modal
  const openEditFullOrder = (order) => {
    setEditingFullOrder(order);
    setEditFormData({
      "Mã đơn hàng": order["Mã đơn hàng"] || "",
      "Name*": order["Name*"] || order["Tên lên đơn"] || "",
      "Phone*": order["Phone*"] || "",
      Add: order["Add"] || "",
      City: order["City"] || "",
      State: order["State"] || "",
      "Mặt hàng": order["Mặt hàng"] || order["Tên mặt hàng 1"] || "",
      "Số lượng mặt hàng 1": order["Số lượng mặt hàng 1"] || "",
      "Giá bán": order["Giá bán"] || "",
      "Tổng tiền VNĐ": order["Tổng tiền VNĐ"] || "",
      "Nhân viên Marketing": order["Nhân viên Marketing"] || "",
      "Nhân viên Sale": order["Nhân viên Sale"] || "",
      Team: order["Team"] || "",
      Ca: order["Ca"] || "",
      "Ngày lên đơn": order["Ngày lên đơn"] || "",
      "Trạng thái đơn": order["Trạng thái đơn"] || "",
      "Hình thức thanh toán": order["Hình thức thanh toán"] || "",
    });
  };

  // Close edit full order modal
  const closeEditFullOrder = () => {
    setEditingFullOrder(null);
    setEditFormData({
      "Mã đơn hàng": "",
      "Name*": "",
      "Phone*": "",
      Add: "",
      City: "",
      State: "",
      "Mặt hàng": "",
      "Số lượng mặt hàng 1": "",
      "Giá bán": "",
      "Tổng tiền VNĐ": "",
      "Nhân viên Marketing": "",
      "Nhân viên Sale": "",
      Team: "",
      Ca: "",
      "Ngày lên đơn": "",
      "Trạng thái đơn": "",
      "Hình thức thanh toán": "",
    });
  };

  const handleUpdateFullOrder = async () => {
    if (!editingFullOrder) return;

    try {
      // Get the old values before updating
      const oldValues = {
        "Mã đơn hàng": editingFullOrder["Mã đơn hàng"] || "",
        "Name*":
          editingFullOrder["Name*"] || editingFullOrder["Tên lên đơn"] || "",
        "Phone*": editingFullOrder["Phone*"] || "",
        Add: editingFullOrder["Add"] || "",
        City: editingFullOrder["City"] || "",
        State: editingFullOrder["State"] || "",
        "Mặt hàng":
          editingFullOrder["Mặt hàng"] ||
          editingFullOrder["Tên mặt hàng 1"] ||
          "",
        "Số lượng mặt hàng 1": editingFullOrder["Số lượng mặt hàng 1"] || "",
        "Giá bán": editingFullOrder["Giá bán"] || "",
        "Tổng tiền VNĐ": editingFullOrder["Tổng tiền VNĐ"] || "",
        "Nhân viên Marketing": editingFullOrder["Nhân viên Marketing"] || "",
        "Nhân viên Sale": editingFullOrder["Nhân viên Sale"] || "",
        Team: editingFullOrder["Team"] || "",
        Ca: editingFullOrder["Ca"] || "",
        "Ngày lên đơn": editingFullOrder["Ngày lên đơn"] || "",
        "Trạng thái đơn": editingFullOrder["Trạng thái đơn"] || "",
        "Hình thức thanh toán": editingFullOrder["Hình thức thanh toán"] || "",
      };

      // Note: this project uses `/datasheet/F3.json` as the primary dataset.
      // The `/f3_data/<id>` collection may be absent; we persist edits to
      // `datasheet/F3` below to ensure changes survive a reload.

      // Also persist changes to datasheet/F3 (the app reads from this URL on load)
      try {
        const BASE_URL =
          "https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app";
        const F3_URL = `${BASE_URL}/datasheet/F3.json`;
        const resp = await fetch(F3_URL);
        if (!resp.ok) throw new Error(`Failed to fetch datasheet (status ${resp.status})`);
        const f3DataRaw = await resp.json();

        // Determine order code to match entries. Prefer the original code
        // from editingFullOrder, but also consider a changed code from the
        // edit form data as a fallback.
        const originalCode =
          editingFullOrder["Mã đơn hàng"] || editingFullOrder["Mã đơn"] || editingFullOrder["Mã"] || null;
        const newCode = editFormData["Mã đơn hàng"] || editFormData["Mã đơn"] || editFormData["Mã"] || null;
        const tryCodes = [originalCode, newCode].filter(Boolean).map((c) => String(c).trim());

        let patched = false;

        if (Array.isArray(f3DataRaw)) {
          for (const code of tryCodes) {
            const idx = f3DataRaw.findIndex((item) => {
              if (!item) return false;
              const codeField =
                item["Mã đơn hàng"] || item["Mã đơn"] || item["Mã Đơn"] || item["OrderCode"] || item["Mã"];
              return codeField && String(codeField).trim() === code;
            });
            if (idx !== -1) {
              const entryUrl = `${BASE_URL}/datasheet/F3/${idx}.json`;
              const putResp = await fetch(entryUrl, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editFormData),
              });
              if (!putResp.ok) throw new Error(`PATCH failed (status ${putResp.status})`);
              patched = true;
              break;
            }
          }
        } else if (f3DataRaw && typeof f3DataRaw === "object") {
          for (const code of tryCodes) {
            const foundKey = Object.keys(f3DataRaw).find((k) => {
              const item = f3DataRaw[k];
              if (!item) return false;
              const codeField =
                item["Mã đơn hàng"] || item["Mã đơn"] || item["Mã Đơn"] || item["OrderCode"] || item["Mã"];
              return codeField && String(codeField).trim() === code;
            });
            if (foundKey) {
              const entryUrl = `${BASE_URL}/datasheet/F3/${foundKey}.json`;
              const putResp = await fetch(entryUrl, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editFormData),
              });
              if (!putResp.ok) throw new Error(`PATCH failed (status ${putResp.status})`);
              patched = true;
              break;
            }
          }
        }

        if (!patched) {
          // If we couldn't find an existing entry to update, throw so the
          // caller gets a failure notification. Creating a new entry could
          // be done here, but that may duplicate records; prefer error.
          throw new Error("Could not find matching datasheet/F3 entry to update");
        }
      } catch (e) {
        console.error("Failed to persist to datasheet/F3 (fatal):", e);
        toast.error("Lỗi khi ghi dữ liệu lên server — thay đổi chưa được lưu");
        // Re-throw to allow outer catch to handle rollback or further logging
        throw e;
      }

      // Log the full update with old values
      await logChange(
        editingFullOrder.id,
        "full_update",
        oldValues,
        editFormData,
        editingFullOrder
      );

      // Update both f3Data and localF3Data
      setF3Data((prevData) =>
        prevData.map((item) =>
          item.id === editingFullOrder.id ? { ...item, ...editFormData } : item
        )
      );
      setLocalF3Data((prevData) =>
        prevData.map((item) =>
          item.id === editingFullOrder.id ? { ...item, ...editFormData } : item
        )
      );

      toast.success("Cập nhật vận đơn thành công");
      closeEditFullOrder();
    } catch (err) {
      console.error("Error updating full order:", err);
      toast.error("Lỗi khi cập nhật vận đơn");
    }
  };

  // Row selection handlers
  const toggleRowSelection = (rowId) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };

  const toggleSelectAllRows = () => {
    const currentPageIds = paginatedF3Data.map((item) => item.id);
    const allSelected = currentPageIds.every((id) => selectedRows.has(id));

    if (allSelected) {
      // Deselect all on current page
      setSelectedRows((prev) => {
        const newSet = new Set(prev);
        currentPageIds.forEach((id) => newSet.delete(id));
        return newSet;
      });
    } else {
      // Select all on current page
      setSelectedRows((prev) => {
        const newSet = new Set(prev);
        currentPageIds.forEach((id) => newSet.add(id));
        return newSet;
      });
    }
  };

  const copySelectedRows = () => {
    if (selectedRows.size === 0) {
      toast.warning("Vui lòng chọn ít nhất một hàng để copy");
      return;
    }

    // Get selected data
    const selectedData = localF3Data.filter((item) =>
      selectedRows.has(item.id)
    );

    // Convert to CSV format
    const headers = columnOrder.filter((col) => visibleColumns[col]);
    const csvContent = [
      headers
        .map((col) => {
          const columnLabels = {
            stt: "STT",
            orderCode: "Mã đơn hàng",
            customerName: "Tên khách hàng",
            phone: "Điện thoại",
            address: "Địa chỉ",
            product: "Mặt hàng",
            quantity: "Số lượng",
            price: "Giá bán",
            totalVND: "Tổng tiền VNĐ",
            marketing: "NV Marketing",
            sale: "NV Sale",
            team: "Team",
            shift: "Ca",
            orderDate: "Ngày lên đơn",
            status: "Trạng thái đơn",
            paymentMethod: "Hình thức TT",
          };
          return columnLabels[col] || col;
        })
        .join(","),
      ...selectedData.map((item, index) =>
        headers
          .map((col) => {
            switch (col) {
              case "stt":
                return index + 1;
              case "orderCode":
                return item["Mã đơn hàng"] || "";
              case "customerName":
                return `"${(item["Name*"] || item["Tên lên đơn"] || "").replace(
                  /"/g,
                  '""'
                )}"`;
              case "phone":
                return item["Phone*"] || "";
              case "address":
                return `"${(
                  [item["Add"], item["City"], item["State"]]
                    .filter(Boolean)
                    .join(", ") || ""
                ).replace(/"/g, '""')}"`;
              case "product":
                return `"${(
                  item["Mặt hàng"] ||
                  item["Tên mặt hàng 1"] ||
                  ""
                ).replace(/"/g, '""')}"`;
              case "quantity":
                return item["Số lượng mặt hàng 1"] || "";
              case "price":
                return item["Giá bán"] || 0;
              case "totalVND":
                return item["Tổng tiền VNĐ"] || 0;
              case "marketing":
                return `"${(item["Nhân viên Marketing"] || "").replace(
                  /"/g,
                  '""'
                )}"`;
              case "sale":
                return `"${(item["Nhân viên Sale"] || "").replace(
                  /"/g,
                  '""'
                )}"`;
              case "team":
                return item["Team"] || "";
              case "shift":
                return item["Ca"] || "";
              case "orderDate":
                return item["Ngày lên đơn"]
                  ? new Date(item["Ngày lên đơn"]).toLocaleDateString("vi-VN")
                  : "";
              case "status":
                return item["Trạng thái đơn"] || "";
              case "paymentMethod":
                return item["Hình thức thanh toán"] || "";
              default:
                return "";
            }
          })
          .join(",")
      ),
    ].join("\n");

    // Copy to clipboard
    navigator.clipboard
      .writeText(csvContent)
      .then(() => {
        toast.success(`Đã copy ${selectedRows.size} hàng vào clipboard`);
        setSelectedRows(new Set()); // Clear selection after copy
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        toast.error("Lỗi khi copy dữ liệu");
      });
  };

  // Modal state for delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState(false);

  // Open delete confirmation modal (all roles can delete)
  const handleDeleteSelectedOrders = () => {
    if (selectedRows.size === 0) {
      toast.warning("Vui lòng chọn ít nhất một vận đơn để xóa");
      return;
    }

    setShowDeleteModal(true);
  };

  // Perform deletion after user confirms in modal (all roles can delete)
  const performDeleteSelectedOrders = async () => {
    setDeleteInProgress(true);
    try {
      const idsToDelete = Array.from(selectedRows);

      const deletePromises = idsToDelete.map(async (id) => {
        const order = localF3Data.find((item) => item.id === id) || null;

        // Note: there is no /f3_data collection in this database. Deletion
        // is performed on the canonical `/datasheet/F3` below.

        // Xóa trong datasheet/F3
        try {
          const f3Url =
            "https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/datasheet/F3.json";
          const resp = await fetch(f3Url);
          const f3Data = await resp.json();

          const orderCode = order
            ? order["Mã đơn hàng"] || order["Mã đơn"]
            : null;

          if (Array.isArray(f3Data)) {
            const idx = f3Data.findIndex((item) => {
              if (!item) return false;
              const code =
                item["Mã đơn hàng"] ||
                item["Mã đơn"] ||
                item["Mã Đơn"] ||
                item["OrderCode"] ||
                item["Mã"];
              return code && String(code).trim() === String(orderCode).trim();
            });

            if (idx !== -1) {
              const entryUrl = `https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/datasheet/F3/${idx}.json`;
              await fetch(entryUrl, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
              });
            }
          } else if (f3Data && typeof f3Data === "object") {
            const foundKey = Object.keys(f3Data).find((k) => {
              const item = f3Data[k];
              if (!item) return false;
              const code =
                item["Mã đơn hàng"] ||
                item["Mã đơn"] ||
                item["Mã Đơn"] ||
                item["OrderCode"] ||
                item["Mã"];
              return code && String(code).trim() === String(orderCode).trim();
            });

            if (foundKey) {
              const entryUrl = `https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/datasheet/F3/${foundKey}.json`;
              await fetch(entryUrl, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
              });
            }
          }
        } catch (err) {
          console.error(
            "Delete: failed to delete from datasheet (non-fatal):",
            err
          );
        }

        try {
          await logChange(id, "delete", order, null, order);
        } catch (e) {
          console.error("Error logging deletion for", id, e);
        }
      });

      await Promise.all(deletePromises);

      // Remove from both f3Data and localF3Data
      setF3Data((prev) => prev.filter((item) => !selectedRows.has(item.id)));
      setLocalF3Data((prev) =>
        prev.filter((item) => !selectedRows.has(item.id))
      );

      setSelectedRows(new Set());
      toast.success(`Đã xóa ${idsToDelete.length} vận đơn thành công`);
    } catch (err) {
      console.error("Error deleting selected orders:", err);
      toast.error("Lỗi khi xóa vận đơn. Vui lòng thử lại.");
    } finally {
      setDeleteInProgress(false);
      setShowDeleteModal(false);
    }
  };

  const clearSelection = () => {
    setSelectedRows(new Set());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải dữ liệu vận đơn...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 bg-red-50 rounded-lg">
        <p className="text-red-600">Lỗi: {error}</p>
      </div>
    );
  }

  const hasActiveFilters = () => {
    // Only treat a filter as "active" when it has a meaningful value.
    // Arrays must have length > 0, strings are trimmed before checking.
    const hasDate = Boolean(filters.startDate) || Boolean(filters.endDate);
    const hasSearch =
      typeof filters.searchText === "string" &&
      filters.searchText.trim().length > 0;
    const hasPayment = Array.isArray(filters.paymentMethod)
      ? filters.paymentMethod.length > 0
      : Boolean(filters.paymentMethod);
    const hasShifts =
      Array.isArray(filters.shifts) && filters.shifts.length > 0;
    const hasTeams = Array.isArray(filters.teams) && filters.teams.length > 0;
    const hasProducts =
      Array.isArray(filters.products) && filters.products.length > 0;

    return (
      hasDate || hasSearch || hasPayment || hasShifts || hasTeams || hasProducts
    );
  };

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/"
          className="text-sm text-gray-600 hover:text-gray-800 flex-shrink-0 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </Link>

        <h2 className="text-2xl font-bold text-primary uppercase text-center flex-1">
          Vận đơn
        </h2>

        <Link
          to="/lich-su-thay-doi"
          className="ml-4 flex-shrink-0 inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-700 hover:bg-gray-50 hover:shadow-sm"
          title="Xem lịch sử thay đổi"
        >
          Lịch sử thay đổi
        </Link>
      </div>
      <div className="mb-4">
        <div className="relative max-w-md">
          <input
            type="text"
            value={filters.searchText || ""}
            onChange={(e) => handleFilterChange("searchText", e.target.value)}
            placeholder="Tìm kiếm trong bảng..."
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
          {filters.searchText && (
            <button
              onClick={() => handleFilterChange("searchText", "")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
        <div className="lg:col-span-6">
          <FilterPanel
            activeTab={"f3"}
            filters={filters}
            handleFilterChange={handleFilterChange}
            quickSelectValue={quickSelectValue}
            handleQuickDateSelect={handleQuickDateSelect}
            availableFilters={availableFilters}
            userRole={userRole}
            hasActiveFilters={hasActiveFilters}
            clearAllFilters={clearFilters}
            showMarkets={false}
            showPaymentMethodSearch={true}
            variant="topbar"
            columnsConfig={columnsConfig}
            visibleColumns={visibleColumns}
            onVisibleColumnsChange={setVisibleColumns}
          />
        </div>

        <div className="lg:col-span-6">
          {/* Search input grouped under the filter panel (appears above the table) */}
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 mb-1">Tổng đơn hàng</p>
                  <p className="text-3xl font-bold">{stats.totalOrders}</p>
                </div>
                <svg
                  className="w-12 h-12 opacity-80 transition-transform duration-300 hover:scale-110"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                  <path
                    fillRule="evenodd"
                    d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 mb-1">
                    Tổng doanh thu (VNĐ)
                  </p>
                  <p className="text-2xl font-bold">
                    {stats.totalRevenue.toLocaleString("vi-VN")}
                  </p>
                </div>
                <svg
                  className="w-12 h-12 opacity-80 transition-transform duration-300 hover:scale-110"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"></path>
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 mb-1">Đơn hợp lệ</p>
                  <p className="text-3xl font-bold">{stats.validOrders}</p>
                </div>
                <svg
                  className="w-12 h-12 opacity-80 transition-transform duration-300 hover:scale-110"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 mb-1">Giá trị TB/Đơn</p>
                  <p className="text-2xl font-bold">
                    {stats.avgOrderValue.toLocaleString("vi-VN", {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                </div>
                <svg
                  className="w-12 h-12 opacity-80 transition-transform duration-300 hover:scale-110"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path>
                </svg>
              </div>
            </div>
          </div>

          {/* Row Selection Controls */}
          <div className="mb-4 flex items-center justify-between bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="selectAllRows"
                  checked={
                    paginatedF3Data.length > 0 &&
                    paginatedF3Data.every((item) => selectedRows.has(item.id))
                  }
                  onChange={toggleSelectAllRows}
                  className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                />
                <label
                  htmlFor="selectAllRows"
                  className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  Chọn tất cả ({selectedRows.size} đã chọn)
                </label>
              </div>
              {selectedRows.size > 0 && (
                <button
                  onClick={clearSelection}
                  className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-all duration-200"
                >
                  Xóa chọn
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDeleteSelectedOrders}
                disabled={selectedRows.size === 0}
                className={`px-4 py-2 text-sm font-medium rounded transition-all duration-200 mr-2 ${
                  selectedRows.size === 0
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-red-600 text-white hover:bg-red-700 hover:shadow-md"
                }`}
              >
                <svg
                  className="w-4 h-4 inline mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M6 2a1 1 0 00-1 1v1H3a1 1 0 100 2h14a1 1 0 100-2h-2V3a1 1 0 00-1-1H6z" />
                  <path d="M6 7a1 1 0 011 1v7a2 2 0 002 2h2a2 2 0 002-2V8a1 1 0 112 0v7a4 4 0 01-4 4H9a4 4 0 01-4-4V8a1 1 0 011-1z" />
                </svg>
                Xóa {selectedRows.size > 0 && `(${selectedRows.size})`}
              </button>

              <button
                onClick={copySelectedRows}
                disabled={selectedRows.size === 0}
                className={`px-4 py-2 text-sm font-medium rounded transition-all duration-200 ${
                  selectedRows.size === 0
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700 hover:shadow-md"
                }`}
              >
                <svg
                  className="w-4 h-4 inline mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
                Copy {selectedRows.size > 0 && `(${selectedRows.size})`}
              </button>
            </div>
          </div>

          {/* F3 Data Table */}
          {localF3Data.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Không có dữ liệu vận đơn</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto shadow-md rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-green-500">
                    <tr>
                      {/* Row Selection Column */}
                      <th className="px-3 py-3 text-center text-sm font-medium text-white uppercase tracking-wider border border-gray-300 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={
                            paginatedF3Data.length > 0 &&
                            paginatedF3Data.every((item) =>
                              selectedRows.has(item.id)
                            )
                          }
                          onChange={toggleSelectAllRows}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                        />
                      </th>
                      {columnOrder.map((columnKey) => {
                        if (!visibleColumns[columnKey]) return null;

                        const columnLabels = {
                          stt: "STT",
                          orderCode: "Mã đơn hàng",
                          customerName: "Tên khách hàng",
                          phone: "Điện thoại",
                          address: "Địa chỉ",
                          product: "Mặt hàng",
                          quantity: "Số lượng",
                          price: "Giá bán",
                          totalVND: "Tổng tiền VNĐ",
                          marketing: "NV Marketing",
                          sale: "NV Sale",
                          team: "Team",
                          shift: "Ca",
                          orderDate: "Ngày lên đơn",
                          status: "Trạng thái đơn",
                          paymentMethod: "Hình thức TT",
                        };

                        return (
                          <th
                            key={columnKey}
                            className={`px-3 py-3 text-center text-sm font-medium text-white uppercase tracking-wider border border-gray-300 whitespace-nowrap cursor-move select-none transition-all duration-300 relative overflow-visible ${
                              draggedColumn === columnKey
                                ? "opacity-50 scale-105 rotate-2 shadow-2xl bg-green-700 z-50"
                                : dropTarget === columnKey
                                ? "bg-green-500 border-green-300 border-2 shadow-lg scale-105 animate-pulse"
                                : "hover:bg-green-800"
                            }`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, columnKey)}
                            onDragOver={(e) => handleDragOver(e, columnKey)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, columnKey)}
                            onDragEnd={handleDragEnd}
                            title="Kéo để thay đổi vị trí cột"
                          >
                            {/* Ripple Effect */}
                            {showSuccessRipple && dropTarget === columnKey && (
                              <div
                                className="absolute inset-0 bg-white opacity-30 rounded animate-ping"
                                style={{
                                  left: ripplePosition.x - 20,
                                  top: ripplePosition.y - 20,
                                  width: 40,
                                  height: 40,
                                }}
                              />
                            )}

                            <div className="flex items-center justify-center gap-2 relative z-10">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSort(columnKey);
                                }}
                                className="w-full flex items-center gap-2 px-2 py-1 bg-white bg-opacity-10 hover:bg-opacity-30 rounded text-sm font-medium"
                                title="Sắp xếp"
                              >
                                <span>{columnLabels[columnKey]}</span>
                                <span className="ml-1 flex items-center">
                                  {sortConfig.column === columnKey ? (
                                    sortConfig.direction === "asc" ? (
                                      <svg
                                        className="w-4 h-4 text-white"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path d="M5 12l5-5 5 5H5z" />
                                      </svg>
                                    ) : (
                                      <svg
                                        className="w-4 h-4 text-white transform rotate-180"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path d="M5 12l5-5 5 5H5z" />
                                      </svg>
                                    )
                                  ) : (
                                    <svg
                                      className="w-4 h-4 text-white opacity-50"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M7 11l5-5 5 5M7 13l5 5 5-5"
                                      />
                                    </svg>
                                  )}
                                </span>
                              </button>
                            </div>
                          </th>
                        );
                      })}
                      {canEditFullOrder && (
                        <th className="px-3 py-3 text-center text-sm font-medium text-white uppercase tracking-wider border border-gray-300 whitespace-nowrap">
                          Sửa vận đơn
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedF3Data.map((item, index) => {
                      const globalIndex =
                        (currentPage - 1) * itemsPerPage + index;
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-gray-50 transition-all duration-200 ${
                            selectedRows.has(item.id)
                              ? "bg-green-50 shadow-sm"
                              : ""
                          }`}
                        >
                          {/* Row Selection Checkbox */}
                          <td
                            className={`px-3 py-3 whitespace-nowrap text-center ${
                              selectedRows.has(item.id)
                                ? "border-l-4 border-green-500 bg-green-50"
                                : "border border-gray-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedRows.has(item.id)}
                              onChange={() => toggleRowSelection(item.id)}
                              className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                            />
                          </td>
                          {columnOrder.map((columnKey) => {
                            if (!visibleColumns[columnKey]) return null;

                            const renderCell = (key) => {
                              switch (key) {
                                case "stt":
                                  return (
                                    <td
                                      key={key}
                                      className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300"
                                    >
                                      {globalIndex + 1}
                                    </td>
                                  );
                                case "orderCode":
                                  return (
                                    <td
                                      key={key}
                                      className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300"
                                    >
                                      {item["Mã đơn hàng"] || "-"}
                                    </td>
                                  );
                                case "customerName":
                                  return (
                                    <td
                                      key={key}
                                      className="px-3 py-3 text-sm font-medium text-gray-900 border border-gray-300 max-w-[150px] break-words"
                                    >
                                      {item["Name*"] ||
                                        item["Tên lên đơn"] ||
                                        "-"}
                                    </td>
                                  );
                                case "phone":
                                  return (
                                    <td
                                      key={key}
                                      className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300"
                                    >
                                      {item["Phone*"] || "-"}
                                    </td>
                                  );
                                case "address":
                                  return (
                                    <td
                                      key={key}
                                      className="px-3 py-3 text-sm font-medium text-gray-900 border border-gray-300"
                                    >
                                      {[
                                        item["Add"],
                                        item["City"],
                                        item["State"],
                                      ]
                                        .filter(Boolean)
                                        .join(", ") || "-"}
                                    </td>
                                  );
                                case "product":
                                  return (
                                    <td
                                      key={key}
                                      className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300"
                                    >
                                      {item["Mặt hàng"] ||
                                        item["Tên mặt hàng 1"] ||
                                        "-"}
                                    </td>
                                  );
                                case "quantity":
                                  return (
                                    <td
                                      key={key}
                                      className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300"
                                    >
                                      {item["Số lượng mặt hàng 1"] || "-"}
                                    </td>
                                  );
                                case "price":
                                  return (
                                    <td
                                      key={key}
                                      className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300"
                                    >
                                      ${item["Giá bán"] || 0}
                                    </td>
                                  );
                                case "totalVND":
                                  return (
                                    <td
                                      key={key}
                                      className="px-3 py-3 whitespace-nowrap text-sm font-bold text-green-600 border border-gray-300"
                                    >
                                      {(
                                        item["Tổng tiền VNĐ"] || 0
                                      ).toLocaleString("vi-VN")}
                                      ₫
                                    </td>
                                  );
                                case "marketing":
                                  return (
                                    <td
                                      key={key}
                                      className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300"
                                    >
                                      {item["Nhân viên Marketing"] || "-"}
                                    </td>
                                  );
                                case "sale":
                                  return (
                                    <td
                                      key={key}
                                      className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300"
                                    >
                                      {item["Nhân viên Sale"] || "-"}
                                    </td>
                                  );
                                case "team":
                                  return (
                                    <td
                                      key={key}
                                      className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300"
                                    >
                                      {item["Team"] || "-"}
                                    </td>
                                  );
                                case "shift":
                                  return (
                                    <td
                                      key={key}
                                      className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300"
                                    >
                                      {item["Ca"] || "-"}
                                    </td>
                                  );
                                case "orderDate":
                                  return (
                                    <td
                                      key={key}
                                      className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300"
                                    >
                                      {item["Ngày lên đơn"]
                                        ? new Date(
                                            item["Ngày lên đơn"]
                                          ).toLocaleDateString("vi-VN")
                                        : "-"}
                                    </td>
                                  );
                                case "status":
                                  return (
                                    <td
                                      key={key}
                                      className="px-3 py-3 whitespace-nowrap text-sm border border-gray-300 text-center"
                                    >
                                      <div className="relative inline-block">
                                        {canEditStatus ? (
                                          <>
                                            <button
                                              onClick={() =>
                                                toggleStatusDropdown(item.id)
                                              }
                                              className={`px-2 py-1 text-xs rounded-full cursor-pointer hover:opacity-80 transition ${getStatusStyle(
                                                item["Trạng thái đơn"]
                                              )}`}
                                              title="Click để thay đổi trạng thái"
                                            >
                                              {item["Trạng thái đơn"] ||
                                                "Chưa xác định"}{" "}
                                              ▼
                                            </button>

                                            {openStatusDropdown === item.id && (
                                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[140px]">
                                                {item["Trạng thái đơn"] !==
                                                  "Đơn hợp lệ" && (
                                                  <button
                                                    onClick={() =>
                                                      handleQuickStatusChange(
                                                        item.id,
                                                        "Đơn hợp lệ"
                                                      )
                                                    }
                                                    className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 transition flex items-center gap-2"
                                                  >
                                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                    Đơn hợp lệ
                                                  </button>
                                                )}
                                                {item["Trạng thái đơn"] !==
                                                  "Đơn hủy" && (
                                                  <button
                                                    onClick={() =>
                                                      handleQuickStatusChange(
                                                        item.id,
                                                        "Đơn hủy"
                                                      )
                                                    }
                                                    className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 transition flex items-center gap-2"
                                                  >
                                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                                    Đơn hủy
                                                  </button>
                                                )}
                                                {item["Trạng thái đơn"] !==
                                                  "Đơn chờ xử lý" && (
                                                  <button
                                                    onClick={() =>
                                                      handleQuickStatusChange(
                                                        item.id,
                                                        "Đơn chờ xử lý"
                                                      )
                                                    }
                                                    className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 transition flex items-center gap-2"
                                                  >
                                                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                                    Đơn chờ xử lý
                                                  </button>
                                                )}
                                                {item["Trạng thái đơn"] !==
                                                  "Chưa xác định" && (
                                                  <button
                                                    onClick={() =>
                                                      handleQuickStatusChange(
                                                        item.id,
                                                        "Chưa xác định"
                                                      )
                                                    }
                                                    className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 transition flex items-center gap-2"
                                                  >
                                                    <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                                    Chưa xác định
                                                  </button>
                                                )}
                                              </div>
                                            )}
                                          </>
                                        ) : (
                                          <span
                                            className={`px-2 py-1 text-xs rounded-full ${getStatusStyle(
                                              item["Trạng thái đơn"]
                                            )}`}
                                          >
                                            {item["Trạng thái đơn"] ||
                                              "Chưa xác định"}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  );
                                case "paymentMethod":
                                  return (
                                    <td
                                      key={key}
                                      className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300"
                                    >
                                      {item["Hình thức thanh toán"] || "-"}
                                    </td>
                                  );
                                default:
                                  return null;
                              }
                            };

                            return renderCell(columnKey);
                          })}
                          {canEditFullOrder && (
                            <td className="px-3 py-3 whitespace-nowrap text-sm border border-gray-300 text-center">
                              <button
                                onClick={() => openEditFullOrder(item)}
                                className="px-3 py-1 bg-green-600 text-white font-medium rounded hover:bg-green-700 text-sm"
                              >
                                Sửa vận đơn
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {localF3Data.length > itemsPerPage && (
                <div className="mt-6 transition-all duration-300 ease-in-out">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={localF3Data.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}

          {/* Drag Indicator */}
          {draggedColumn && (
            <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-bounce">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 animate-spin"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                <span className="text-sm font-medium">Đang kéo cột...</span>
              </div>
            </div>
          )}
          {editingFullOrder && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-all duration-300 ease-in-out">
              <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto transform scale-100 transition-all duration-300 ease-out animate-in fade-in-0 zoom-in-95 hover:shadow-2xl">
                <h3 className="text-xl font-bold mb-6 text-gray-800 transition-all duration-200">
                  Sửa thông tin vận đơn
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mã đơn hàng
                    </label>
                    <input
                      type="text"
                      value={editFormData["Mã đơn hàng"]}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          "Mã đơn hàng": e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tên khách hàng
                    </label>
                    <input
                      type="text"
                      value={editFormData["Name*"]}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          "Name*": e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Điện thoại
                    </label>
                    <input
                      type="text"
                      value={editFormData["Phone*"]}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          "Phone*": e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Địa chỉ
                    </label>
                    <input
                      type="text"
                      value={editFormData["Add"]}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          Add: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Thành phố
                    </label>
                    <input
                      type="text"
                      value={editFormData["City"]}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          City: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tỉnh
                    </label>
                    <input
                      type="text"
                      value={editFormData["State"]}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          State: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mặt hàng
                    </label>
                    <input
                      type="text"
                      value={editFormData["Mặt hàng"]}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          "Mặt hàng": e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Số lượng
                    </label>
                    <input
                      type="number"
                      value={editFormData["Số lượng mặt hàng 1"]}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          "Số lượng mặt hàng 1": e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Giá bán ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFormData["Giá bán"]}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          "Giá bán": e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tổng tiền VNĐ
                    </label>
                    <input
                      type="number"
                      value={editFormData["Tổng tiền VNĐ"]}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          "Tổng tiền VNĐ": e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      NV Marketing
                    </label>
                    <input
                      type="text"
                      value={editFormData["Nhân viên Marketing"]}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          "Nhân viên Marketing": e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      NV Sale
                    </label>
                    <input
                      type="text"
                      value={editFormData["Nhân viên Sale"]}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          "Nhân viên Sale": e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team
                    </label>
                    <input
                      type="text"
                      value={editFormData["Team"]}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          Team: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ca
                    </label>
                    <input
                      type="text"
                      value={editFormData["Ca"]}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          Ca: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ngày lên đơn
                    </label>
                    <input
                      type="date"
                      value={
                        editFormData["Ngày lên đơn"]
                          ? new Date(editFormData["Ngày lên đơn"])
                              .toISOString()
                              .split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          "Ngày lên đơn": e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Trạng thái đơn
                    </label>
                    <select
                      value={editFormData["Trạng thái đơn"]}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          "Trạng thái đơn": e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="Chưa xác định">Chưa xác định</option>
                      <option value="Đơn hợp lệ">Đơn hợp lệ</option>
                      <option value="Đơn hủy">Đơn hủy</option>
                      <option value="Đơn chờ xử lý">Đơn chờ xử lý</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hình thức thanh toán
                    </label>
                    <input
                      type="text"
                      value={editFormData["Hình thức thanh toán"]}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          "Hình thức thanh toán": e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleUpdateFullOrder}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 transform hover:scale-105 hover:shadow-md"
                  >
                    Lưu thay đổi
                  </button>
                  <button
                    onClick={closeEditFullOrder}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-all duration-200 transform hover:scale-105 hover:shadow-md"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Delete Confirmation Modal */}
          {showDeleteModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-bold mb-4">Xác nhận xóa vận đơn</h3>
                <p className="mb-4">
                  Bạn có chắc muốn xóa{" "}
                  <span className="font-semibold">{selectedRows.size}</span> vận
                  đơn đã chọn? Hành động này không thể hoàn tác.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-all duration-150"
                    disabled={deleteInProgress}
                  >
                    Hủy
                  </button>
                  <button
                    onClick={performDeleteSelectedOrders}
                    className={`px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-all duration-150 flex items-center gap-2 ${
                      deleteInProgress ? "opacity-70 cursor-wait" : ""
                    }`}
                    disabled={deleteInProgress}
                  >
                    <>
                      {deleteInProgress ? (
                        <svg
                          className="w-4 h-4 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="white"
                            strokeWidth="4"
                            className="opacity-50"
                          />
                          <path
                            d="M4 12a8 8 0 018-8"
                            stroke="white"
                            strokeWidth="4"
                            strokeLinecap="round"
                          />
                        </svg>
                      ) : null}
                      Xác nhận xóa
                    </>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
