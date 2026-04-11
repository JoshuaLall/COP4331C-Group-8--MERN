# OurPlace Mobile

This folder contains a separate Flutter app that talks to the existing Express API. The React website stays untouched.

## Why this lives separately

- `frontend/` remains the web experience.
- `mobile/` is the Android-focused Flutter client.
- Both clients reuse the same backend routes in `backend/`.

## Important Android note

The mobile app uses environment-based API selection:

- debug/default on Android emulator: `http://10.0.2.2:5000/api`
- release/default for deployed builds: `https://cop4331c.com/api`

That means local emulator builds keep working against a backend on your computer, while production builds point at the live site by default.

You can still override the API base explicitly for any environment:

```powershell
flutter run --dart-define=OURPLACE_API_BASE=http://YOUR_COMPUTER_IP:5000/api
```

## Repo-friendly structure

To keep the commit small, this folder is intentionally source-first:

- `lib/` contains the hand-written app code
- generated Flutter platform folders can be recreated locally

If `android/`, `web/`, or other generated folders are missing after checkout, regenerate them with Flutter.

## First-time setup

After installing Flutter locally, run this inside `mobile/`:

```powershell
flutter create . --platforms=android,web
flutter pub get
flutter run
```

`flutter create .` will generate the missing platform wrapper files around the app code already in `lib/`.

## Current mobile scope

- Sign in
- Create household account
- Join household with invite code
- View open, assigned, my, and recurring chores
- Claim chores
- Complete chores
- Create one-off chores
- Create recurring chores
- Edit profile basics
- Generate invite codes

## Suggested next steps

- Add email verification and password reset deep links for mobile
- Add chore editing and recurring template editing
- Add push notifications for due and claimed chores
- Move backend secrets into environment variables before shipping
