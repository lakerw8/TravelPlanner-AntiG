# iOS Mobile App Quickstart (Expo + Existing Backend)

## 1. Backend prep

1. In one terminal:

```bash
cd /Users/rixinpeng/Documents/GitHub/TravelPlanner-AntiG
npm run dev
```

2. Confirm backend is reachable at `http://127.0.0.1:3000`.

## 2. Mobile app prep

1. In a second terminal:

```bash
cd /Users/rixinpeng/Documents/GitHub/TravelPlanner-AntiG/mobile
cp .env.example .env
```

2. Fill `.env`:

```bash
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3000
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<optional>
```

3. Install dependencies:

```bash
npm install
```

## 3. Supabase OAuth setup

In Supabase Auth provider config, ensure redirect URL includes:

- `travelplanner://auth/callback`

## 4. Run iOS simulator

```bash
npm run ios
```

## 5. MVP verification checklist

1. Login with Google from mobile app.
2. Trips tab loads real trips from `/api/trips`.
3. Create a trip from the modal.
4. Open itinerary, add a place, verify it appears in timeline.
5. Open logistics, add flight and lodging, then delete them.
6. Confirm same records appear in the web app.
