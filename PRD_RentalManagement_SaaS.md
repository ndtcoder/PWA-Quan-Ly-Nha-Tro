# 📋 PRD — Rental Property Management SaaS
> **Phiên bản**: 1.0 | **Ngày**: 2025 | **Trạng thái**: Draft for AI-agent vibe coding  
> **Dành cho**: Frontend dev (React), Backend dev (FastAPI), UX/UI, QA, Security

---

## 0. TÓM TẮT QUYẾT ĐỊNH KIẾN TRÚC

| Hạng mục | Quyết định | Lý do |
|---|---|---|
| Mô hình | SaaS multi-tenant | Nhiều chủ nhà độc lập |
| Frontend | React (Vite) + Tailwind CSS | PWA support, AI-friendly |
| Backend | FastAPI (Python) | Type-safe, async, AI-friendly |
| Database | Supabase (PostgreSQL + RLS) | Tenant isolation tự động qua Row-Level Security |
| Auth | Supabase Auth (JWT) | Built-in, hỗ trợ role |
| File Storage | Supabase Storage | Ảnh đồng hồ, PDF hợp đồng |
| Notification | Email: Resend.com + PWA Web Push | Miễn phí, dễ tích hợp |
| Payment | VietQR (bank transfer) | Phổ biến nhất thị trường VN |
| AI OCR | Google Vision API | Độ chính xác cao cho ảnh đồng hồ |
| PDF Export | WeasyPrint (Python) | Generate hợp đồng từ HTML template |
| Deploy Frontend | Vercel | Zero-config, CDN |
| Deploy Backend | Railway hoặc Render | FastAPI không chạy native trên Vercel |
| Quy mô mục tiêu | 10–100 chủ nhà, 200–2000 phòng | Mid-scale, thiết kế scalable |

> ⚠️ **Lưu ý triển khai**: Vercel không hỗ trợ FastAPI native. Cấu trúc đề xuất:  
> `React → Vercel` | `FastAPI → Railway (free tier)` | `DB/Auth/Storage → Supabase`

---

## 1. MULTI-TENANCY & PHÂN QUYỀN

### 1.1 Mô hình Tenant

```
SaaS Platform
├── Tenant A (Chủ nhà Nguyễn Văn A - có 3 nhà trọ)
│   ├── Users: owner, manager_01, accountant_01, tenant_01...
│   └── Data: properties, contracts, invoices... (isolated)
├── Tenant B (Công ty BĐS XYZ - có 50 căn hộ)
│   └── ...
```

**Mỗi Tenant là một `organization`** trong hệ thống. Người dùng thuộc về đúng 1 tenant.

### 1.2 RBAC — Ma trận phân quyền

| Quyền | System Admin | Owner (Chủ nhà) | Manager (QL) | Accountant (KT) | Maintenance | Cleaner | Renter (Người thuê) |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Quản lý toàn bộ tenant | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Thêm/xóa property | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Xem tất cả property | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Tạo/sửa hợp đồng | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Xem hợp đồng của mình | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ (chỉ của mình) |
| Tạo invoice | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Xem invoice | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ (chỉ của mình) |
| Thanh toán invoice | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Xem báo cáo tài chính | ❌ | ✅ | ✅ (giới hạn) | ✅ | ❌ | ❌ | ❌ |
| Tạo yêu cầu bảo trì | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Xử lý yêu cầu bảo trì | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Upload ảnh đồng hồ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Duyệt số đồng hồ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Quản lý nhân viên | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Xem lịch làm việc | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

### 1.3 Database Schema — Tenant Isolation (Supabase RLS)

```sql
-- Mọi bảng đều có tenant_id
-- Supabase RLS tự động filter theo JWT claim

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,         -- dùng cho subdomain: slug.app.com
  subscription_plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL,  -- 'owner' | 'manager' | 'accountant' | 'maintenance' | 'cleaner' | 'renter' | 'sysadmin'
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy mẫu (áp dụng tương tự cho tất cả bảng có organization_id):
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON properties
  USING (organization_id = (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));
```

---

## 2. MODULE 1 — QUẢN LÝ NHÀ CHO THUÊ (Property Management)

### 2.1 Database Schema

```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  name TEXT NOT NULL,                -- "Nhà trọ 123 Nguyễn Trãi"
  address TEXT NOT NULL,
  ward TEXT, district TEXT, city TEXT,
  property_type TEXT,                -- 'house' | 'apartment_building' | 'villa'
  total_units INT DEFAULT 0,
  description TEXT,
  thumbnail_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) NOT NULL,
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  unit_number TEXT NOT NULL,         -- "P101", "Phòng 2A"
  floor INT,
  area_sqm DECIMAL(6,2),
  base_rent DECIMAL(12,0) NOT NULL,  -- giá thuê/tháng (VND)
  deposit_amount DECIMAL(12,0),      -- tiền cọc
  max_occupants INT DEFAULT 2,
  status TEXT DEFAULT 'vacant',      -- 'vacant' | 'occupied' | 'maintenance'
  amenities JSONB DEFAULT '[]',      -- ["wifi","ac","parking","water_heater"]
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE unit_co_owners (                  -- phân quyền nhiều chủ nhà
  unit_id UUID REFERENCES units(id),
  profile_id UUID REFERENCES profiles(id),
  share_percentage DECIMAL(5,2) DEFAULT 100,
  PRIMARY KEY (unit_id, profile_id)
);
```

### 2.2 API Endpoints (FastAPI)

```
GET    /api/properties                  → danh sách nhà (filter: city, status)
POST   /api/properties                  → tạo nhà mới
GET    /api/properties/{id}             → chi tiết + danh sách units
PATCH  /api/properties/{id}             → cập nhật thông tin
DELETE /api/properties/{id}             → xóa (soft delete)

GET    /api/properties/{id}/units       → danh sách phòng
POST   /api/properties/{id}/units       → thêm phòng
GET    /api/units/{id}                  → chi tiết phòng
PATCH  /api/units/{id}                  → cập nhật phòng
DELETE /api/units/{id}                  → xóa phòng
GET    /api/units/{id}/history          → lịch sử thuê của phòng
```

### 2.3 Business Rules
- Khi xóa property: không được xóa nếu còn hợp đồng đang active → trả lỗi 409
- `total_units` trên properties tự động cập nhật qua trigger khi thêm/xóa unit
- `status` của unit tự động cập nhật: 'occupied' khi có contract active, 'vacant' khi contract kết thúc

### 2.4 UI Screens (React)
- **`/properties`**: Danh sách dạng card/grid, filter theo thành phố & trạng thái, badge "X/Y phòng đã thuê"
- **`/properties/:id`**: Dashboard của 1 nhà, floor plan dạng grid các phòng với màu trạng thái
- **`/properties/:id/units/new`**: Form thêm phòng
- **`/units/:id`**: Chi tiết phòng, tab: Thông tin / Hợp đồng / Hóa đơn / Bảo trì

### 2.5 Acceptance Criteria
- [ ] Owner tạo được property và thêm tối thiểu 1 unit
- [ ] Unit hiển thị đúng status (vacant/occupied) real-time
- [ ] Filter danh sách hoạt động đúng
- [ ] RLS đảm bảo owner A không thấy property của owner B

