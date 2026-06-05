# 🏥 Schedula – Role-Based Auth API

**NestJS · TypeScript · PostgreSQL · JWT**

---

## 📁 Project Structure

```
schedula-nest/
├── src/
│   ├── auth/
│   │   ├── dto/
│   │   │   └── login.dto.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts     ← verifies JWT token
│   │   │   └── roles.guard.ts        ← checks user role
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts       ← Passport JWT strategy
│   │   ├── auth.controller.ts        ← /api/auth/* routes
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   └── roles.decorator.ts        ← @Roles() decorator
│   ├── users/
│   │   ├── dto/
│   │   │   └── signup.dto.ts
│   │   ├── doctor.controller.ts      ← /doctor/* routes (DOCTOR only)
│   │   ├── patient.controller.ts     ← /patient/* routes (PATIENT only)
│   │   ├── user.entity.ts            ← TypeORM entity + Role enum
│   │   ├── users.module.ts
│   │   └── users.service.ts
│   ├── app.module.ts
│   └── main.ts
├── .env.example
├── .gitignore
├── nest-cli.json
├── package.json
└── tsconfig.json
```

---

## ⚙️ Setup & Run

### 1. Prerequisites

- Node.js v18+
- PostgreSQL running locally (or use a cloud DB)

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=yourpassword
DB_NAME=schedula

JWT_SECRET=any_long_random_string_here
JWT_EXPIRES_IN=7d
```

### 4. Create the database

```sql
-- In psql or pgAdmin:
CREATE DATABASE schedula;
```

> TypeORM will auto-create the `users` table on first run (`synchronize: true`).

### 5. Run the server

```bash
# Development (hot reload)
npm run start:dev

# Production
npm run build && npm run start:prod
```

Server: `http://localhost:3000`

---

## 📡 API Reference

### Auth — Public Routes

#### `POST /api/auth/signup`

**Doctor:**
```json
{
  "name": "Dr. Anjali Sharma",
  "email": "anjali@hospital.com",
  "password": "password123",
  "role": "DOCTOR",
  "specialization": "Cardiology",
  "licenseNumber": "MCI-2024-001"
}
```

**Patient:**
```json
{
  "name": "Ravi Kumar",
  "email": "ravi@gmail.com",
  "password": "password123",
  "role": "PATIENT",
  "dateOfBirth": "1990-05-15",
  "bloodGroup": "O+"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account created successfully.",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "name": "...", "role": "DOCTOR" }
}
```

---

#### `POST /api/auth/login`

```json
{
  "email": "anjali@hospital.com",
  "password": "password123"
}
```

---

#### `GET /api/auth/me`

> 🔒 Bearer token required

---

### Doctor Routes — 🔒 DOCTOR only

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/doctor/profile` | Doctor's own profile |
| GET | `/doctor/patients` | List all patients |

---

### Patient Routes — 🔒 PATIENT only

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/patient/profile` | Patient's own profile |
| GET | `/patient/doctors` | List all doctors |

---

## 🧪 Testing Scenarios (Postman / Hoppscotch)

Add header for protected routes:
```
Authorization: Bearer <your_token_here>
```

| Test | Token | Route | Expected |
|------|-------|-------|----------|
| Doctor accesses own profile | Doctor token | GET /doctor/profile | ✅ 200 |
| Doctor tries patient route | Doctor token | GET /patient/profile | ❌ 403 |
| Patient accesses own profile | Patient token | GET /patient/profile | ✅ 200 |
| Patient tries doctor route | Patient token | GET /doctor/profile | ❌ 403 |
| No token | None | GET /doctor/profile | ❌ 401 |
| Invalid token | Garbage | GET /patient/profile | ❌ 401 |

---

## 🔐 Auth Flow

```
Client                             Server
  │                                  │
  ├──POST /api/auth/login──────────► │
  │                                  │  1. Find user by email
  │                                  │  2. bcrypt.compare(password)
  │                                  │  3. jwt.sign({ sub, email, role })
  │ ◄──{ token: "eyJ..." }──────────┤
  │                                  │
  ├──GET /doctor/profile────────────► │
  │  Authorization: Bearer eyJ...    │  1. JwtAuthGuard → verify token
  │                                  │  2. JwtStrategy → attach req.user
  │                                  │  3. RolesGuard → check role = DOCTOR
  │ ◄──200 OK / 403 Forbidden───────┤
```

---

## 🌿 Git Workflow

```bash
# Create feature branch
git checkout -b feature/role-based-auth

# Commit in small steps
git add src/users/user.entity.ts
git commit -m "feat: add User entity with DOCTOR/PATIENT role enum"

git add src/auth/guards/
git commit -m "feat: add JwtAuthGuard and RolesGuard"

git add src/users/doctor.controller.ts src/users/patient.controller.ts
git commit -m "feat: add role-restricted doctor and patient controllers"

# Push and open PR
git push origin feature/role-based-auth
```

---

## ✅ Deliverables Checklist

- [x] Signup API — `POST /api/auth/signup`
- [x] Login API — `POST /api/auth/login`
- [x] JWT Authentication
- [x] Role-Based Authorization (`DOCTOR` / `PATIENT`)
- [x] `GET /doctor/profile` — DOCTOR only
- [x] `GET /patient/profile` — PATIENT only
- [x] `GET /doctor/patients` — DOCTOR only
- [x] `GET /patient/doctors` — PATIENT only
- [ ] API tested (Postman/Hoppscotch)
- [ ] Loom video recorded
- [ ] PR raised
