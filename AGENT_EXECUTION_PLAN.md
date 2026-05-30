# 🤖 AGENT EXECUTION PLAN
## Rental Management SaaS — Kịch bản thực thi tuần tự cho AI Agent

> **Đọc phần này trước khi bắt đầu**
>
> Tài liệu này là "đạo diễn kịch bản" cho quá trình vibe coding với AI agent.
> Mỗi TASK là 1 lần gọi agent độc lập. Quy tắc bắt buộc:
> - ✅ Hoàn thành 100% TASK hiện tại trước khi sang TASK tiếp theo
> - ✅ Luôn đính kèm **Context Files** được liệt kê vào prompt
> - ✅ Chạy **Verify** sau mỗi task — nếu fail thì sửa trước khi tiếp tục
> - ❌ Không gộp 2 task thành 1 — mỗi task có scope đã được cân nhắc

---

## 📐 QUY ƯỚC ĐỌC FILE NÀY

```
TASK-ID   : Mã định danh, dùng để reference trong Context Files
Vai trò   : Backend | Frontend | Fullstack | DevOps
Phụ thuộc : Các TASK phải hoàn thành trước
Input     : Tài liệu / file cần đính kèm vào prompt agent
Prompt    : Nội dung gửi cho agent (copy & paste)
Output    : File/artifact agent phải tạo ra
Verify    : Cách kiểm tra task đã xong đúng
```

---

## PHASE 0 — PROJECT SETUP & DEVOPS
> Mục tiêu: Dựng xương sống dự án, chạy được "Hello World" trên cả 3 layer.

---

### TASK-001 · Khởi tạo Backend (FastAPI)
```
Vai trò   : Backend
Phụ thuộc : Không
Input     : PRD Section 0 (Tech Stack)
```

**Prompt:**
```
Tạo project FastAPI với cấu trúc thư mục sau. Stack: Python 3.11+, FastAPI, Supabase-py, Pydantic v2.

Cấu trúc thư mục:
backend/
├── app/
│   ├── main.py              # FastAPI app instance, CORS, routers
│   ├── config.py            # Settings từ env vars (Pydantic BaseSettings)
│   ├── database.py          # Supabase client singleton
│   ├── dependencies.py      # JWT auth dependency, get_current_user
│   ├── models/              # Pydantic request/response models (empty folder + __init__.py)
│   ├── routers/             # API routers (empty folder + __init__.py)
│   └── services/            # Business logic (empty folder + __init__.py)
├── requirements.txt
├── .env.example
└── README.md

Yêu cầu:
- requirements.txt gồm: fastapi, uvicorn[standard], supabase, python-dotenv, pydantic-settings, slowapi, python-jose[cryptography]
- config.py dùng Pydantic BaseSettings đọc: SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET, ENVIRONMENT
- main.py: CORS cho localhost:5173 và production domain, mount router /api/v1
- dependencies.py: hàm get_current_user(token: str) → decode JWT từ Supabase, trả về dict {user_id, email, role, organization_id}
- Health check endpoint: GET /health → {"status": "ok", "version": "1.0.0"}
- .env.example liệt kê tất cả biến môi trường cần thiết
```

**Output:** Toàn bộ file cấu trúc backend/

**Verify:**
```bash
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload
# Truy cập http://localhost:8000/health → {"status":"ok"}
# Truy cập http://localhost:8000/docs → Swagger UI hiện
```

---

### TASK-002 · Khởi tạo Frontend (React + Vite)
```
Vai trò   : Frontend
Phụ thuộc : Không (song song với TASK-001)
Input     : PRD Section 0 (Tech Stack)
```

**Prompt:**
```
Tạo React project với Vite. Stack: React 18, TypeScript, TailwindCSS, React Router v6, Axios, Zustand, React Query (TanStack Query v5).

Cấu trúc thư mục:
frontend/
├── public/
│   ├── manifest.json        # PWA manifest
│   └── icons/               # PWA icons placeholder (192x192, 512x512)
├── src/
│   ├── main.tsx
│   ├── App.tsx              # Router setup
│   ├── api/                 # axios instance + API functions (empty)
│   ├── components/          # Shared UI components (empty)
│   │   └── ui/              # Button, Input, Badge, Card, Modal, Table
│   ├── hooks/               # Custom hooks (empty)
│   ├── pages/               # Page components (empty)
│   ├── stores/              # Zustand stores (empty)
│   ├── types/               # TypeScript types (empty)
│   └── utils/               # Helper functions (empty)
├── index.html
├── vite.config.ts           # PWA plugin config
├── tailwind.config.ts
├── tsconfig.json
└── .env.example

Yêu cầu:
- tailwind.config.ts: màu primary là blue-600 (#2563eb), font Be Vietnam Pro (Google Fonts)
- vite.config.ts: cài vite-plugin-pwa, proxy /api → http://localhost:8000
- manifest.json: name="QuanLyNhaTro", short_name="NhaTro", display="standalone", theme_color="#2563eb"
- App.tsx: setup React Router với layout: AuthLayout (cho /login, /register) và AppLayout (sidebar + header, cho toàn bộ app)
- api/client.ts: axios instance với baseURL từ env, interceptor tự động đính JWT vào header, interceptor bắt lỗi 401 → redirect /login
- .env.example: VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_VAPID_PUBLIC_KEY
- Tạo component Spinner, EmptyState, ErrorBoundary trong components/ui/
```

**Output:** Toàn bộ cấu trúc frontend/

**Verify:**
```bash
cd frontend && npm install && npm run dev
# http://localhost:5173 → React app chạy, không lỗi console
```

---

### TASK-003 · Supabase Schema Migration — Phase 1 (Core Tables)
```
Vai trò   : Backend/DevOps
Phụ thuộc : TASK-001
Input     : PRD Section 1 (Multi-tenancy), Section 2 (Properties), Section 3 (Contracts), Section 4 (Renters)
```

**Prompt:**
```
Tạo file SQL migration cho Supabase. Chạy trong Supabase SQL Editor theo thứ tự.

Tạo file: backend/migrations/001_core_tables.sql

Nội dung phải bao gồm đúng thứ tự (tránh foreign key error):
1. CREATE TABLE organizations (id, name, slug UNIQUE, subscription_plan, created_at)
2. CREATE TABLE profiles (id UUID REFERENCES auth.users, organization_id, full_name, phone, role TEXT CHECK role IN ('sysadmin','owner','manager','accountant','maintenance','cleaner','renter'), avatar_url, is_active DEFAULT TRUE, created_at)
3. CREATE TABLE properties (id, organization_id, name, address, ward, district, city, property_type CHECK IN ('house','apartment_building','villa'), total_units DEFAULT 0, description, thumbnail_url, is_deleted DEFAULT FALSE, created_by, created_at, updated_at)
4. CREATE TABLE units (id, property_id, organization_id, unit_number, floor, area_sqm, base_rent, deposit_amount, max_occupants DEFAULT 2, status DEFAULT 'vacant' CHECK IN ('vacant','occupied','maintenance'), amenities JSONB DEFAULT '[]', notes, created_at)
5. CREATE TABLE unit_co_owners (unit_id, profile_id, share_percentage DEFAULT 100, PRIMARY KEY(unit_id, profile_id))
6. CREATE TABLE renter_profiles (id, organization_id, user_id REFERENCES profiles(id) NULLABLE, full_name, date_of_birth, gender, id_number, id_issued_date, id_issued_place, id_front_url, id_back_url, phone, email, emergency_contact_name, emergency_contact_phone, hometown, occupation, workplace, created_at)
7. CREATE TABLE contracts (id, organization_id, unit_id, renter_id REFERENCES renter_profiles, created_by, contract_number UNIQUE, status DEFAULT 'draft' CHECK IN ('draft','active','expired','terminated'), start_date, end_date, monthly_rent, deposit_amount, deposit_paid_date, payment_due_day DEFAULT 5, max_occupants DEFAULT 2, terms, pdf_url, signed_at, terminated_at, termination_reason, created_at, updated_at)
8. CREATE TABLE contract_co_renters (contract_id, full_name, id_number, phone, PRIMARY KEY(contract_id, id_number))

Thêm:
- FUNCTION updated_at_trigger() và TRIGGER cho tất cả bảng có updated_at
- INDEX trên organization_id cho tất cả bảng (performance)
- INDEX trên contracts(unit_id, status), units(property_id, status)

Sau migration, enable RLS:
ALTER TABLE [mỗi bảng] ENABLE ROW LEVEL SECURITY;

Tạo RLS policy "tenant_isolation" cho mỗi bảng (trừ organizations, profiles):
CREATE POLICY "tenant_isolation" ON [table]
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

Policy đặc biệt cho profiles: user chỉ xem được profile trong cùng organization.
Policy cho contracts: renter chỉ xem contract của chính mình (thêm điều kiện renter_id).
```

**Output:** `backend/migrations/001_core_tables.sql`

**Verify:**
```sql
-- Chạy trong Supabase SQL Editor
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- Phải thấy: organizations, profiles, properties, units, unit_co_owners, renter_profiles, contracts, contract_co_renters
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- rowsecurity = TRUE cho tất cả bảng
```

---

### TASK-004 · Supabase Schema Migration — Phase 2 (Operations Tables)
```
Vai trò   : Backend/DevOps
Phụ thuộc : TASK-003
Input     : PRD Section 5 (Staff), Section 6 (Finance), Section 7 (Meter), Section 8 (Maintenance), Section 10.2 (Notifications)
```

