# CalPal AI Setup Guide

## Prerequisites
- Node.js 18+ installed
- Google Cloud account
- Convex account (free at https://convex.dev)

## Step 1: Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Google Calendar API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback` (for development)
     - Add your production URL later (e.g., `https://yourapp.com/api/auth/callback`)
   - Click "Create"
   - Copy your **Client ID** and **Client Secret**

5. Configure OAuth consent screen:
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "External" (unless you have Google Workspace)
   - Fill in app name, support email
   - Add scopes:
     - `https://www.googleapis.com/auth/calendar.events`
     - `https://www.googleapis.com/auth/calendar.readonly`
     - `https://www.googleapis.com/auth/calendar.freebusy`
   - Add test users (your email) during development
   - Save

## Step 2: Convex Setup

1. Install Convex CLI globally (optional):
   ```bash
   npm install -g convex
   ```

2. Login to Convex:
   ```bash
   npx convex dev
   ```
   - This will open a browser window to authenticate
   - Create a new project or select existing one
   - It will generate `.env.local` with Convex credentials

## Step 3: Environment Variables

1. Copy the example env file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in your credentials:
   ```env
   # Convex (already filled by `npx convex dev`)
   CONVEX_DEPLOYMENT=your-deployment
   NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

   # Google OAuth (from Google Cloud Console)
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-secret-here
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback

   # Generate encryption key:
   # Run: openssl rand -base64 32
   ENCRYPTION_KEY=your-generated-key

   # Generate NextAuth secret:
   # Run: openssl rand -base64 32
   NEXTAUTH_SECRET=your-generated-secret
   NEXTAUTH_URL=http://localhost:3000
   ```

## Step 4: Install Dependencies

```bash
npm install
```

## Step 5: Run Development Server

```bash
# Terminal 1: Run Convex backend
npx convex dev

# Terminal 2: Run Next.js
npm run dev
```

Visit http://localhost:3000

## Step 6: Test OAuth Flow

1. Click "Sign in with Google"
2. Authorize the app
3. You should be redirected to the dashboard
4. Check Convex dashboard to see your user and tokens stored

## Troubleshooting

### "Redirect URI mismatch"
- Make sure the redirect URI in Google Cloud Console exactly matches `GOOGLE_REDIRECT_URI` in `.env.local`

### "Access blocked: This app's request is invalid"
- Make sure you've added the Calendar API scopes to your OAuth consent screen
- Add your email as a test user if the app is in development mode

### "ENCRYPTION_KEY not set"
- Generate a key: `openssl rand -base64 32`
- Add it to `.env.local`

### Convex connection issues
- Make sure `npx convex dev` is running
- Check that `NEXT_PUBLIC_CONVEX_URL` matches your Convex deployment
