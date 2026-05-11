# 💊 DawaOuk — AI Drug Scanner

A comprehensive AI-powered medicine identification app. Scan, search, translate, check interactions, and save drugs locally.

## ✨ Features

- **📷 AI Scanner** — Upload or capture a photo → Gemini AI identifies the drug instantly
- **🔍 FDA Search** — Search 1M+ drugs from the OpenFDA database
- **⌨️ Text Search** — Type any drug name → searches FDA + Gemini AI
- **🌐 Translate** — Translate drug results to 12 languages via Gemini AI
- **⚡ Drug Interactions** — Check if two drugs are safe to take together
- **💾 Auto-Save** — Drugs are saved locally, no AI call needed next time
- **❤️ Favorites** — Mark drugs as favorites for quick access
- **📋 History** — Track all your scans and searches
- **🤖 AI Chat** — Ask anything about drugs
- **🌙 Dark Mode** — Full dark theme support
- **📤 Share** — Share drug info with others
- **💵🇲🇦 Dual Pricing** — USD and MAD (Moroccan Dirham)

## 🚀 Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/dawaOuk.git
cd dawaOuk
npm install
npm run dev
```

## 🔑 Setup Gemini API Key (Free)

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Sign in with Google
3. Click **Get API Key** → **Create API Key**
4. Paste the key in the app (Scan → API Key)

> 100% free — no credit card needed

## 🛠️ Tech Stack

- **React 19** + **TypeScript**
- **Vite 7** (build tool)
- **Tailwind CSS 4** (styling)
- **Google Gemini 2.5 Flash** (AI analysis + translation)
- **OpenFDA API** (drug database)
- **localStorage** (drug cache + history)
- **Lucide React** (icons)

## 📁 Project Structure

```
src/
├── App.tsx                          # Main app with tabs
├── main.tsx                         # Entry point
├── index.css                        # Tailwind + dark mode
├── components/
│   ├── MedicineScanner.tsx          # Photo/camera/search scanner
│   ├── FDADrugCard.tsx              # FDA drug result card
│   ├── AIChat.tsx                   # AI chat interface
│   ├── DrugInteractionChecker.tsx   # Drug interaction check
│   └── TranslateBar.tsx             # Translation dropdown
├── services/
│   ├── geminiAI.ts                  # Gemini API (analyze + translate)
│   ├── drugApi.ts                   # OpenFDA API
│   └── drugCache.ts                 # Local storage DB + history
└── utils/
    └── cn.ts                        # Tailwind merge utility
```

## ⚠️ Disclaimer

This app is for **educational purposes only**. Always consult a doctor or pharmacist before using any medication. Drug prices are approximate estimates.

## 📄 License

MIT
