# 🏥 Schedula — Backend API

A production-ready healthcare appointment booking system built with NestJS, TypeScript, and PostgreSQL.

---

## 🚀 Live Server
```
https://schedula-api-dyox.onrender.com
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS (TypeScript) |
| Database | PostgreSQL + TypeORM |
| Auth | JWT (jsonwebtoken) |
| Password Hashing | bcryptjs |
| Deployment | Render |
| Cloud DB | Neon PostgreSQL |

---

## ⚙️ Project Setup

### Prerequisites
- Node.js v18+
- PostgreSQL running locally

### 1. Clone the repo
```bash
git clone https://github.com/Pushkarchauhan/schedula-auth.git
cd schedula-auth
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup environment variables
```bash
cp .env.example .env
```

### 4. Create database
```sql
CREATE DATABASE schedula;
```

### 5. Run the server
```bash
npm run start:dev
```

Server runs at: `http://localhost:3000`

---

## 🔑 Environment Variables

```env
# Server
PORT=3000

# Local PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=schedula

# Production (Neon PostgreSQL)
DATABASE_URL=postgresql://username:password@host/schedula?sslmode=require

# JWT
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d
```

---

## ✅ Features Implemented

### Day 1 — Project Setup
- NestJS project initialized
- PostgreSQL connected
- ER Diagram created

### Day 2 — Role Based Authentication
- Signup API (no token on signup)
- Login API (JWT token returned)
- DOCTOR and PATIENT roles
- JWT Auth Guard
- Roles Guard

### Day 3 — Doctor & Patient Onboarding
- Doctor profile creation (POST/GET/PATCH)
- Patient profile creation (POST/GET/PATCH)
- Role-based route protection

### Day 4 — Doctor Discovery
- List all doctors with pagination
- Search by name (partial match)
- Filter by specialization
- Filter by availability
- Get doctor by ID

### Day 5 — Deployment
- Deployed on Render
- Neon PostgreSQL connected
- Environment variables configured
- CORS enabled

### Day 6 — Doctor Availability
- Recurring weekly availability (POST/GET/PATCH/DELETE)
- Custom date override
- Overlap validation
- Availability by date

### Day 7 — Slot Generation
- Generate slots from availability
- Configurable slot duration
- Stream slots for patients
- Future slots only

### Day 8 — Appointment Booking
- Book appointments
- Patient appointment view
- Cancel appointments
- Doctor appointment view
- Duplicate booking prevention

### Day 9 — Advanced Scheduling
- STREAM scheduling (exact time slots with buffer)
- WAVE scheduling (token-based, max capacity)
- Token number assignment
- Capacity management

---

## 📡 API Reference

### Auth
```
POST /api/auth/signup     → Register (no token)
POST /api/auth/login      → Login (returns JWT)
GET  /api/auth/me         → Current user
```

### Doctor Onboarding
```
POST  /doctor/profile     → Create profile
GET   /doctor/profile     → Get profile
PATCH /doctor/profile     → Update profile
```

### Patient Onboarding
```
POST  /patient/profile    → Create profile
GET   /patient/profile    → Get profile
PATCH /patient/profile    → Update profile
```

### Doctor Discovery
```
GET /doctor               → List all doctors
GET /doctor?search=name   → Search by name
GET /doctor?specialization=cardiology → Filter
GET /doctor?page=1&limit=10 → Pagination
GET /doctor/:id           → Doctor details
```

### Availability
```
POST   /availability              → Create recurring slot
GET    /availability              → Get all slots
PATCH  /availability/:id          → Update slot
DELETE /availability/:id          → Delete slot
POST   /availability/override     → Custom date override
GET    /availability/date?date=   → Get by date
```

### Slots
```
POST /doctor/slots/generate          → Generate slots
GET  /doctor/slots?date=             → Doctor view slots
GET  /doctor/:id/slots?date=         → Patient view slots
```

### Appointments
```
POST  /appointment              → Book appointment
GET   /appointment/my           → Patient appointments
PATCH /appointment/:id/cancel   → Cancel appointment
GET   /doctor/appointments      → Doctor appointments
```

### Advanced Scheduling
```
POST /scheduling/config              → Set scheduling type
GET  /scheduling/config              → Get config
POST /scheduling/generate            → Generate schedule
GET  /scheduling/:id/slots?date=     → Stream slots (patient)
GET  /scheduling/:id/waves?date=     → Wave slots (patient)
POST /scheduling/wave/book           → Book wave slot
```

---

## 🌿 Branch Strategy

```
main
  └── feature/role-based-auth         (Day 2)
        └── feature/day3-onboarding   (Day 3)
              └── feature/day4-...    (Day 4)
                    └── ...
```

Each day = one feature branch = one PR

---

## 📮 API Collection
Import the Postman collection from the repo:
```
/docs/schedula-api-collection.json
```

Or use the live server URL directly in Postman.
