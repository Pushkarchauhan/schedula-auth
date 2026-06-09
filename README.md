# 🏥 Schedula – Backend API

**NestJS · TypeScript · PostgreSQL · JWT**

---

## 📁 Project Structure

```
src/
├── auth/                          # Day 2 - JWT Auth
│   ├── dto/login.dto.ts
│   ├── guards/jwt-auth.guard.ts
│   ├── guards/roles.guard.ts
│   ├── strategies/jwt.strategy.ts
│   ├── roles.decorator.ts
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   └── auth.service.ts
├── users/                         # Day 2 - User entity
│   ├── dto/signup.dto.ts
│   ├── user.entity.ts
│   ├── users.module.ts
│   └── users.service.ts
├── doctor/                        # Day 3 - Doctor Onboarding
│   ├── dto/create-doctor-profile.dto.ts
│   ├── dto/update-doctor-profile.dto.ts
│   ├── doctor-profile.entity.ts
│   ├── doctor.controller.ts
│   ├── doctor.module.ts
│   └── doctor.service.ts
├── patient/                       # Day 3 - Patient Onboarding
│   ├── dto/create-patient-profile.dto.ts
│   ├── dto/update-patient-profile.dto.ts
│   ├── patient-profile.entity.ts
│   ├── patient.controller.ts
│   ├── patient.module.ts
│   └── patient.service.ts
├── database/                      # Day 3 - Migrations
│   ├── data-source.ts
│   └── migrations/
│       └── 1700000000000-CreateProfileTables.ts
├── app.module.ts
└── main.ts
```

---

## ⚙️ Setup

```bash
npm install
cp .env.example .env   # fill in your DB password and JWT secret
```

---

## 🗄️ Database Setup

```sql
-- In psql or pgAdmin:
CREATE DATABASE schedula;
```

Run migrations:
```bash
npm run migration:run
```

Start server:
```bash
npm run start:dev
```

---

## 📡 API Reference

### Auth (Public)

| Method | Route | Body |
|--------|-------|------|
| POST | `/api/auth/signup` | name, email, password, role |
| POST | `/api/auth/login` | email, password |
| GET  | `/api/auth/me` | — (Bearer token) |

---

### Doctor Onboarding 🩺 — DOCTOR only

| Method | Route | Description |
|--------|-------|-------------|
| POST  | `/doctor/profile` | Create profile (onboarding) |
| GET   | `/doctor/profile` | Get own profile |
| PATCH | `/doctor/profile` | Update profile |

**POST /doctor/profile body:**
```json
{
  "fullName": "Dr. Anjali Sharma",
  "specialization": "Cardiology",
  "experience": 10,
  "qualification": "MBBS, MD",
  "consultationFee": 500,
  "availabilityHours": "Mon-Fri 9AM-5PM",
  "profileDetails": "Senior cardiologist with 10 years experience."
}
```

---

### Patient Onboarding 🧑‍⚕️ — PATIENT only

| Method | Route | Description |
|--------|-------|-------------|
| POST  | `/patient/profile` | Create profile (onboarding) |
| GET   | `/patient/profile` | Get own profile |
| PATCH | `/patient/profile` | Update profile |

**POST /patient/profile body:**
```json
{
  "fullName": "Ravi Kumar",
  "age": 30,
  "gender": "MALE",
  "phone": "9876543210",
  "address": "123 Main St, Delhi",
  "bloodGroup": "O+",
  "allergies": "Penicillin",
  "medicalHistory": "Diabetes Type 2",
  "emergencyContact": "9876500000"
}
```

---

## 🧪 Postman Testing

Add header for all protected routes:
```
Authorization: Bearer <your_token>
```

| # | Test | Expected |
|---|------|----------|
| 1 | POST /api/auth/signup (DOCTOR) | 201 ✅ |
| 2 | POST /api/auth/signup (PATIENT) | 201 ✅ |
| 3 | POST /api/auth/login | 200 ✅ |
| 4 | POST /doctor/profile (Doctor token) | 201 ✅ |
| 5 | GET /doctor/profile (Doctor token) | 200 ✅ |
| 6 | PATCH /doctor/profile (Doctor token) | 200 ✅ |
| 7 | POST /doctor/profile again (duplicate) | 409 ❌ |
| 8 | POST /patient/profile (Patient token) | 201 ✅ |
| 9 | GET /patient/profile (Patient token) | 200 ✅ |
| 10 | PATCH /patient/profile (Patient token) | 200 ✅ |
| 11 | GET /doctor/profile (Patient token) | 403 ❌ |
| 12 | GET /patient/profile (Doctor token) | 403 ❌ |
| 13 | GET /doctor/profile (no token) | 401 ❌ |

---

## 🌿 Git Branch

```bash
git checkout -b feature/doctor-patient-onboarding
git add .
git commit -m "feat: add doctor and patient onboarding with profile APIs"
git push origin feature/doctor-patient-onboarding
```
