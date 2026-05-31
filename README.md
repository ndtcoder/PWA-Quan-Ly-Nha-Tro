# My Home - Hệ thống Quản lý Nhà cho thuê

Ứng dụng Progressive Web App (PWA) full-stack để quản lý nhà cho thuê tại Việt Nam. Dành cho chủ nhà trọ và quản lý để xử lý người thuê, hợp đồng, hóa đơn, đọc đồng hồ điện nước, yêu cầu bảo trì, và nhiều hơn nữa.

## Công nghệ sử dụng

| Tầng | Công nghệ |
|------|-----------|
| Backend | Python 3.11, FastAPI, Supabase (PostgreSQL + Auth + Storage) |
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Zustand, TanStack Query |
| PWA | Service Worker, Web Push Notifications, Hỗ trợ Offline |
| Triển khai | Backend trên Railway, Frontend trên Vercel |

## Cấu trúc dự án

```
PWA-Quan-Ly-Nha-Tro/
  backend/
    app/
      main.py           # Điểm khởi động FastAPI
      config.py         # Cài đặt từ biến môi trường
      routers/          # Xử lý route API
      services/         # Logic nghiệp vụ
      models/           # Pydantic request/response models
      middleware/       # Logging, security headers
      utils/            # Validate file, helpers
      cron/             # Lịch trình tự động (nhắc hóa đơn, v.v.)
    migrations/         # File migration SQL cho Supabase
    requirements.txt    # Dependencies Python
  frontend/
    src/
      pages/            # Các trang route
      components/       # UI components tái sử dụng
      api/              # API client (axios)
      stores/           # Zustand state management
      hooks/            # Custom React hooks
      types/            # TypeScript type definitions
    public/
      sw.js             # Service Worker
      manifest.json     # PWA manifest
      offline.html      # Trang offline fallback
    vite.config.ts      # Cấu hình Vite + PWA
```

## Tính năng

- Quản lý multi-tenant với phân quyền theo vai trò (Chủ nhà, Quản lý, Nhân viên, Người thuê)
- Quản lý nhà cho thuê và phòng
- Hồ sơ người thuê với upload ảnh CCCD
- Quản lý vòng đời hợp đồng (tạo, kích hoạt, chấm dứt, hết hạn)
- Upload bản scan hợp đồng chính thức (PDF)
- Tạo hóa đơn hàng tháng tự động
- Thanh toán QR VietQR với xác minh webhook
- Đọc đồng hồ điện/nước với AI OCR (Google Vision)
- Theo dõi yêu cầu bảo trì/sửa chữa
- Thông báo push và nhắc nhở qua email
- Báo cáo tài chính và phân tích hiệu suất
- Đăng nhập bằng Google hoặc email/mật khẩu
- PWA với hỗ trợ offline và cài đặt trên điện thoại

---

## Hướng dẫn Deploy từ đầu (Clean Deploy)

### Yêu cầu hệ thống

- Python 3.11+
- Node.js 18+
- Tài khoản Supabase (free tier đủ dùng)

### Bước 1: Thiết lập Supabase

