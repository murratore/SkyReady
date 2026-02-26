# 🌟 SkyReady

> Weather conditions for astrophotography – optimized for Switzerland & the Alps

A Progressive Web App (PWA) that helps astrophotographers plan their observation sessions by providing an **Astro Score** (0-100) based on cloud cover, seeing, transparency, and moon phase.

![SkyReady Screenshot](public/icons/icon-192.png)

## ✨ Features

- **Astro Score** (0-100) with uncertainty from ensemble weather models
- **4 Photography Modes** with optimized score weights:
  - 🌌 General
  - 🔭 Deep Sky
  - 🪐 Planetary
  - 🌌 Milky Way
- **GPS Location** + text search for any location worldwide
- **Up to 5 Favorites** for quick location switching
- **4-Day Forecast** with hourly night chart
- **Detailed Parameters**: Cloud cover, seeing, transparency, humidity, wind, moon
- **Dark/Light Theme** with space-inspired aesthetics
- **PWA** with offline support and 3-hour data caching
- **German UI** (Swiss market focus)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📊 Data Sources

| API | Purpose | Cache |
|-----|---------|-------|
| [Open-Meteo](https://open-meteo.com) | Weather data, cloud cover, sun/moon times | 3 hours |
| [7Timer!](https://www.7timer.info) | Seeing & transparency (astro-specific) | 3 hours |
| [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api) | Location search | - |

## 🎯 Score Calculation

Weights vary by photography mode:

| Parameter | General | Deep Sky | Planetary | Milky Way |
|-----------|---------|----------|-----------|-----------|
| Clouds | 40% | 40% | 35% | 45% |
| Seeing | 20% | 10% | **40%** | 5% |
| Transparency | 20% | **30%** | 10% | 25% |
| Moon | 15% | 15% | 10% | **20%** |
| Humidity | 5% | 5% | 5% | 5% |

## 🛠️ Tech Stack

- **Vite** – Fast build tool
- **Vanilla JS** – No framework overhead (easy Android conversion)
- **Chart.js** – Hourly score visualization
- **PWA** – Offline support via service worker

## 📱 Android Conversion

This PWA is designed for easy conversion to a native Android app:

```bash
# Option 1: Capacitor
npx cap init
npx cap add android

# Option 2: PWABuilder
# Upload to https://pwabuilder.com
```

## 📁 Project Structure

```
src/
├── main.js              # Entry point
├── app.js               # Main orchestration
├── components/          # UI components
├── services/            # API & business logic
└── styles/              # CSS design system
```

## 📄 License

MIT

---

*Built with ❤️ for astrophotographers in Switzerland and the Alps*
