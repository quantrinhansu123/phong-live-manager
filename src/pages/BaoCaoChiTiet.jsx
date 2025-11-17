import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useReportData } from "../hooks/useReportData";
import FilterPanel from "../components/FilterPanel";

// Firebase URLs
const F3_URL = 'https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/datasheet/F3.json';
const BAO_CAO_MKT_URL = 'https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/datasheet/B%C3%A1o_c%C3%A1o_MKT.json';
const EMPLOYEES_URL = 'https://lumi-6dff7-default-rtdb.asia-southeast1.firebasedatabase.app/datasheet/Nh%C3%A2n_s%E1%BB%B9.json';

// Helper function to normalize name for matching
const normalizeName = (name) => {
  return String(name || '').trim().toLowerCase()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/đ/g, 'd') // Replace đ/Đ with d
    .replace(/Đ/g, 'd')
    .replace(/[^\w\s]/g, '') // Remove special characters
    .trim();
};

// Helper function to parse date flexibly
const parseDateFlex = (v) => {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v) ? null : v;
  if (typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d) ? null : d;
  }
  const s = String(v).trim();
  if (!s) return null;
  const d1 = new Date(s);
  if (!isNaN(d1)) return d1;
  return null;
};

// Helper to extract numeric value from an object given possible key names
const numFrom = (obj = {}, keys = []) => {
  for (const k of keys) {
    if (!obj) continue;
    const raw = obj[k];
    if (raw == null) continue;
    const s = String(raw).replace(/[^0-9\-\.]/g, '').trim();
    if (!s) continue;
    const n = Number(s);
    if (!isNaN(n)) return n;
  }
  return 0;
};

