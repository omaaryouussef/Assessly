# Assessly

Assessly is an academic assessment platform for managing courses, enrollments, and student assessments. Instructors can create and grade coding assessments in lockdown window prohibiting students from using any AI tools; students can join courses and access assessments, solving them in a built-in compiler having access to only course content.

## Tech stack

| Layer    | Technologies                               |
| -------- | ------------------------------------------ |
| Frontend | React 19, Vite, React Router, Font Awesome |
| Backend  | Node.js, Express 5, JWT, bcrypt            |
| Database | PostgreSQL                                 |

## Project structure

```
Assessly/
├── v1.0/
│   ├── web-client/          # React frontend (Vite)
│   │   ├── src/
│   │   │   ├── components/  # Layout, auth, navbar, sidebar
│   │   │   ├── pages/       # Route pages (instructor, student, auth)
│   │   │   └── router/      # React Router config + RoleGuard
│   │   └── contexts/        # CourseContext
│   └── server/              # Express API
│       ├── db/
│       │   ├── index.js     # PostgreSQL client
│       │   └── schema.sql   # Database schema reference
│       └── src/
│           ├── handlers/    # Route handlers
│           ├── middleware/  # authenticate, authorize (roles)
│           └── routes/      # users, courses, assessments
└── README.md
```

## Getting started

### 1. Database

Create a PostgreSQL database and apply the schema in `v1.0/server/db/schema.sql` (adjust as needed for your local setup).

### 2. Server environment

Create `v1.0/server/.env`:

```env
DB_USER=your_db_user
DB_HOST=localhost
DB_DATABASE=assessly
DB_PASSWORD=your_db_password
DB_PORT=5432
JWT_SECRET=your_jwt_secret
```

### 3. Web client environment

Create `v1.0/web-client/.env`:

```env
VITE_API_BASE_URL=http://localhost:3000
```

### 4. Install dependencies

```bash
cd v1.0/server && npm install
cd ../web-client && npm install
```
