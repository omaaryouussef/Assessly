# Assessly

Assessly is an academic assessment platform for managing courses, enrollments, and student assessments. Instructors create assessments with optional desktop proctoring; students take proctored exams in the **Assessly desktop app** when lockdown settings are enabled.

## Tech stack

| Layer    | Technologies                               |
| -------- | ------------------------------------------ |
| Frontend | React 19, Vite, React Router, Font Awesome |
| Desktop  | Electron 43, electron-builder              |
| Backend  | Node.js, Express 5, JWT, bcrypt            |
| Database | PostgreSQL                                 |

## Project structure

```
Assessly/
├── v1.0/
│   ├── desktop/             # Electron shell (lockdown, local mode)
│   ├── web-client/          # React frontend (Vite)
│   └── server/              # Express API
│       ├── db/
│       │   ├── schema.sql
│       │   └── migrations/
│       └── src/
└── README.md
```

## Getting started (web development)

### 1. Database

Create a PostgreSQL database and apply:

- `v1.0/server/db/schema.sql`

### 2. Server environment

Create `v1.0/server/.env`:

```env
DB_USER=your_db_user
DB_HOST=localhost
DB_DATABASE=assessly
DB_PASSWORD=your_db_password
DB_PORT=5432
JWT_SECRET=your_jwt_secret
CORS_ORIGINS=http://localhost:5173,app://assessly
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3011/api/users/auth/google/callback
CLIENT_URL=http://localhost:5173
SESSION_SECRET=your_session_secret
```

In Google Cloud Console, add `GOOGLE_CALLBACK_URL` as an **Authorized redirect URI** for the OAuth client.

For verification and instructor invite emails, also set:

```env
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password
```

The API defaults to port **3011**.

### Bootstrap first admin

Public registration always creates **STUDENT** accounts. Instructors join only via admin invite.

Create the first admin manually after applying the schema (hash a password with bcrypt first):

```sql
INSERT INTO users (name, auc_id, email, hashed_password, role, department, is_verified)
VALUES (
  'Site Admin',
  '000000001',
  'admin@university.edu',
  '<bcrypt_hash>',
  'ADMIN',
  'Administration',
  true
);
```

Generate a bcrypt hash (from `v1.0/server`):

```bash
node -e "import('bcrypt').then(async ({default:b})=>console.log(await b.hash('your-password',10)))"
```

Then sign in and open **Invites** to email instructor invite links.

If the database was created before instructor invites existed, also run:

- `v1.0/server/db/migrations/001_instructor_invites.sql`

### 3. Web client environment

Create `v1.0/web-client/.env`:

```env
VITE_API_BASE_URL=http://localhost:3011
```

### 4. Install dependencies

```bash
cd v1.0/server && npm install
cd ../web-client && npm install
cd ../desktop && npm install
```

### 5. Run the web stack

```bash
# terminal 1
cd v1.0/server && node src/index.js

# terminal 2
cd v1.0/web-client && npm run dev
```

## Desktop app

### Development

```bash
# terminal 1 — API
cd v1.0/server && node src/index.js

# terminal 2 — web UI for Electron
cd v1.0/web-client && npm run dev

# terminal 3 — Electron shell
cd v1.0/desktop && npm run dev
```

On first launch, configure the server URL (institution hosted API or `http://localhost:3011`).

### Local mode (small schools)

From **Account → Desktop connection** in the desktop app:

1. Click **Start local server** (bundled PostgreSQL + API on port 3011).
2. Students on the same LAN can point to `http://<instructor-ip>:3011`.
3. Coding assessments still need a remote [Piston](https://github.com/engineer-man/piston) instance configured on the API host.

### Production builds

```bash
cd v1.0/desktop
npm run build:win   # Windows installer (.exe)
npm run build:mac   # macOS disk image (.dmg)
```

**Code signing**

- Windows: set `CSC_LINK` and `CSC_KEY_PASSWORD` before building.
- macOS: set `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID` for notarization.

Installers are configured in `v1.0/desktop/electron-builder.yml`.

## Proctoring

When instructors disable window switching, clipboard, or screenshots—or enable network/process monitoring—students must use the **desktop app**. The app applies:

- Kiosk fullscreen mode
- Global shortcut blocking (Alt+Tab, Cmd+Tab, etc.)
- Focus reclamation if the student leaves the window
- Optional in-app network filtering and forbidden-process detection

Violations are logged to the server for instructor review on the feedback page.

**Limits on student-owned devices:** force-quit, a second device, or OS-level escape hatches (e.g. Ctrl+Alt+Delete → End Task) cannot be fully blocked without institution-managed kiosk policies.