---

## 3. MODULE 2 — QUẢN LÝ HỢP ĐỒNG (Contract Management)

### 3.1 Database Schema

```sql
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  unit_id UUID REFERENCES units(id) NOT NULL,
  renter_id UUID REFERENCES profiles(id) NOT NULL,   -- người ký hợp đồng chính
  created_by UUID REFERENCES profiles(id),
  
  -- Thông tin hợp đồng
  contract_number TEXT UNIQUE,        -- "HD-2024-001" (auto-generate)
  status TEXT DEFAULT 'draft',        -- 'draft' | 'active' | 'expired' | 'terminated'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Tài chính
  monthly_rent DECIMAL(12,0) NOT NULL,
  deposit_amount DECIMAL(12,0) NOT NULL,
  deposit_paid_date DATE,
  payment_due_day INT DEFAULT 5,      -- ngày thanh toán hàng tháng (ngày 5)
  
  -- Số người & điều khoản
  max_occupants INT DEFAULT 2,
  terms TEXT,                          -- điều khoản bổ sung
  
  -- PDF
  pdf_url TEXT,                        -- Supabase Storage URL
  
  -- Timestamps
  signed_at TIMESTAMPTZ,
  terminated_at TIMESTAMPTZ,
  termination_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contract_co_renters (     -- người ở ghép thêm vào hợp đồng
  contract_id UUID REFERENCES contracts(id),
  full_name TEXT NOT NULL,
  id_number TEXT,                      -- CCCD
  phone TEXT,
  PRIMARY KEY (contract_id, id_number)
);
```

### 3.2 Luồng tạo hợp đồng

```
1. Chọn unit (phải đang vacant)
2. Chọn/tạo renter profile
3. Điền form: ngày bắt đầu, kết thúc, giá thuê, tiền cọc, điều khoản
4. Preview hợp đồng (HTML render)
5. Export PDF (gọi backend /api/contracts/{id}/export-pdf)
6. Confirm → status = 'active', unit.status = 'occupied'
```

### 3.3 API Endpoints

```
GET    /api/contracts                          → danh sách (filter: status, unit, renter)
POST   /api/contracts                          → tạo mới (status = draft)
GET    /api/contracts/{id}                     → chi tiết
PATCH  /api/contracts/{id}                     → cập nhật
POST   /api/contracts/{id}/activate            → kích hoạt (draft → active)
POST   /api/contracts/{id}/terminate           → chấm dứt sớm
POST   /api/contracts/{id}/export-pdf          → generate & upload PDF, trả về URL
GET    /api/contracts/expiring-soon            → hợp đồng hết hạn trong 30 ngày
```

### 3.4 PDF Template (WeasyPrint)
- Template HTML/CSS chuẩn hợp đồng thuê nhà Việt Nam
- Biến điền vào: `{{tenant_name}}`, `{{unit_address}}`, `{{monthly_rent}}`, `{{start_date}}`, `{{end_date}}`, etc.
- Output: PDF lưu Supabase Storage bucket `contracts/`, trả về signed URL

### 3.5 Tự động nhắc nhở hợp đồng hết hạn
- **Cron job** (chạy mỗi ngày 8:00 SA):
  - 30 ngày trước end_date → gửi email + push notification cho Owner/Manager
  - 7 ngày trước → nhắc lần 2
  - Ngày hết hạn → tự động đổi status = 'expired', unit.status = 'vacant'

### 3.6 Acceptance Criteria
- [ ] Số hợp đồng tự động tăng dần, không trùng
- [ ] Không thể tạo 2 hợp đồng active cho cùng 1 unit
- [ ] PDF export đúng thông tin, font tiếng Việt hiển thị chuẩn
- [ ] Hợp đồng hết hạn tự động đổi trạng thái

---

## 4. MODULE 3 — QUẢN LÝ NGƯỜI THUÊ (Renter Management)

### 4.1 Database Schema

```sql
CREATE TABLE renter_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  user_id UUID REFERENCES profiles(id),  -- NULL nếu chưa tạo tài khoản app
  
  -- Thông tin cá nhân
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,                           -- 'male' | 'female' | 'other'
  id_number TEXT,                        -- CCCD/CMND
  id_issued_date DATE,
  id_issued_place TEXT,
  id_front_url TEXT,                     -- Supabase Storage
  id_back_url TEXT,
  
  -- Liên lạc
  phone TEXT,
  email TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  
  -- Xuất xứ
  hometown TEXT,
  occupation TEXT,
  workplace TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 API Endpoints

```
GET    /api/renters                    → danh sách người thuê (filter: có hợp đồng active?)
POST   /api/renters                    → tạo hồ sơ người thuê
GET    /api/renters/{id}               → chi tiết + lịch sử hợp đồng + lịch sử thanh toán
PATCH  /api/renters/{id}               → cập nhật thông tin
POST   /api/renters/{id}/invite        → gửi email mời tạo tài khoản app
GET    /api/renters/{id}/invoices      → lịch sử hóa đơn
```

### 4.3 Luồng mời người thuê dùng app
```
1. Owner tạo renter_profile (thủ công nhập thông tin)
2. Owner click "Mời dùng app" → hệ thống gửi email có link đăng ký
3. Renter đăng ký → profiles.role = 'renter', liên kết với renter_profiles
4. Renter đăng nhập → chỉ thấy: hợp đồng của mình, hóa đơn, gửi yêu cầu bảo trì
```

### 4.4 Acceptance Criteria
- [ ] Upload ảnh CCCD 2 mặt lưu vào Supabase Storage private bucket
- [ ] Renter chỉ thấy dữ liệu của chính mình (RLS)
- [ ] Tìm kiếm người thuê theo tên/CCCD/số điện thoại

---

## 5. MODULE 4 — QUẢN LÝ NHÂN VIÊN (Staff Management)

### 5.1 Database Schema

```sql
CREATE TABLE staff_assignments (        -- phân công nhân viên vào property
  profile_id UUID REFERENCES profiles(id),
  property_id UUID REFERENCES properties(id),
  assigned_role TEXT,                   -- 'manager' | 'maintenance' | 'cleaner' | 'accountant'
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (profile_id, property_id)
);

