# PMSS – Prime Minister Special Scholarship Management System

A full-stack web-based scholarship management platform built for the **Prime Minister Special Scholarship Scheme (PMSS)**. Students can register, apply, upload documents, and track status in real time. Admins can review, verify, approve/reject applications, manage users, and generate reports.

---

## Tech Stack

| Layer     | Technology                                    |
|-----------|-----------------------------------------------|
| Frontend  | React 18 + Vite, Tailwind CSS, Redux Toolkit  |
| Backend   | Node.js 20, Express 4, MongoDB + Mongoose     |
| Auth      | JWT (access 1h + refresh 7d), bcryptjs        |
| Files     | Multer (PDF/image upload, 2MB limit)          |
| Email     | Nodemailer (Ethereal test / real SMTP)        |
| PDF       | PDFKit (approval letter generation)           |

---

## Project Structure

```
PMSSS/
├── backend/
│   ├── src/
│   │   ├── config/db.js
│   │   ├── middleware/auth.js
│   │   ├── models/User.js, Application.js
│   │   ├── routes/auth.js, student.js, documents.js, admin.js
│   │   ├── services/email.js, pdf.js
│   │   └── server.js
│   ├── uploads/           ← uploaded documents stored here
│   └── .env
└── frontend/
    └── src/
        ├── components/layout/Navbar.jsx, Sidebar.jsx, DashboardLayout.jsx
        ├── components/ui/StatusBadge, Toast, Modal, DataTable, ...
        ├── pages/HomePage, Login, Register, Dashboard, ...
        ├── services/api.js, authService.js, studentService.js, ...
        └── store/slices/authSlice, applicationSlice, toastSlice
```

---

## Setup Instructions

### Prerequisites

- Node.js 20+
- MongoDB (local) running on port 27017

### 1. Clone & Install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment Variables

Edit `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/pmss
JWT_SECRET=pmss_jwt_secret_key_2024_secure
JWT_REFRESH_SECRET=pmss_refresh_secret_key_2024_secure
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# Email (leave blank to use Ethereal test email)
EMAIL_HOST=smtp.ethereal.email
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=noreply@pmss.gov.in

FRONTEND_URL=http://localhost:5173
```

For deployments such as Render, set the same MongoDB connection string in the service environment as `MONGO_URI`, `MONGODB_URI`, or `DATABASE_URL`. Do not point the production service at `mongodb://127.0.0.1:27017`, because that will try to connect to the Render container itself.

If your frontend origin changes in production, set `CORS_ORIGINS` to a comma-separated list of allowed origins, for example `https://your-frontend.onrender.com,https://www.yoursite.com`.

### 3. Start Backend

```bash
cd backend
npm run dev
```

The backend will:
- Connect to MongoDB `pmss` database
- Automatically seed the admin account (see credentials below)
- Start on `http://localhost:5000`

### 4. Start Frontend

```bash
cd frontend
npm run dev
```

Frontend runs on `http://localhost:5173`

---

## Default Admin Credentials

```
Email:    admin@pmss.gov.in
Password: Admin@123
```

> Login at `/admin/login`

---

## API Endpoints

### Auth
| Method | Endpoint               | Description        |
|--------|------------------------|--------------------|
| POST   | /api/auth/register     | Student registration |
| POST   | /api/auth/login        | Login (student/admin)|
| POST   | /api/auth/logout       | Logout              |
| POST   | /api/auth/refresh-token| Refresh access token|

### Student (requires JWT)
| Method | Endpoint                          | Description         |
|--------|-----------------------------------|---------------------|
| GET    | /api/student/profile              | Get profile         |
| PUT    | /api/student/profile              | Update profile      |
| GET    | /api/student/application          | Get application     |
| POST   | /api/student/application          | Create application  |
| PUT    | /api/student/application/:id      | Update application  |
| GET    | /api/student/application/status   | Get status          |
| GET    | /api/student/application/letter   | Download PDF letter |

### Documents (requires JWT)
| Method | Endpoint                     | Description     |
|--------|------------------------------|-----------------|
| POST   | /api/documents/upload        | Upload documents |
| GET    | /api/documents/:applicationId| Get document URLs|

### Admin (requires admin JWT)
| Method | Endpoint                              | Description            |
|--------|---------------------------------------|------------------------|
| GET    | /api/admin/applications               | List + search + filter |
| GET    | /api/admin/applications/:id           | Application detail     |
| PATCH  | /api/admin/applications/:id/status    | Update status          |
| GET    | /api/admin/applications/:id/letter    | Generate PDF letter    |
| GET    | /api/admin/users                      | List students          |
| PATCH  | /api/admin/users/:id                  | Activate/deactivate    |
| GET    | /api/admin/stats                      | Dashboard stats        |
| GET    | /api/admin/reports                    | Reports (JSON/CSV)     |

---

## Application Status Flow

```
draft → submitted → under_review → verified → approved
                                            ↘ rejected
```

---

## Features

### Student Portal
- ✅ Secure registration with form validation
- ✅ JWT login with auto token refresh
- ✅ Multi-step scholarship application (5 steps)
- ✅ Save as draft & continue later
- ✅ Document upload (PDF only, 2MB limit; JPG/PNG for photo)
- ✅ Real-time application status tracking with timeline
- ✅ Download PDF approval letter
- ✅ Email notifications at every status change

### Admin Portal
- ✅ Separate admin login page
- ✅ Dashboard with 6 stats cards
- ✅ Applications list with search, filter, pagination
- ✅ Full application detail viewer with document links
- ✅ Approve / Reject / Request Revision workflow
- ✅ Internal remarks (not visible to student)
- ✅ Reports: by state, by category, monthly trend
- ✅ Export reports as CSV
- ✅ User management (activate/deactivate accounts)

---

## Email Notifications

Email is sent to students when:
1. Application submitted
2. Status changed to Under Review
3. Application Approved (with download link)
4. Application Rejected (with reason)
5. Revision Requested (with admin note)

> If `EMAIL_USER` / `EMAIL_PASS` are not set, the system automatically creates an Ethereal test account. Check the backend console for the preview URL.

---

## Document Upload Rules

- All documents: **PDF only**, max **2MB**
- Passport photo: **JPG/PNG**, max **2MB**
- Required documents: Aadhaar, Income Certificate, Marksheet, Photo
- Files stored in `backend/uploads/<studentId>/`

---

## License

Government of India – Educational Use Only
