# Travel Planner Mobile (iOS-first)

This app is an Expo + React Native client for the existing Next.js backend.

## 1. Prerequisites

- Node 20+
- Xcode (for iOS simulator)
- Expo CLI via local npm scripts

## 2. Setup

```bash
cd /Users/rixinpeng/Documents/GitHub/TravelPlanner-AntiG/mobile
cp .env.example .env
npm install
```

Populate `.env` values:

- `EXPO_PUBLIC_API_BASE_URL` -> local backend URL (`http://127.0.0.1:3000` for iOS simulator)
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (optional, depending on Supabase OAuth setup)

## 3. Run backend

In another terminal:

```bash
cd /Users/rixinpeng/Documents/GitHub/TravelPlanner-AntiG
npm run dev
```

## 4. Run iOS app

```bash
cd /Users/rixinpeng/Documents/GitHub/TravelPlanner-AntiG/mobile
npm run ios
```

## 5. OAuth redirect

Set Supabase Google OAuth redirect URL to include:

- `travelplanner://auth/callback`

## 6. Current MVP scope

- Welcome + Google login
- Trips list/create
- Trip itinerary view + add/remove item
- Trip logistics view + add/remove flight/lodging
- Saved/Profile placeholders