**Prompt:**
```
Tạo file: backend/migrations/002_operations_tables.sql

Tạo theo thứ tự:
1. staff_assignments (profile_id, property_id, assigned_role, assigned_at, PRIMARY KEY(profile_id, property_id))

2. task_templates (id, organization_id, title, description, task_type CHECK IN ('maintenance','cleaning','inspection'), property_id, unit_id NULLABLE, assigned_to, created_by, priority DEFAULT 'normal', recurrence_type CHECK IN ('once','daily','weekly','monthly','quarterly'), recurrence_day_of_week INT CHECK 0-6, recurrence_day_of_month INT CHECK 1-31, recurrence_month_of_quarter INT CHECK 1-3, recurrence_start_date DATE, recurrence_end_date DATE NULLABLE, is_active DEFAULT TRUE, created_at)

3. tasks (id, organization_id, template_id NULLABLE REFERENCES task_templates, title, description, task_type, property_id, unit_id NULLABLE, assigned_to, assigned_by, priority DEFAULT 'normal', status DEFAULT 'pending' CHECK IN ('pending','in_progress','done','cancelled'), due_date, completed_at, completion_notes, completion_photos JSONB DEFAULT '[]', created_at, updated_at)

4. service_fee_configs (id, property_id, organization_id, service_name, fee_type CHECK IN ('fixed','per_person','per_unit'), amount, is_active DEFAULT TRUE)

5. invoices (id, organization_id, contract_id, unit_id, renter_id, invoice_number UNIQUE, billing_period_start DATE, billing_period_end DATE, due_date DATE, subtotal, total, status DEFAULT 'draft' CHECK IN ('draft','sent','paid','overdue','cancelled'), paid_amount DEFAULT 0, paid_at, payment_method, vietqr_payload, vietqr_ref_code UNIQUE, notes, created_at, updated_at)

6. invoice_items (id, invoice_id, item_type CHECK IN ('rent','electricity','water','service','internet','parking','other'), description, quantity DECIMAL, unit_price DECIMAL, amount DECIMAL NOT NULL, meter_reading_id UUID NULLABLE)

7. meter_readings (id, organization_id, unit_id, meter_type CHECK IN ('electricity','water'), billing_month DATE, previous_reading DECIMAL, current_reading DECIMAL, consumption DECIMAL, unit_price DECIMAL, photo_url TEXT NOT NULL, ai_detected_value DECIMAL, ai_confidence DECIMAL, ai_raw_response JSONB, submitted_by, submitted_at DEFAULT NOW(), reviewed_by NULLABLE, reviewed_at NULLABLE, is_approved DEFAULT FALSE, manual_override_value DECIMAL, UNIQUE(unit_id, meter_type, billing_month))

8. maintenance_requests (id, organization_id, scope CHECK IN ('property','unit') DEFAULT 'unit', property_id NOT NULL, unit_id NULLABLE, submitted_by NOT NULL, submitter_role TEXT, title, description, location_detail, category CHECK IN ('electrical','plumbing','furniture','structure','other'), priority DEFAULT 'normal', status DEFAULT 'open' CHECK IN ('open','assigned','in_progress','resolved','closed'), photos JSONB DEFAULT '[]', assigned_to NULLABLE, assigned_at NULLABLE, resolved_at NULLABLE, resolution_notes, resolution_photos JSONB DEFAULT '[]', cost DEFAULT 0, renter_rating INT CHECK 1-5, renter_feedback, created_at, updated_at)

9. notifications (id, organization_id, recipient_id, type TEXT, title, body, data JSONB, channel CHECK IN ('email','push','in_app'), is_read DEFAULT FALSE, sent_at, read_at, created_at)

10. push_subscriptions (id, profile_id, endpoint, p256dh, auth_key TEXT, created_at)

Thêm RLS cho tất cả bảng mới.
RLS đặc biệt:
- tasks: nhân viên chỉ thấy task assigned_to = auth.uid() hoặc là owner/manager
- maintenance_requests: renter chỉ thấy request của phòng mình (scope='unit' AND submitted_by = auth.uid())
- notifications: chỉ thấy của chính mình (recipient_id = auth.uid())
- meter_readings: renter chỉ thấy của unit đang thuê
```

**Output:** `backend/migrations/002_operations_tables.sql`

**Verify:**
```sql
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
-- Phải đủ 18+ bảng
```

---

## PHASE 1 — AUTHENTICATION & ORGANIZATION
> Mục tiêu: Người dùng đăng ký/đăng nhập được, phân role hoạt động.

---

### TASK-005 · Backend — Auth Router
```
Vai trò   : Backend
Phụ thuộc : TASK-001, TASK-003
Input     : PRD Section 10.1 (Authentication)
```

**Prompt:**
```
Tạo auth module cho FastAPI. Sử dụng Supabase Auth (không tự quản lý password).

Tạo các file:
- app/models/auth.py : Pydantic models
- app/routers/auth.py : Router
- app/services/auth_service.py : Business logic

Models cần tạo:
- RegisterOwnerRequest(email, password, full_name, organization_name)
- LoginRequest(email, password)
- InviteUserRequest(email, role: Literal['manager','accountant','maintenance','cleaner','renter'], property_id: Optional[UUID])
- AcceptInviteRequest(token, email, password, full_name)

Endpoints:
POST /api/v1/auth/register-owner
  - Tạo user Supabase Auth
  - Tạo organizations record (slug = slugify(organization_name))
  - Tạo profiles record (role='owner')
  - Trả về {user_id, organization_id, access_token}

POST /api/v1/auth/login
  - Gọi supabase.auth.sign_in_with_password()
  - Trả về {access_token, user: {id, email, role, organization_id, full_name}}

POST /api/v1/auth/logout
  - Gọi supabase.auth.sign_out()

GET /api/v1/auth/me
  - Yêu cầu JWT (dùng dependency get_current_user)
  - Trả về profile đầy đủ

POST /api/v1/auth/invite
  - Yêu cầu JWT, role phải là owner hoặc manager
  - Tạo invitation token (UUID), lưu vào bảng tạm hoặc Supabase table invitations(token, email, role, organization_id, property_id, expires_at = NOW()+48h)
  - Gửi email invite (mock bằng print() trước, sẽ tích hợp Resend sau)

POST /api/v1/auth/accept-invite
  - Validate token còn hạn
  - Tạo user Supabase Auth
  - Tạo profiles(role từ invitation, organization_id từ invitation)
  - Nếu có property_id → tạo staff_assignments
  - Xóa invitation token

Tạo thêm bảng invitations trong migration nếu chưa có:
(id UUID, token UUID UNIQUE, email, role, organization_id, property_id NULLABLE, expires_at TIMESTAMPTZ)
```

**Output:** `app/models/auth.py`, `app/routers/auth.py`, `app/services/auth_service.py`

**Verify:**
```bash
# Test với HTTPie hoặc curl
http POST localhost:8000/api/v1/auth/register-owner \
  email=test@example.com password=Test1234! \
  full_name="Nguyen Van A" organization_name="Nha Tro ABC"
# → 201, trả về access_token

http POST localhost:8000/api/v1/auth/login \
  email=test@example.com password=Test1234!
# → 200, trả về token

http GET localhost:8000/api/v1/auth/me \
  "Authorization: Bearer <token>"
# → 200, trả về profile với role='owner'
```

---

### TASK-006 · Frontend — Auth Pages
```
Vai trò   : Frontend
Phụ thuộc : TASK-002, TASK-005
Input     : TASK-005 API endpoints
```

**Prompt:**
```
Tạo các trang Auth cho React app. Dùng React Hook Form + Zod để validate.

Tạo các file:
- src/pages/auth/LoginPage.tsx
- src/pages/auth/RegisterPage.tsx
- src/pages/auth/AcceptInvitePage.tsx  (đọc token từ URL query param)
- src/stores/authStore.ts              (Zustand: user, token, setAuth, logout)
- src/api/auth.ts                      (API functions gọi backend)
- src/hooks/useAuth.ts                 (hook tiện ích)

LoginPage:
- Form: Email, Password, nút Login
- Sau login thành công → lưu vào authStore → redirect /dashboard
- Link "Quên mật khẩu" (placeholder)

RegisterPage:
- Form: Họ tên, Email, Password, Confirm Password, Tên tổ chức/nhà trọ
- Sau đăng ký → auto login → redirect /dashboard
- Link quay lại Login

AcceptInvitePage:
- Đọc ?token=xxx từ URL
- Gọi GET /auth/validate-invite?token=xxx → hiện email đã được invite
- Form: Họ tên, Password, Confirm Password
- Submit → POST /auth/accept-invite

authStore (Zustand + persist vào localStorage):
- state: { user: User | null, token: string | null }
- actions: setAuth(user, token), logout(), isAuthenticated()

AppLayout:
- Nếu không có token → redirect /login
- Sidebar theo role: owner thấy đủ menu, renter chỉ thấy: Hợp đồng, Hóa đơn, Báo sự cố, Đọc đồng hồ

Design yêu cầu:
- Clean, professional, mobile-responsive
- Logo placeholder ở góc trên
- Loading state khi đang submit
- Hiện lỗi inline dưới field (không dùng alert)
```

**Output:** Các file kể trên

**Verify:**
- Đăng ký → redirect dashboard (có sidebar)
- Đăng nhập lại → vào /login redirect về /dashboard
- F5 vẫn giữ login (localStorage persist)
- Màn hình mobile (375px) không bị overflow

---

## PHASE 2 — PROPERTY & UNIT MANAGEMENT

---

### TASK-007 · Backend — Properties & Units API
```
Vai trò   : Backend
Phụ thuộc : TASK-005
Input     : PRD Section 2 (Property Management)
```

**Prompt:**
```
Tạo CRUD API cho Properties và Units.

Tạo các file:
- app/models/property.py
- app/routers/properties.py
- app/services/property_service.py

Models:
- PropertyCreate(name, address, ward, district, city, property_type, description)
- PropertyUpdate(name?, address?, ward?, district?, city?, description?, thumbnail_url?)
- PropertyResponse(id, name, address, city, property_type, total_units, occupied_units, created_at)
- UnitCreate(unit_number, floor?, area_sqm?, base_rent, deposit_amount, max_occupants, amenities, notes?)
- UnitUpdate(tất cả fields là Optional)
- UnitResponse(id, unit_number, floor, area_sqm, base_rent, deposit_amount, status, amenities, current_renter_name?)

Endpoints (tất cả yêu cầu JWT, lọc theo organization_id tự động):
GET    /api/v1/properties                     filter: city, status (có unit vacant?)
POST   /api/v1/properties                     role: owner only
GET    /api/v1/properties/{id}                kèm danh sách units
PATCH  /api/v1/properties/{id}                role: owner only
DELETE /api/v1/properties/{id}                soft delete (is_deleted=TRUE), trả 409 nếu có active contracts

GET    /api/v1/properties/{id}/units          filter: status
POST   /api/v1/properties/{id}/units          role: owner, manager
GET    /api/v1/units/{id}                     kèm current contract info nếu có
PATCH  /api/v1/units/{id}                     role: owner, manager
DELETE /api/v1/units/{id}                     trả 409 nếu status='occupied'
GET    /api/v1/units/{id}/history             lịch sử contracts của unit

Business logic:
- GET /properties/{id}: tính occupied_units = COUNT(units WHERE status='occupied')
- Mỗi request tự động filter organization_id = current_user.organization_id
- Role check: viết decorator @require_roles(['owner']) để tái sử dụng
```

