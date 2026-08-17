# Frontend Auth & Setup Documentation

This document outlines the setup, packages installed, and credentials required to run the FCR-SCS system.

## 1. Required Packages Installed
The following packages were added to the `presentation_layer` to support authentication:
- `axios`: Used for creating a centralized HTTP client (`src/services/api.ts`) that automatically attaches JWT tokens to requests and handles global 401 Unauthorized errors.

*No additional state management libraries (like Redux or Zustand) were required, as React's native `Context API` (`src/context/AuthContext.tsx`) was sufficient for handling global auth state.*

## 2. Environment Variables
To ensure the backend connects properly and the frontend knows where to send API requests, verify your `.env` files.

### `presentation_layer/.env`
If your backend runs on a different port than `3030`, you can specify it here. Otherwise, the default is already `http://localhost:3030/api`.
```env
VITE_API_URL=http://localhost:3030/api
```

### `data_layer/database/.env` (or `business_logic_layer/.env`)
You **MUST** configure Gmail credentials for the password reset emails to work.
```env
# Database Connection
DATABASE_URL="postgresql://postgres:0193378431@localhost:5432/fcr_scs_db?schema=public"

# Gmail SMTP Configuration
SMTP_USER="your.gmail@gmail.com"
SMTP_PASS="your-16-char-app-password"
```

## 3. Admin Account Credentials
A seeder script (`data_layer/database/seed.ts`) was executed to insert an initial System Administrator account into the database. You can use these credentials to log in:

- **Email**: `admin@fcrscs.gov.my`
- **Password**: `password123`

## 4. How the Authentication Works
1. **Login**: User enters credentials on `/login`. The frontend calls `/api/users/login`.
2. **Session Storage**: On success, the backend returns a JWT token and user details. These are stored in the browser's `localStorage` (`auth_token` and `user_data`).
3. **Protected Routes**: React Router checks `AuthContext` before rendering `<ProtectedRoute>`. If no token exists, the user is redirected to `/login`.
4. **API Requests**: Every subsequent request made via `src/services/api.ts` automatically attaches the token: `Authorization: Bearer <token>`.
5. **Session Expiry**: If the backend rejects a token (HTTP 401), the Axios interceptor automatically clears `localStorage` and forces a redirect back to `/login`.