CREATE TABLE task_templates (           -- khuôn mẫu cho task lặp lại
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT,                       -- 'maintenance' | 'cleaning' | 'inspection'
  property_id UUID REFERENCES properties(id),
  unit_id UUID REFERENCES units(id),   -- NULL = áp dụng toàn nhà
  assigned_to UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  priority TEXT DEFAULT 'normal',       -- 'low' | 'normal' | 'high' | 'urgent'

  -- Cấu hình lặp lại
  recurrence_type TEXT NOT NULL,        -- 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly'
  recurrence_day_of_week INT,           -- 0=CN, 1=T2...6=T7 (dùng khi weekly)
  recurrence_day_of_month INT,          -- 1–31 (dùng khi monthly/quarterly)
  recurrence_month_of_quarter INT,      -- 1, 2 hoặc 3 (dùng khi quarterly, tháng mấy trong quý)
  recurrence_start_date DATE NOT NULL,
  recurrence_end_date DATE,             -- NULL = lặp vô thời hạn
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  template_id UUID REFERENCES task_templates(id), -- NULL nếu là task 1 lần không dùng template
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT,                       -- 'maintenance' | 'cleaning' | 'inspection'
  property_id UUID REFERENCES properties(id),
  unit_id UUID REFERENCES units(id),   -- NULL = task chung toàn nhà
  assigned_to UUID REFERENCES profiles(id),
  assigned_by UUID REFERENCES profiles(id),
  priority TEXT DEFAULT 'normal',       -- 'low' | 'normal' | 'high' | 'urgent'
  status TEXT DEFAULT 'pending',        -- 'pending' | 'in_progress' | 'done' | 'cancelled'
  due_date DATE,
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  completion_photos JSONB DEFAULT '[]', -- ảnh minh chứng hoàn thành
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.2 Logic sinh task từ template lặp lại

**Cron job** chạy mỗi ngày 5:00 SA — `spawn_recurring_tasks`:

```python
# Pseudo-code
def spawn_recurring_tasks(today: date):
    active_templates = get_active_templates()  # recurrence_type != 'once', is_active=True

    for tmpl in active_templates:
        if tmpl.recurrence_end_date and today > tmpl.recurrence_end_date:
            deactivate_template(tmpl.id)
            continue

        should_spawn = False

        if tmpl.recurrence_type == 'daily':
            should_spawn = True

        elif tmpl.recurrence_type == 'weekly':
            should_spawn = (today.weekday() == tmpl.recurrence_day_of_week)

        elif tmpl.recurrence_type == 'monthly':
            should_spawn = (today.day == tmpl.recurrence_day_of_month)

        elif tmpl.recurrence_type == 'quarterly':
            # Tháng mấy trong quý (1/2/3) và đúng ngày
            month_in_quarter = ((today.month - 1) % 3) + 1
            should_spawn = (
                month_in_quarter == tmpl.recurrence_month_of_quarter
                and today.day == tmpl.recurrence_day_of_month
            )

        if should_spawn:
            # Tránh tạo trùng nếu đã có task cùng template trong ngày
            if not task_exists_today(tmpl.id, today):
                create_task_from_template(tmpl, due_date=today)
                notify_assignee(tmpl.assigned_to, task)
```

**Ví dụ cấu hình thực tế:**

| Tên task | Loại | Cấu hình |
|---|---|---|
| Dọn vệ sinh hành lang | `weekly` | Thứ 2 hàng tuần |
| Kiểm tra PCCC | `monthly` | Ngày 1 hàng tháng |
| Bảo dưỡng máy bơm | `quarterly` | Tháng 1 của quý, ngày 10 |
| Thay bóng đèn khu vực A | `once` | Ngày cụ thể, không lặp |

### 5.3 API Endpoints

```
GET    /api/staff                              → danh sách nhân viên trong tenant
POST   /api/staff/invite                       → mời nhân viên (gửi email)
PATCH  /api/staff/{id}/role                    → đổi role
DELETE /api/staff/{id}                         → vô hiệu hóa tài khoản

-- Task Templates (task lặp lại)
GET    /api/task-templates                     → danh sách template (filter: property, type, active)
POST   /api/task-templates                     → tạo template mới (once hoặc recurring)
GET    /api/task-templates/{id}                → chi tiết template + preview lịch sinh task
PATCH  /api/task-templates/{id}                → cập nhật template
DELETE /api/task-templates/{id}                → dừng lặp (set is_active = false)

-- Tasks (instance cụ thể)
GET    /api/tasks                              → danh sách task (filter: assigned_to, status, property, date_range)
GET    /api/tasks/{id}                         → chi tiết task
PATCH  /api/tasks/{id}                         → cập nhật (status, notes, ảnh hoàn thành)
GET    /api/tasks/my-tasks                     → task của user đang đăng nhập
GET    /api/tasks/calendar                     → task theo dạng lịch (week/month view)
```

### 5.4 UI Screens
- **`/staff`**: Danh sách nhân viên, badge theo role, trạng thái active/inactive
- **`/tasks`**: Kanban board (Pending → In Progress → Done) hoặc list view, toggle calendar view
- **`/tasks/templates`**: Danh sách task template, badge loại lặp (Daily/Weekly/Monthly/Quarterly/Once)
- **`/tasks/templates/new`**: Form tạo template — chọn loại lặp → hiện các field cấu hình tương ứng
- **`/tasks/my-tasks`**: Dành cho nhân viên xem task được giao, sắp xếp theo due_date
- **`/tasks/calendar`**: Calendar view hiển thị task theo ngày/tuần

### 5.5 Acceptance Criteria
- [ ] Owner/Manager invite nhân viên qua email, nhân viên nhận link đăng ký
- [ ] Nhân viên chỉ thấy task và property được phân công
- [ ] Cập nhật status task gửi notification cho người tạo
- [ ] Task `once`: tạo 1 instance duy nhất, không lặp
- [ ] Task `daily`: cron sinh đúng 1 instance mỗi ngày
- [ ] Task `weekly`: sinh đúng ngày trong tuần đã cài
- [ ] Task `monthly`: sinh đúng ngày trong tháng đã cài (nếu tháng không có ngày đó, dùng ngày cuối tháng)
- [ ] Task `quarterly`: sinh đúng tháng trong quý và ngày đã cài
- [ ] Cron không tạo duplicate instance nếu chạy lại trong ngày
- [ ] Deactivate template → không sinh task mới, giữ nguyên lịch sử cũ
- [ ] UI form tạo template ẩn/hiện field cấu hình theo loại lặp đã chọn

---

## 6. MODULE 5 & 6 — TÀI CHÍNH & HÓA ĐƠN (Finance & Invoicing)

### 6.1 Database Schema

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  contract_id UUID REFERENCES contracts(id) NOT NULL,
  unit_id UUID REFERENCES units(id) NOT NULL,
  renter_id UUID REFERENCES renter_profiles(id) NOT NULL,
  
  invoice_number TEXT UNIQUE,           -- "INV-2024-001"
  billing_period_start DATE NOT NULL,   -- đầu kỳ
  billing_period_end DATE NOT NULL,     -- cuối kỳ
  due_date DATE NOT NULL,               -- hạn thanh toán
  
  -- Tổng tiền
  subtotal DECIMAL(12,0) NOT NULL,
  total DECIMAL(12,0) NOT NULL,
  
  status TEXT DEFAULT 'draft',         -- 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  
  -- Thanh toán
  paid_amount DECIMAL(12,0) DEFAULT 0,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,                  -- 'bank_transfer' | 'cash' | 'momo'
  
  -- VietQR
  vietqr_payload TEXT,                  -- chuỗi QR code
  vietqr_ref_code TEXT UNIQUE,          -- mã tham chiếu để đối chiếu tự động
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) NOT NULL,
  item_type TEXT NOT NULL,              -- 'rent' | 'electricity' | 'water' | 'service' | 'internet' | 'parking' | 'other'
  description TEXT NOT NULL,
  quantity DECIMAL(10,3),
  unit_price DECIMAL(12,0),
  amount DECIMAL(12,0) NOT NULL,
  meter_reading_id UUID               -- link sang meter_readings nếu là điện/nước
);