**Output:** 3 file model/router/service

**Verify:**
```bash
# Tạo property
http POST localhost:8000/api/v1/properties \
  name="Nha Tro 123" address="123 Nguyen Trai" city="Ho Chi Minh" \
  property_type="house" "Authorization: Bearer <token>"
# → 201, có id

# Thêm unit
http POST localhost:8000/api/v1/properties/<id>/units \
  unit_number="P101" base_rent=3000000 deposit_amount=6000000 \
  "Authorization: Bearer <token>"
# → 201

# Xem property với units
http GET localhost:8000/api/v1/properties/<id> "Authorization: Bearer <token>"
# → có trường units[] và total_units=1
```

---

### TASK-008 · Frontend — Property List & Detail Pages
```
Vai trò   : Frontend
Phụ thuộc : TASK-006, TASK-007
Input     : TASK-007 API endpoints, PRD Section 2.4 (UI Screens)
```

**Prompt:**
```
Tạo UI cho quản lý nhà cho thuê.

Tạo các file:
- src/api/properties.ts           (API functions)
- src/pages/properties/PropertyListPage.tsx
- src/pages/properties/PropertyDetailPage.tsx
- src/pages/properties/PropertyFormPage.tsx  (tạo mới + chỉnh sửa)
- src/pages/units/UnitDetailPage.tsx
- src/pages/units/UnitFormModal.tsx          (modal thêm/sửa phòng)
- src/components/property/PropertyCard.tsx
- src/components/property/UnitGrid.tsx
- src/types/property.ts

PropertyListPage (/properties):
- Hiển thị dạng grid card, mỗi card: tên nhà, địa chỉ, "X/Y phòng đã thuê", badge màu theo tình trạng
- Filter bar: thành phố, loại nhà, trạng thái
- Button "Thêm nhà mới" (chỉ hiện với owner)
- Loading skeleton khi fetch
- Empty state khi chưa có nhà

PropertyDetailPage (/properties/:id):
- Header: tên nhà, địa chỉ, badge tổng quan
- UnitGrid: mỗi ô là 1 phòng, màu: xanh=vacant, đỏ=occupied, vàng=maintenance
- Click ô phòng → navigate /units/:id
- Tab: Thông tin / Danh sách phòng / Bảo trì / Báo cáo (placeholder)

UnitDetailPage (/units/:id):
- Header: tên phòng, badge status, giá thuê
- Tabs: Thông tin | Hợp đồng (placeholder) | Hóa đơn (placeholder) | Bảo trì (placeholder)
- Tab Thông tin: diện tích, số người, tiện nghi (chip/tag), ghi chú

UnitFormModal:
- Modal overlay, form thêm/sửa phòng
- Field: Số phòng, Tầng, Diện tích, Giá thuê, Tiền cọc, Số người tối đa, Tiện nghi (multi-select checkbox)

Dùng TanStack Query (useQuery, useMutation) để fetch & cache data.
Invalidate cache sau mutation.
```

**Output:** Các file kể trên

**Verify:**
- Thêm nhà → hiện trong list
- Click vào nhà → thấy grid phòng
- Thêm phòng qua modal → grid cập nhật ngay
- Filter theo thành phố hoạt động
- Mobile: grid 1 cột, desktop: 3 cột

---

## PHASE 3 — CONTRACTS & RENTERS

---

### TASK-009 · Backend — Renter Profiles API
```
Vai trò   : Backend
Phụ thuộc : TASK-007
Input     : PRD Section 4 (Renter Management)
```

**Prompt:**
```
Tạo CRUD API cho Renter Profiles.

File:
- app/models/renter.py
- app/routers/renters.py
- app/services/renter_service.py

Models:
- RenterCreate(full_name, phone, email?, id_number?, id_issued_date?, id_issued_place?, date_of_birth?, gender?, hometown?, occupation?, workplace?, emergency_contact_name?, emergency_contact_phone?)
- RenterUpdate (tất cả Optional)
- RenterResponse(id, full_name, phone, email, id_number, current_unit_number?, current_property_name?, active_contract_id?, created_at)
- RenterDetailResponse(tất cả fields + contracts_history[] + invoices_summary)

Endpoints:
GET    /api/v1/renters                         filter: has_active_contract, search (name/phone/id_number)
POST   /api/v1/renters
GET    /api/v1/renters/{id}                    RenterDetailResponse
PATCH  /api/v1/renters/{id}
POST   /api/v1/renters/{id}/invite             gửi email mời tạo tài khoản (mock print)

Upload ảnh CCCD (2 endpoints riêng):
POST   /api/v1/renters/{id}/id-front           nhận multipart/form-data, upload Supabase Storage bucket 'id-documents', trả về URL
POST   /api/v1/renters/{id}/id-back

Business logic GET /renters:
- JOIN với contracts để lấy current_unit_number (contract status='active')
- Search: ILIKE trên full_name, phone, id_number
```

**Output:** 3 file

**Verify:**
```bash
http POST localhost:8000/api/v1/renters \
  full_name="Tran Thi B" phone="0901234567" id_number="123456789" \
  "Authorization: Bearer <token>"
# → 201

http GET "localhost:8000/api/v1/renters?search=Tran" "Authorization: Bearer <token>"
# → list có 1 item
```

---

### TASK-010 · Backend — Contracts API + PDF Export
```
Vai trò   : Backend
Phụ thuộc : TASK-009
Input     : PRD Section 3 (Contracts)
```

**Prompt:**
```
Tạo Contracts API với tính năng export PDF.

Cài thêm: pip install weasyprint jinja2

File:
- app/models/contract.py
- app/routers/contracts.py
- app/services/contract_service.py
- app/templates/contract_template.html   (HTML template hợp đồng)

Models:
- ContractCreate(unit_id, renter_id, start_date, end_date, monthly_rent, deposit_amount, deposit_paid_date?, payment_due_day=5, max_occupants=2, terms?)
- ContractUpdate(end_date?, monthly_rent?, terms?, deposit_paid_date?, payment_due_day?)
- ContractResponse(id, contract_number, status, unit_number, property_name, renter_name, start_date, end_date, monthly_rent, deposit_amount, created_at)

Endpoints:
GET    /api/v1/contracts                       filter: status, unit_id, renter_id
POST   /api/v1/contracts                       auto-generate contract_number: "HD-{YYYY}-{SEQ:03d}"
GET    /api/v1/contracts/{id}
PATCH  /api/v1/contracts/{id}                  chỉ khi status='draft'
POST   /api/v1/contracts/{id}/activate         draft→active, cập nhật unit.status='occupied'
POST   /api/v1/contracts/{id}/terminate        active→terminated, cập nhật unit.status='vacant', yêu cầu termination_reason
POST   /api/v1/contracts/{id}/export-pdf       generate PDF, upload Supabase Storage 'contracts/', trả về {pdf_url}
GET    /api/v1/contracts/expiring-soon         hợp đồng hết hạn trong 30 ngày

contract_template.html:
- Mẫu hợp đồng thuê nhà tiêu chuẩn Việt Nam (đủ các điều khoản cơ bản)
- Dùng Jinja2 variables: {{contract_number}}, {{tenant_name}}, {{property_address}}, {{unit_number}}, {{monthly_rent}}, {{start_date}}, {{end_date}}, {{deposit_amount}}, {{max_occupants}}, {{terms}}, {{today}}
- Font: sử dụng Google Font Be Vietnam Pro qua @import
- CSS: A4 size, margin 2cm, font-size 12pt, Times New Roman fallback

Business rules:
- Không tạo được 2 contract 'active' cho cùng unit → raise 409
- contract_number tự tăng theo năm (năm mới reset về 001)
- Khi activate: set signed_at = NOW()
```

**Output:** 4 file

**Verify:**
```bash
# Tạo contract
http POST localhost:8000/api/v1/contracts \
  unit_id=<uuid> renter_id=<uuid> \
  start_date=2024-01-01 end_date=2024-12-31 \
  monthly_rent=3000000 deposit_amount=6000000 \
  "Authorization: Bearer <token>"
# → 201, contract_number="HD-2024-001"

# Export PDF
http POST localhost:8000/api/v1/contracts/<id>/export-pdf "Authorization: Bearer <token>"
# → {pdf_url: "https://...supabase.co/storage/.../contracts/HD-2024-001.pdf"}
# Mở URL → PDF hiển thị đúng, có tiếng Việt
```

---

### TASK-011 · Frontend — Contract & Renter Pages
```
Vai trò   : Frontend
Phụ thuộc : TASK-008, TASK-010
Input     : TASK-009, TASK-010 API endpoints
```

