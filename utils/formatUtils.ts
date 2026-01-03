/**
 * Format currency với dấu phẩy ngăn cách hàng nghìn
 * @param val - Giá trị số tiền
 * @returns Chuỗi đã format với dấu phẩy ngăn cách và đơn vị VND
 */
export const formatCurrency = (val: number): string => {
  // Format số với dấu phẩy ngăn cách hàng nghìn
  const formatted = Math.round(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${formatted} ₫`;
};