CREATE TABLE service_fee_configs (     -- cấu hình phí dịch vụ theo property
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id),
  service_name TEXT NOT NULL,          -- "Phí vệ sinh", "Internet", "Gửi xe"
  fee_type TEXT,                       -- 'fixed' | 'per_person' | 'per_unit'
  amount DECIMAL(12,0),
  is_active BOOLEAN DEFAULT TRUE
);
```

### 6.2 VietQR Integration

**Cách tạo QR:**
```python
# FastAPI endpoint
# Dùng thư viện vietqr hoặc tự build theo chuẩn EMVCo
def generate_vietqr(bank_code, account_number, amount, ref_code, description):
    # ref_code = "HD{contract_id[:8]}{month}{year}" → đối chiếu tự động
    payload = build_vietqr_payload(...)
    return {"qr_string": payload, "ref_code": ref_code}
```

**Auto-detect thanh toán:**
- **Option A (Đơn giản nhất)**: Tích hợp webhook từ ngân hàng qua SePay hoặc Casso.vn (third-party, hỗ trợ nhiều ngân hàng VN)
- **Luồng**: Ngân hàng nhận tiền → Casso phát hiện giao dịch có `ref_code` → Casso POST webhook đến `/api/payments/webhook` → hệ thống cập nhật invoice status = 'paid'
- **Fallback**: Owner xác nhận thanh toán thủ công

```
POST /api/payments/webhook     → nhận webhook từ Casso/SePay
GET  /api/invoices             → danh sách hóa đơn (filter: status, period, unit)
POST /api/invoices             → tạo hóa đơn thủ công
POST /api/invoices/auto-generate  → tự động tạo hóa đơn tháng mới cho tất cả active contracts
GET  /api/invoices/{id}        → chi tiết + QR code
POST /api/invoices/{id}/send   → gửi hóa đơn cho renter (email + push)
POST /api/invoices/{id}/mark-paid  → xác nhận thanh toán thủ công
GET  /api/invoices/{id}/pdf    → export PDF hóa đơn
```

### 6.3 Logic tự động tính hóa đơn hàng tháng

```python
# Pseudo-code cho auto-generate invoice
def calculate_monthly_invoice(contract, billing_month):
    items = []
    
    # 1. Tiền thuê (tính theo số ngày nếu không đủ tháng)
    days_in_period = calculate_days(billing_month, contract.start_date, contract.end_date)
    rent = contract.monthly_rent * days_in_period / days_in_month
    items.append(InvoiceItem(type='rent', amount=rent))
    
    # 2. Điện (từ meter_readings)
    elec_reading = get_meter_reading(contract.unit_id, billing_month, 'electricity')
    if elec_reading and elec_reading.is_approved:
        elec_amount = elec_reading.consumption * elec_price_per_kwh
        items.append(InvoiceItem(type='electricity', amount=elec_amount))
    
    # 3. Nước (từ meter_readings)
    water_reading = get_meter_reading(contract.unit_id, billing_month, 'water')
    if water_reading and water_reading.is_approved:
        water_amount = water_reading.consumption * water_price_per_m3
        items.append(InvoiceItem(type='water', amount=water_amount))
    
    # 4. Phí dịch vụ (từ service_fee_configs)
    for fee in get_service_fees(contract.unit_id):
        if fee.fee_type == 'per_person':
            amount = fee.amount * contract.max_occupants
        else:
            amount = fee.amount
        items.append(InvoiceItem(type='service', amount=amount))
    
    return Invoice(items=items, total=sum(i.amount for i in items))
```

### 6.4 Cron Jobs (tự động hóa)

| Job | Thời gian | Hành động |
|---|---|---|
| `auto_generate_invoices` | Ngày 1 hàng tháng, 6:00 SA | Tạo draft invoices cho tất cả active contracts |
| `send_invoices` | Ngày 3 hàng tháng, 8:00 SA | Gửi invoices đã draft cho renters |
| `payment_reminder_3days` | Hàng ngày 8:00 SA | Nhắc những invoice đến hạn trong 3 ngày |
| `payment_reminder_1day` | Hàng ngày 8:00 SA | Nhắc những invoice đến hạn ngày mai |
| `overdue_5days` | Hàng ngày 8:00 SA | Cảnh báo công nợ invoice quá hạn 5 ngày |
| `overdue_10days` | Hàng ngày 8:00 SA | Cảnh báo mạnh, flag account, gửi owner |

### 6.5 Acceptance Criteria
- [ ] QR VietQR hiển thị đúng số tiền và mã tham chiếu
- [ ] Webhook nhận payment → invoice tự động chuyển 'paid'
- [ ] Hóa đơn tính đúng số ngày khi thuê không đủ tháng
- [ ] Báo cáo doanh thu hiển thị đúng tổng theo tháng/quý/năm
- [ ] Cron job không tạo trùng invoice cho cùng kỳ

---

## 7. MODULE 7 — ĐỌC ĐỒNG HỒ ĐIỆN-NƯỚC (Meter Reading + AI OCR)

### 7.1 Database Schema

```sql
CREATE TABLE meter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  unit_id UUID REFERENCES units(id) NOT NULL,
  meter_type TEXT NOT NULL,             -- 'electricity' | 'water'
  billing_month DATE NOT NULL,          -- đầu tháng: 2024-03-01
  
  -- Số đọc
  previous_reading DECIMAL(10,2),       -- số đầu kỳ
  current_reading DECIMAL(10,2),        -- số cuối kỳ
  consumption DECIMAL(10,2),            -- = current - previous
  unit_price DECIMAL(10,0),             -- đồng/kWh hoặc đồng/m³
  
  -- Ảnh
  photo_url TEXT NOT NULL,              -- Supabase Storage URL
  
  -- AI OCR
  ai_detected_value DECIMAL(10,2),      -- số AI đọc được
  ai_confidence DECIMAL(4,3),           -- 0.000 → 1.000
  ai_raw_response JSONB,                -- response đầy đủ từ Google Vision
  
  -- Trạng thái
  submitted_by UUID REFERENCES profiles(id),  -- người upload
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES profiles(id),   -- owner/manager duyệt
  reviewed_at TIMESTAMPTZ,
  is_approved BOOLEAN DEFAULT FALSE,
  manual_override_value DECIMAL(10,2),  -- nếu chủ nhà sửa tay
  
  UNIQUE(unit_id, meter_type, billing_month)
);
```

### 7.2 Luồng AI OCR

```
[Renter/Staff] Chụp ảnh đồng hồ
        ↓
POST /api/meter-readings/upload
        ↓
Backend lưu ảnh → Supabase Storage
        ↓
Gọi Google Vision API (TEXT_DETECTION)
        ↓
Parse response → tìm chuỗi số lớn nhất (thường là số công tơ)
        ↓
Lưu ai_detected_value + ai_confidence
        ↓
Trả về kết quả cho frontend hiển thị preview
        ↓
[Owner/Manager] Xem ảnh + số AI đọc → Duyệt hoặc Sửa
        ↓