**Prompt:**
```
Tạo UI cho Hợp đồng và Người thuê.

File:
- src/api/contracts.ts
- src/api/renters.ts
- src/pages/contracts/ContractListPage.tsx
- src/pages/contracts/ContractDetailPage.tsx
- src/pages/contracts/ContractFormPage.tsx
- src/pages/renters/RenterListPage.tsx
- src/pages/renters/RenterDetailPage.tsx
- src/pages/renters/RenterFormPage.tsx
- src/components/contract/ContractStatusBadge.tsx
- src/types/contract.ts
- src/types/renter.ts

ContractListPage (/contracts):
- Table: Số HĐ | Căn phòng | Người thuê | Ngày bắt đầu | Ngày kết thúc | Trạng thái | Hành động
- Filter: status, property
- Badge màu: draft=xám, active=xanh, expired=đỏ, terminated=cam
- Row cảnh báo màu vàng nếu còn < 30 ngày

ContractFormPage (/contracts/new):
- Step 1: Chọn phòng (dropdown chỉ hiện phòng đang vacant)
- Step 2: Chọn/tạo người thuê
- Step 3: Điền chi tiết hợp đồng (ngày, giá, tiền cọc, điều khoản)
- Step 4: Preview HTML → Button "Xuất PDF" → Button "Kích hoạt hợp đồng"
- Multi-step form với progress indicator

ContractDetailPage (/contracts/:id):
- Header: số HĐ, badge status, action buttons (Kích hoạt / Chấm dứt / Xuất PDF)
- Thông tin 2 cột: bên trái hợp đồng, bên phải người thuê
- Timeline: ngày tạo → ký → hết hạn (visual progress bar)
- PDF download button nếu pdf_url tồn tại

RenterListPage (/renters):
- Table: Tên | SĐT | CCCD | Phòng hiện tại | Trạng thái HĐ | Hành động
- Search bar (realtime, debounce 300ms)

RenterDetailPage (/renters/:id):
- Avatar placeholder + thông tin cá nhân 2 cột
- Ảnh CCCD 2 mặt với upload button
- Tab: Hợp đồng | Hóa đơn (placeholder) | Ghi chú
```

**Output:** Các file kể trên

**Verify:**
- Tạo hợp đồng qua multi-step form
- Kích hoạt → badge đổi thành active, phòng hiển thị occupied
- PDF download hoạt động
- Search người thuê realtime

---

## PHASE 4 — STAFF & TASK MANAGEMENT

---

### TASK-012 · Backend — Staff & Task Templates API
```
Vai trò   : Backend
Phụ thuộc : TASK-005
Input     : PRD Section 5 (Staff Management) — toàn bộ
```

**Prompt:**
```
Tạo Staff và Task management API, bao gồm task lặp lại.

File:
- app/models/staff.py
- app/models/task.py
- app/routers/staff.py
- app/routers/tasks.py
- app/services/staff_service.py
- app/services/task_service.py
- app/services/task_scheduler.py    (logic sinh task từ template)

=== STAFF API ===
GET    /api/v1/staff                           danh sách nhân viên (filter: role, property_id)
POST   /api/v1/staff/invite                    tái dùng invite flow từ TASK-005
PATCH  /api/v1/staff/{id}/role
DELETE /api/v1/staff/{id}                      set is_active=FALSE

=== TASK TEMPLATES API ===
Models:
- TaskTemplateCreate(title, description?, task_type, property_id, unit_id?, assigned_to, priority, recurrence_type, recurrence_day_of_week?, recurrence_day_of_month?, recurrence_month_of_quarter?, recurrence_start_date, recurrence_end_date?)
- Validation: nếu recurrence_type='weekly' → recurrence_day_of_week bắt buộc, v.v.

GET    /api/v1/task-templates                  filter: property_id, recurrence_type, is_active
POST   /api/v1/task-templates                  tạo template + nếu recurrence_type='once' thì tạo task ngay
GET    /api/v1/task-templates/{id}             kèm preview 5 lần sinh task tiếp theo
PATCH  /api/v1/task-templates/{id}
DELETE /api/v1/task-templates/{id}             set is_active=FALSE

=== TASKS API ===
GET    /api/v1/tasks                           filter: assigned_to, status, property_id, date_range (start/end)
GET    /api/v1/tasks/{id}
PATCH  /api/v1/tasks/{id}                      update status, completion_notes, completion_photos
GET    /api/v1/tasks/my-tasks                  task của user đang login
GET    /api/v1/tasks/calendar                  ?start=YYYY-MM-DD&end=YYYY-MM-DD → tasks trong khoảng

=== TASK SCHEDULER (task_scheduler.py) ===
Hàm spawn_recurring_tasks(today: date):
  - Lấy tất cả task_templates có is_active=TRUE, recurrence_type != 'once'
  - Với mỗi template, xác định should_spawn theo recurrence_type
  - Kiểm tra task đã tồn tại hôm nay (template_id + due_date = today) → skip nếu đã có
  - Tạo task mới từ template
  - (Notification sẽ tích hợp ở TASK-017)

Expose endpoint để test:
POST /api/v1/tasks/trigger-scheduler          (chỉ dùng trong dev, bảo vệ bằng API key)
  → gọi spawn_recurring_tasks(today)
```

**Output:** 6 file

**Verify:**
```bash
# Tạo template weekly (thứ 2 hàng tuần)
http POST localhost:8000/api/v1/task-templates \
  title="Dọn hành lang" task_type="cleaning" \
  property_id=<uuid> assigned_to=<staff_uuid> \
  priority="normal" recurrence_type="weekly" \
  recurrence_day_of_week=1 \
  recurrence_start_date="2024-01-01" \
  "Authorization: Bearer <token>"

# Trigger scheduler
http POST localhost:8000/api/v1/tasks/trigger-scheduler

# Kiểm tra task được tạo
http GET localhost:8000/api/v1/tasks "Authorization: Bearer <token>"
# → có task mới với due_date = ngày thứ 2 gần nhất
```

---

### TASK-013 · Frontend — Staff & Task Pages
```
Vai trò   : Frontend
Phụ thuộc : TASK-011, TASK-012
Input     : TASK-012 API, PRD Section 5.4 (UI Screens)
```

**Prompt:**
```
Tạo UI cho quản lý nhân viên và công việc.

File:
- src/api/staff.ts
- src/api/tasks.ts
- src/pages/staff/StaffListPage.tsx
- src/pages/tasks/TaskListPage.tsx           (Kanban + List toggle)
- src/pages/tasks/TaskTemplateListPage.tsx
- src/pages/tasks/TaskTemplateFormPage.tsx   (form dynamic theo recurrence_type)
- src/pages/tasks/MyTasksPage.tsx
- src/components/tasks/KanbanBoard.tsx
- src/components/tasks/TaskCard.tsx
- src/components/tasks/RecurrenceFormFields.tsx  (reusable)
- src/types/task.ts

StaffListPage (/staff):
- Table: Avatar | Tên | Role badge | Property phụ trách | Trạng thái | Hành động
- Button "Mời nhân viên" → Modal: Email, Role, Property
- Role badge màu: manager=xanh, maintenance=cam, cleaner=tím, accountant=vàng

TaskListPage (/tasks):
- Toggle: Kanban view / List view
- Kanban: 4 cột (Chờ xử lý / Đang làm / Hoàn thành / Đã hủy), drag card giữa cột (dùng @dnd-kit/core)
- List view: Table với filter ngày, status, assigned_to, property
- Badge priority: urgent=đỏ, high=cam, normal=xanh, low=xám
- "Tạo task" → navigate /tasks/templates/new

TaskTemplateFormPage (/tasks/templates/new và /edit/:id):
- Field chung: Tiêu đề, Mô tả, Loại, Nhà, Phòng (optional), Nhân viên phụ trách, Độ ưu tiên
- Radio "Loại lặp lại": Một lần | Hàng ngày | Hàng tuần | Hàng tháng | Hàng quý
- Khi chọn "Hàng tuần" → hiện thêm: "Ngày trong tuần" (checkbox T2-CN)
- Khi chọn "Hàng tháng" → hiện: "Vào ngày (1-31) hàng tháng"
- Khi chọn "Hàng quý" → hiện: "Tháng thứ [1/2/3] trong quý, vào ngày..."
- Ngày bắt đầu lặp, Ngày kết thúc lặp (optional)
- Preview: "Task sẽ được tạo vào: [danh sách 5 ngày tiếp theo]"

MyTasksPage (/tasks/my-tasks):
- Dành cho nhân viên
- Nhóm theo: Hôm nay / Tuần này / Sắp tới / Đã xong
- Card task: tiêu đề, nhà/phòng, deadline, badge priority
- Click card → drawer/modal: chi tiết + button "Bắt đầu" / "Hoàn thành" + textarea ghi chú
```

**Output:** Các file kể trên

**Verify:**
- Kanban drag & drop hoạt động, gọi API cập nhật status
- Form tạo template: chọn "Hàng tuần" → hiện field ngày trong tuần
- Preview lịch sinh task hiển thị đúng
- MyTasksPage: nhân viên chỉ thấy task của mình

---

## PHASE 5 — FINANCE & INVOICING

---

### TASK-014 · Backend — Invoice & VietQR API
```
Vai trò   : Backend
Phụ thuộc : TASK-010
Input     : PRD Section 6 (Finance & Invoicing)
```

