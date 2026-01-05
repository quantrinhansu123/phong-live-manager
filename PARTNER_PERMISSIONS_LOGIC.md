# Logic Phân Quyền Cho Đối Tác (Partner Permissions Logic)

## 📋 Tổng Quan

Hệ thống phân quyền cho đối tác dựa trên **Role-Based Access Control (RBAC)** với 2 role chính:
- **Admin**: Toàn quyền
- **Partner**: Chỉ xem thông tin của chính mình

---

## 🔑 1. Xác Định User Role & ID

### Khi đăng nhập (Login.tsx):
```typescript
// Lưu thông tin user vào localStorage
localStorage.setItem('currentUserId', user.id)      // ID của partner
localStorage.setItem('currentUserRole', 'partner')  // Role: 'admin' | 'partner' | 'employee'
```

### Các hàm utility (permissionUtils.ts):
```typescript
getCurrentUserRole(): UserRole     // Lấy role: 'admin', 'partner', 'employee'
getCurrentUserId(): string | undefined  // Lấy ID của user hiện tại
isAdmin(): boolean                 // Kiểm tra có phải admin không
```

---

## 🔍 2. Logic Filter Dữ Liệu

### Trong PartnerManagement.tsx (dòng 155-189):

```typescript
const filteredPartners = partners.filter(partner => {
  // BƯỚC 1: Kiểm tra phân quyền xem dữ liệu
  const currentUserRole = getCurrentUserRole();
  const currentUserId = getCurrentUserId();
  
  // Nếu là partner (KHÔNG phải admin), chỉ hiển thị bản thân
  if (currentUserRole === 'partner' && !isAdmin() && currentUserId) {
    if (partner.id !== currentUserId) {
      return false; // Ẩn các đối tác khác
    }
  }
  
  // BƯỚC 2: Áp dụng các filter khác (search, type, status)
  // ...
  
  return true;
});
```

**Kết quả:**
- **Admin**: Thấy tất cả đối tác
- **Partner**: Chỉ thấy đối tác có `id === currentUserId`

---

## 🎛️ 3. UI Controls (Giao Diện)

### A. Nút "Thêm Đối Tác Mới" (dòng 199-212)
```typescript
{isAdmin() && (
  <button onClick={...}>
    Thêm Đối Tác Mới (添加新合作伙伴)
  </button>
)}
```
- ✅ **Admin**: Thấy nút
- ❌ **Partner**: Không thấy nút

### B. Nút "Sửa" và "Xóa" trong bảng (dòng 545-565)
```typescript
{isAdmin() && (
  <>
    <button onClick={...}>编辑 (Sửa)</button>
    <button onClick={...}>删除 (Xóa)</button>
  </>
)}
```
- ✅ **Admin**: Thấy cả 2 nút
- ❌ **Partner**: Không thấy cả 2 nút

### C. Nút "Xem" (查看)
- ✅ **Tất cả user**: Đều thấy nút "Xem" để xem chi tiết

---

## 📊 4. Bảng Tổng Hợp Quyền Truy Cập

| Chức năng | Admin | Partner |
|-----------|-------|---------|
| **Xem danh sách đối tác** | ✅ Tất cả | ✅ Chỉ bản thân |
| **Xem chi tiết đối tác** | ✅ Tất cả | ✅ Chỉ bản thân |
| **Thêm đối tác mới** | ✅ Có | ❌ Không |
| **Sửa đối tác** | ✅ Tất cả | ❌ Không |
| **Xóa đối tác** | ✅ Tất cả | ❌ Không |
| **Export Excel** | ✅ Tất cả | ✅ Chỉ bản thân |
| **Xem mật khẩu** | ✅ Có | ✅ Có (chỉ của mình) |

---

## 🔐 5. Flow Hoạt Động

```
1. User đăng nhập
   ↓
2. Login.tsx lưu vào localStorage:
   - currentUserId: "partner_id_123"
   - currentUserRole: "partner"
   ↓
3. PartnerManagement.tsx load data:
   - fetchPartners() → Lấy tất cả đối tác
   ↓
4. Filter dữ liệu:
   - getCurrentUserRole() → "partner"
   - getCurrentUserId() → "partner_id_123"
   - Filter: chỉ giữ lại partner.id === "partner_id_123"
   ↓
5. Render UI:
   - isAdmin() → false
   - Ẩn nút "Thêm", "Sửa", "Xóa"
   - Chỉ hiển thị đối tác của chính họ
```

---

## 💡 6. Lưu Ý Quan Trọng

1. **Lọc dữ liệu ở client-side**: 
   - Filter xảy ra sau khi fetch data
   - Data vẫn được fetch đầy đủ từ server
   - Chỉ ẩn ở giao diện

2. **Bảo mật client-side không đủ**:
   - ⚠️ Nên có API endpoint riêng cho partner
   - ⚠️ Server nên validate và chỉ trả về data phù hợp
   - ✅ Hiện tại chỉ là protection ở UI level

3. **ID so sánh**:
   - `partner.id` phải khớp với `currentUserId`
   - ID được lưu khi login từ `partner.id` hoặc `personnel.id`

---

## 🔧 7. Các File Liên Quan

- `utils/permissionUtils.ts`: Các hàm utility phân quyền
- `pages/Login.tsx`: Lưu role & ID khi login
- `pages/PartnerManagement.tsx`: Áp dụng phân quyền cho đối tác
- `types.ts`: Định nghĩa interface `Partner`, `UserRole`

---

## 📝 Ví Dụ Code

### Kiểm tra quyền trong component:
```typescript
import { getCurrentUserRole, getCurrentUserId, isAdmin } from '../utils/permissionUtils';

const currentRole = getCurrentUserRole(); // 'admin' | 'partner' | 'employee'
const currentId = getCurrentUserId();     // 'user_id_123' | undefined
const isUserAdmin = isAdmin();            // true | false

// Filter data
if (currentRole === 'partner' && !isUserAdmin && currentId) {
  // Chỉ hiển thị data của chính user
  filteredData = data.filter(item => item.id === currentId);
}

// Show/hide UI
{isUserAdmin && <button>Admin Only Button</button>}
```

---

## ❓ FAQ

**Q: Partner có thể edit thông tin của chính mình không?**
A: Hiện tại KHÔNG. Chỉ Admin mới có thể edit. Nếu cần cho partner edit, cần thêm logic cho phép edit khi `partner.id === currentUserId`.

**Q: Nếu partner đăng nhập với email không có trong danh sách Partners thì sao?**
A: Login sẽ fail với message "Email không tồn tại trong hệ thống!"

**Q: Partner có thể xem mật khẩu của mình không?**
A: Có, partner có thể xem mật khẩu của chính mình trong bảng và modal chi tiết (cột "Mật khẩu").