is_approved = true → sẵn sàng cho auto-generate invoice
```

### 7.3 API Endpoints

```
POST /api/meter-readings/upload         → upload ảnh + trigger OCR, trả về AI result
GET  /api/meter-readings                → danh sách (filter: unit, month, status)
PATCH /api/meter-readings/{id}/approve  → duyệt số (có thể kèm manual_override_value)
GET  /api/units/{id}/meter-history      → lịch sử chỉ số điện/nước theo đơn vị
```

### 7.4 Google Vision API Integration

```python
# FastAPI service
from google.cloud import vision
import re

def ocr_meter_image(image_bytes: bytes) -> dict:
    client = vision.ImageAnnotatorClient()
    image = vision.Image(content=image_bytes)
    response = client.text_detection(image=image)
    
    texts = response.text_annotations
    if not texts:
        return {"value": None, "confidence": 0}
    
    full_text = texts[0].description
    
    # Tìm số có 4-7 chữ số (phù hợp số công tơ điện/nước VN)
    numbers = re.findall(r'\b\d{4,7}(?:\.\d{1,2})?\b', full_text)
    if numbers:
        # Lấy số lớn nhất (thường là chỉ số tích lũy)
        best = max(float(n) for n in numbers)
        return {"value": best, "confidence": 0.85, "raw": full_text}
    
    return {"value": None, "confidence": 0, "raw": full_text}
```

### 7.5 Acceptance Criteria
- [ ] Upload ảnh → hiển thị số AI đọc trong < 5 giây
- [ ] Nếu AI confidence < 0.6 → hiển thị cảnh báo "Ảnh không rõ, vui lòng nhập tay"
- [ ] Owner/Manager thấy ảnh gốc bên cạnh số AI đọc để đối chiếu
- [ ] Không thể tạo invoice nếu meter_reading chưa được approved
- [ ] Lưu lịch sử đầy đủ để phát hiện bất thường (tiêu thụ tăng đột biến)

---

## 8. MODULE 8 — BẢO TRÌ & SỬA CHỮA (Maintenance)

### 8.1 Phân loại yêu cầu sửa chữa

| Loại | Scope | Người tạo được | Ví dụ |
|---|---|---|---|
| **Yêu cầu chung** (property-level) | Cả toàn nhà / khu vực chung | Owner, Manager | Hỏng đèn hành lang, rò rỉ mái, sự cố thang máy |
| **Yêu cầu riêng** (unit-level) | Một phòng cụ thể | Owner, Manager, Renter | Tắc bồn cầu phòng 201, quạt trần hỏng |

> **Quy tắc phân quyền**: Renter chỉ tạo được yêu cầu riêng cho phòng của mình. Manager và Owner tạo được cả hai loại.

### 8.2 Database Schema

```sql
CREATE TABLE maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,

  -- Scope: property-level hoặc unit-level (chọn 1 trong 2)
  scope TEXT NOT NULL DEFAULT 'unit',   -- 'property' | 'unit'
  property_id UUID REFERENCES properties(id) NOT NULL,  -- luôn bắt buộc
  unit_id UUID REFERENCES units(id),    -- NULL nếu scope = 'property'

  submitted_by UUID REFERENCES profiles(id) NOT NULL,
  submitter_role TEXT NOT NULL,         -- snapshot: 'renter' | 'manager' | 'owner' (tránh join)

  title TEXT NOT NULL,
  description TEXT,
  location_detail TEXT,                 -- mô tả vị trí cụ thể: "hành lang tầng 2, gần thang máy"
  category TEXT,                        -- 'electrical' | 'plumbing' | 'furniture' | 'structure' | 'other'
  priority TEXT DEFAULT 'normal',       -- 'low' | 'normal' | 'high' | 'urgent'
  status TEXT DEFAULT 'open',           -- 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed'

  photos JSONB DEFAULT '[]',            -- [{"url": "...", "caption": "..."}] tối đa 5 ảnh

  -- Phân công
  assigned_to UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ,

  -- Hoàn thành
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  resolution_photos JSONB DEFAULT '[]', -- ảnh sau sửa chữa
  cost DECIMAL(12,0) DEFAULT 0,

  -- Đánh giá (chỉ áp dụng nếu submitted_by là renter)
  renter_rating INT CHECK (renter_rating BETWEEN 1 AND 5),
  renter_feedback TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8.3 Luồng xử lý theo từng loại

**Luồng A — Renter gửi yêu cầu riêng (unit-level):**
```
Renter chọn "Báo sự cố phòng" → scope='unit', unit_id=phòng của mình
        ↓
Điền: tiêu đề, mô tả, category, priority, ảnh
        ↓
Notification → Owner + Manager phụ trách property đó
        ↓
Manager phân công nhân viên xử lý
        ↓
Nhân viên cập nhật in_progress → resolved + chi phí + ảnh sau sửa
        ↓
Notification → Renter: "Yêu cầu đã xử lý"
        ↓
Renter đánh giá 1–5 sao + feedback
```

**Luồng B — Manager/Owner gửi yêu cầu chung (property-level):**
```
Manager chọn "Báo sự cố khu vực chung" → scope='property'
        ↓
Chọn property, nhập location_detail (vị trí cụ thể), category, priority, ảnh
        ↓
Phân công ngay khi tạo (optional) hoặc phân công sau
        ↓
Nhân viên xử lý → cập nhật status, nhập chi phí + ảnh sau
        ↓
Notification → Owner: "Sự cố [tên] đã được xử lý, chi phí: X đồng"
        ↓
Không có bước đánh giá (không phải renter)
```

### 8.4 API Endpoints

```
GET    /api/maintenance                        → danh sách (filter: scope, status, property_id, unit_id, category, priority)
POST   /api/maintenance                        → tạo yêu cầu (scope xác định unit_id có required không)
GET    /api/maintenance/{id}                   → chi tiết
PATCH  /api/maintenance/{id}                   → cập nhật (assign, status, resolve)
POST   /api/maintenance/{id}/assign            → phân công nhân viên
POST   /api/maintenance/{id}/resolve           → đánh dấu hoàn thành + nhập chi phí + ảnh sau
POST   /api/maintenance/{id}/rate              → renter đánh giá (chỉ cho phép nếu submitted_by = caller)
GET    /api/properties/{id}/maintenance        → tất cả request của 1 property (cả chung lẫn riêng)
GET    /api/units/{id}/maintenance-history     → lịch sử riêng của 1 phòng
```

### 8.5 Validation Rules (Backend)
```python
# POST /api/maintenance
if body.scope == 'unit':
    assert body.unit_id is not None, "unit_id bắt buộc khi scope='unit'"
    if caller.role == 'renter':
        # Renter chỉ được gửi cho phòng đang thuê
        assert has_active_contract(caller.id, body.unit_id), "Bạn không có hợp đồng tại phòng này"

if body.scope == 'property':
    assert caller.role in ['owner', 'manager'], "Chỉ owner/manager mới tạo yêu cầu chung"
    body.unit_id = None  # force null
```