**Prompt:**
```
Tạo Invoice API với VietQR integration.

Cài thêm: pip install qrcode[pil] Pillow

File:
- app/models/invoice.py
- app/routers/invoices.py
- app/services/invoice_service.py
- app/services/vietqr_service.py

=== VIETQR SERVICE ===
VietQR theo chuẩn EMVCo (Napas/BIDV standard):
- Hàm generate_ref_code(contract_id, billing_month) → "NHAT{contract_id[:6].upper()}{YYYYMM}"
- Hàm build_vietqr_string(bank_bin, account_number, amount, ref_code, description) → EMVCo string
  Bank BIN list cần support: Vietcombank=970436, BIDV=970418, Techcombank=970407, MB=970422, VPBank=970432
- Hàm generate_qr_image(qr_string) → base64 PNG string (dùng qrcode lib)
- Đọc cấu hình từ env: BANK_BIN, BANK_ACCOUNT_NUMBER, BANK_ACCOUNT_NAME

=== INVOICE API ===
Models:
- InvoiceCreate(contract_id, billing_period_start, billing_period_end, due_date, items[])
- InvoiceItemCreate(item_type, description, quantity, unit_price, amount)
- InvoiceResponse(id, invoice_number, contract_id, unit_number, renter_name, billing_period, due_date, total, status, vietqr_ref_code, qr_image_base64?)

Endpoints:
GET    /api/v1/invoices                               filter: status, unit_id, renter_id, period
POST   /api/v1/invoices                               tạo thủ công
GET    /api/v1/invoices/{id}                          kèm items[] và qr_image_base64
POST   /api/v1/invoices/{id}/send                     đổi status draft→sent, mock gửi email (print)
POST   /api/v1/invoices/{id}/mark-paid               xác nhận thủ công, nhập payment_method, paid_amount
POST   /api/v1/invoices/auto-generate                 tạo draft invoices cho tất cả active contracts trong tháng hiện tại
GET    /api/v1/invoices/{id}/pdf                      export PDF (dùng WeasyPrint + Jinja2 template)

POST   /api/v1/payments/webhook                       nhận webhook từ Casso
  - Header: x-api-key từ CASSO_API_KEY env
  - Body: {id, tid, description, amount, date, bank_sub_acc_id, ...}
  - Parse description tìm ref_code (regex: NHAT[A-Z0-9]{6}\d{6})
  - Tìm invoice có vietqr_ref_code matching
  - Nếu tìm thấy: set status='paid', paid_amount=amount, paid_at=date
  - Trả về 200 luôn (Casso yêu cầu)

auto-generate logic:
- Với mỗi active contract:
  - Skip nếu đã có invoice cho billing_period của tháng này
  - Tính các khoản: rent, electricity (nếu meter_reading approved), water, service fees
  - Tạo invoice + items + generate vietqr_ref_code
```

**Output:** 4 file

**Verify:**
```bash
# Auto-generate invoices
http POST localhost:8000/api/v1/invoices/auto-generate "Authorization: Bearer <token>"

# Xem invoice
http GET localhost:8000/api/v1/invoices/<id> "Authorization: Bearer <token>"
# → có qr_image_base64, đúng ref_code, đúng total

# Test webhook (giả lập Casso)
http POST localhost:8000/api/v1/payments/webhook \
  "x-api-key: <CASSO_API_KEY>" \
  description="NHAT<REF_CODE> Thanh toan tien phong" amount=3000000
# → invoice status chuyển 'paid'
```

---

### TASK-015 · Frontend — Invoice Pages
```
Vai trò   : Frontend
Phụ thuộc : TASK-013, TASK-014
Input     : TASK-014 API
```

**Prompt:**
```
Tạo UI cho Hóa đơn và Thanh toán.

File:
- src/api/invoices.ts
- src/pages/invoices/InvoiceListPage.tsx
- src/pages/invoices/InvoiceDetailPage.tsx
- src/components/invoice/QRPaymentCard.tsx
- src/components/invoice/InvoiceStatusBadge.tsx
- src/components/invoice/InvoiceItemsTable.tsx
- src/types/invoice.ts

InvoiceListPage (/invoices):
- Table: Số HĐ | Phòng | Người thuê | Kỳ thanh toán | Hạn nộp | Tổng tiền | Trạng thái | Hành động
- Row quá hạn → highlight đỏ nhạt
- Filter: status, property, tháng
- Button "Tạo hóa đơn hàng loạt" (gọi auto-generate)
- Badge: draft=xám, sent=xanh dương, paid=xanh lá, overdue=đỏ, cancelled=xám đậm

InvoiceDetailPage (/invoices/:id):
- Header: số hóa đơn, kỳ thanh toán, trạng thái, hạn nộp
- InvoiceItemsTable: danh sách khoản tiền với từng dòng (tiền thuê, điện, nước, dịch vụ)
- Tổng tiền nổi bật
- QRPaymentCard (hiển thị khi status != 'paid'):
  - Ảnh QR lớn (200x200)
  - Thông tin chuyển khoản: ngân hàng, số TK, tên TK, số tiền, nội dung chuyển khoản
  - "Sao chép nội dung CK" button
  - Badge "Đang chờ thanh toán" nhấp nháy
  - Refresh button để poll status (gọi lại API mỗi 30s)
- Action buttons (cho owner/manager): "Xác nhận đã TT thủ công" | "Gửi cho người thuê" | "Xuất PDF"

View dành cho Renter (/my-invoices):
- Chỉ thấy hóa đơn của mình
- Card layout (không phải table)
- Mỗi card: kỳ, tổng tiền, hạn nộp, status
- Click → InvoiceDetailPage với QR lớn nổi bật
```

**Output:** Các file kể trên

**Verify:**
- QR hiển thị đúng, scan được bằng điện thoại
- Auto-poll status mỗi 30s khi đang ở trang QR
- Renter không thấy invoice của người khác

---

## PHASE 6 — METER READINGS & AI OCR

---

### TASK-016 · Backend — Meter Reading + Google Vision OCR
```
Vai trò   : Backend
Phụ thuộc : TASK-014
Input     : PRD Section 7 (Meter Reading)
```

**Prompt:**
```
Tạo Meter Reading API với Google Vision OCR.

Cài thêm: pip install google-cloud-vision

File:
- app/models/meter.py
- app/routers/meters.py
- app/services/meter_service.py
- app/services/ocr_service.py

=== OCR SERVICE ===
Hàm ocr_meter_image(image_bytes: bytes) → dict:
- Gọi Google Vision API TEXT_DETECTION
- Parse texts[0].description
- Tìm số: re.findall(r'\b\d{4,7}(?:[.,]\d{1,2})?\b', text) → chuẩn hóa dấu chấm/phẩy
- Lấy số lớn nhất (chỉ số tích lũy luôn lớn hơn chỉ số tiêu thụ)
- Nếu confidence < 0.6 → flag cần nhập tay
- Return: {detected_value, confidence, raw_text, all_numbers_found}

Hàm estimate_confidence(numbers_found, raw_text) → float:
- Cao hơn nếu tìm thấy đúng 1-2 số trong range hợp lệ
- Thấp hơn nếu quá nhiều số hoặc không số nào

=== METER API ===
Models:
- MeterReadingSubmit(unit_id, meter_type, billing_month: date, previous_reading?: float)
  + image file (multipart)
- MeterReadingApprove(approved_value?: float)  -- None = dùng ai_detected_value
- MeterReadingResponse(id, unit_id, meter_type, billing_month, previous_reading, current_reading, consumption, unit_price, photo_url, ai_detected_value, ai_confidence, is_approved, manual_override_value, submitted_at, reviewed_at)

Endpoints:
POST   /api/v1/meter-readings/upload              multipart/form-data: image + metadata
  1. Validate unit thuộc organization
  2. Upload ảnh → Supabase Storage 'meter-photos/{org_id}/{unit_id}/{YYYYMM}_{type}.jpg'
  3. Gọi OCR → lưu ai_detected_value, ai_confidence
  4. Tạo meter_reading record (is_approved=FALSE)
  5. Return MeterReadingResponse + warning nếu confidence thấp

GET    /api/v1/meter-readings                      filter: unit_id, meter_type, billing_month, is_approved
GET    /api/v1/meter-readings/{id}
PATCH  /api/v1/meter-readings/{id}/approve         role: owner, manager
  - Nếu body có approved_value → set manual_override_value, tính consumption = approved_value - previous_reading
  - Nếu không → dùng ai_detected_value, tính consumption
  - Set is_approved=TRUE, reviewed_by, reviewed_at
GET    /api/v1/units/{id}/meter-history            lịch sử 12 tháng gần nhất (cả điện và nước)

Validate:
- Không cho upload nếu đã có reading approved cho cùng unit+month+type
- current_reading phải > previous_reading (nếu có)
- Cảnh báo nếu consumption tăng > 50% so tháng trước (bất thường)
```

**Output:** 4 file

**Verify:**
```bash
# Upload ảnh đồng hồ
http --multipart POST localhost:8000/api/v1/meter-readings/upload \
  unit_id=<uuid> meter_type=electricity billing_month=2024-01-01 \
  image@test_meter.jpg \
  "Authorization: Bearer <token>"
# → có ai_detected_value, ai_confidence

# Approve
http PATCH localhost:8000/api/v1/meter-readings/<id>/approve \
  "Authorization: Bearer <token>"
# → is_approved=TRUE
```

---

### TASK-016B · Frontend — Meter Reading Pages
```
Vai trò   : Frontend
Phụ thuộc : TASK-015, TASK-016
Input     : TASK-016 API
```

**Prompt:**
```
Tạo UI cho đọc đồng hồ điện-nước.

File:
- src/api/meters.ts
- src/pages/meters/MeterReadingListPage.tsx
- src/pages/meters/MeterUploadPage.tsx
- src/components/meter/OCRResultCard.tsx
- src/components/meter/MeterHistoryChart.tsx
- src/types/meter.ts

MeterReadingListPage (/meters):
- Chọn tháng (month picker)
- Table: Nhà | Phòng | Loại | Số cũ | Số mới (AI) | Tiêu thụ | Trạng thái | Hành động
- Filter: property, meter_type, is_approved
- Badge: Chờ duyệt=vàng, Đã duyệt=xanh, Cần nhập tay=đỏ (khi AI confidence thấp)
- Button "Duyệt" inline trong bảng → modal confirm + cho phép sửa số

MeterUploadPage (/meters/upload hoặc /units/:id/meter):
- Chọn: Loại đồng hồ (Điện / Nước)
- Nhập số đầu kỳ (previous_reading)
- Upload ảnh: drag & drop hoặc chụp từ camera (trên mobile)
- Preview ảnh trước khi submit
- Loading: "Đang đọc số đồng hồ bằng AI..."
- OCRResultCard sau khi có kết quả:
  - Hiển thị ảnh bên trái, số AI đọc được bên phải (số to, nổi bật)
  - Confidence bar (màu xanh nếu cao, đỏ nếu thấp)
  - Input "Số thực tế" (pre-fill bằng AI value, user có thể sửa)
  - Button "Xác nhận và gửi"
  - Warning banner nếu confidence < 0.6: "Ảnh không đủ rõ, vui lòng kiểm tra lại"

MeterHistoryChart (cho UnitDetailPage):
- Line chart 2 đường (điện + nước) theo tháng (12 tháng)
- Dùng Recharts LineChart
- Hover tooltip: số tiêu thụ + chi phí

Trang cho Renter:
- Trong MyDashboard → Section "Đọc đồng hồ tháng này"
- Nếu chưa upload → button "Chụp ảnh đồng hồ"
- Nếu đã upload chờ duyệt → "Đang chờ xác nhận"
- Nếu đã duyệt → hiện số và chi phí
```

