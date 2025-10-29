# Architecture Overview

## System Flow Diagram

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ 1. Click "Sign in with Google"
       │
       ▼
┌─────────────────────┐
│  /api/auth/google   │  ──────► Generates OAuth URL
└──────┬──────────────┘
       │
       │ 2. Redirect to Google
       │
       ▼
┌──────────────────────┐
│  Google OAuth Screen │
│  (consent & auth)    │
└──────┬───────────────┘
       │
       │ 3. User authorizes app
       │
       ▼
┌──────────────────────────┐
│  /api/auth/callback      │
│  • Receives code         │
│  • Exchanges for tokens  │
│  • Gets user info        │
│  • Encrypts tokens       │
└──────┬───────────────────┘
       │
       │ 4. Store in Convex
       │
       ▼
┌──────────────────────────┐
│      Convex DB           │
│  ┌─────────────────┐     │
│  │     users       │     │
│  ├─────────────────┤     │
│  │  googleTokens   │     │
│  │  (encrypted)    │     │
│  ├─────────────────┤     │
│  │  preferences    │     │
│  └─────────────────┘     │
└──────┬───────────────────┘
       │
       │ 5. Set session cookie & redirect
       │
       ▼
┌──────────────────────────┐
│      /dashboard          │
│  • Check session         │
│  • Get user from Convex  │
│  • Get tokens            │
│  • Decrypt tokens        │
└──────┬───────────────────┘
       │
       │ 6. Fetch calendar events
       │
       ▼
┌──────────────────────────┐
│ GoogleCalendarClient     │
│  • Check token expiry    │
│  • Refresh if needed     │
│  • Call Calendar API     │
└──────┬───────────────────┘
       │
       │ 7. Return events
       │
       ▼
┌──────────────────────────┐
│  Google Calendar API     │
│  • List events           │
│  • Return JSON           │
└──────────────────────────┘
```

## Component Breakdown

### Frontend (Next.js)

#### `/app/page.tsx`
- **Purpose:** Landing page with sign-in button
- **Auth:** Public
- **Features:** Error handling, redirects to OAuth

#### `/app/dashboard/page.tsx`
- **Purpose:** Main calendar view after login
- **Auth:** Protected (requires session)
- **Features:**
  - Displays user info
  - Shows weekly events from Google Calendar
  - Logout button

#### `/app/layout.tsx`
- **Purpose:** Root layout with Convex provider
- **Wraps:** All pages with ConvexClientProvider

### API Routes

#### `/app/api/auth/google/route.ts`
- **Method:** GET
- **Purpose:** Initiates OAuth flow
- **Flow:**
  1. Generate OAuth URL with scopes
  2. Redirect user to Google

#### `/app/api/auth/callback/route.ts`
- **Method:** GET
- **Purpose:** Handles OAuth callback
- **Flow:**
  1. Receive authorization code
  2. Exchange code for tokens
  3. Get user info from Google
  4. Encrypt tokens
  5. Store in Convex (user + tokens)
  6. Set session cookie
  7. Redirect to dashboard

#### `/app/api/auth/logout/route.ts`
- **Methods:** GET, POST
- **Purpose:** Clears session
- **Flow:**
  1. Delete session cookie
  2. Redirect to home

### Backend (Convex)

#### `convex/schema.ts`
- **Purpose:** Defines database schema
- **Tables:**
  - `users`: User profiles
  - `googleTokens`: Encrypted OAuth tokens
  - `preferences`: User settings
  - `friends`: Social connections
  - `proposals`: Scheduling suggestions
  - `contacts`: Quick name→email lookup

#### `convex/users.ts`
- **Mutations:**
  - `getOrCreateUser`: Find or create user record
- **Queries:**
  - `getUserByEmail`: Find user by email
  - `getCurrentUser`: Get user by ID

#### `convex/auth.ts`
- **Mutations:**
  - `storeTokens`: Save encrypted tokens
  - `updateAccessToken`: Refresh token
- **Queries:**
  - `getTokens`: Retrieve tokens for user

### Library Functions

#### `lib/google-auth.ts`
- **Purpose:** OAuth helpers
- **Functions:**
  - `getOAuth2Client()`: Create OAuth2 client
  - `getAuthorizationUrl()`: Generate auth URL
  - `getTokensFromCode()`: Exchange code for tokens
  - `getUserInfo()`: Get user profile from Google
  - `refreshAccessToken()`: Refresh expired token

#### `lib/google-calendar.ts`
- **Purpose:** Google Calendar API wrapper
- **Class:** `GoogleCalendarClient`
- **Methods:**
  - `forUser()`: Create client for user (decrypts tokens)
  - `ensureValidToken()`: Auto-refresh if expired
  - `listEvents()`: Get calendar events
  - `createEvent()`: Add event to calendar
  - `updateEvent()`: Modify existing event
  - `deleteEvent()`: Remove event
  - `getFreeBusy()`: Check availability
  - `getCalendarList()`: List user's calendars

#### `lib/encryption.ts`
- **Purpose:** Token encryption/decryption
- **Algorithm:** AES-256-GCM
- **Functions:**
  - `encrypt()`: Encrypt plaintext to hex string
  - `decrypt()`: Decrypt hex string to plaintext

#### `lib/auth.ts`
- **Purpose:** Session management
- **Functions:**
  - `getUserId()`: Get current user from cookie
  - `requireAuth()`: Enforce authentication (redirects if not logged in)
  - `logout()`: Clear session

## Data Flow Examples

### Creating an Event

```
User submits form
   ↓