### 8.6 UI Screens
- **`/maintenance`**: Danh sách tổng hợp với filter. Hai tab: **Khu vực chung** / **Theo phòng**
- **`/maintenance/new`**: Form tạo — radio chọn loại (Khu vực chung / Phòng cụ thể) → hiện field tương ứng
- **`/maintenance/:id`**: Chi tiết: timeline trạng thái, ảnh before/after, chi phí, đánh giá
- **`/units/:id`** tab Bảo trì: lọc chỉ unit-level request của phòng đó
- **`/properties/:id`** tab Bảo trì: hiển thị cả property-level và tổng hợp unit-level

### 8.7 Acceptance Criteria
- [ ] Renter không thể chọn scope='property'
- [ ] Renter không thể gửi request cho unit không có hợp đồng active
- [ ] Owner/Manager thấy cả 2 loại request trong property của mình
- [ ] Renter chỉ thấy request của phòng mình và không thấy request chung
- [ ] Upload tối đa 5 ảnh khi tạo, 5 ảnh khi resolve
- [ ] Chi phí bảo trì (cả chung lẫn riêng) tổng hợp vào báo cáo tài chính theo property
- [ ] Trường `location_detail` bắt buộc khi scope='property'
- [ ] Chỉ renter là người tạo mới được đánh giá request của mình

---

## 9. MODULE 9 — BÁO CÁO & PHÂN TÍCH (Analytics & Reports)

### 9.1 Tổng quan các nhóm báo cáo

| Nhóm | Báo cáo | Xem được bởi |
|---|---|---|
| **Tài chính** | Doanh thu, công nợ, dự báo, gợi ý giá | Owner, Accountant |
| **Vận hành nhà** | Tỷ lệ lấp đầy, hệ số vận hành, chi phí sự cố | Owner, Manager |
| **Nhân viên** | Hiệu suất công việc, chất lượng xử lý | Owner, Manager |
| **Bảo trì** | Chi phí, tần suất sự cố, thời gian xử lý | Owner, Manager, Accountant |

---

### 9.2 Nhóm 1 — Báo cáo Tài chính (Finance Reports)

**API:**
```
GET /api/reports/revenue
    ?period=monthly|quarterly|yearly & year=2024 & property_id=xxx (optional)

GET /api/reports/overdue            → công nợ chưa thanh toán (theo property/renter)
GET /api/reports/maintenance-costs  → chi phí bảo trì theo property/tháng
GET /api/reports/forecast           → dự báo doanh thu 3 tháng tới (linear regression)
GET /api/reports/rent-optimization  → gợi ý giá thuê (so sánh avg thị trường)
```

**Response mẫu — Revenue:**
```json
{
  "period": "monthly", "year": 2024,
  "data": [
    {"month": "2024-01", "revenue": 45000000, "collected": 42000000, "outstanding": 3000000},
    {"month": "2024-02", "revenue": 45000000, "collected": 45000000, "outstanding": 0}
  ],
  "summary": {
    "total_revenue": 540000000,
    "total_collected": 510000000,
    "collection_rate": 0.944
  }
}
```

**UI Charts:**
- Doanh thu: LineChart/BarChart doanh thu + thu thực tế theo tháng
- Công nợ: BarChart theo property
- Chi phí bảo trì: AreaChart theo tháng
- Dự báo: LineChart có đường dự báo khác màu (dashed)

**Dự báo doanh thu:**
```python
from scipy import stats

def forecast_revenue(history_data: list, months_ahead: int = 3):
    x = list(range(len(history_data)))
    y = [d['revenue'] for d in history_data]
    slope, intercept, *_ = stats.linregress(x, y)
    forecasts = []
    for i in range(months_ahead):
        next_x = len(history_data) + i
        forecasts.append({
            "month": add_months(history_data[-1]['month'], i + 1),
            "forecasted_revenue": max(0, slope * next_x + intercept)
        })
    return forecasts
```

---

### 9.3 Nhóm 2 — Báo cáo Hiệu suất Nhân viên (Staff Performance Reports)

**API:**
```
GET /api/reports/staff-performance
    ?period=weekly|monthly|yearly
    &start_date=2024-01-01 & end_date=2024-03-31
    &staff_id=xxx (optional, lọc 1 nhân viên)
    &property_id=xxx (optional)
```

**Response mẫu:**
```json
{
  "period": "monthly",
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "staff": [
    {
      "profile_id": "uuid",
      "full_name": "Nguyễn Văn B",
      "role": "maintenance",
      "property_assignments": ["Nhà trọ 123", "Chung cư ABC"],

      "tasks": {
        "total_assigned": 24,
        "completed": 21,
        "in_progress": 2,
        "cancelled": 1,
        "completion_rate": 0.875,
        "avg_completion_hours": 4.2,      -- giờ từ assigned → done
        "overdue_count": 3                -- hoàn thành quá due_date
      },

      "maintenance": {
        "total_requests_handled": 8,
        "avg_resolution_hours": 6.5,
        "avg_renter_rating": 4.3,         -- avg từ renter_rating
        "total_cost_managed": 2500000     -- tổng chi phí sửa chữa đã xử lý
      },

      "quality_score": 82.5              -- điểm tổng hợp (xem công thức bên dưới)
    }
  ]
}
```

**Công thức quality_score (0–100):**
```python
def calculate_quality_score(staff_data: dict) -> float:
    # Trọng số
    W_COMPLETION  = 0.35   # tỷ lệ hoàn thành task
    W_TIMELINESS  = 0.25   # tỷ lệ không trễ deadline
    W_RATING      = 0.25   # đánh giá trung bình từ renter (scale 1-5 → 0-100)
    W_SPEED       = 0.15   # tốc độ xử lý (so sánh với avg của team)

    completion_score = staff_data['tasks']['completion_rate'] * 100
    timeliness_score = (1 - staff_data['tasks']['overdue_count'] /
                        max(staff_data['tasks']['total_assigned'], 1)) * 100
    rating_score     = (staff_data['maintenance']['avg_renter_rating'] / 5) * 100
    speed_score      = calculate_speed_score(staff_data['maintenance']['avg_resolution_hours'])

    return (completion_score * W_COMPLETION +
            timeliness_score * W_TIMELINESS +
            rating_score     * W_RATING +
            speed_score      * W_SPEED)
```

**UI Charts:**
- **Bảng xếp hạng nhân viên**: Table sortable theo quality_score, completion_rate, avg_rating
- **Biểu đồ cá nhân**: RadarChart 4 chiều (Hoàn thành / Đúng hạn / Đánh giá / Tốc độ)
- **Trend theo thời gian**: LineChart quality_score theo tháng của từng nhân viên
- **So sánh team**: BarChart grouped completion_rate của toàn bộ nhân viên

**API bổ sung:**
```
GET /api/reports/staff-performance/{staff_id}/trend
    ?months=6                          → trend quality_score 6 tháng gần nhất

GET /api/reports/staff-performance/leaderboard
    ?period=monthly & property_id=xxx  → top/bottom nhân viên trong kỳ
```

---

### 9.4 Nhóm 3 — Hệ số Vận hành theo Nhà (Property Operational KPIs)

> Mục tiêu: Cho chủ nhà cái nhìn X-ray về hiệu suất từng tòa nhà — đâu đang "ngốn" chi phí, đâu có thể tối ưu.

**API:**
```
GET /api/reports/property-kpis
    ?property_id=xxx & period=monthly|quarterly|yearly & year=2024
```