**Output:** Các file kể trên

**Verify:**
- Upload ảnh → loading → hiện kết quả OCR < 5 giây
- Confidence thấp → warning hiển thị
- History chart render đúng 12 tháng
- Mobile: camera capture hoạt động

---

## PHASE 7 — MAINTENANCE

---

### TASK-017 · Backend — Maintenance API
```
Vai trò   : Backend
Phụ thuộc : TASK-014
Input     : PRD Section 8 (Maintenance)
```

**Prompt:**
```
Tạo Maintenance API hỗ trợ 2 scope: property-level và unit-level.

File:
- app/models/maintenance.py
- app/routers/maintenance.py
- app/services/maintenance_service.py

Models:
- MaintenanceCreate(scope: Literal['property','unit'], property_id, unit_id?: UUID, title, description?, location_detail?, category, priority, photos?)
- MaintenanceAssign(assigned_to: UUID)
- MaintenanceResolve(resolution_notes, cost: int, resolution_photos?: list)
- MaintenanceRate(rating: int [1-5], feedback?: str)
- MaintenanceResponse(id, scope, property_name, unit_number?, submitter_name, submitter_role, title, category, priority, status, assigned_to_name?, cost, created_at, resolved_at?)

Endpoints:
GET    /api/v1/maintenance                         filter: scope, status, property_id, unit_id, category, priority
POST   /api/v1/maintenance
GET    /api/v1/maintenance/{id}                    kèm photos, resolution_photos, timeline events
PATCH  /api/v1/maintenance/{id}/assign             role: owner, manager
PATCH  /api/v1/maintenance/{id}/status             update status (in_progress) cho assigned staff
POST   /api/v1/maintenance/{id}/resolve            role: owner, manager, maintenance staff
POST   /api/v1/maintenance/{id}/rate               chỉ submitted_by là renter mới gọi được
GET    /api/v1/properties/{id}/maintenance         tất cả request (cả 2 scope) của 1 property
GET    /api/v1/units/{id}/maintenance-history

Validation (trong service):
def validate_create(body, current_user):
    if body.scope == 'unit':
        assert body.unit_id is not None  # 400
        if current_user.role == 'renter':
            # Kiểm tra user có active contract tại unit này không
            contract = get_active_contract(unit_id=body.unit_id, renter_id=current_user.profile_id)
            assert contract is not None  # 403
    if body.scope == 'property':
        assert current_user.role in ['owner', 'manager']  # 403
        assert body.location_detail is not None  # 400: bắt buộc cho scope=property
        body.unit_id = None

RLS cho API layer (thêm vào service, không chỉ dựa DB):
- Renter chỉ xem request scope='unit' mà submitted_by = mình
- Staff chỉ xem request assigned_to = mình hoặc request của property mình được phân công

Upload ảnh maintenance:
POST /api/v1/maintenance/{id}/photos    multipart, tối đa 5 ảnh, upload → Supabase 'maintenance-photos/'
```

**Output:** 3 file

**Verify:**
```bash
# Renter tạo yêu cầu riêng (unit-level)
http POST localhost:8000/api/v1/maintenance \
  scope=unit unit_id=<uuid> property_id=<uuid> \
  title="Tắc bồn cầu" category=plumbing priority=high \
  "Authorization: Bearer <renter_token>"
# → 201

# Manager tạo yêu cầu chung (property-level)
http POST localhost:8000/api/v1/maintenance \
  scope=property property_id=<uuid> \
  title="Đèn hành lang tầng 2 hỏng" location_detail="Hành lang tầng 2" \
  category=electrical priority=normal \
  "Authorization: Bearer <manager_token>"
# → 201

# Renter thử tạo scope=property → 403
```

---

### TASK-018 · Frontend — Maintenance Pages
```
Vai trò   : Frontend
Phụ thuộc : TASK-015, TASK-017
Input     : TASK-017 API, PRD Section 8.6 (UI Screens)
```

**Prompt:**
```
Tạo UI cho Bảo trì & Sửa chữa.

File:
- src/api/maintenance.ts
- src/pages/maintenance/MaintenanceListPage.tsx
- src/pages/maintenance/MaintenanceDetailPage.tsx
- src/pages/maintenance/MaintenanceFormPage.tsx
- src/components/maintenance/MaintenanceStatusTimeline.tsx
- src/components/maintenance/ScopeToggle.tsx
- src/types/maintenance.ts

MaintenanceListPage (/maintenance):
- 2 tab: "Khu vực chung" (scope=property) | "Theo phòng" (scope=unit)
- Table: Tiêu đề | Nhà/Phòng | Danh mục | Ưu tiên | Người xử lý | Trạng thái | Ngày tạo
- Filter: status, category, priority, property
- Badge priority: urgent=đỏ pulse, high=cam, normal=xanh, low=xám
- Badge status: open=xám, assigned=xanh dương, in_progress=vàng, resolved=xanh lá

MaintenanceFormPage (/maintenance/new):
- Bước 1 — Chọn loại:
  Radio với 2 card lớn:
  [🏠 Khu vực chung]  [🚪 Theo phòng]
  (Renter không thấy option Khu vực chung)

- Bước 2 — Chọn vị trí:
  Nếu "Khu vực chung": dropdown chọn Nhà + text field "Vị trí cụ thể" (bắt buộc)
  Nếu "Theo phòng": dropdown chọn Nhà → dropdown chọn Phòng
  (Renter: auto-fill phòng đang thuê, không cần chọn)

- Bước 3 — Thông tin sự cố:
  Tiêu đề, Mô tả, Danh mục (icon + text), Mức độ ưu tiên (4 lựa chọn dạng card)
  Upload ảnh (tối đa 5, preview grid)

- Xác nhận và gửi

MaintenanceDetailPage (/maintenance/:id):
- Header: tiêu đề, badge scope (Chung/Phòng), badge status
- Ảnh before (photo_url[]) dạng gallery grid
- MaintenanceStatusTimeline: timeline dọc, mỗi event là 1 điểm
  [Mở] → [Đã phân công] → [Đang xử lý] → [Đã giải quyết]
- Thông tin: người báo, nhân viên xử lý, ngày, chi phí
- Ảnh after (resolution_photos[])
- Nếu status=resolved và renter là người tạo → hiện rating form (5 sao + textarea)
- Action buttons (owner/manager): "Phân công" | "Giải quyết"

Assign Modal:
- Dropdown chọn nhân viên (maintenance/cleaner) được phân công vào property này
```

**Output:** Các file kể trên

**Verify:**
- Renter: form chỉ hiện scope "Theo phòng", không có "Khu vực chung"
- Manager: thấy cả 2 tab
- Timeline cập nhật khi status thay đổi
- Gallery ảnh trước/sau hiển thị đúng

---

## PHASE 8 — NOTIFICATIONS & AUTOMATION

---

### TASK-019 · Backend — Notification Service + Cron Jobs
```
Vai trò   : Backend
Phụ thuộc : TASK-017
Input     : PRD Section 10.2 (Notifications), Section 6.4 (Cron Jobs)
```

**Prompt:**
```
Tạo hệ thống Notification và Cron Jobs.

Cài thêm: pip install resend pywebpush apscheduler

File:
- app/services/notification_service.py
- app/services/email_service.py         (Resend integration)
- app/services/push_service.py          (Web Push)
- app/routers/notifications.py
- app/routers/push.py
- app/cron/scheduler.py                 (APScheduler setup)
- app/cron/jobs.py                      (tất cả job functions)

=== NOTIFICATION SERVICE ===
Hàm send_notification(recipient_id, type, title, body, data={}, channels=['in_app']):
  1. Lưu vào bảng notifications
  2. Nếu 'email' in channels → gọi email_service.send()
  3. Nếu 'push' in channels → gọi push_service.send()

=== EMAIL SERVICE (Resend) ===
Templates HTML cho:
- invoice_sent: "Hóa đơn tháng {month} - {amount}đ"
- payment_reminder: "Nhắc thanh toán: còn {days} ngày"
- payment_overdue: "⚠️ Quá hạn thanh toán {days} ngày"
- contract_expiring: "Hợp đồng sắp hết hạn: còn {days} ngày"
- maintenance_update: "Yêu cầu sửa chữa của bạn đã được cập nhật"
- task_assigned: "Bạn có task mới: {task_title}"

=== PUSH SERVICE (VAPID) ===
- Đọc VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_EMAIL từ env
- Hàm send_push(subscription_endpoint, p256dh, auth_key, title, body, data)
- Hàm send_push_to_user(profile_id, title, body, data): lấy tất cả subscriptions của user, send tới tất cả

=== NOTIFICATION API ===
GET  /api/v1/notifications              lịch sử 50 notifications gần nhất của user
PATCH /api/v1/notifications/mark-read  body: {ids: [uuid]} hoặc {all: true}

=== PUSH API ===
POST /api/v1/push/subscribe            body: {endpoint, p256dh, auth}
DELETE /api/v1/push/subscribe          body: {endpoint}

=== CRON JOBS (APScheduler) ===
Setup trong scheduler.py, start trong main.py startup event.

Jobs:
1. spawn_recurring_tasks     : mỗi ngày 5:00 SA → gọi task_scheduler.spawn_recurring_tasks(today)
2. auto_generate_invoices    : ngày 1 hàng tháng 6:00 SA → invoice_service.auto_generate_for_month()
3. send_monthly_invoices     : ngày 3 hàng tháng 8:00 SA → đổi draft→sent, send email+push cho renters
4. payment_reminder          : hàng ngày 8:00 SA → tìm invoices due trong 3 ngày, gửi reminder
5. overdue_check             : hàng ngày 9:00 SA → tìm invoices quá hạn 5 ngày và 10 ngày, gửi cảnh báo
6. contract_expiry_check     : hàng ngày 8:00 SA → tìm contracts hết hạn trong 30 và 7 ngày, gửi cảnh báo
7. expire_contracts          : hàng ngày 0:00 → set status='expired' cho contracts quá end_date

Khi task được assign → gọi send_notification(assigned_to, 'task_assigned', ...)
Khi maintenance resolved → gọi send_notification(submitted_by, 'maintenance_update', ...)
Tích hợp notification vào: contract_service, invoice_service, maintenance_service, task_service
```

