# Quan Ly Nha Tro - Rental Property Management SaaS

A full-stack Progressive Web App (PWA) for managing rental properties in Vietnam. Built for property owners and managers to handle tenants, contracts, invoicing, meter readings, maintenance requests, and more.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11, FastAPI, Supabase (PostgreSQL + Auth + Storage) |
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Zustand, TanStack Query |
| PWA | Service Worker, Web Push Notifications, Offline Support |
| Deployment | Backend on Railway, Frontend on Vercel |

## Project Structure

```
PWA-Quan-Ly-Nha-Tro/
  backend/
    app/
      main.py           # FastAPI app entry point
      config.py         # Settings from env vars
      routers/          # API route handlers
      services/         # Business logic
      models/           # Pydantic request/response models
      middleware/       # Logging, security headers
      utils/            # File validation, helpers
      cron/             # Scheduled jobs (invoice reminders, etc.)
    migrations/         # SQL migration files for Supabase
    requirements.txt    # Python dependencies
  frontend/
    src/
      pages/            # Route page components
      components/       # Reusable UI components
      api/              # API client (axios)
      stores/           # Zustand state management
      hooks/            # Custom React hooks
      types/            # TypeScript type definitions
    public/
      sw.js             # Service Worker
      manifest.json     # PWA manifest
      offline.html      # Offline fallback page
    vite.config.ts      # Vite + PWA config
```

## Features

- Multi-tenant organization management with role-based access (Owner, Manager, Staff)
- Property and unit management
- Renter profiles with CCCD/ID photo OCR scanning
- Contract lifecycle management
- Automated monthly invoice generation
- QR code bank transfer payments with webhook verification
- Electricity/water meter readings with photo OCR
- Maintenance request tracking
- Push notifications and email reminders
- Financial reports and analytics dashboards
- PWA with offline support and installability

## Local Development Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- A Supabase project (free tier works)

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/PWA-Quan-Ly-Nha-Tro.git
cd PWA-Quan-Ly-Nha-Tro
```

### 2. Backend Setup

```bash
cd backend

# Create environment file
cp .env.example .env
# Edit .env with your Supabase credentials and API keys

# Install dependencies
pip install -r requirements.txt

# Start the development server
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000` with interactive docs at `http://localhost:8000/docs`.

### 3. Frontend Setup

```bash
cd frontend

# Create environment file
cp .env.example .env
# Edit .env with your API URL and Supabase details

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:5173`.

### 4. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the migration files in `backend/migrations/` in order using the Supabase SQL editor
3. Enable Row Level Security (RLS) policies as defined in migrations
4. Copy the project URL and service role key to your backend `.env`
5. Copy the project URL and anon key to your frontend `.env`

## Environment Variables

### Backend

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | Yes |
| `JWT_SECRET` | Secret for JWT token verification | Yes |
| `ENVIRONMENT` | `development`, `production`, or `test` | Yes |
| `GOOGLE_VISION_API_KEY` | Google Cloud Vision API key (for OCR) | No |
| `RESEND_API_KEY` | Resend.com API key (for emails) | No |
| `VAPID_PRIVATE_KEY` | VAPID private key for push notifications | No |
| `VAPID_PUBLIC_KEY` | VAPID public key for push notifications | No |
| `VAPID_EMAIL` | Contact email for push notifications | No |
| `CASSO_API_KEY` | Casso.vn webhook API key | No |
| `BANK_BIN` | Bank BIN for QR code generation | No |
| `BANK_ACCOUNT_NUMBER` | Bank account number | No |
| `BANK_ACCOUNT_NAME` | Bank account holder name | No |

### Frontend

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API base URL | Yes |
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `VITE_VAPID_PUBLIC_KEY` | VAPID public key for push | No |

## Deployment

### Backend to Railway

1. Connect your GitHub repository to [Railway](https://railway.app)
2. Set the root directory to `backend/`
3. Add all required environment variables from the table above
4. Railway will auto-detect Python and use the `Procfile` for the start command
5. The health check endpoint is `GET /health`

### Frontend to Vercel

1. Connect your GitHub repository to [Vercel](https://vercel.com)
2. Set the root directory to `frontend/`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variables (`VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
6. The `vercel.json` handles SPA rewrites and security headers automatically

### Production Checklist

- [ ] Set strong `JWT_SECRET` (32+ random characters)
- [ ] Configure CORS in backend to allow only your Vercel domain
- [ ] Enable Supabase RLS policies on all tables
- [ ] Set up Casso webhook URL pointing to `/api/v1/payments/webhook`
- [ ] Generate VAPID keys for push notifications
- [ ] Configure custom domain on Vercel and Railway

## API Documentation

When the backend is running, visit `/docs` for the interactive Swagger UI documentation, or `/redoc` for the ReDoc version.

## License

Private - All rights reserved.