**Response mẫu:**
```json
{
  "property_id": "uuid",
  "property_name": "Nhà trọ 123 Nguyễn Trãi",
  "period": "2024-Q1",
  "total_units": 20,
  "occupied_units": 17,

  "occupancy": {
    "occupancy_rate": 0.85,             -- 17/20
    "avg_vacancy_days_per_unit": 8.2,   -- avg số ngày phòng bỏ trống
    "turnover_count": 3                 -- số lần đổi người thuê trong kỳ
  },

  "utility_efficiency": {
    "electricity": {
      "total_kwh": 4200,
      "total_cost": 8820000,
      "cost_per_person": 441000,        -- tổng người ở / tổng chi phí
      "cost_per_occupied_unit": 518824,
      "mom_change_pct": 0.05            -- tăng/giảm so tháng trước
    },
    "water": {
      "total_m3": 310,
      "total_cost": 1550000,
      "cost_per_person": 77500,
      "cost_per_occupied_unit": 91176,
      "mom_change_pct": -0.02
    }
  },

  "maintenance": {
    "total_requests": 14,
    "property_level_requests": 4,       -- sự cố khu vực chung
    "unit_level_requests": 10,          -- sự cố theo phòng
    "total_cost": 3200000,
    "cost_per_unit": 160000,            -- tổng chi phí / tổng số phòng
    "avg_resolution_hours": 18.4,
    "incident_rate_per_unit": 0.7,      -- số sự cố / phòng trong kỳ
    "top_categories": [                 -- top 3 loại sự cố nhiều nhất
      {"category": "plumbing", "count": 5, "cost": 1500000},
      {"category": "electrical", "count": 4, "cost": 900000},
      {"category": "furniture", "count": 3, "cost": 450000}
    ],
    "most_problematic_units": [         -- top 3 phòng có nhiều sự cố nhất
      {"unit_number": "P203", "request_count": 3, "total_cost": 850000},
      {"unit_number": "P105", "request_count": 2, "total_cost": 600000}
    ]
  },

  "financial_efficiency": {
    "total_revenue": 85000000,
    "total_operating_cost": 13570000,   -- điện + nước + bảo trì
    "operating_cost_ratio": 0.1596,     -- chi phí vận hành / doanh thu
    "net_operating_income": 71430000,
    "revenue_per_sqm": 85000            -- nếu có dữ liệu diện tích
  },

  "alerts": [                           -- cảnh báo tự động dựa trên ngưỡng
    {
      "type": "high_water_cost",
      "message": "Chi phí nước/đầu người tháng này cao hơn 30% so với trung bình 3 tháng",
      "severity": "warning"
    },
    {
      "type": "high_incident_unit",
      "message": "Phòng P203 có 3 sự cố trong 30 ngày — cần kiểm tra toàn diện",
      "severity": "alert"
    }
  ]
}
```

**Logic tính alerts tự động:**
```python
ALERT_THRESHOLDS = {
    "water_cost_per_person_increase": 0.25,   # tăng > 25% so avg 3 tháng → warning
    "electricity_cost_increase": 0.20,         # tăng > 20% → warning
    "incident_per_unit_per_month": 2,          # > 2 sự cố/phòng/tháng → alert
    "maintenance_cost_ratio": 0.15,            # chi phí bảo trì > 15% doanh thu → warning
    "vacancy_days_threshold": 14,              # phòng trống > 14 ngày → info
}

def generate_property_alerts(kpi_data: dict) -> list[dict]:
    alerts = []
    # So sánh với 3 tháng trước để tính baseline
    # Sinh alert nếu vượt ngưỡng
    ...
    return alerts
```

**API bổ sung:**
```
GET /api/reports/property-kpis/compare
    ?property_ids=id1,id2,id3 & period=monthly & year=2024
    → So sánh KPI của nhiều nhà cùng lúc (radar chart)

GET /api/reports/property-kpis/{property_id}/units-breakdown
    ?period=monthly & year=2024
    → Breakdown chi tiết đến từng phòng (sự cố, điện, nước, doanh thu)
```

**UI Charts:**
- **KPI Dashboard card**: occupancy_rate, operating_cost_ratio, incident_rate, avg_resolution_hours — mỗi card có so sánh kỳ trước (↑/↓)
- **RadarChart**: So sánh nhiều nhà trên 5 chiều (Lấp đầy / Chi phí điện / Chi phí nước / Sự cố / Hiệu suất thu tiền)
- **Heatmap (unit grid)**: Mỗi ô là 1 phòng, màu theo số sự cố hoặc chi phí điện/nước
- **Bảng top sự cố**: Most problematic units với sparkline trend

---

### 9.5 Acceptance Criteria (Module 9 tổng hợp)

**Tài chính:**
- [ ] Doanh thu theo tháng/quý/năm hiển thị đúng tổng từ invoices
- [ ] Dự báo 3 tháng dựa trên tối thiểu 3 tháng dữ liệu lịch sử

**Nhân viên:**
- [ ] quality_score tính đúng theo công thức (có unit test)
- [ ] Báo cáo weekly/monthly/yearly tính đúng date range
- [ ] Nhân viên không có maintenance handling → avg_renter_rating = null (không tính)
- [ ] Leaderboard hiển thị đúng top và bottom performer
- [ ] Owner/Manager thấy báo cáo nhân viên trong property của mình

**Hệ số vận hành:**
- [ ] cost_per_person tính dựa trên tổng occupants thực tế (từ contracts.max_occupants)
- [ ] Alerts tự động sinh khi vượt ngưỡng, lưu vào DB để audit
- [ ] So sánh nhiều nhà (radar chart) hoạt động với tối đa 5 properties
- [ ] Units breakdown drill-down đến từng phòng
- [ ] Tất cả KPI filter được theo kỳ (monthly/quarterly/yearly)

---

## 10. CROSS-CUTTING CONCERNS

### 10.1 Authentication (Supabase Auth)

```
POST /auth/register          → tạo tài khoản + tạo organization (nếu là owner)
POST /auth/login             → đăng nhập → JWT token
POST /auth/logout
POST /auth/forgot-password
POST /auth/reset-password
GET  /auth/me                → profile + role + permissions
```

**Luồng đăng ký chủ nhà mới:**
1. Nhập email, password, tên, tên tổ chức
2. Supabase tạo auth user, gửi email xác nhận
3. Sau xác nhận → backend tạo `organizations` + `profiles` (role='owner')

**Luồng invite (staff/renter):**
1. Owner/Manager gọi `POST /api/invitations`
2. Hệ thống tạo invitation token, gửi email có link
3. Người nhận click link → trang đăng ký có token pre-fill
4. Sau đăng ký → profiles liên kết với organization, role được gán

### 10.2 Notification System