**Output:** 8 file

**Verify:**
```bash
# Subscribe push
http POST localhost:8000/api/v1/push/subscribe \
  endpoint="https://fcm..." p256dh="..." auth="..." \
  "Authorization: Bearer <token>"

# Trigger cron thủ công để test
http POST localhost:8000/api/v1/tasks/trigger-scheduler
# → xem log "Sent notification to user X"

# Xem notifications
http GET localhost:8000/api/v1/notifications "Authorization: Bearer <token>"
```

---

### TASK-020 · Frontend — Notifications UI
```
Vai trò   : Frontend
Phụ thuộc : TASK-018, TASK-019
Input     : TASK-019 API
```

**Prompt:**
```
Tạo UI cho Thông báo và PWA Push Permission.

File:
- src/api/notifications.ts
- src/hooks/usePushNotification.ts
- src/components/layout/NotificationBell.tsx
- src/components/layout/NotificationDropdown.tsx
- src/pages/notifications/NotificationPage.tsx
- src/services/pwa.ts                            (service worker registration)
- public/sw.js                                   (service worker)

NotificationBell (trong AppLayout header):
- Icon chuông + badge số thông báo chưa đọc (đỏ)
- Click → NotificationDropdown hiện bên dưới
- Poll /api/v1/notifications mỗi 30s để cập nhật badge

NotificationDropdown:
- Danh sách 10 notifications gần nhất
- Mỗi item: icon (màu theo type) + title + body + thời gian tương đối ("5 phút trước")
- Chưa đọc: nền xanh nhạt
- Click item → navigate tới trang liên quan (dùng data.link)
- "Đánh dấu tất cả đã đọc" button
- "Xem tất cả" → /notifications

NotificationPage (/notifications):
- Danh sách đầy đủ, nhóm theo ngày: Hôm nay / Hôm qua / Tuần này / Cũ hơn
- Filter theo type

usePushNotification hook:
- requestPermission() → nếu granted → lấy VAPID public key → tạo PushSubscription → gọi POST /api/v1/push/subscribe
- isSupported: kiểm tra browser support
- permissionStatus: 'default' | 'granted' | 'denied'

PWA Push Permission flow:
- Hiện banner nhẹ ở đầu trang sau login: "Bật thông báo để không bỏ lỡ nhắc nhở thanh toán"
- Button "Bật thông báo" → gọi requestPermission()
- Nếu denied → ẩn banner, không hỏi lại
- Lưu trạng thái vào localStorage

public/sw.js (Service Worker):
- Cache app shell (index.html, main.js, main.css)
- Push event handler: hiển thị notification với icon, title, body
- Notification click → mở app + navigate tới link trong data
- Fetch event: network-first strategy
```

**Output:** Các file kể trên

**Verify:**
- Gửi notification từ backend → badge cập nhật
- Click notification → navigate đúng trang
- PWA push permission banner hiện sau login
- Bật thông báo → nhận push notification từ OS

---

## PHASE 9 — REPORTS & ANALYTICS

---

### TASK-021 · Backend — Reports API
```
Vai trò   : Backend
Phụ thuộc : TASK-019
Input     : PRD Section 9 (Analytics & Reports) — toàn bộ
```

**Prompt:**
```
Tạo Reports API với 3 nhóm báo cáo.

Cài thêm: pip install scipy numpy

File:
- app/routers/reports.py
- app/services/reports/finance_reports.py
- app/services/reports/staff_reports.py
- app/services/reports/property_kpi_reports.py

=== NHÓM 1: FINANCE ===
GET /api/v1/reports/revenue
  params: period (monthly|quarterly|yearly), year, property_id?
  → Aggregate từ invoices WHERE status IN ('paid','overdue')
  → Bao gồm cả forecast 3 tháng tới (linear regression nếu có ≥3 tháng data)

GET /api/v1/reports/occupancy
  params: property_id?, date?
  → vacant_units, occupied_units, occupancy_rate per property

GET /api/v1/reports/overdue
  → invoices quá hạn, grouped by property và renter

GET /api/v1/reports/maintenance-costs
  params: period, year, property_id?
  → SUM(cost) từ maintenance_requests WHERE status='resolved'

=== NHÓM 2: STAFF PERFORMANCE ===
GET /api/v1/reports/staff-performance
  params: period (weekly|monthly|yearly), start_date, end_date, staff_id?, property_id?
  → Với mỗi staff trong khoảng thời gian:
    - tasks: total_assigned, completed, in_progress, cancelled, completion_rate, avg_completion_hours, overdue_count
    - maintenance: total_requests_handled, avg_resolution_hours, avg_renter_rating, total_cost_managed
    - quality_score: tính theo công thức (completion 35% + timeliness 25% + rating 25% + speed 15%)

GET /api/v1/reports/staff-performance/{staff_id}/trend
  params: months=6
  → quality_score theo từng tháng trong N tháng gần nhất

GET /api/v1/reports/staff-performance/leaderboard
  params: period, property_id?
  → sorted by quality_score DESC, top 5 và bottom 5

=== NHÓM 3: PROPERTY KPIs ===
GET /api/v1/reports/property-kpis
  params: property_id, period (monthly|quarterly|yearly), year
  → Response đầy đủ như PRD Section 9.4:
    - occupancy: occupancy_rate, avg_vacancy_days, turnover_count
    - utility_efficiency: điện (total_kwh, cost, per_person, per_unit, mom_change), nước tương tự
    - maintenance: total_requests (cả 2 scope), cost, resolution_hours, incident_rate, top_categories, most_problematic_units
    - financial_efficiency: revenue, operating_cost, ratio, NOI
    - alerts: auto-generated dựa trên ngưỡng

GET /api/v1/reports/property-kpis/compare
  params: property_ids (comma-separated, max 5), period, year
  → array của KPI per property để vẽ radar chart

GET /api/v1/reports/property-kpis/{property_id}/units-breakdown
  params: period, year
  → KPI drill-down đến từng unit: sự cố, điện, nước, doanh thu

Viết unit tests cho:
- calculate_quality_score()
- generate_property_alerts()
- forecast_revenue()
```

**Output:** 4 file

**Verify:**
```bash
http GET "localhost:8000/api/v1/reports/revenue?period=monthly&year=2024" "Authorization: Bearer <token>"
http GET "localhost:8000/api/v1/reports/staff-performance?period=monthly&start_date=2024-01-01&end_date=2024-01-31" "Authorization: Bearer <token>"
http GET "localhost:8000/api/v1/reports/property-kpis?property_id=<uuid>&period=monthly&year=2024" "Authorization: Bearer <token>"
# Tất cả → 200, đúng cấu trúc JSON
```

---

### TASK-022 · Frontend — Reports Dashboard
```
Vai trò   : Frontend
Phụ thuộc : TASK-020, TASK-021
Input     : TASK-021 API, PRD Section 9 UI Charts
```

**Prompt:**
```
Tạo Dashboard báo cáo với charts.

Cài thêm: npm install recharts

File:
- src/api/reports.ts
- src/pages/reports/ReportsPage.tsx              (tab navigation cho 3 nhóm)
- src/pages/reports/FinanceReportPage.tsx
- src/pages/reports/StaffReportPage.tsx
- src/pages/reports/PropertyKPIPage.tsx
- src/components/reports/RevenueChart.tsx
- src/components/reports/StaffLeaderboard.tsx
- src/components/reports/StaffRadarChart.tsx
- src/components/reports/PropertyKPICards.tsx
- src/components/reports/PropertyHeatmap.tsx
- src/components/reports/PropertyCompareRadar.tsx
- src/types/report.ts

ReportsPage (/reports):
- 3 tab: 💰 Tài chính | 👥 Nhân viên | 🏠 Vận hành nhà

FinanceReportPage:
- Filter bar: Property (dropdown), Năm, Kỳ (Tháng/Quý/Năm)
- RevenueChart: BarChart grouped: doanh thu dự kiến (xanh) + thực thu (xanh đậm) + dự báo (dashed)
- Summary cards: Tổng DT | Tổng thu | Tỷ lệ thu | Công nợ
- Bảng công nợ chi tiết

StaffReportPage:
- Filter: Kỳ (Tuần/Tháng/Năm), Nhân viên (optional), Nhà (optional)
- StaffLeaderboard: Table sortable, cột: Tên | Hoàn thành | Đúng hạn | Đánh giá | Điểm chất lượng
  - Sparkline trend nhỏ trong cột Điểm
  - Top 3 có badge vàng/bạc/đồng
- Click vào nhân viên → StaffRadarChart (4 chiều: Hoàn thành / Đúng hạn / Chất lượng / Tốc độ)
- Line chart điểm chất lượng theo 6 tháng

PropertyKPIPage:
- Property selector (multi-select cho compare, single cho detail)
- PropertyKPICards: 4 card KPI với arrow so sánh kỳ trước (↑↓)
  - Tỷ lệ lấp đầy | Chi phí/đầu người | Sự cố/phòng | Tỷ lệ chi phí vận hành
- Alerts section: danh sách cảnh báo tự động, icon màu theo severity
- PropertyHeatmap: grid các phòng, màu theo số sự cố (xanh→đỏ gradient)
- "So sánh nhà" button → PropertyCompareRadar (radar chart 5 chiều, nhiều property)
- "Xem chi tiết theo phòng" → table breakdown từng phòng

PropertyCompareRadar:
- Dùng Recharts RadarChart
- Tối đa 5 property, mỗi property 1 màu
- 5 trục: Lấp đầy | Chi phí điện | Chi phí nước | Tần suất sự cố | Hiệu suất thu tiền
- Legend hiển thị tên từng nhà + màu

PropertyHeatmap:
- Grid giống UnitGrid (TASK-008) nhưng màu theo intensity
- Màu: xanh lá (0 sự cố) → vàng (1-2) → cam (3-4) → đỏ (5+)
- Hover: tooltip hiển thị số sự cố, chi phí, tên phòng
```

