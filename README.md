# CalPal AI - Smart Calendar Assistant

An AI-powered calendar management app that integrates with Google Calendar for intelligent scheduling and event management.

## 🎯 Current Status: Phase 1 Complete

✅ **Phase 1: Authentication & Token Storage** - COMPLETE

- Next.js 15 project with TypeScript and Tailwind CSS
- Convex backend with full schema for users, tokens, friends, and proposals
- Google OAuth 2.0 flow with secure token storage
- Encrypted token storage in Convex
- Automatic token refresh when expired
- Google Calendar API wrapper with all CRUD operations
- Protected routes and session management
- Dashboard showing weekly calendar events

## 🚀 Quick Start

### Prerequisites

1. **Node.js 18+** installed
2. **Google Cloud account** (free)
3. **Convex account** (free at https://convex.dev)

### Step 1: Clone and Install

```bash
cd calpalai
npm install
```

### Step 2: Set Up Google OAuth

Follow the detailed instructions in [SETUP.md](./SETUP.md) to:
1. Create a Google Cloud project
2. Enable Google Calendar API
3. Set up OAuth 2.0 credentials
4. Configure OAuth consent screen

### Step 3: Set Up Convex

```bash
# Initialize Convex (opens browser for auth)
npx convex dev
```

This will:
- Create a Convex project
- Generate `.env.local` with Convex credentials
- Start the Convex backend in dev mode

### Step 4: Configure Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
# Already filled by `npx convex dev`
CONVEX_DEPLOYMENT=your-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# From Google Cloud Console
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Generate with: openssl rand -base64 32
ENCRYPTION_KEY=your-encryption-key
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
```

### Step 5: Run the App

Open two terminal windows:

**Terminal 1: Convex Backend**
```bash
npx convex dev
```

**Terminal 2: Next.js Frontend**
```bash
npm run dev
```

Visit http://localhost:3000

## 🧪 Testing the Auth Flow

1. **Home Page**: Click "Sign in with Google"
2. **Google OAuth**: Authorize the app (grant calendar permissions)
3. **Callback**: You'll be redirected back to the app
4. **Dashboard**: See your calendar events for this week

### Verify It Works

✅ Check Convex dashboard (https://dashboard.convex.dev):
- `users` table: Should have your user record
- `googleTokens` table: Should have encrypted tokens
- `preferences` table: Should have default preferences

✅ Check browser cookies:
- `user_id` cookie should be set

✅ Check dashboard:
- Should show your name
- Should list events from your Google Calendar

## 📁 Project Structure

```
calpalai/
├── app/                      # Next.js App Router
│   ├── api/auth/            # OAuth routes
│   │   ├── google/          # Initiate OAuth
│   │   ├── callback/        # OAuth callback
│   │   └── logout/          # Logout
│   ├── dashboard/           # Protected dashboard page
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page
├── convex/                   # Convex backend
│   ├── schema.ts            # Database schema
│   ├── users.ts             # User functions
│   └── auth.ts              # Token management
├── lib/                      # Shared utilities
│   ├── google-auth.ts       # OAuth helpers
│   ├── google-calendar.ts   # Calendar API wrapper
│   ├── encryption.ts        # Token encryption
│   └── auth.ts              # Session helpers
└── components/               # React components (TBD)
```

## 🗄️ Convex Schema

### users
- email, displayName, timezone, googleCalendarId

### googleTokens
- userId, accessToken (encrypted), refreshToken (encrypted), expiresAt

### preferences
- workHours, defaultDuration, bufferMin, avoidWeekends

### friends
- userId, friendUserId, permission (busy-only/full-details), status

### proposals
- slots[], attendees[], status, expiresAt

### contacts
- displayName, email, googleCalendarId

## 🔐 Security Features

- ✅ Tokens encrypted at rest using AES-256-GCM
- ✅ Automatic token refresh before expiry
- ✅ HTTP-only session cookies
- ✅ Secure OAuth flow with PKCE support
- ✅ Environment variables for secrets

## 🛠️ Available API Methods

### GoogleCalendarClient

```typescript
const calendar = await GoogleCalendarClient.forUser(userId);

// List events
await calendar.listEvents(timeMin, timeMax);

// Create event
await calendar.createEvent({
  title: "Team Meeting",
  start: "2025-10-28T14:00:00-05:00",
  end: "2025-10-28T15:00:00-05:00",
  attendees: ["friend@example.com"],
  location: "Zoom",
});

// Update event
await calendar.updateEvent(eventId, { title: "Updated Title" });

// Delete event
await calendar.deleteEvent(eventId);

// Get free/busy info
await calendar.getFreeBusy(["email1@example.com"], timeMin, timeMax);
```

## 🎯 Next Steps (Phases 2-10)

- [ ] Phase 2: Calendar CRUD UI (forms, dialogs)
- [ ] Phase 3: Friends system (invite, accept, permissions)
- [ ] Phase 4: Free/busy & group scheduling
- [ ] Phase 5: Proposals system
- [ ] Phase 6: Trigger.dev jobs (daily digest)
- [ ] Phase 7: Polish & testing
- [ ] **Phase 8: AI Layer** (chat interface, natural language)

## 🐛 Troubleshooting

### "Redirect URI mismatch"
Make sure Google Cloud Console redirect URI exactly matches `.env.local`

### "Access blocked"
Add your email as a test user in Google OAuth consent screen

### "ENCRYPTION_KEY not set"
Generate: `openssl rand -base64 32` and add to `.env.local`

### Convex errors
Make sure `npx convex dev` is running in a separate terminal

## 📚 Documentation

- [Full Setup Guide](./SETUP.md)
- [Google Calendar API](https://developers.google.com/calendar/api/v3/reference)
- [Convex Docs](https://docs.convex.dev)
- [Next.js Docs](https://nextjs.org/docs)

## 📝 License

MIT
