# OurPlace Mobile

This folder contains the Flutter mobile client for OurPlace. It uses the same Express API as the web app in the rest of the repo.

## What someone new needs

Install these first:

- Flutter SDK
- Android Studio with an emulator, or a physical Android device
- Node.js and npm

Confirm Flutter is ready:

```powershell
flutter doctor
```

## Run the backend first

From the repo root:

```powershell
cd backend
npm install
npm run dev
```

The API should be available on `http://localhost:5000`.

## Run the mobile app

In a second terminal:

```powershell
cd mobile
flutter pub get
flutter run
```

## API base URL behavior

By default, the mobile app points to the deployed API:

- default: `https://cop4331c.com/api`

If you want the app to talk to a backend running on your own computer, override it when starting Flutter.

Android emulator:

```powershell
flutter run --dart-define=OURPLACE_API_BASE=http://10.0.2.2:5000/api
```

Physical device on the same Wi-Fi:

```powershell
flutter run --dart-define=OURPLACE_API_BASE=http://YOUR_COMPUTER_IP:5000/api
```

## Clean GitHub upload notes

These files and folders should stay out of Git:

- `.dart_tool/`
- `.idea/`
- `build/`
- `.flutter-plugins-dependencies`
- `android/.gradle/`
- `android/local.properties`
- local `.env` files

This repo now ignores those automatically.

## Useful commands

Get packages:

```powershell
flutter pub get
```

Run tests:

```powershell
flutter test
```

Build an APK:

```powershell
flutter build apk
```

## Current app features

- Register and log in
- Create a household
- Join a household with an invite code
- View chore lists
- Claim and complete chores
- Create chores and recurring chores
- Edit basic profile information
