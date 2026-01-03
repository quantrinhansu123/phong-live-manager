import React, { useState } from 'react';

export interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'checkbox';
  options?: { value: string; label: string }[];
}

export interface QuickDateFilter {
  label: string;
  getDateRange: () => { from: string; to: string };
}

interface FilterBarProps {
  onSearch: (searchText: string) => void;
  onExportExcel: () => void;
  onImportExcel: (file: File) => void;
  onReset: () => void;
  filterFields?: FilterField[];
  selectedFilters: Record<string, string[]>;
  onFilterChange: (field: string, values: string[]) => void;
  quickDateFilters?: QuickDateFilter[];
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onQuickDateSelect: (from: string, to: string) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  onSearch,
  onExportExcel,
  onImportExcel,
  onReset,
  filterFields = [],
  selectedFilters,
  onFilterChange,
  quickDateFilters = [],
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onQuickDateSelect,
}) => {
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchText(value);
    onSearch(value);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportExcel(file);
    }
    // Reset input để có thể chọn lại file cùng tên
    e.target.value = '';
  };

  // Quick date filters
  const defaultQuickFilters: QuickDateFilter[] = [
    {
      label: 'Hôm nay',
      getDateRange: () => {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        return { from: dateStr, to: dateStr };
      },
    },
    {
      label: 'Hôm qua',
      getDateRange: () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];
        return { from: dateStr, to: dateStr };
      },
    },
    {
      label: 'Tuần này',
      getDateRange: () => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const weekStart = new Date(today.setDate(diff));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return {
          from: weekStart.toISOString().split('T')[0],
          to: weekEnd.toISOString().split('T')[0],
        };
      },
    },
    {
      label: 'Tuần trước',
      getDateRange: () => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const weekStart = new Date(today.setDate(diff - 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return {
          from: weekStart.toISOString().split('T')[0],
          to: weekEnd.toISOString().split('T')[0],
        };
      },
    },
    {
      label: 'Tháng này',
      getDateRange: () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return {
          from: firstDay.toISOString().split('T')[0],
          to: lastDay.toISOString().split('T')[0],
        };
      },
    },
    {
      label: 'Tháng trước',
      getDateRange: () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
        return {
          from: firstDay.toISOString().split('T')[0],
          to: lastDay.toISOString().split('T')[0],
        };
      },
    },
    {
      label: '30 ngày qua',
      getDateRange: () => {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return {
          from: thirtyDaysAgo.toISOString().split('T')[0],
          to: today.toISOString().split('T')[0],
        };
      },
    },
  ];

  const allQuickFilters = [...defaultQuickFilters, ...quickDateFilters];

  const handleQuickDateClick = (filter: QuickDateFilter) => {
    const range = filter.getDateRange();
    onQuickDateSelect(range.from, range.to);
  };

  const handleCheckboxChange = (field: string, value: string, checked: boolean) => {
    const currentValues = selectedFilters[field] || [];
    if (checked) {
      onFilterChange(field, [...currentValues, value]);
    } else {
      onFilterChange(field, currentValues.filter(v => v !== value));
    }
  };

  return (
    <div className="bg-white rounded shadow-sm border border-gray-200 p-4 space-y-4">
      {/* Dòng 1: Tìm kiếm, Export, Import, Reset */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Tìm kiếm tổng (tất cả các giá trị trong bảng)..."
            value={searchText}
            onChange={handleSearch}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy"
          />
        </div>
        <button
          onClick={onExportExcel}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Tải xuống Excel
        </button>
        <label className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm font-medium flex items-center gap-2 cursor-pointer">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Tải lên Excel
        </label>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition text-sm font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Quay lại
        </button>
      </div>

      {/* Dòng 2: Bộ lọc */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-700">Bộ lọc</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-sm text-brand-navy hover:underline"
          >
            {showFilters ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
          </button>
        </div>

        {showFilters && (
          <div className="space-y-4">
            {/* Bộ lọc thời gian */}
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase">Lọc theo thời gian</h4>
              <div className="space-y-2">
                {/* Lọc nhanh */}
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Lọc nhanh:</label>
                  <div className="flex flex-wrap gap-2">
                    {allQuickFilters.map((filter, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickDateClick(filter)}
                        className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 hover:border-brand-navy transition"
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Từ ngày đến ngày */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-xs text-gray-600 mb-1 block">Từ ngày:</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => onDateFromChange(e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-navy"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-600 mb-1 block">Đến ngày:</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => onDateToChange(e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-navy"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bộ lọc theo các trường */}
            {filterFields.length > 0 && (
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase">Lọc theo trường</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filterFields.map((field) => (
                    <div key={field.key}>
                      <label className="text-xs font-medium text-gray-700 mb-2 block">
                        {field.label}:
                      </label>
                      {field.type === 'checkbox' && field.options ? (
                        <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-200 rounded p-2 bg-white">
                          {field.options.map((option) => (
                            <label
                              key={option.value}
                              className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded"
                            >
                              <input
                                type="checkbox"
                                checked={(selectedFilters[field.key] || []).includes(option.value)}
                                onChange={(e) =>
                                  handleCheckboxChange(field.key, option.value, e.target.checked)
                                }
                                className="w-4 h-4 text-brand-navy border-gray-300 rounded focus:ring-brand-navy"
                              />
                              <span className="text-gray-700">{option.label}</span>
                            </label>
                          ))}
                        </div>
                      ) : field.type === 'select' && field.options ? (
                        <select
                          multiple
                          value={selectedFilters[field.key] || []}
                          onChange={(e) => {
                            const values = Array.from(e.target.selectedOptions, (option) => option.value);
                            onFilterChange(field.key, values);
                          }}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-navy"
                          size={4}
                        >
                          {field.options.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


