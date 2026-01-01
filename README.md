# Phong Live Manager

Hệ thống quản lý Live và báo cáo cho Phong Live.

## Tính năng

- 📊 **Quản lý Live**: Theo dõi và báo cáo các phiên Live
- 👥 **Quản lý Nhân sự**: Quản lý thông tin nhân viên, lương và KPIs
- 🏪 **Quản lý Cửa hàng**: Quản lý danh sách cửa hàng và xem chi tiết
- 📈 **Báo cáo**: Tổng hợp báo cáo theo nhân viên, cửa hàng và thời gian
- 📹 **Video Metrics**: Theo dõi hiệu quả video

## Công nghệ

- React 19
- TypeScript
- Vite
- React Router
- Recharts (biểu đồ)
- Tailwind CSS

## Cài đặt

1. Cài đặt dependencies:
```bash
npm install
```

2. Chạy ứng dụng:
```bash
npm run dev
```

3. Build cho production:
```bash
npm run build
```

## Cấu trúc dự án

```
phong-live-manager/
├── components/       # Các component tái sử dụng
├── pages/          # Các trang chính
├── services/       # API và data service
├── types.ts        # TypeScript types
└── App.tsx         # Component chính
```

## Push lên GitHub

Repo đã được khởi tạo. Để push lên GitHub:

1. Tạo repository mới trên GitHub:
   - Vào https://github.com/new
   - Đặt tên repository (ví dụ: `phong-live-manager`)
   - Không khởi tạo README, .gitignore, hoặc license (đã có sẵn)

2. Kết nối với remote và push:
```bash
git remote add origin https://github.com/YOUR_USERNAME/phong-live-manager.git
git push -u origin main
```

Hoặc nếu dùng SSH:
```bash
git remote add origin git@github.com:YOUR_USERNAME/phong-live-manager.git
git push -u origin main
```

## License

Private project
