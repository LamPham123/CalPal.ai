# Testing Checklist for Phase 1

## Before You Start

- [ ] Node.js 18+ installed
- [ ] Have a Google account
- [ ] Have or create a Convex account (free)

## Setup Steps

### 1. Google Cloud Console Setup

- [ ] Go to https://console.cloud.google.com/
- [ ] Create new project (or select existing)
- [ ] Enable Google Calendar API
- [ ] Create OAuth 2.0 credentials (Web application)
- [ ] Add redirect URI: `http://localhost:3000/api/auth/callback`
- [ ] Configure OAuth consent screen
- [ ] Add required scopes:
  - `https://www.googleapis.com/auth/calendar.events`
  - `https://www.googleapis.com/auth/calendar.readonly`
  - `https://www.googleapis.com/auth/calendar.freebusy`
- [ ] Add your email as test user (if in development mode)
- [ ] Copy Client ID and Client Secret

### 2. Install Dependencies

```bash
npm install
```

### 3. Initialize Convex

```bash
npx convex dev
```

This will:
- [ ] Open browser for authentication
- [ ] Create/select Convex project
- [ ] Generate `.env.local` with Convex credentials
- [ ] Start Convex dev server

**Keep this terminal running!**

### 4. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in:

- [ ] `GOOGLE_CLIENT_ID` (from Google Cloud Console)
- [ ] `GOOGLE_CLIENT_SECRET` (from Google Cloud Console)
- [ ] `GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback`
- [ ] `ENCRYPTION_KEY` (generate with: `openssl rand -base64 32`)
- [ ] `NEXTAUTH_SECRET` (generate with: `openssl rand -base64 32`)
- [ ] `NEXTAUTH_URL=http://localhost:3000`

### 5. Test Encryption

```bash
npm run test:encryption
```

Expected output:
```
✅ All encryption tests passed!
```

### 6. Start Development Server

Open a **new terminal** (keep Convex running):

```bash
npm run dev
```

## Testing the Auth Flow

### Step 1: Home Page
- [ ] Visit http://localhost:3000
- [ ] See "CalPal AI" heading
- [ ] See "Sign in with Google" button
- [ ] Click the button

### Step 2: Google OAuth
- [ ] Redirected to Google sign-in
- [ ] Select your Google account
- [ ] See permission request for calendar access
- [ ] Click "Allow" or "Continue"

### Step 3: Callback & Redirect
- [ ] Redirected back to localhost
- [ ] URL changes to `/dashboard`
- [ ] See "Welcome, [Your Name]"

### Step 4: Dashboard Verification
- [ ] See green success message: "Authentication successful!"
- [ ] See "This Week's Events" section
- [ ] See your actual calendar events (if you have any)
- [ ] See account information (email, timezone, calendar ID)
- [ ] See "Logout" link in header

### Step 5: Verify Data in Convex

- [ ] Go to https://dashboard.convex.dev
- [ ] Open your project
- [ ] Click "Data" tab
- [ ] Check `users` table:
  - [ ] See your user record
  - [ ] Has email, displayName, timezone, googleCalendarId
- [ ] Check `googleTokens` table:
  - [ ] See token record linked to your userId
  - [ ] accessToken and refreshToken are encrypted (long hex strings)
  - [ ] expiresAt is a timestamp
- [ ] Check `preferences` table:
  - [ ] See default preferences for your user
  - [ ] workHoursStart: "09:00"
  - [ ] defaultDurationMin: 60

### Step 6: Test Session Persistence

- [ ] Refresh the dashboard page
- [ ] Still logged in? ✅
- [ ] Still see your events? ✅

### Step 7: Test Logout

- [ ] Click "Logout" in header
- [ ] Redirected to home page
- [ ] Try visiting http://localhost:3000/dashboard
- [ ] Should redirect to home with error

### Step 8: Test Re-login

- [ ] Click "Sign in with Google" again
- [ ] Should authenticate faster (already authorized)
- [ ] Back to dashboard with events

## Common Issues & Fixes

### "Redirect URI mismatch"
**Fix:** Ensure Google Cloud Console redirect URI exactly matches:
```
http://localhost:3000/api/auth/callback
```
(no trailing slash)

### "Access blocked: This app's request is invalid"
**Fix:**
1. Add calendar scopes to OAuth consent screen
2. Add your email as test user
3. If stuck, recreate OAuth credentials

### "ENCRYPTION_KEY environment variable is not set"
**Fix:** Generate and add to `.env.local`:
```bash
openssl rand -base64 32
```

### No events showing but I have events in Google Calendar
**Fix:**
1. Check browser console for errors
2. Check terminal (Convex & Next.js) for errors
3. Verify token hasn't expired (should auto-refresh)
4. Check that events are in "this week"

### Convex errors
**Fix:** Make sure `npx convex dev` is running in separate terminal

### "Failed to load calendar events"
**Fix:**
1. Check Google Calendar API is enabled
2. Check scopes in OAuth consent screen
3. Revoke app access in Google account settings and re-authenticate

## Success Criteria

✅ **Phase 1 Complete** when all of these work:

1. Sign in with Google → redirects to dashboard
2. Dashboard shows your name and email
3. Dashboard lists your Google Calendar events
4. User and tokens stored in Convex (encrypted)
5. Logout works and clears session
6. Re-login works without issues
7. No console errors

## Next: Phase 2

Once Phase 1 works perfectly, you're ready for:
- Calendar CRUD UI (create, edit, delete events)
- Friends system
- Group scheduling
- And eventually... AI! 🤖

---

**Questions?** Check [SETUP.md](./SETUP.md) and [README.md](./README.md)