**Stack**: Resend (email) + Web Push (via `web-push` library)

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  recipient_id UUID REFERENCES profiles(id) NOT NULL,
  
  type TEXT NOT NULL,   -- 'invoice_due' | 'contract_expiring' | 'maintenance_update' | etc.
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,           -- link, invoice_id, etc.
  
  channel TEXT,         -- 'email' | 'push' | 'in_app'
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE push_subscriptions (    -- PWA Web Push subscriptions
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**API:**
```
GET  /api/notifications              → lịch sử thông báo của user
POST /api/notifications/mark-read    → đánh dấu đã đọc
POST /api/push/subscribe             → đăng ký PWA push
DELETE /api/push/subscribe           → hủy đăng ký
```

### 10.3 File Storage (Supabase Storage)

**Buckets:**

| Bucket | Access | Contents |
|---|---|---|
| `contracts` | Private (signed URL) | PDF hợp đồng |
| `invoices` | Private (signed URL) | PDF hóa đơn |
| `meter-photos` | Private (signed URL) | Ảnh đồng hồ |
| `id-documents` | Private (signed URL) | Ảnh CCCD người thuê |
| `maintenance-photos` | Private (signed URL) | Ảnh sửa chữa |
| `property-images` | Public | Ảnh nhà/phòng |

### 10.4 Security Requirements

| Hạng mục | Yêu cầu |
|---|---|
| Authentication | JWT + Supabase RLS cho tất cả queries |
| Authorization | Kiểm tra role ở cả API layer (FastAPI dependency) và DB layer (RLS) |
| Data isolation | Mọi query đều filter `organization_id` |
| File access | Signed URLs hết hạn sau 1 giờ cho private buckets |
| Input validation | Pydantic models cho tất cả API input |
| Rate limiting | 100 req/min/user trên FastAPI (via slowapi) |
| HTTPS | Bắt buộc, Vercel + Railway tự handle |
| Sensitive data | CCCD photos encrypted at rest (Supabase default) |
| Webhook security | Verify HMAC signature từ Casso/SePay |

### 10.5 PWA Configuration

```json
// manifest.json
{
  "name": "QuanLyNhaTro",
  "short_name": "NhaTro",
  "theme_color": "#2563eb",
  "background_color": "#ffffff",
  "display": "standalone",
  "start_url": "/",
  "icons": [...]
}
```

**Service Worker**: Cache app shell, offline fallback page, background sync cho notification

---

## 11. PHÂN CHIA CÔNG VIỆC THEO TEAM

### 11.1 Backend Team (FastAPI)

**Sprint 1 (2 tuần):**
- [ ] Project setup: FastAPI + Supabase client + folder structure
- [ ] Auth module: register, login, JWT middleware, invite flow
- [ ] Organizations & Profiles CRUD
- [ ] Properties & Units CRUD + RLS policies

**Sprint 2:**
- [ ] Contracts module + PDF export (WeasyPrint)
- [ ] Renter profiles module
- [ ] Meter readings + Google Vision OCR integration

**Sprint 3:**
- [ ] Invoices module + VietQR generation
- [ ] Payment webhook (Casso integration)
- [ ] Cron jobs: auto_generate_invoices, payment_reminders, contract_expiry
- [ ] Task templates + `spawn_recurring_tasks` cron job

**Sprint 4:**
- [ ] Maintenance module: scope='property' và scope='unit', validation rules
- [ ] Notifications (Resend + web-push)
- [ ] Staff performance report API + quality_score calculation
- [ ] Property operational KPIs API + alerts engine

### 11.2 Frontend Team (React)

**Sprint 1:**
- [ ] Project setup: Vite + React + TailwindCSS + React Router
- [ ] Auth screens: Login, Register, Forgot Password
- [ ] Layout: Sidebar nav (responsive), Header, PWA manifest
- [ ] Properties & Units screens

**Sprint 2:**
- [ ] Contracts screens + PDF preview
- [ ] Renter management screens
- [ ] Staff & Tasks: Kanban + Calendar view
- [ ] Task template form (ẩn/hiện field theo loại lặp)

**Sprint 3:**
- [ ] Invoice screens + QR display
- [ ] Meter reading upload + OCR preview
- [ ] Maintenance screens: 2 tab Chung/Riêng, form dynamic theo scope
- [ ] Push notification permission flow

**Sprint 4:**
- [ ] Reports: Finance charts (Recharts)
- [ ] Reports: Staff performance — table, RadarChart, trend
- [ ] Reports: Property KPI dashboard — heatmap, compare radar, units breakdown
- [ ] PWA: Service Worker, offline page

### 11.3 UX/UI Designer

**Deliverables theo thứ tự ưu tiên:**
1. Design system: Colors, Typography, Components (Button, Card, Badge, Table, Form)
2. Screens: Dashboard owner, Property list, Unit detail
3. Screens: Invoice với QR code, Meter reading upload
4. Screens: Mobile views (PWA) cho Renter portal
5. Screens: Staff task view, Maintenance request

**Lưu ý thiết kế:**
- Mobile-first cho renter (hay dùng điện thoại)
- Desktop-first cho owner/manager (hay dùng máy tính)
- Bảng màu: Tin tưởng + Chuyên nghiệp (Blue #2563eb primary)
- Font hỗ trợ tiếng Việt: Inter hoặc Be Vietnam Pro

### 11.4 QA Team

**Test cases ưu tiên:**
1. Tenant isolation: user A không thấy data của tenant B
2. Invoice calculation: tính đúng tiền điện/nước/ngày thuê
3. Payment webhook: QR thanh toán → invoice tự động 'paid'
4. OCR pipeline: upload ảnh → nhận số trong < 5s
5. Cron jobs: không tạo duplicate invoice
6. PDF export: font tiếng Việt không bị lỗi

### 11.5 Security Review

**Checklist trước production:**
- [ ] Tất cả API endpoints đều có JWT auth (trừ /auth/*)
- [ ] RLS policies đã enable trên tất cả tables Supabase
- [ ] Private storage buckets không public access
- [ ] Webhook endpoints verify HMAC signature
- [ ] Không log sensitive data (CCCD number, bank account)
- [ ] Pydantic validation cho tất cả inputs
- [ ] Rate limiting active

---

## 12. ENVIRONMENT VARIABLES

```env
# Backend (FastAPI / Railway)
SUPABASE_URL=
SUPABASE_SERVICE_KEY=           # service_role key (không phải anon)
JWT_SECRET=
GOOGLE_VISION_API_KEY=
RESEND_API_KEY=
VAPID_PRIVATE_KEY=              # Web Push
VAPID_PUBLIC_KEY=
VAPID_EMAIL=
CASSO_WEBHOOK_SECRET=           # hoặc SePay
BANK_ACCOUNT_NUMBER=            # tài khoản nhận tiền VietQR

# Frontend (Vercel)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=                   # FastAPI URL trên Railway
VITE_VAPID_PUBLIC_KEY=
```

---

## 13. TECH DEBT & KNOWN LIMITATIONS (v1.0)

| Hạng mục | Limitation | Plan v2 |
|---|---|---|
| Payment | Chỉ VietQR, confirm qua Casso | Tích hợp MoMo, ZaloPay SDK |
| OCR | Google Vision, 1000 req/tháng free | Fallback sang Tesseract.js nếu exceed |
| Forecast | Linear regression đơn giản | ML model với nhiều features hơn |
| Multi-language | Chỉ tiếng Việt | i18n framework |
| Mobile | PWA (không phải native app) | React Native nếu cần offline-heavy |
| Notifications | Email + Push, không có SMS | Tích hợp Zalo OA hoặc Twilio |