export default function BaoCaoChiTiet() {
  const [userTeam, setUserTeam] = useState("");
  const [userRole, setUserRole] = useState("user");
  const [userEmail, setUserEmail] = useState("");
  const [f3Data, setF3Data] = useState([]);
  const [mktData, setMktData] = useState([]);
  const [f3Loading, setF3Loading] = useState(true);
  const [f3Error, setF3Error] = useState(null);

  useEffect(() => {
    setUserTeam(localStorage.getItem("userTeam") || "");
    setUserRole(localStorage.getItem("userRole") || "user");
    setUserEmail(localStorage.getItem("userEmail") || "");
  }, []);

  const { masterData, allTeams, loading, error } = useReportData(userRole, userTeam, userEmail);

  // Fetch F3 and MKT data
  useEffect(() => {
    const fetchF3AndMktData = async () => {
      try {
        setF3Loading(true);

        // Fetch raw F3
        const f3Response = await fetch(F3_URL);
        const f3DataRaw = await f3Response.json();
        let rawF3Data = [];
        if (Array.isArray(f3DataRaw)) rawF3Data = f3DataRaw;
        else if (f3DataRaw && typeof f3DataRaw === 'object') {
          if (Array.isArray(f3DataRaw.data)) rawF3Data = f3DataRaw.data;
          else rawF3Data = Object.values(f3DataRaw).filter(r => r && typeof r === 'object');
        }

        // Normalize F3 dates
        const normalizedF3All = rawF3Data.map(r => ({ ...r, __date: parseDateFlex(r['Ngày lên đơn'] || r['Ngày']) })).filter(r => r.__date && !isNaN(r.__date));

        // Fetch MKT raw
        let normalizedMktAll = [];
        try {
          const mktResponse = await fetch(BAO_CAO_MKT_URL);
          const mktDataRaw = await mktResponse.json();
          let rawMktData = [];
          if (Array.isArray(mktDataRaw)) rawMktData = mktDataRaw;
          else if (mktDataRaw && typeof mktDataRaw === 'object') {
            if (Array.isArray(mktDataRaw.data)) rawMktData = mktDataRaw.data;
            else rawMktData = Object.values(mktDataRaw).filter(r => r && typeof r === 'object');
          }

          const validRawMktData = rawMktData.filter(r => r && (r['Tên'] || r['Ten'] || r['Name']));
          normalizedMktAll = validRawMktData.map(r => {
            const dsChot = Number(r['Doanh số']) || 0;
            const dateObj = parseDateFlex(r['Ngày']) || new Date();
            return {
              idnv: String(r['id_NS'] || '').trim(),
              ten: String(r['Tên'] || r['Ten'] || r['Name'] || 'N/A').trim(),
              email: String(r['Email'] || '').trim(),
              ngay: dateObj,
              ca: String(r['Ca'] || r['ca'] || 'N/A').trim(),
              sanPham: String(r['Mặt hàng'] || r['Sản_phẩm'] || r['Sản phẩm'] || 'N/A').trim(),
              thiTruong: String(r['Khu vực'] || r['Thị_trường'] || r['Thị trường'] || 'N/A').trim(),
              team: String(r['Team'] || r['Chi nhánh'] || 'Khác').trim(),
              chucVu: String(r['Chức vụ'] || '').trim().toLowerCase(),
              cpqc: Number(r['CPQC']) || 0,
              soMessCmt: Number(r['Số_Mess_Cmt']) || Number(r['Số Mess Cmt']) || 0,
              soDon: Number(r['Số đơn']) || 0,
              dsChot: dsChot,
              __date: parseDateFlex(r['Ngày']),
              __caTokens: String(r['Ca'] || r['ca'] || '').split(',').map(c => c.trim()).filter(Boolean),
            };
          }).filter(r => r.ngay && !isNaN(r.ngay));
        } catch (mktErr) {
          console.warn('MKT data fetch failed:', mktErr);
          normalizedMktAll = [];
        }

        // Determine allowed MKT rows based on role
        let allowedMkt = normalizedMktAll;

        if (userRole === 'user') {
          // Only allow rows for this user's email (if available)
          if (userEmail) {
            allowedMkt = normalizedMktAll.filter(r => r.email && r.email.toLowerCase() === String(userEmail).toLowerCase());
          } else {
            allowedMkt = [];
          }
        } else if (userRole === 'leader') {
          // Leader: determine team via employees file or fallback to local userTeam
          let leaderTeam = userTeam || '';
          try {
            const empResp = await fetch(EMPLOYEES_URL);
            const empRaw = await empResp.json();
            let empList = [];
            if (Array.isArray(empRaw)) empList = empRaw;
            else if (empRaw && typeof empRaw === 'object') empList = Object.values(empRaw).filter(e => e && typeof e === 'object');
            const me = empList.find(e => {
              const email = (e['Email'] || e['email'] || e['EMAIL'] || '').toString().trim().toLowerCase();
              return email && userEmail && email === userEmail.toLowerCase();
            });
            if (me) {
              leaderTeam = me['Team'] || me['team'] || me['Chi nhánh'] || me['Chi nhanh'] || leaderTeam;
            }
          } catch (empErr) {
            console.warn('Failed to fetch employees for leader team lookup:', empErr);
          }

          if (leaderTeam) {
            allowedMkt = normalizedMktAll.filter(r => r.team && String(r.team).trim() === String(leaderTeam).trim());
          } else {
            allowedMkt = normalizedMktAll.filter(r => r.team && String(r.team).trim() === String(userTeam).trim());
          }
        } else {
          // admin: keep all
          allowedMkt = normalizedMktAll;
        }

        // Build allowed names set (normalized) from allowedMkt, to filter F3 rows
        const allowedNames = new Set((allowedMkt || []).map(r => normalizeName(r.ten)));

        // Filter F3 rows to those relevant for the allowed MKT persons (unless admin)
        let allowedF3 = normalizedF3All;
        if (userRole !== 'admin') {
          allowedF3 = normalizedF3All.filter(row => {
            const rawF3Name = row['Nhân viên Marketing'] || row['Marketing'] || row['marketing'] || row['Tên'] || row['Ten'] || row['Name'] || '';
            if (!rawF3Name) return false;
            return allowedNames.has(normalizeName(rawF3Name));
          });
        }

        // Finally set state
        setMktData(allowedMkt);
        setF3Data(allowedF3);

      } catch (err) {
        console.error('Error fetching F3/MKT data:', err);
        setF3Error(err.message || String(err));
      } finally {
        setF3Loading(false);
      }
    };

    fetchF3AndMktData();
  }, [userRole, userTeam, userEmail]);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    products: [],
    shifts: [],
    markets: [],
    teams: [],
    searchText: "",
  });

  const [availableFilters, setAvailableFilters] = useState({
    products: [],
    shifts: ["Giữa ca", "Hết ca"],
    markets: [],
    teams: [],
  });

  const [quickSelectValue, setQuickSelectValue] = useState("");
  const [filteredData, setFilteredData] = useState([]);

  // Columns visibility config
  const columnsConfig = [
    { key: 'stt', label: 'STT' },
    { key: 'team', label: 'Team' },
    { key: 'name', label: 'Marketing' },
    { key: 'cpqc', label: 'CPQC' },
    { key: 'mess', label: 'Số Mess' },
    { key: 'orders', label: 'Số Đơn' },
    { key: 'revenue', label: 'DS Chốt' },
    { key: 'tiLeChot', label: 'Tỉ lệ chốt' },
    { key: 'giaMess', label: 'Giá Mess' },
    { key: 'cps', label: 'CPS' },
    { key: 'cpds', label: '%CP/DS' },
    { key: 'giaTBDon', label: 'Giá TB Đơn' },
    { key: 'ordersTT', label: 'Số Đơn (TT)' },
    { key: 'ordersHuy', label: 'Số đơn Huỷ' },
    { key: 'revenueReal', label: 'DS Chốt (TT)' },
    { key: 'dsHuy', label: 'DS Huỷ' },
    { key: 'tiLeChotTT', label: 'Tỉ lệ chốt (TT)' },
    // Daily-specific
    { key: 'product', label: 'Sản phẩm' },
    { key: 'market', label: 'Thị trường' },
    { key: 'ca', label: 'Ca' },
  ];

  const [visibleColumns, setVisibleColumns] = useState(() => {
    const obj = {};
    columnsConfig.forEach(c => { obj[c.key] = true; });
    return obj;
  });

  const handleVisibleColumnsChange = (next) => {
    setVisibleColumns(next);
  };

  // Pagination state for summary table
  const [summaryPage, setSummaryPage] = useState(1);
  // Pagination state for each daily table
  const [dailyPages, setDailyPages] = useState({});
  const itemsPerPage = 10;
  const maxDailyTables = 7;

  // Function to parse date strings in DD/MM/YYYY format
  const parseDate = (dateStr) => {
    if (dateStr instanceof Date) return dateStr;
    if (typeof dateStr === 'string') {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const year = parseInt(parts[2]);
        return new Date(year, month, day);
      }
    }
    return new Date(dateStr);
  };

  // Helper functions
  const formatNumber = (num) => {
    return num ? num.toLocaleString("vi-VN") : "0";
  };

  const formatCurrency = (num) => {
    return num ? num.toLocaleString("vi-VN") + "đ" : "0đ";
  };

  const formatPercent = (num) => {
    return (num * 100).toFixed(2) + "%";
  };

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Format a Date to local YYYY-MM-DD (avoid timezone shifts from toISOString)
  const formatLocalYYYYMMDD = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Return start (Monday) and end (Sunday) dates for the week containing `refDate`, shifted by weekOffset
  const getWeekRange = (refDate = new Date(), weekOffset = 0) => {
    const d = new Date(refDate);
    d.setHours(0, 0, 0, 0);
    // JS: 0 = Sunday, 1 = Monday, ... 6 = Saturday
    // Calculate distance to Monday (0 for Monday, 6 for Sunday)
    const day = d.getDay();
    const diffToMonday = (day + 6) % 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - diffToMonday + weekOffset * 7);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { start: monday, end: sunday };
  };

  // Update available filters when mktData changes (giống HTML)
  useEffect(() => {
    if (mktData && mktData.length > 0) {
      const products = [...new Set(mktData.map((r) => r.sanPham).filter(Boolean))];
      const markets = [...new Set(mktData.map((r) => r.thiTruong).filter(Boolean))];
      const teams = [...new Set(mktData.map((r) => r.team).filter(Boolean))];

      setAvailableFilters((prev) => ({ 
        ...prev, 
        products: products.sort(), 
        markets: markets.sort(), 
        teams: teams.length > 0 ? teams.sort() : (allTeams || []) 
      }));
    } else if (allTeams && allTeams.length > 0) {
      setAvailableFilters((prev) => ({ ...prev, teams: allTeams }));
    }
  }, [mktData, allTeams]);

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => {
      if (Array.isArray(value)) {
        return { ...prev, [filterType]: value };
      }

      if (Array.isArray(prev[filterType])) {
        const newValues = prev[filterType].includes(value) ? prev[filterType].filter((v) => v !== value) : [...prev[filterType], value];
        return { ...prev, [filterType]: newValues };
      }
      return { ...prev, [filterType]: value };
    });
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
        const { start, end } = getWeekRange(today, -1);
        startDate = start;
        endDate = end;
        break;
      }
      case "this-week": {
        const { start, end } = getWeekRange(today, 0);
        startDate = start;
        endDate = end;
        break;
      }
      case "next-week": {
        const { start, end } = getWeekRange(today, 1);
        startDate = start;
        endDate = end;
        break;
      }
      case "this-month":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      default:
        if (value.startsWith("month-")) {
          const month = parseInt(value.split("-")[1]) - 1; // 0-based
          startDate = new Date(today.getFullYear(), month, 1);
          endDate = new Date(today.getFullYear(), month + 1, 0);
        } else if (value.startsWith("q")) {
          const quarter = parseInt(value.slice(1)); // 1-4
          const quarterStartMonth = (quarter - 1) * 3;
          startDate = new Date(today.getFullYear(), quarterStartMonth, 1);
          endDate = new Date(today.getFullYear(), quarterStartMonth + 3, 0);
        }
        break;
    }

    setFilters((prev) => ({ ...prev, startDate: formatLocalYYYYMMDD(startDate), endDate: formatLocalYYYYMMDD(endDate) }));
  };

  const clearAllFilters = () => {
    setFilters({ startDate: "", endDate: "", products: [], shifts: [], markets: [], teams: [], searchText: "" });
    setQuickSelectValue("");
  };

  const hasActiveFilters = () => {
    return (
      filters.searchText || filters.startDate || filters.endDate || filters.products.length > 0 || filters.shifts.length > 0 || filters.markets.length > 0 || filters.teams.length > 0
    );
  };

  // Apply filters to mktData - giống hệt HTML
  useEffect(() => {
    let filtered = [...(mktData || [])];

    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((r) => {
        const date = r.__date || r.ngay;
        if (!date || isNaN(date)) return false;
        const dateObj = new Date(date);
        dateObj.setHours(0, 0, 0, 0);
        return dateObj >= startDate;
      });
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((r) => {
        const date = r.__date || r.ngay;
        if (!date || isNaN(date)) return false;
        const dateObj = new Date(date);
        dateObj.setHours(0, 0, 0, 0);
        return dateObj <= endDate;
      });
    }

    if (filters.products.length > 0) {
      filtered = filtered.filter((r) => filters.products.includes(r.sanPham));
    }
    if (filters.shifts.length > 0) {
      filtered = filtered.filter((r) => {
        if (!r.__caTokens || r.__caTokens.length === 0) return false;
        return r.__caTokens.some(c => filters.shifts.includes(c));
      });
    }
    if (filters.markets.length > 0) {
      filtered = filtered.filter((r) => filters.markets.includes(r.thiTruong));
    }
    if (filters.teams.length > 0) {
      filtered = filtered.filter((r) => r.team && filters.teams.includes(r.team));
    }

    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.ten && r.ten.toLowerCase().includes(searchLower)) ||
          (r.email && r.email.toLowerCase().includes(searchLower)) ||
          (r.team && r.team.toLowerCase().includes(searchLower)) ||
          (r.sanPham && r.sanPham.toLowerCase().includes(searchLower)) ||
          (r.thiTruong && r.thiTruong.toLowerCase().includes(searchLower))
      );
    }

    setFilteredData(filtered);
  }, [filters, mktData]);

  // Calculate summary data with F3 integration
  const summaryData = useMemo(() => {
    const aggregated = {};
    const aggregatedNormalized = {}; // mapping normalized name -> original key

    // Aggregate from filteredData (MKT data) - giống hệt HTML
    (filteredData || []).forEach((item) => {
      const key = item.ten || 'N/A';
      if (!aggregated[key]) {
        aggregated[key] = {
          team: item.team,
          name: item.ten,
          mess: 0,
          cpqc: 0,
          orders: 0,
          ordersTT: 0,
          ordersHuy: 0,
          revenue: 0,
          revenueReal: 0,
          dsHuy: 0,
        };
        aggregatedNormalized[normalizeName(key)] = key;
      }

      // Dùng fields đã normalize - giống HTML
      aggregated[key].mess += item.soMessCmt || 0;
      aggregated[key].cpqc += item.cpqc || 0;
      aggregated[key].orders += item.soDon || 0;
      aggregated[key].revenue += item.dsChot || 0;
    });

    // Filter F3 data based on current filters
    const startDate = filters.startDate ? new Date(filters.startDate) : null;
    const endDate = filters.endDate ? new Date(filters.endDate) : null;
    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(23, 59, 59, 999);

    const productSet = filters.products.length > 0 ? new Set(filters.products) : null;
    const caSet = filters.shifts.length > 0 ? new Set(filters.shifts) : null;
    const teamSet = filters.teams.length > 0 ? new Set(filters.teams) : null;
    const marketSet = filters.markets.length > 0 ? new Set(filters.markets) : null;

    // Add F3 data to aggregated (matching by normalized name)
    (f3Data || []).forEach((row) => {
      // Filter by name - only if matches aggregated MKT names
      const rawF3Name = row['Nhân viên Marketing'] || row['Marketing'] || row['marketing'] || row['Tên'] || row['Ten'] || row['Name'] || '';
      if (!rawF3Name) return;
      
      const mktNameNorm = normalizeName(rawF3Name);
      const mappedName = aggregatedNormalized[mktNameNorm];
      if (!mappedName) return; // Not in MKT data, skip (unless team filter is "all")

      // Filter by date
      const date = row.__date || parseDateFlex(row['Ngày lên đơn'] || row['Ngày']);
      if (!date || isNaN(date)) return;
      const dateObj = new Date(date);
      dateObj.setHours(0, 0, 0, 0);
      if (startDate && dateObj < startDate) return;
      if (endDate && dateObj > endDate) return;

      // Filter by product
      const product = row['Mặt hàng'] || row['Sản_phẩm'] || row['Sản phẩm'] || '';
      if (productSet && !productSet.has(product)) return;

      // Filter by ca
      if (caSet) {
        const ca = row['Ca'] || row['ca'] || '';
        const tokens = String(ca).split(',').map(c => c.trim()).filter(Boolean);
        if (tokens.length === 0 || !tokens.some(c => caSet.has(c))) return;
      }

      // Filter by market
      const market = row['Khu vực'] || row['Thị_trường'] || row['Thị trường'] || '';
      if (marketSet && !marketSet.has(market)) return;

      // Add F3 values
      const tongTienValue = numFrom(row, ['Tổng tiền VNĐ', 'Tổng tiền VND', 'Tổng_tiền_VNĐ', 'Tổng_tiền_VND', 'tongTienVND', 'Total VND', 'total_vnd']);
      
      // Check if order is cancelled
      const ketQuaCheck = String(row['Kết quả Check'] || row['Kết_quả_Check'] || row['ket qua check'] || row['KetQuaCheck'] || '').trim();
      const isHuy = ketQuaCheck === 'Huỷ' || ketQuaCheck === 'Hủy' || ketQuaCheck === 'Huy';
      
      aggregated[mappedName].ordersTT += 1;
      aggregated[mappedName].revenueReal += tongTienValue;
      
      if (isHuy) {
        aggregated[mappedName].ordersHuy += 1;
        aggregated[mappedName].dsHuy += tongTienValue;
      }
    });

    // Add unmapped F3 rows if team filter is "all"
    const teamAll = filters.teams.length === 0;
    const unmappedF3Aggregated = {};

    if (teamAll) {
      (f3Data || []).forEach((row) => {
        const rawF3Name = row['Nhân viên Marketing'] || row['Marketing'] || row['marketing'] || row['Tên'] || row['Ten'] || row['Name'] || '';
        if (!rawF3Name) return;
        
        const mktNameNorm = normalizeName(rawF3Name);
        const mappedName = aggregatedNormalized[mktNameNorm];
        if (mappedName) return; // Already in MKT data, skip

        // Apply filters
        const date = row.__date || parseDateFlex(row['Ngày lên đơn'] || row['Ngày']);
        if (!date || isNaN(date)) return;
        const dateObj = new Date(date);
        dateObj.setHours(0, 0, 0, 0);
        if (startDate && dateObj < startDate) return;
        if (endDate && dateObj > endDate) return;

        const product = row['Mặt hàng'] || row['Sản_phẩm'] || row['Sản phẩm'] || '';
        if (productSet && !productSet.has(product)) return;

        if (caSet) {
          const ca = row['Ca'] || row['ca'] || '';
          const tokens = String(ca).split(',').map(c => c.trim()).filter(Boolean);
          if (tokens.length === 0 || !tokens.some(c => caSet.has(c))) return;
        }

        const market = row['Khu vực'] || row['Thị_trường'] || row['Thị trường'] || '';
        if (marketSet && !marketSet.has(market)) return;

        if (!unmappedF3Aggregated[rawF3Name]) {
          unmappedF3Aggregated[rawF3Name] = {
            name: rawF3Name,
            team: row['Team'] || row['Chi nhánh'] || 'Khác',
            mess: 0,
            cpqc: 0,
            orders: 0,
            ordersTT: 0,
            ordersHuy: 0,
            revenue: 0,
            revenueReal: 0,
            dsHuy: 0,
            isUnmappedF3: true,
          };
        }

        const tongTienValue = numFrom(row, ['Tổng tiền VNĐ', 'Tổng tiền VND', 'Tổng_tiền_VNĐ', 'Tổng_tiền_VND', 'tongTienVND', 'Total VND', 'total_vnd']);
        unmappedF3Aggregated[rawF3Name].ordersTT += 1;
        unmappedF3Aggregated[rawF3Name].revenueReal += tongTienValue;

        const ketQuaCheck = String(row['Kết quả Check'] || row['Kết_quả_Check'] || row['ket qua check'] || row['KetQuaCheck'] || '').trim();
        const isHuy = ketQuaCheck === 'Huỷ' || ketQuaCheck === 'Hủy' || ketQuaCheck === 'Huy';
        if (isHuy) {
          unmappedF3Aggregated[rawF3Name].ordersHuy += 1;
          unmappedF3Aggregated[rawF3Name].dsHuy += tongTienValue;
        }
      });
    }

    // Convert to array and add calculated fields
    const mktRows = Object.values(aggregated).map((data) => ({
      ...data,
      tiLeChot: data.mess > 0 ? data.orders / data.mess : 0,
      tiLeChotTT: data.mess > 0 ? data.ordersTT / data.mess : 0,
      giaMess: data.mess > 0 ? data.cpqc / data.mess : 0,
      cps: data.orders > 0 ? data.cpqc / data.orders : 0,
      cpds: data.revenue > 0 ? data.cpqc / data.revenue : 0,
      giaTBDon: data.orders > 0 ? data.revenue / data.orders : 0,
      isUnmappedF3: false,
    }));

    const unmappedF3Rows = Object.values(unmappedF3Aggregated).map((data) => ({
      ...data,
      tiLeChot: 0,
      tiLeChotTT: 0,
      giaMess: 0,
      cps: 0,
      cpds: 0,
      giaTBDon: 0,
    }));

    const result = teamAll ? [...mktRows, ...unmappedF3Rows] : mktRows;

    return result;
  }, [filteredData, f3Data, filters]);

  // Group data by date for daily breakdown - giống HTML với F3 integration
  const dailyBreakdown = useMemo(() => {
    // Map theo ngày -> Marketing -> data
    const byDateAndMkt = new Map(); // dateKey -> Map(name -> data)

    // Filter conditions
    const startDate = filters.startDate ? new Date(filters.startDate) : null;
    const endDate = filters.endDate ? new Date(filters.endDate) : null;
    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(23, 59, 59, 999);

    const productSet = filters.products.length > 0 ? new Set(filters.products) : null;
    const caSet = filters.shifts.length > 0 ? new Set(filters.shifts) : null;
    const teamSet = filters.teams.length > 0 ? new Set(filters.teams) : null;
    const marketSet = filters.markets.length > 0 ? new Set(filters.markets) : null;

    // Quét MKT (báo cáo) – nguồn Mess/CPQC/Số đơn/DS chốt
    (mktData || []).forEach((r) => {
      const name = r.ten || 'N/A';
      if (!name || name === 'N/A') return;

      const team = r.team || 'Khác';
      if (teamSet && !teamSet.has(team)) return;

      const date = r.__date || r.ngay;
      if (!date || isNaN(date)) return;
      const dateObj = new Date(date);
      dateObj.setHours(0, 0, 0, 0);
      if (startDate && dateObj < startDate) return;
      if (endDate && dateObj > endDate) return;

      if (productSet && !productSet.has(r.sanPham)) return;

      if (caSet) {
        if (!r.__caTokens || r.__caTokens.length === 0 || !r.__caTokens.some(t => caSet.has(t))) return;
      }

      if (marketSet && !marketSet.has(r.thiTruong)) return;

      const dateKey = dateObj.toISOString().split('T')[0];
      if (!byDateAndMkt.has(dateKey)) byDateAndMkt.set(dateKey, new Map());
      const byMkt = byDateAndMkt.get(dateKey);
      if (!byMkt.has(name)) {
        byMkt.set(name, {
          name,
          team: team,
          mess: 0,
          cpqc: 0,
          orders: 0,
          ordersTT: 0,
          ordersHuy: 0,
          dsChot: 0,
          dsChotTT: 0,
          dsHuy: 0,
          // Keep original fields for display
          sanPham: r.sanPham,
          thiTruong: r.thiTruong,
          ca: r.ca,
        });
      }
      const m = byMkt.get(name);
      m.mess += r.soMessCmt || 0;
      m.cpqc += r.cpqc || 0;
      m.orders += r.soDon || 0;
      m.dsChot += r.dsChot || 0;
    });

    // Quét F3 – nguồn đơn thực tế & doanh số thực tế
    const aggregatedNormalized = {};
    Array.from(byDateAndMkt.values()).forEach((byMkt) => {
      byMkt.forEach((data, name) => {
        aggregatedNormalized[normalizeName(name)] = name;
      });
    });

    // Filter F3 data cho daily breakdown - CHỈ tính theo tên MKT đã được filter theo Team
    // Trong daily breakdown, aggregate theo ngày + marketing, KHÔNG filter F3 theo product/ca/market
    // vì đã aggregate tất cả MKT records theo ngày + marketing rồi
    (f3Data || []).forEach((row) => {
      // 1. Filter theo tên Marketing - CHỈ tính nếu khớp với tên đã aggregate từ MKT
      const rawName = row['Nhân viên Marketing'] || row['Marketing'] || row['marketing'] || row['Tên'] || row['Ten'] || row['Name'] || '';
      if (!rawName) return;
      const mktNameNorm = normalizeName(rawName);
      const mappedName = aggregatedNormalized[mktNameNorm];
      if (!mappedName) return; // không khớp với MKT → BỎ QUA

      // 2. Filter theo date
      const date = row.__date || parseDateFlex(row['Ngày lên đơn'] || row['Ngày']);
      if (!date || isNaN(date)) return;
      const dateObj = new Date(date);
      dateObj.setHours(0, 0, 0, 0);
      if (startDate && dateObj < startDate) return;
      if (endDate && dateObj > endDate) return;

      // 3. Filter theo product - chỉ filter nếu có filter product
      const product = row['Mặt hàng'] || row['Sản_phẩm'] || row['Sản phẩm'] || '';
      if (productSet && !productSet.has(product)) return;

      // 4. Filter theo ca - chỉ filter nếu có filter ca
      if (caSet) {
        const ca = row['Ca'] || row['ca'] || '';
        const tokens = String(ca).split(',').map(c => c.trim()).filter(Boolean);
        if (tokens.length === 0 || !tokens.some(t => caSet.has(t))) return;
      }

      // 5. Filter theo market - chỉ filter nếu có filter market
      const market = row['Khu vực'] || row['Thị_trường'] || row['Thị trường'] || '';
      if (marketSet && !marketSet.has(market)) return;

      // KHÔNG filter theo team - chỉ tính theo tên MKT đã match
      const dateKey = dateObj.toISOString().split('T')[0];
      if (!byDateAndMkt.has(dateKey)) return; // không có ngày này trong MKT
      const byMkt = byDateAndMkt.get(dateKey);
      if (!byMkt.has(mappedName)) return; // không có MKT này trong ngày
      const m = byMkt.get(mappedName);
      
      const tongTienValue = numFrom(row, ['Tổng tiền VNĐ', 'Tổng tiền VND', 'Tổng_tiền_VNĐ', 'Tổng_tiền_VND', 'tongTienVND', 'Total VND', 'total_vnd']);
      m.ordersTT += 1;
      m.dsChotTT += tongTienValue;

      // Kiểm tra Kết quả Check="Huỷ"
      const ketQuaCheck = String(row['Kết quả Check'] || row['Kết_quả_Check'] || row['ket qua check'] || row['KetQuaCheck'] || '').trim();
      const isHuy = ketQuaCheck === 'Huỷ' || ketQuaCheck === 'Hủy' || ketQuaCheck === 'Huy';
      if (isHuy) {
        m.ordersHuy += 1;
        m.dsHuy += tongTienValue;
      }
    });

    // Convert to array format
    const sortedDates = Array.from(byDateAndMkt.keys()).sort((a, b) => b.localeCompare(a));
    const result = sortedDates.map((dateKey) => {
      const byMkt = byDateAndMkt.get(dateKey);
      const dateObj = new Date(dateKey + 'T00:00:00');
      const marketers = Array.from(byMkt.values()).sort((a, b) => {
        const teamCompare = (a.team || '').localeCompare(b.team || '');
        return teamCompare !== 0 ? teamCompare : (a.name || '').localeCompare(b.name || '');
      });

      return {
        date: dateObj,
        dateStr: formatDate(dateObj),
        items: marketers,
      };
    });

    return result;
  }, [mktData, f3Data, filters]);

  // Calculate totals
  const totals = useMemo(() => {
    return summaryData.reduce(
      (acc, row) => ({
        mess: acc.mess + (row.mess || 0),
        cpqc: acc.cpqc + (row.cpqc || 0),
        orders: acc.orders + (row.orders || 0),
        ordersTT: acc.ordersTT + (row.ordersTT || 0),
        ordersHuy: acc.ordersHuy + (row.ordersHuy || 0),
        revenue: acc.revenue + (row.revenue || 0),
        revenueReal: acc.revenueReal + (row.revenueReal || 0),
        dsHuy: acc.dsHuy + (row.dsHuy || 0),
      }),
      {
        mess: 0,
        cpqc: 0,
        orders: 0,
        ordersTT: 0,
        ordersHuy: 0,
        revenue: 0,
        revenueReal: 0,
        dsHuy: 0,
      }
    );
  }, [summaryData]);

  if (loading || f3Loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-lumi-orange mx-auto"></div>
          <p className="mt-4 text-lumi-gray">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error || f3Error) {
    return (
      <div className="p-8">
        <div className="text-red-600 font-bold">Lỗi khi tải dữ liệu: {String(error || f3Error)}</div>
        <Link to="/bang-bao-cao" className="text-blue-600 underline mt-2 inline-block">Quay lại Bảng báo cáo</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto px-8 py-8 bg-white">
      <div className="mb-6">
        <Link to="/" className="text-sm text-gray-600 hover:text-gray-800">← Quay lại</Link>
        <h1 className="text-2xl font-bold text-gray-800 mt-2">Báo cáo chi tiết</h1>
      </div>

      <div>
        <FilterPanel
          activeTab={"detailed"}
          filters={filters}
          handleFilterChange={(type, value) => handleFilterChange(type, value)}
          quickSelectValue={quickSelectValue}
          handleQuickDateSelect={(e) => handleQuickDateSelect(e)}
          availableFilters={availableFilters}
          userRole={userRole}
          hasActiveFilters={() => hasActiveFilters()}
          clearAllFilters={() => clearAllFilters()}
          variant="topbar"
          columnsConfig={columnsConfig}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={handleVisibleColumnsChange}
        />

        <div className="mt-4">
          <div className="space-y-6">
            {/* Summary Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <h3 className="bg-primary text-white text-lg font-bold px-4 py-3">
                BÁO CÁO TỔNG HỢP
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                  <thead className="bg-secondary">
                    <tr>
                      {visibleColumns?.stt !== false && (
                        <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">STT</th>
                      )}
                      {visibleColumns?.team !== false && (
                        <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Team</th>
                      )}
                      {visibleColumns?.name !== false && (
                        <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Marketing</th>
                      )}
                      {visibleColumns?.cpqc !== false && (
                        <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">CPQC<span className="data-source-note text-[8px] font-normal italic block">(MKT)</span></th>
                      )}
                      {visibleColumns?.mess !== false && (
                        <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Số Mess<span className="data-source-note text-[8px] font-normal italic block">(MKT)</span></th>
                      )}
                      {visibleColumns?.orders !== false && (
                        <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Số Đơn<span className="data-source-note text-[8px] font-normal italic block">(MKT)</span></th>
                      )}
                      {visibleColumns?.revenue !== false && (
                        <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">DS Chốt<span className="data-source-note text-[8px] font-normal italic block">(MKT)</span></th>
                      )}
                      {visibleColumns?.tiLeChot !== false && (
                        <th className="px-2 py-2 text-center text-xs font-semibold bg-yellow-300 uppercase border border-gray-400 whitespace-nowrap">Tỉ lệ chốt</th>
                      )}
                      {visibleColumns?.giaMess !== false && (
                        <th className="px-2 py-2 text-center text-xs font-semibold bg-yellow-300 uppercase border border-gray-400 whitespace-nowrap">Giá Mess</th>
                      )}
                      {visibleColumns?.cps !== false && (
                        <th className="px-2 py-2 text-center text-xs font-semibold bg-yellow-300 uppercase border border-gray-400 whitespace-nowrap">CPS</th>
                      )}
                      {visibleColumns?.cpds !== false && (
                        <th className="px-2 py-2 text-center text-xs font-semibold bg-yellow-300 uppercase border border-gray-400 whitespace-nowrap">%CP/DS</th>
                      )}
                      {visibleColumns?.giaTBDon !== false && (
                        <th className="px-2 py-2 text-center text-xs font-semibold bg-yellow-300 uppercase border border-gray-400 whitespace-nowrap">Giá TB Đơn</th>
                      )}
                      {visibleColumns?.ordersTT !== false && (
                        <th className="px-2 py-2 text-center text-xs font-semibold bg-blue-500 text-white uppercase border border-gray-400 whitespace-nowrap">Số Đơn (TT)<span className="data-source-note text-[8px] font-normal italic block">(F3)</span></th>
                      )}
                      {visibleColumns?.ordersHuy !== false && (
                        <th className="px-2 py-2 text-center text-xs font-semibold bg-blue-500 text-white uppercase border border-gray-400 whitespace-nowrap">Số đơn Huỷ<span className="data-source-note text-[8px] font-normal italic block">(F3)</span></th>
                      )}
                      {visibleColumns?.revenueReal !== false && (
                        <th className="px-2 py-2 text-center text-xs font-semibold bg-blue-500 text-white uppercase border border-gray-400 whitespace-nowrap">DS Chốt (TT)<span className="data-source-note text-[8px] font-normal italic block">(F3)</span></th>
                      )}
                      {visibleColumns?.dsHuy !== false && (
                        <th className="px-2 py-2 text-center text-xs font-semibold bg-blue-500 text-white uppercase border border-gray-400 whitespace-nowrap">DS Huỷ<span className="data-source-note text-[8px] font-normal italic block">(F3)</span></th>
                      )}
                      {visibleColumns?.tiLeChotTT !== false && (
                        <th className="px-2 py-2 text-center text-xs font-semibold bg-yellow-300 uppercase border border-gray-400 whitespace-nowrap">Tỉ lệ chốt (TT)</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {/* Total Row */}
                    <tr className="bg-primary text-white font-bold">
                      <td
                        className="px-2 py-2 text-xs border border-gray-400"
                        colSpan="3"
                      >
                        TỔNG CỘNG
                      </td>
                      {visibleColumns?.cpqc !== false && (
                        <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(totals.cpqc)}</td>
                      )}
                      {visibleColumns?.mess !== false && (
                        <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatNumber(totals.mess)}</td>
                      )}
                      {visibleColumns?.orders !== false && (
                        <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatNumber(totals.orders)}</td>
                      )}
                      {visibleColumns?.revenue !== false && (
                        <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(totals.revenue)}</td>
                      )}
                      {visibleColumns?.tiLeChot !== false && (
                        <td className="px-2 py-2 text-xs text-center border border-gray-400">{formatPercent(totals.mess ? totals.orders / totals.mess : 0)}</td>
                      )}
                      {visibleColumns?.giaMess !== false && (
                        <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(totals.mess ? totals.cpqc / totals.mess : 0)}</td>
                      )}
                      {visibleColumns?.cps !== false && (
                        <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(totals.orders ? totals.cpqc / totals.orders : 0)}</td>
                      )}
                      {visibleColumns?.cpds !== false && (
                        <td className="px-2 py-2 text-xs text-center border border-gray-400">{formatPercent(totals.revenue ? totals.cpqc / totals.revenue : 0)}</td>
                      )}
                      {visibleColumns?.giaTBDon !== false && (
                        <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(totals.orders ? totals.revenue / totals.orders : 0)}</td>
                      )}
                      {visibleColumns?.ordersTT !== false && (
                        <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatNumber(totals.ordersTT)}</td>
                      )}
                      {visibleColumns?.ordersHuy !== false && (
                        <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatNumber(totals.ordersHuy)}</td>
                      )}
                      {visibleColumns?.revenueReal !== false && (
                        <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(totals.revenueReal)}</td>
                      )}
                      {visibleColumns?.dsHuy !== false && (
                        <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(totals.dsHuy)}</td>
                      )}
                      {visibleColumns?.tiLeChotTT !== false && (
                        <td className="px-2 py-2 text-xs text-center border border-gray-400">{formatPercent(totals.mess ? totals.ordersTT / totals.mess : 0)}</td>
                      )}
                    </tr>

                    {/* Data Rows - Paginated */}
                    {(() => {
                      const startIndex = (summaryPage - 1) * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const paginatedData = summaryData.slice(startIndex, endIndex);

                      return paginatedData.map((row, pageIndex) => {
                        const actualIndex = startIndex + pageIndex;
                        const rowStyle = row.isUnmappedF3 ? { backgroundColor: '#fff3cd', fontStyle: 'italic' } : {};
                        return (
                          <tr key={actualIndex} className="hover:bg-gray-50" style={rowStyle} title={row.isUnmappedF3 ? '⚠️ Chỉ có dữ liệu F3, không có dữ liệu MKT' : ''}>
                            {visibleColumns?.stt !== false && (
                              <td className="px-2 py-2 text-xs text-center border border-gray-400">{actualIndex + 1}</td>
                            )}
                            {visibleColumns?.team !== false && (
                              <td className="px-2 py-2 text-xs border border-gray-400">{row.team}</td>
                            )}
                            {visibleColumns?.name !== false && (
                              <td className="px-2 py-2 text-xs border border-gray-400">{row.name}{row.isUnmappedF3 ? <span className="text-yellow-700 text-[10px]"> (F3 only)</span> : ''}</td>
                            )}
                            {visibleColumns?.cpqc !== false && (
                              <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(row.cpqc)}</td>
                            )}
                            {visibleColumns?.mess !== false && (
                              <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatNumber(row.mess)}</td>
                            )}
                            {visibleColumns?.orders !== false && (
                              <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatNumber(row.orders)}</td>
                            )}
                            {visibleColumns?.revenue !== false && (
                              <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(row.revenue)}</td>
                            )}
                            {visibleColumns?.tiLeChot !== false && (
                              <td className="px-2 py-2 text-xs text-center border border-gray-400">{formatPercent(row.tiLeChot || 0)}</td>
                            )}
                            {visibleColumns?.giaMess !== false && (
                              <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(row.giaMess || 0)}</td>
                            )}
                            {visibleColumns?.cps !== false && (
                              <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(row.cps || 0)}</td>
                            )}
                            {visibleColumns?.cpds !== false && (
                              <td className="px-2 py-2 text-xs text-center border border-gray-400">{formatPercent(row.cpds || 0)}</td>
                            )}
                            {visibleColumns?.giaTBDon !== false && (
                              <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(row.giaTBDon || 0)}</td>
                            )}
                            {visibleColumns?.ordersTT !== false && (
                              <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatNumber(row.ordersTT || 0)}</td>
                            )}
                            {visibleColumns?.ordersHuy !== false && (
                              <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatNumber(row.ordersHuy || 0)}</td>
                            )}
                            {visibleColumns?.revenueReal !== false && (
                              <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(row.revenueReal || 0)}</td>
                            )}
                            {visibleColumns?.dsHuy !== false && (
                              <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(row.dsHuy || 0)}</td>
                            )}
                            {visibleColumns?.tiLeChotTT !== false && (
                              <td className="px-2 py-2 text-xs text-center border border-gray-400">{formatPercent(row.tiLeChotTT || 0)}</td>
                            )}
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls for Summary Table */}
              {summaryData.length > itemsPerPage && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Hiển thị{" "}
                    <span className="font-medium">
                      {(summaryPage - 1) * itemsPerPage + 1}
                    </span>{" "}
                    đến{" "}
                    <span className="font-medium">
                      {Math.min(summaryPage * itemsPerPage, summaryData.length)}
                    </span>{" "}
                    trong tổng số{" "}
                    <span className="font-medium">{summaryData.length}</span> dòng
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSummaryPage(summaryPage - 1)}
                      disabled={summaryPage === 1}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        summaryPage === 1
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                      }`}
                    >
                      ← Trước
                    </button>

                    {/* Page numbers */}
                    <div className="flex gap-1">
                      {(() => {
                        const totalPages = Math.ceil(
                          summaryData.length / itemsPerPage
                        );
                        return Array.from(
                          { length: totalPages },
                          (_, i) => i + 1
                        ).map((page) => (
                          <button
                            key={page}
                            onClick={() => setSummaryPage(page)}
                            className={`px-3 py-1 rounded text-sm font-medium ${
                              page === summaryPage
                                ? "bg-blue-600 text-white"
                                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                            }`}
                          >
                            {page}
                          </button>
                        ));
                      })()}
                    </div>

                    <button
                      onClick={() => setSummaryPage(summaryPage + 1)}
                      disabled={
                        summaryPage === Math.ceil(summaryData.length / itemsPerPage)
                      }
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        summaryPage === Math.ceil(summaryData.length / itemsPerPage)
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                      }`}
                    >
                      Sau →
                    </button>
                  </div>
                </div>
              )}

              {summaryData.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">Không có dữ liệu phù hợp với bộ lọc</p>
                </div>
              )}
            </div>

            {/* Daily Breakdown Tables - Show only first 7 */}
            {dailyBreakdown.slice(0, maxDailyTables).map((dayData, dayIndex) => {
              // Calculate daily totals - dùng fields đã có F3 data
              const dayTotals = dayData.items.reduce(
                (acc, item) => ({
                  mess: acc.mess + (item.mess || 0),
                  cpqc: acc.cpqc + (item.cpqc || 0),
                  orders: acc.orders + (item.orders || 0),
                  ordersReal: acc.ordersReal + (item.ordersTT || 0),
                  ordersHuy: acc.ordersHuy + (item.ordersHuy || 0),
                  revenue: acc.revenue + (item.dsChot || 0),
                  revenueReal: acc.revenueReal + (item.dsChotTT || 0),
                  dsHuy: acc.dsHuy + (item.dsHuy || 0),
                }),
                {
                  mess: 0,
                  cpqc: 0,
                  orders: 0,
                  ordersReal: 0,
                  ordersHuy: 0,
                  revenue: 0,
                  revenueReal: 0,
                  dsHuy: 0,
                }
              );

              // Pagination for this day
              const currentPage = dailyPages[dayIndex] || 1;
              const totalPages = Math.ceil(dayData.items.length / itemsPerPage);
              const startIndex = (currentPage - 1) * itemsPerPage;
              const endIndex = startIndex + itemsPerPage;
              const paginatedItems = dayData.items.slice(startIndex, endIndex);

              const handlePageChange = (newPage) => {
                setDailyPages((prev) => ({ ...prev, [dayIndex]: newPage }));
              };

              return (
                <div
                  key={dayIndex}
                  className="bg-white rounded-lg shadow-md overflow-hidden"
                >
                  <h3 className="bg-gray-100 text-gray-800 text-base font-bold px-4 py-3 border-b border-gray-300">
                    Ngày {dayData.dateStr} - Tổng {dayData.items.length} dòng
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                      <thead className="bg-secondary">
                        <tr>
                          {visibleColumns?.stt !== false && (
                            <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">STT</th>
                          )}
                          {visibleColumns?.team !== false && (
                            <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Team</th>
                          )}
                          {visibleColumns?.name !== false && (
                            <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Marketing</th>
                          )}
                          {visibleColumns?.product !== false && (
                            <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Sản phẩm</th>
                          )}
                          {visibleColumns?.market !== false && (
                            <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Thị trường</th>
                          )}
                          {visibleColumns?.ca !== false && (
                            <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Ca</th>
                          )}
                          {visibleColumns?.mess !== false && (
                            <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Số Mess</th>
                          )}
                          {visibleColumns?.cpqc !== false && (
                            <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">CPQC</th>
                          )}
                          {visibleColumns?.orders !== false && (
                            <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Số Đơn</th>
                          )}
                          {visibleColumns?.ordersTT !== false && (
                            <th className="px-2 py-2 text-center text-xs font-semibold text-blue-100 uppercase border border-gray-400 whitespace-nowrap">Số Đơn (TT)</th>
                          )}
                          {visibleColumns?.revenue !== false && (
                            <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Doanh số</th>
                          )}
                          {visibleColumns?.tiLeChot !== false && (
                            <th className="px-2 py-2 text-center text-xs font-semibold text-white uppercase border border-gray-400 whitespace-nowrap">Tỉ lệ chốt</th>
                          )}
                          {visibleColumns?.giaMess !== false && (
                            <th className="px-2 py-2 text-center text-xs font-semibold bg-yellow-300 uppercase border border-gray-400 whitespace-nowrap">Giá Mess</th>
                          )}
                          {visibleColumns?.cps !== false && (
                            <th className="px-2 py-2 text-center text-xs font-semibold bg-yellow-300 uppercase border border-gray-400 whitespace-nowrap">CPS</th>
                          )}
                          {visibleColumns?.cpds !== false && (
                            <th className="px-2 py-2 text-center text-xs font-semibold bg-yellow-300 uppercase border border-gray-400 whitespace-nowrap">%CP/DS</th>
                          )}
                          {visibleColumns?.giaTBDon !== false && (
                            <th className="px-2 py-2 text-center text-xs font-semibold bg-yellow-300 uppercase border border-gray-400 whitespace-nowrap">Giá TB Đơn</th>
                          )}
                          {visibleColumns?.ordersHuy !== false && (
                            <th className="px-2 py-2 text-center text-xs font-semibold bg-blue-500 text-white uppercase border border-gray-400 whitespace-nowrap">Số đơn Huỷ</th>
                          )}
                          {visibleColumns?.revenueReal !== false && (
                            <th className="px-2 py-2 text-center text-xs font-semibold bg-blue-500 text-white uppercase border border-gray-400 whitespace-nowrap">DS Chốt (TT)</th>
                          )}
                          {visibleColumns?.dsHuy !== false && (
                            <th className="px-2 py-2 text-center text-xs font-semibold bg-blue-500 text-white uppercase border border-gray-400 whitespace-nowrap">DS Huỷ</th>
                          )}
                          {visibleColumns?.tiLeChotTT !== false && (
                            <th className="px-2 py-2 text-center text-xs font-semibold bg-yellow-300 uppercase border border-gray-400 whitespace-nowrap">Tỉ lệ chốt (TT)</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        <tr className="bg-green-600 text-white font-bold">
                          <td
                            className="px-2 py-2 text-xs border border-gray-400"
                            colSpan="6"
                          >
                            TỔNG NGÀY
                          </td>
                          {visibleColumns?.mess !== false && (
                            <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatNumber(dayTotals.mess)}</td>
                          )}
                          {visibleColumns?.cpqc !== false && (
                            <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(dayTotals.cpqc)}</td>
                          )}
                          {visibleColumns?.orders !== false && (
                            <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatNumber(dayTotals.orders)}</td>
                          )}
                          {visibleColumns?.ordersTT !== false && (
                            <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatNumber(dayTotals.ordersReal || 0)}</td>
                          )}
                          {visibleColumns?.revenue !== false && (
                            <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(dayTotals.revenue || 0)}</td>
                          )}
                          {visibleColumns?.tiLeChot !== false && (
                            <td className="px-2 py-2 text-xs text-center border border-gray-400">{formatPercent(dayTotals.mess ? dayTotals.orders / dayTotals.mess : 0)}</td>
                          )}
                          {visibleColumns?.giaMess !== false && (
                            <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(dayTotals.mess ? dayTotals.cpqc / dayTotals.mess : 0)}</td>
                          )}
                          {visibleColumns?.cps !== false && (
                            <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(dayTotals.orders ? dayTotals.cpqc / dayTotals.orders : 0)}</td>
                          )}
                          {visibleColumns?.cpds !== false && (
                            <td className="px-2 py-2 text-xs text-center border border-gray-400">{formatPercent(dayTotals.revenue ? dayTotals.cpqc / dayTotals.revenue : 0)}</td>
                          )}
                          {visibleColumns?.giaTBDon !== false && (
                            <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(dayTotals.orders ? dayTotals.revenue / dayTotals.orders : 0)}</td>
                          )}
                          {visibleColumns?.ordersHuy !== false && (
                            <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatNumber(dayTotals.ordersHuy || 0)}</td>
                          )}
                          {visibleColumns?.revenueReal !== false && (
                            <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(dayTotals.revenueReal || 0)}</td>
                          )}
                          {visibleColumns?.dsHuy !== false && (
                            <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(dayTotals.dsHuy || 0)}</td>
                          )}
                          {visibleColumns?.tiLeChotTT !== false && (
                            <td className="px-2 py-2 text-xs text-center border border-gray-400">{dayTotals.mess && dayTotals.mess > 0 ? formatPercent((dayTotals.ordersReal || 0) / dayTotals.mess) : '0.00%'}</td>
                          )}
                        </tr>

                        {paginatedItems.map((item, itemIndex) => {
                          const closingRate = item.mess && item.mess > 0 ? item.orders / item.mess : 0;
                          const closingRateReal = item.mess && item.mess > 0 ? (item.ordersTT || 0) / item.mess : 0;
                          const giaMess = item.mess && item.mess > 0 ? item.cpqc / item.mess : 0;
                          const cps = item.orders && item.orders > 0 ? item.cpqc / item.orders : 0;
                          const cpds = item.dsChot && item.dsChot > 0 ? item.cpqc / item.dsChot : 0;
                          const giaTBDon = item.orders && item.orders > 0 ? item.dsChot / item.orders : 0;
                          return (
                            <tr key={itemIndex} className="hover:bg-gray-50">
                              {visibleColumns?.stt !== false && (
                                <td className="px-2 py-2 text-xs text-center border border-gray-400">{startIndex + itemIndex + 1}</td>
                              )}
                              {visibleColumns?.team !== false && (
                                <td className="px-2 py-2 text-xs border border-gray-400">{item.team}</td>
                              )}
                              {visibleColumns?.name !== false && (
                                <td className="px-2 py-2 text-xs border border-gray-400">{item.name}</td>
                              )}
                              {visibleColumns?.product !== false && (
                                <td className="px-2 py-2 text-xs border border-gray-400">{item.sanPham || '-'}</td>
                              )}
                              {visibleColumns?.market !== false && (
                                <td className="px-2 py-2 text-xs border border-gray-400">{item.thiTruong || '-'}</td>
                              )}
                              {visibleColumns?.ca !== false && (
                                <td className="px-2 py-2 text-xs border border-gray-400">{item.ca || '-'}</td>
                              )}
                              {visibleColumns?.mess !== false && (
                                <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatNumber(item.mess || 0)}</td>
                              )}
                              {visibleColumns?.cpqc !== false && (
                                <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(item.cpqc || 0)}</td>
                              )}
                              {visibleColumns?.orders !== false && (
                                <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatNumber(item.orders || 0)}</td>
                              )}
                              {visibleColumns?.ordersTT !== false && (
                                <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatNumber(item.ordersTT || 0)}</td>
                              )}
                              {visibleColumns?.revenue !== false && (
                                <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(item.dsChot || 0)}</td>
                              )}
                              {visibleColumns?.tiLeChot !== false && (
                                <td className="px-2 py-2 text-xs text-center border border-gray-400">{formatPercent(closingRate)}</td>
                              )}
                              {visibleColumns?.giaMess !== false && (
                                <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(giaMess)}</td>
                              )}
                              {visibleColumns?.cps !== false && (
                                <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(cps)}</td>
                              )}
                              {visibleColumns?.cpds !== false && (
                                <td className="px-2 py-2 text-xs text-center border border-gray-400">{formatPercent(cpds)}</td>
                              )}
                              {visibleColumns?.giaTBDon !== false && (
                                <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(giaTBDon)}</td>
                              )}
                              {visibleColumns?.ordersHuy !== false && (
                                <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatNumber(item.ordersHuy || 0)}</td>
                              )}
                              {visibleColumns?.revenueReal !== false && (
                                <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(item.dsChotTT || 0)}</td>
                              )}
                              {visibleColumns?.dsHuy !== false && (
                                <td className="px-2 py-2 text-xs text-right border border-gray-400">{formatCurrency(item.dsHuy || 0)}</td>
                              )}
                              {visibleColumns?.tiLeChotTT !== false && (
                                <td className="px-2 py-2 text-xs text-center border border-gray-400">{item.mess && item.mess > 0 ? formatPercent(closingRateReal) : '0.00%'}</td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Hiển thị <span className="font-medium">{startIndex + 1}</span>{" "}
                        đến{" "}
                        <span className="font-medium">
                          {Math.min(endIndex, dayData.items.length)}
                        </span>{" "}
                        trong tổng số{" "}
                        <span className="font-medium">{dayData.items.length}</span>{" "}
                        dòng
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            currentPage === 1
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                          }`}
                        >
                          ← Trước
                        </button>

                        <div className="flex gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                            (page) => (
                              <button
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className={`px-3 py-1 rounded text-sm font-medium ${
                                  page === currentPage
                                    ? "bg-blue-600 text-white"
                                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                                }`}
                              >
                                {page}
                              </button>
                            )
                          )}
                        </div>

                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            currentPage === totalPages
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                          }`}
                        >
                          Sau →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


