# 📱 Build DawaOuk APK (Android)

## Prerequisites

1. **Node.js 18+** — [nodejs.org](https://nodejs.org)
2. **Android Studio** — [developer.android.com/studio](https://developer.android.com/studio)
3. **Java JDK 17** — installed with Android Studio

---

## Step-by-Step Guide

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/dawaOuk.git
cd dawaOuk
npm install
```

### 2. Remove SingleFile Plugin (Required for APK)

Edit `vite.config.ts` and change it to:

```ts
import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

### 3. Build the Web App

```bash
npm run build
```

### 4. Add Android Platform

```bash
npx cap add android
```

### 5. Sync Web Files to Android

```bash
npx cap sync android
```

### 6. Open in Android Studio

```bash
npx cap open android
```

### 7. Build APK in Android Studio

1. Wait for Gradle sync to finish
2. Go to **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### 8. Build Release APK (Signed)

1. Go to **Build → Generate Signed Bundle / APK**
2. Choose **APK**
3. Create a new keystore or use existing
4. Select **release** build type
5. Click **Finish**

---

## Quick Commands Reference

```bash
# Build web
npm run build

# Add Android (first time only)
npx cap add android

# Sync after code changes
npx cap sync android

# Open Android Studio
npx cap open android

# Run on connected device
npx cap run android
```

---

## Troubleshooting

### Camera not working on Android
The camera permissions are configured in `capacitor.config.ts`. 
If still not working, check `android/app/src/main/AndroidManifest.xml` has:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.INTERNET" />
```

### White screen on Android
Make sure `webDir` in `capacitor.config.ts` is set to `dist` and you ran `npm run build` before `npx cap sync`.

### API calls failing
The app uses HTTPS by default (`androidScheme: 'https'` in config). This is required for camera and API calls.

---

## App Info

| Field | Value |
|-------|-------|
| App ID | `com.dawaOuk.app` |
| App Name | DawaOuk |
| Min SDK | 22 (Android 5.1) |
| Target SDK | 34 (Android 14) |
| Web Dir | `dist` |