1. Tạo project mới tại [supabase.com](https://supabase.com)
2. Vào **SQL Editor**, chạy 2 file migration theo thứ tự:
   - `backend/migrations/001_core_tables.sql`
   - `backend/migrations/002_operations_tables.sql`
3. Vào **Storage**, tạo các bucket (đặt Private):
   - `contracts`
   - `id-documents`
   - `meter-photos`
   - `maintenance-photos`
4. Vào **Authentication > Providers > Google**:
   - Bật Google provider
   - Điền Google OAuth Client ID và Secret
5. Vào **Authentication > URL Configuration**:
   - Thêm Redirect URL: `http://localhost:5173/auth/callback` (dev)
   - Thêm Redirect URL cho domain production nếu có
6. Lấy các key từ **Settings > API**:
   - `Project URL` (SUPABASE_URL)
   - `service_role key` (SUPABASE_SERVICE_KEY - cho backend)
   - `anon public key` (SUPABASE_ANON_KEY - cho frontend)
   - `JWT Secret` (JWT_SECRET - cho backend)

### Bước 2: Thiết lập Backend

```bash
cd backend

# Tạo file cấu hình
cp .env.example .env

# Sửa .env với thông tin Supabase:
# SUPABASE_URL=https://xxx.supabase.co
# SUPABASE_SERVICE_KEY=your_service_role_key
# JWT_SECRET=your_jwt_secret
# ENVIRONMENT=development

# Cài đặt dependencies
pip install -r requirements.txt

# Khởi động server
uvicorn app.main:app --reload --port 8000
```

Kiểm tra: `http://localhost:8000/health` phải trả về `{"status": "ok", "version": "1.0.0"}`

API docs: `http://localhost:8000/docs`

### Bước 3: Thiết lập Frontend

```bash
cd frontend

# Tạo file cấu hình
cp .env.example .env

# Sửa .env:
# VITE_API_URL=http://localhost:8000
# VITE_SUPABASE_URL=https://xxx.supabase.co
# VITE_SUPABASE_ANON_KEY=your_anon_public_key

# Cài đặt dependencies
npm install

# Khởi động server phát triển
npm run dev
```

Mở `http://localhost:5173` - Trang đăng nhập sẽ hiện lên.

### Bước 4: Kiểm tra

- Đăng ký tài khoản mới (email hoặc Google)
- Đặt tên hệ thống nhà trọ (nếu dùng Google)
- Thêm nhà cho thuê, thêm phòng
- Tạo hợp đồng, thêm người thuê

---

## Biến môi trường

### Backend (.env)

| Biến | Mô tả | Bắt buộc |
|------|--------|----------|
| `SUPABASE_URL` | URL project Supabase | Có |
| `SUPABASE_SERVICE_KEY` | Service role key của Supabase | Có |
| `JWT_SECRET` | JWT secret từ Supabase Settings > API | Có |
| `ENVIRONMENT` | `development` hoặc `production` | Có |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Không (cần cho đăng nhập Google) |
| `GOOGLE_VISION_API_KEY` | Google Cloud Vision API key (cho OCR đồng hồ) | Không |
| `RESEND_API_KEY` | API key Resend.com (cho gửi email) | Không |
| `VAPID_PRIVATE_KEY` | VAPID private key cho push notifications | Không |
| `VAPID_PUBLIC_KEY` | VAPID public key cho push notifications | Không |
| `VAPID_EMAIL` | Email liên hệ cho push notifications | Không |
| `CASSO_API_KEY` | API key Casso.vn (webhook thanh toán) | Không |
| `BANK_BIN` | Mã BIN ngân hàng cho QR VietQR | Không |
| `BANK_ACCOUNT_NUMBER` | Số tài khoản ngân hàng | Không |
| `BANK_ACCOUNT_NAME` | Tên chủ tài khoản | Không |

### Frontend (.env)

| Biến | Mô tả | Bắt buộc |
|------|--------|----------|
| `VITE_API_URL` | URL backend API | Có |
| `VITE_SUPABASE_URL` | URL project Supabase | Có |
| `VITE_SUPABASE_ANON_KEY` | Anon public key của Supabase | Có |
| `VITE_VAPID_PUBLIC_KEY` | VAPID public key cho push | Không |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID | Không |

---

## Triển khai Production

### Backend lên Railway

1. Kết nối GitHub repository với [Railway](https://railway.app)
2. Đặt root directory: `backend/`
3. Thêm tất cả biến môi trường bắt buộc
4. Railway tự detect Python và dùng `Procfile`
5. Health check endpoint: `GET /health`

### Frontend lên Vercel

1. Kết nối GitHub repository với [Vercel](https://vercel.com)
2. Đặt root directory: `frontend/`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Thêm biến môi trường (`VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
6. File `vercel.json` tự xử lý SPA rewrites và security headers

### Checklist trước production

- [ ] Đặt `JWT_SECRET` mạnh (32+ ký tự ngẫu nhiên)
- [ ] Cấu hình CORS trong backend chỉ cho phép domain Vercel
- [ ] Đảm bảo RLS policies đã bật trên tất cả bảng
- [ ] Cấu hình Casso webhook URL trỏ tới `/api/v1/payments/webhook`
- [ ] Tạo VAPID keys cho push notifications
- [ ] Thêm Redirect URL production vào Supabase Auth
- [ ] Cấu hình custom domain trên Vercel và Railway

---

## Lưu ý quan trọng

| Tính năng | Yêu cầu | Nếu không có |
|-----------|----------|--------------|
| Đăng nhập Google | Bật Google provider trong Supabase Auth + Google OAuth Client ID | Chỉ dùng được email/mật khẩu |
| Upload ảnh CCCD | Tạo bucket `id-documents` trong Storage | Hiện lỗi khi upload |
| Upload/Xuất PDF hợp đồng | Tạo bucket `contracts` trong Storage | Hiện lỗi khi xuất PDF |
| Xuất PDF hợp đồng | Font Arial/DejaVu trên server (Windows có sẵn) | PDF không hiển thị tiếng Việt đúng |
| Email thông báo | `RESEND_API_KEY` | Hiện mock (print ra console) |
| OCR đồng hồ điện/nước | `GOOGLE_VISION_API_KEY` | Hiện lỗi khi upload ảnh đồng hồ |
| Thanh toán QR VietQR | `BANK_BIN`, `BANK_ACCOUNT_NUMBER`, `BANK_ACCOUNT_NAME` | QR không sinh được |
| Push notifications | `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY` | Không gửi được push |

App vẫn chạy bình thường mà không cần các API key trên. Chỉ tính năng tương ứng sẽ báo lỗi khi sử dụng.

---

## Database Migrations

Khi deploy mới hoàn toàn, chỉ cần chạy 2 file SQL theo thứ tự trong Supabase SQL Editor:

```
backend/migrations/001_core_tables.sql    -- Bảng cơ bản: organizations, profiles, properties, units, contracts, renters, invitations
backend/migrations/002_operations_tables.sql  -- Bảng vận hành: tasks, invoices, meters, maintenance, notifications
```

Các file này đã bao gồm:
- Tất cả bảng với đầy đủ cột
- Trigger functions (auto update `updated_at`)
- Indexes cho performance
- Row Level Security (RLS) policies cho data isolation

---

## Tài liệu API

Khi backend đang chạy, truy cập:
- `/docs` - Swagger UI (tương tác trực tiếp)
- `/redoc` - ReDoc (đọc documentation)

---

## Giấy phép

Private - All rights reserved.