**Output:** Các file kể trên

**Verify:**
- Chart DT hiển thị đúng data, tooltip hover hiện đủ thông tin
- Radar chart so sánh 2+ nhà render không lỗi
- Heatmap màu theo đúng số sự cố
- Mobile: charts responsive, không overflow

---

## PHASE 10 — PWA POLISH & SECURITY HARDENING

---

### TASK-023 · Security Hardening
```
Vai trò   : Backend + Frontend
Phụ thuộc : TASK-022
Input     : PRD Section 10.4 (Security Requirements)
```

**Prompt:**
```
Rà soát và bổ sung các lớp bảo mật còn thiếu.

=== BACKEND ===
1. Rate limiting (slowapi):
   - Global: 100 req/min/IP
   - Auth endpoints: 10 req/min/IP (chống brute force)
   - OCR upload: 20 req/hour/user (tốn tiền API)

2. Input validation review:
   - Kiểm tra tất cả POST/PATCH endpoint có Pydantic model đủ constraints
   - Thêm max_length cho text fields: title≤200, description≤2000
   - Validate UUID format cho tất cả path params

3. File upload security:
   - Chỉ chấp nhận MIME types: image/jpeg, image/png, image/webp
   - Giới hạn size: 10MB cho ảnh đồng hồ/bảo trì, 20MB cho CCCD
   - Tạo random filename khi upload (không dùng tên gốc)

4. Webhook security:
   - POST /payments/webhook: verify HMAC-SHA256 signature từ header x-casso-signature
   - Implement timing-safe comparison

5. Logging (không log sensitive data):
   - Tạo middleware log mỗi request: method, path, status, duration (KHÔNG log body, KHÔNG log token)
   - Mask CCCD number trong log: "123***789"

6. Supabase RLS audit:
   - Viết test script: tạo 2 user khác organization, kiểm tra user A không đọc được data user B
   - Test với supabase-py dùng anon key (không service key)

=== FRONTEND ===
1. Token storage: dùng memory (Zustand) + httpOnly cookie cho refresh token (không localStorage cho access token)
2. XSS: sanitize bất kỳ HTML user-generated (dùng DOMPurify nếu cần render HTML)
3. Sensitive data: không log CCCD, số tài khoản ra console
4. Error messages: không expose stack trace hay internal error cho user
```

**Output:** Cập nhật các file hiện có + thêm `app/middleware/logging.py`, `app/middleware/security.py`

**Verify:**
- Gửi 15 login request liên tiếp → request thứ 11 bị 429
- Upload file .exe → bị reject 400
- User A token không đọc được /properties của User B → 404 hoặc 403 (không phải 200 với data)

---

### TASK-024 · PWA Final Configuration
```
Vai trò   : Frontend
Phụ thuộc : TASK-023
Input     : PRD Section 10.5 (PWA Configuration)
```

**Prompt:**
```
Hoàn thiện PWA configuration.

Cập nhật/tạo:
- public/manifest.json                 (đầy đủ)
- public/sw.js                         (hoàn thiện caching strategy)
- src/services/pwa.ts                  (cập nhật)
- vite.config.ts                       (PWA plugin hoàn chỉnh)

manifest.json đầy đủ:
{
  "name": "Quản Lý Nhà Trọ",
  "short_name": "NhàTrọ",
  "description": "Hệ thống quản lý nhà cho thuê",
  "start_url": "/",
  "display": "standalone",
  "orientation": "any",
  "theme_color": "#2563eb",
  "background_color": "#ffffff",
  "lang": "vi",
  "icons": [
    {"src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable"},
    {"src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}
  ],
  "screenshots": [
    {"src": "/screenshots/desktop.png", "sizes": "1280x720", "type": "image/png", "form_factor": "wide"},
    {"src": "/screenshots/mobile.png", "sizes": "390x844", "type": "image/png", "form_factor": "narrow"}
  ]
}

Service Worker strategies:
- App shell (index.html, JS, CSS): Cache First
- API calls (/api/v1/*): Network First, fallback to cache khi offline
- Images: Stale While Revalidate
- Offline fallback page: /offline.html (tạo file này với thông báo đẹp)

Thêm vào App.tsx:
- "Cài đặt app" banner (beforeinstallprompt event) với button "Cài đặt"
- Update available banner khi có SW mới: "Có phiên bản mới, tải lại?"

Tạo /offline.html:
- Page đơn giản, không cần React
- Thông báo: "Không có kết nối mạng. Vui lòng kiểm tra internet và thử lại."
- Button "Thử lại" → reload
- Hiện logo và màu brand
```

**Output:** Các file kể trên

**Verify:**
- Chrome → DevTools → Application → Manifest: không có lỗi
- Lighthouse PWA score ≥ 80
- Tắt network → app hiện offline page (không phải màn trắng)
- Mobile Chrome: "Thêm vào màn hình chính" → cài được, icon đúng

---

### TASK-025 · Deployment Configuration
```
Vai trò   : DevOps / Fullstack
Phụ thuộc : TASK-024
Input     : PRD Section 0 (Deploy: Vercel + Railway)
```

**Prompt:**
```
Tạo cấu hình deploy cho production.

=== FRONTEND → VERCEL ===
Tạo: frontend/vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{"source": "/(.*)", "destination": "/index.html"}],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [{"key": "Cache-Control", "value": "no-cache"}, {"key": "Service-Worker-Allowed", "value": "/"}]
    },
    {
      "source": "/(.*)",
      "headers": [
        {"key": "X-Content-Type-Options", "value": "nosniff"},
        {"key": "X-Frame-Options", "value": "DENY"},
        {"key": "Referrer-Policy", "value": "strict-origin-when-cross-origin"}
      ]
    }
  ]
}

Tạo: frontend/.env.production.example
VITE_API_URL=https://your-backend.railway.app
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_VAPID_PUBLIC_KEY=...

=== BACKEND → RAILWAY ===
Tạo: backend/Procfile
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT

Tạo: backend/railway.toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
healthcheckTimeout = 30

Cập nhật backend/app/main.py:
- CORS: thêm Vercel production domain vào allowed_origins
- Chạy cron scheduler chỉ khi ENVIRONMENT=production

Tạo: backend/.env.production.example (đầy đủ tất cả vars)

=== README ===
Cập nhật README.md với hướng dẫn:
1. Setup Supabase project → chạy migration files
2. Lấy API keys (Supabase, Google Vision, Resend, Casso, VietQR)
3. Deploy backend → Railway
4. Deploy frontend → Vercel
5. Set env vars trên cả 2 platform
6. Test health check
```

**Output:** Config files + README

**Verify:**
```bash
# Local production test
cd backend && ENVIRONMENT=production uvicorn app.main:app
cd frontend && npm run build && npx serve dist
# Truy cập localhost:3000 → app chạy đầy đủ
```

---

## 📊 TỔNG QUAN TASK MAP

```
PHASE 0 — Setup
  TASK-001 Backend Init ──────────────────────────────────┐
  TASK-002 Frontend Init ─────────────────────────────────┤
  TASK-003 DB Migration Phase 1 ──────────────────────────┤
  TASK-004 DB Migration Phase 2 ──────────────────────────┘

PHASE 1 — Auth
  TASK-005 Auth Backend ─────────────────────────────────┐
  TASK-006 Auth Frontend ────────────────────────────────┘

PHASE 2 — Property
  TASK-007 Property Backend ─────────────────────────────┐
  TASK-008 Property Frontend ────────────────────────────┘

PHASE 3 — Contracts
  TASK-009 Renter Backend ──────────────────────────────┐
  TASK-010 Contract Backend ────────────────────────────┤
  TASK-011 Contract+Renter Frontend ───────────────────┘

PHASE 4 — Staff
  TASK-012 Staff+Task Backend ─────────────────────────┐
  TASK-013 Staff+Task Frontend ────────────────────────┘

PHASE 5 — Finance
  TASK-014 Invoice+VietQR Backend ─────────────────────┐
  TASK-015 Invoice Frontend ───────────────────────────┘

PHASE 6 — Meters
  TASK-016  Meter+OCR Backend ─────────────────────────┐
  TASK-016B Meter Frontend ────────────────────────────┘

PHASE 7 — Maintenance
  TASK-017 Maintenance Backend ────────────────────────┐
  TASK-018 Maintenance Frontend ───────────────────────┘

PHASE 8 — Notifications
  TASK-019 Notification+Cron Backend ──────────────────┐
  TASK-020 Notification Frontend ──────────────────────┘

PHASE 9 — Reports
  TASK-021 Reports Backend ────────────────────────────┐
  TASK-022 Reports Frontend ───────────────────────────┘

PHASE 10 — Polish
  TASK-023 Security Hardening
  TASK-024 PWA Final Config
  TASK-025 Deployment
```

**Tổng: 26 tasks** · Thứ tự bắt buộc theo phase · Trong mỗi phase: Backend trước, Frontend sau.

---

## 📋 CHECKLIST TRƯỚC KHI GỌI AGENT

Trước mỗi lần gọi agent, bạn cần đính kèm:

```
✅ Nội dung TASK (copy prompt ở trên)
✅ Context Files được liệt kê (paste nội dung file vào prompt)
✅ PRD section liên quan (paste phần tương ứng từ PRD)
✅ Schema SQL của bảng liên quan (từ migration files)
✅ Kết quả Verify của TASK trước (confirm đã xong)
```

Sau khi agent trả về code:
```
✅ Chạy Verify commands
✅ Fix lỗi nếu có (prompt lại agent với lỗi cụ thể)
✅ Commit code với message: "feat: TASK-XXX - [tên task]"
✅ Sang TASK tiếp theo
```