Next.js API route receives data
   ↓
Call GoogleCalendarClient.createEvent()
   ↓
Client checks token expiry
   ↓
[If expired] Refresh token → Update Convex
   ↓
Call Google Calendar API with decrypted token
   ↓
Event created in Google Calendar
   ↓
Return event ID to frontend
```

### Token Refresh Flow

```
API call needs access token
   ↓
Check expiresAt timestamp
   ↓
Is token expired? YES
   ↓
Call refreshAccessToken() with refresh token
   ↓
Get new access token from Google
   ↓
Encrypt new token
   ↓
Update googleTokens table in Convex
   ↓
Use new token for API call
```

### Friend Free/Busy Check

```
User wants to schedule with friend
   ↓
Look up friend in friends table
   ↓
Get friend's userId
   ↓
Get friend's tokens from Convex
   ↓
Create GoogleCalendarClient for friend
   ↓
Call getFreeBusy() with friend's calendar ID
   ↓
Return busy time slots
   ↓
Compute intersection of free times
   ↓
Return available slots to user
```

## Security Layers

### 1. OAuth Flow
- Uses Google's OAuth 2.0 with PKCE
- User explicitly grants permissions
- Tokens only valid for granted scopes

### 2. Token Encryption
- Access & refresh tokens encrypted at rest
- AES-256-GCM (authenticated encryption)
- Encryption key in environment variable (never in code)

### 3. Session Management
- HTTP-only cookies (can't be accessed by JavaScript)
- Secure flag in production (HTTPS only)
- SameSite: lax (CSRF protection)
- 7-day expiry

### 4. Token Refresh
- Automatic refresh before expiry
- No user interaction needed
- New tokens immediately encrypted and stored

### 5. Protected Routes
- `requireAuth()` middleware checks session
- Redirects to login if not authenticated
- No calendar access without valid session

## Technology Stack

```
┌─────────────────────────────────────┐
│         Frontend (Browser)          │
│  • Next.js 15 (React 19)            │
│  • TypeScript                       │
│  • Tailwind CSS                     │
└─────────────────┬───────────────────┘
                  │
                  │ HTTP/HTTPS
                  │
┌─────────────────▼───────────────────┐
│       Next.js Server (Node.js)      │
│  • App Router (Pages & API routes)  │
│  • Server-side rendering            │
│  • API route handlers               │
└─────────────┬───────────┬───────────┘
              │           │
              │           │ Convex SDK
              │           │
              │           ▼
              │  ┌─────────────────┐
              │  │  Convex Backend │
              │  │  • Database     │
              │  │  • Queries      │
              │  │  • Mutations    │
              │  └─────────────────┘
              │
              │ googleapis npm package
              │
              ▼
┌──────────────────────────────────────┐
│       Google APIs                    │
│  • OAuth 2.0                         │
│  • Calendar API v3                   │
│  • User Info API                     │
└──────────────────────────────────────┘
```

## Environment Variables

```bash
# Convex
CONVEX_DEPLOYMENT           # Auto-generated by `npx convex dev`
NEXT_PUBLIC_CONVEX_URL      # Public Convex endpoint

# Google OAuth
GOOGLE_CLIENT_ID            # From Google Cloud Console
GOOGLE_CLIENT_SECRET        # From Google Cloud Console
GOOGLE_REDIRECT_URI         # Your callback URL

# Security
ENCRYPTION_KEY              # For token encryption (32 bytes)
NEXTAUTH_SECRET             # For session signing (32 bytes)
NEXTAUTH_URL                # Your app URL
```

## Deployment Considerations

### Development
- Run Convex locally: `npx convex dev`
- Run Next.js locally: `npm run dev`
- Use localhost redirect URI

### Production
- Deploy Next.js to Vercel
- Deploy Convex (automatic when you push)
- Update redirect URI in Google Cloud Console
- Set production environment variables
- Enable HTTPS (required for OAuth)

## Next Phase Additions

### Phase 2: Calendar CRUD
- New components: EventForm, EventDialog
- New API routes: `/api/events/[id]`
- Use existing GoogleCalendarClient methods

### Phase 3: Friends
- New UI: Friends list, invite form
- Use existing `friends` and `contacts` tables
- New Convex functions in `convex/friends.ts`

### Phase 4: Scheduling
- New file: `lib/scheduling.ts`
- Algorithm: Free/busy intersection
- Use existing `getFreeBusy()` method

### Phase 5: AI Layer
- Add: Vercel AI SDK
- New: Chat interface component
- Agent calls existing functions (no new backend needed!)
