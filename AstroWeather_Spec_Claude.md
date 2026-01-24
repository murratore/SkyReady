# AstroWeather PWA - Spezifikation
**Version:** 1.0  
**Datum:** 24. Januar 2026  
**Optimiert für:** Schweiz / Alpenraum

---

## 1. Projektübersicht

### 1.1 Ziel
Progressive Web App für Astrofotografen zur Beurteilung von Wetterbedingungen mit Fokus auf Wolkendecke, Seeing, Transparenz und Mondphase.

### 1.2 Kernfunktionen
- GPS-basierte Standortbestimmung
- Aktuelle Bedingungen + 3-Tage-Vorhersage
- Astro-Score (0-100) mit Unsicherheits-Bereichen
- Detaillierte Parameter mit Erklärungen
- Bis zu 5 Favoriten-Standorte
- Offline-Funktionalität (PWA)
- Fotografie-Modi (Deep Sky, Planeten, Milchstraße, Allgemein)

### 1.3 Zielgruppe
- Hobby-Astrofotografen
- Wenig Meteorologie-Kenntnisse
- Benötigt einfache, verständliche Darstellung
- Hauptsächlich Schweiz / Alpenraum

---

## 2. Datenquellen

### 2.1 Open-Meteo Ensemble API (Primär)

**Zweck:** Wetterdaten mit Unsicherheits-Bereichen  
**Modelle:** ECMWF IFS + DWD ICON (optimal für Schweiz/Alpenraum)

**Endpoint:**
```
https://api.open-meteo.com/v1/ensemble
```

**Benötigte Parameter:**
```
latitude=47.37
longitude=8.54
hourly=cloud_cover,temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m
daily=sunrise,sunset,moonrise,moonset,moon_phase
models=ecmwf_ifs025,icon_seamless
forecast_days=3
timezone=auto
```

**Wichtige Daten aus Response:**
- `cloud_cover` - Wolkendecke in % (Array mit min/max/mean für Unsicherheit)
- `temperature_2m` - Temperatur in °C
- `relative_humidity_2m` - Luftfeuchtigkeit in %
- `wind_speed_10m` - Windgeschwindigkeit in km/h
- `wind_direction_10m` - Windrichtung in Grad
- `sunrise/sunset` - Sonnenzeiten
- `moonrise/moonset` - Mondzeiten
- `moon_phase` - Mondphase (0.0 = Neumond, 0.5 = Vollmond)

**Ensemble-Logik:**
- API liefert mehrere Werte pro Parameter (verschiedene Modelle)
- Berechne: Minimum, Maximum, Durchschnitt
- Zeige Unsicherheit: "Wolken 15% ±10%" (wenn Spanne groß)

**Cache-Dauer:** 3 Stunden

---

### 2.2 7Timer! ASTRO API (Sekundär)

**Zweck:** Spezialisierte Astro-Parameter (Seeing & Transparency)

**Endpoint:**
```
https://www.7timer.info/bin/astro.php
```

**Benötigte Parameter:**
```
lon=8.54
lat=47.37
ac=0 (auto altitude correction)
unit=metric
output=json
```

**Wichtige Daten aus Response:**
- `seeing` - Atmosphärische Turbulenz (1-8, höher = besser)
- `transparency` - Atmosphärische Durchsichtigkeit (1-8, höher = besser)
- `cloudcover` - Zusätzliche Wolkeninfo (1-9)
- `lifted_index` - Atmosphärische Stabilität
- `rh2m` - Luftfeuchtigkeit

**Konvertierung für UI:**
- Seeing: 1-8 → umrechnen auf 1-5 Skala (5 = perfekt)
- Transparency: 1-8 → umrechnen auf 1-5 Skala (5 = perfekt)
- Werte >5 = gut, 3-5 = mittel, <3 = schlecht

**Cache-Dauer:** 3 Stunden

---

## 3. Datenmodelle

### 3.1 Location
```typescript
{
  id: string,
  name: string,              // "Zürichsee"
  latitude: number,          // 47.3769
  longitude: number,         // 8.5417
  altitude: number,          // Optional, Meter über Meer
  isFavorite: boolean
}
```

### 3.2 AstroConditions
```typescript
{
  timestamp: string,         // ISO timestamp
  location: Location,
  
  // Score
  overallScore: number,      // 0-100
  scoreRating: string,       // 'perfect' | 'very-good' | 'good' | 'moderate' | 'poor'
  scoreUncertainty: number,  // ±X Punkte Unsicherheit
  
  // Wolken (mit Unsicherheit)
  cloudCover: number,        // Durchschnitt 0-100%
  cloudCoverMin: number,     // Minimum (bester Fall)
  cloudCoverMax: number,     // Maximum (schlechtester Fall)
  cloudCoverConfidence: string, // 'high' | 'medium' | 'low'
  
  // Astro-Parameter
  seeing: number,            // 1-5 (5 = perfekt)
  transparency: number,      // 1-5 (5 = perfekt)
  
  // Wetter
  humidity: number,          // 0-100%
  temperature: number,       // °C
  windSpeed: number,         // km/h
  windDirection: string,     // "N", "NE", "SW" etc.
  
  // Mond
  moonPhase: number,         // 0-1 (0 = Neumond)
  moonIllumination: number,  // 0-100%
  moonrise: string | null,   // ISO timestamp
  moonset: string | null,    // ISO timestamp
  isMoonUp: boolean,
  
  // Zeiten
  sunrise: string,           // ISO timestamp
  sunset: string,            // ISO timestamp
  nightStart: string,        // Astronomische Dämmerung
  nightEnd: string,          // Astronomische Dämmerung
  
  // Beste Zeit
  bestObservingStart: string,
  bestObservingEnd: string,
  
  // Warnungen
  warnings: Array<{
    type: string,            // 'fog-risk' | 'high-wind' | 'clouds' | 'moon-bright'
    severity: string,        // 'low' | 'medium' | 'high'
    message: string
  }>
}
```

### 3.3 Forecast
```typescript
{
  location: Location,
  days: Array<{
    date: string,            // "2026-01-24"
    overallScore: number,    // Durchschnitt der Nacht
    scoreRating: string,
    scoreUncertainty: number,
    hourlyConditions: AstroConditions[], // Pro Stunde
    bestHour: string         // ISO timestamp
  }>,
  fetchedAt: string          // Wann wurden Daten geholt
}
```

### 3.4 UserSettings
```typescript
{
  photographyMode: string,   // 'deep-sky' | 'planetary' | 'milky-way' | 'general'
  favoriteLocations: Location[],
  temperatureUnit: string,   // 'celsius' | 'fahrenheit'
  theme: string,             // 'light' | 'dark' | 'auto'
  showDetailedParams: boolean
}
```

---

## 4. Score-Berechnung

### 4.1 Allgemeine Gewichtung
```
Wolkendecke:    40%  (kritischster Faktor)
Seeing:         20%  
Transparency:   20%
Mondphase:      15%
Luftfeuchtigkeit: 5%
```

### 4.2 Modus-spezifische Gewichtungen

**Deep Sky:**
- Wolkendecke: 40%
- Seeing: 10% (weniger wichtig)
- Transparency: 30% (sehr wichtig!)
- Mond: 15%
- Feuchtigkeit: 5%

**Planeten:**
- Wolkendecke: 35%
- Seeing: 40% (kritisch!)
- Transparency: 10%
- Mond: 10% (weniger wichtig)
- Feuchtigkeit: 5%

**Milchstraße:**
- Wolkendecke: 45%
- Seeing: 5% (unwichtig)
- Transparency: 25%
- Mond: 20% (sehr wichtig!)
- Feuchtigkeit: 5%

### 4.3 Score-Kategorien
```
90-100: ⭐⭐⭐⭐⭐ "Perfekt"
70-89:  ⭐⭐⭐⭐   "Sehr gut"
50-69:  ⭐⭐⭐     "Brauchbar"
30-49:  ⭐⭐       "Schwierig"
0-29:   ⭐         "Ungünstig"
```

### 4.4 Unsicherheits-Berechnung
Wenn Ensemble-Daten große Streuung haben:
- Wolkenspanne >30% → "niedrige Konfidenz"
- Wolkenspanne 15-30% → "mittlere Konfidenz"
- Wolkenspanne <15% → "hohe Konfidenz"

Zeige im UI: "Score: 75 ±15" (bei niedriger Konfidenz)

### 4.5 Warnungen

**Beschlag-Risiko:**
- Luftfeuchtigkeit ≥85% UND Temperatur ≤5°C → Hoch
- Luftfeuchtigkeit ≥75% → Mittel

**Wind-Warnung:**
- Wind ≥30 km/h → Hoch (Stabilität gefährdet)
- Wind ≥20 km/h → Mittel (Gewichte empfohlen)

**Wolken-Warnung:**
- Wolkendecke ≥70% → Hoch (nicht möglich)
- Wolkendecke ≥40% → Mittel (Lücken nutzen)

**Mond-Warnung:**
- Mond sichtbar UND Beleuchtung ≥70% → Deep-Sky erschwert

---

## 5. User Interface

### 5.1 Layout-Struktur
```
┌─────────────────────────────────┐
│         Header                   │
│   Logo + Menü                    │
├─────────────────────────────────┤
│   Location Selector              │
│   📍 Standort + GPS + ⭐         │
├─────────────────────────────────┤
│                                  │
│   🌟 Astro Score Card           │
│      85 ±10                      │
│      ⭐⭐⭐⭐⭐                   │
│                                  │
│   Konfidenz: Mittel (±10)       │
│   🌙 Neumond                    │
│   ⏰ 23:00 - 03:00               │
│                                  │
├─────────────────────────────────┤
│   Forecast Timeline              │
│   [Jetzt][Tag1][Tag2][Tag3]     │
│                                  │
│   Stunden-Diagramm              │
├─────────────────────────────────┤
│   ▼ Details anzeigen            │
│                                  │
│   Parameter-Karten              │
│                                  │
└─────────────────────────────────┘
```

### 5.2 Location Selector
```
┌─────────────────────────────────┐
│ 📍 [Zürichsee]           ⭐  🔄│
│    47.37°N, 8.54°E              │
│    (GPS aktiv)                  │
└─────────────────────────────────┘

Funktionen:
- Klick → Favoriten-Liste öffnen
- GPS-Button → Aktuelle Position
- Stern → Als Favorit speichern
- Refresh → Daten neu laden
```

### 5.3 Score Card
```
┌─────────────────────────────────┐
│                                  │
│      🌟 ASTRO-SCORE             │
│                                  │
│         85 ±10                   │
│      ⭐⭐⭐⭐⭐                   │
│       SEHR GUT                   │
│                                  │
│   Konfidenz: Mittel              │
│   (Wettermodelle nicht einig)    │
│                                  │
│   🌙 Neumond (ideal!)           │
│   ⏰ Beste Zeit: 23:00 - 03:00  │
│                                  │
│   ⚠️ Leichter Wind (12 km/h)    │
│                                  │
└─────────────────────────────────┘

Farben nach Score:
- 90+: Grün
- 70-89: Hellgrün  
- 50-69: Gelb
- 30-49: Orange
- 0-29: Rot

Bei niedriger Konfidenz: Gestrichelte Umrandung
```

### 5.4 Forecast Timeline
```
┌───────────────────────────────────┐
│ [JETZT] [TAG 1] [TAG 2] [TAG 3]  │
├───────────────────────────────────┤
│                                   │
│   Liniendiagramm:                │
│   Score-Verlauf über die Nacht   │
│                                   │
│   100 ┤                           │
│    80 ┤     ╱‾‾╲                  │
│    60 ┤   ╱      ╲                │
│    40 ┤ ╱          ╲__            │
│     0 ┤──┬──┬──┬──┬──┬──          │
│      20h 22h 0h 2h 4h 6h          │
│                                   │
│   Markierungen:                  │
│   🌅 Sonnenuntergang             │
│   🌙 Mondauf-/untergang          │
│   ⭐ Beste Beobachtungszeit      │
│                                   │
└───────────────────────────────────┘

Bei unsicherer Vorhersage:
- Zeige Unsicherheitsband (grau schattiert)
```

### 5.5 Detaillierte Parameter
```
▼ Details anzeigen
┌───────────────────────────────────┐
│ ☁️ Wolken:     15% (10-25%)  🟢  │
│    Hohe Konfidenz                │
│    "Meist klar"                  │
│                                   │
│ 👁️ Seeing:     4/5           🟢  │
│    "Ruhige Atmosphäre"           │
│                                   │
│ 🔭 Transparenz: 5/5           🟢  │
│    "Hervorragende Sicht"         │
│                                   │
│ 💧 Luftfeuchte: 65%          🟡  │
│    "Normal, kein Beschlag"       │
│                                   │
│ 🌡️ Temperatur:  8°C              │
│                                   │
│ 💨 Wind:        12 km/h      🟢  │
│    aus Nordost                   │
│    "Leicht - OK"                 │
│                                   │
│ 🌙 Mond:        15% (↗)          │
│    Aufgang: 22:45                │
│    Untergang: 08:30              │
│    "Kaum störend"                │
│                                   │
│ 🌅 Sonnenuntergang: 17:23        │
│ 🌌 Nacht beginnt:   18:45        │
│ 🌄 Sonnenaufgang:   07:58        │
└───────────────────────────────────┘

Jeder Parameter:
- Icon + Wert
- Farb-Indikator (🟢🟡🔴)
- Laien-verständliche Erklärung
- Bei Wolken: Unsicherheitsbereich zeigen
```

### 5.6 Favoriten-Verwaltung
```
┌─────────────────────────────────┐
│   Favoriten verwalten       ✕   │
├─────────────────────────────────┤
│                                  │
│ 📍 Zuhause                  🗑️  │
│    Zürich, 8.54°E 47.37°N       │
│    Score jetzt: 75 🟢           │
│                                  │
│ 📍 Berner Oberland          🗑️  │
│    Grindelwald                  │
│    Score jetzt: 90 🟢           │
│                                  │
│ [+ Aktuellen Standort           │
│    hinzufügen]                  │
│                                  │
│ [+ Standort manuell             │
│    eingeben]                    │
│                                  │
│ Limit: 5 Standorte              │
└─────────────────────────────────┘
```

### 5.7 Einstellungen
```
┌─────────────────────────────────┐
│   Einstellungen             ✕   │
├─────────────────────────────────┤
│                                  │
│ Fotografie-Modus:               │
│ ○ Allgemein                     │
│ ● Deep Sky                      │
│ ○ Planeten                      │
│ ○ Milchstraße                  │
│                                  │
│ Theme:                          │
│ ● Auto (System)                 │
│ ○ Hell                          │
│ ○ Dunkel                        │
│                                  │
│ Einheiten:                      │
│ ● Celsius                       │
│ ○ Fahrenheit                    │
│                                  │
│ Details standardmäßig zeigen:   │
│ Toggle [ON/OFF]                 │
│                                  │
└─────────────────────────────────┘
```

### 5.8 Responsive Breakpoints
- **Mobile** (<768px): Single Column, Touch-optimiert
- **Tablet** (768-1024px): Two Column möglich
- **Desktop** (>1024px): Sidebar + Main Content

### 5.9 Farbschema

**Light Theme:**
- Hintergrund: Weiß / Hellgrau
- Text: Dunkelgrau / Schwarz
- Akzent: Blau

**Dark Theme:**
- Hintergrund: Dunkelgrau / Schwarz
- Text: Weiß / Hellgrau
- Akzent: Hellblau

---

## 6. User Flows

### 6.1 Erste Nutzung
1. App öffnen
2. Location Permission anfragen
   - Erlaubt → GPS-Standort abrufen
   - Abgelehnt → Manuelle Eingabe
3. Daten laden (mit Loading-Indikator)
4. Score anzeigen

### 6.2 Standard-Nutzung
1. App öffnen
2. Cached Standort & Daten zeigen (instant)
3. Im Hintergrund neue Daten laden
4. UI aktualisieren
5. User kann zwischen Tagen switchen
6. User kann Details expandieren

### 6.3 Standort wechseln
1. Klick auf Location Selector
2. Liste der Favoriten öffnet
3. Favorit auswählen
4. Neue Daten laden
5. UI aktualisiert

### 6.4 Favorit hinzufügen
1. Location Selector → Stern-Icon
2. Name eingeben (optional)
3. Als Favorit speichern (max. 5)
4. In Liste erscheint

---

## 7. Daten-Caching

### 7.1 Cache-Strategie
- **API-Daten:** 3 Stunden Cache
- **Favoriten:** LocalStorage (persistent)
- **Einstellungen:** LocalStorage (persistent)
- **Letzter Standort:** LocalStorage (persistent)

### 7.2 Offline-Verhalten
- App zeigt letzte gecachte Daten
- Banner: "Offline - Zeige gecachte Daten"
- Wenn Daten >3h alt: "⚠️ Daten nicht aktuell"
- Refresh-Button versucht Reload

---

## 8. PWA-Anforderungen

### 8.1 Manifest
- Name: "AstroWeather"
- Icons: 72px bis 512px (verschiedene Größen)
- Display: standalone
- Orientation: portrait
- Theme Color: Blau

### 8.2 Service Worker
- Cache statische Assets (HTML, CSS, JS, Icons)
- Cache API-Responses (3h)
- Offline-Fallback-Seite

### 8.3 Installation
- Install-Banner nach 1-2 Besuchen
- "Zum Homescreen hinzufügen" Prompt
- Funktioniert offline nach Installation

---

## 9. Schweiz-spezifische Features

### 9.1 Höhenanpassung
- Standorte über 1000m → Hinweis anzeigen
- "Tal-Nebel möglich, Berge oft klar"
- Altitude in Location speichern (optional)

### 9.2 Föhn-Detection (Optional Phase 2)
Föhn-Bedingungen erkennen:
- Starker Südwind + Druckgefälle
- Warnung: "Föhn - Klarer Himmel, aber turbulent (schlechtes Seeing)"

### 9.3 Multi-Location Vergleich (Optional Phase 2)
- Mehrere Favoriten gleichzeitig vergleichen
- "Wo ist es heute am besten?"
- Score-Vergleich nebeneinander

---

## 10. Zukünftige Features (Phase 2)

### 10.1 Benachrichtigungen
- Push Notifications bei Score >80
- Zeitfenster einstellbar (z.B. nur 20:00-6:00)
- "Heute Nacht perfekt für Deep Sky!"

### 10.2 Wolken-Radar
- Animation der Wolkenbewegung
- Zeige wo Wolken herkommen
- "In 2h wird's besser"

### 10.3 Historische Daten
- Statistiken: Wie oft war Standort gut?
- Beste Monate für Astrofotografie
- Langzeit-Trends

### 10.4 Community Features
- Standorte teilen
- Bewertungen: "War Score korrekt?"
- Foto-Upload bei guten Bedingungen

### 10.5 Aurora-Vorhersage
- KP-Index Integration
- Warnung bei Aurora-Chancen in Alpen
- (Selten, aber möglich bei starken Stürmen)

---

## 11. Technische Hinweise für Implementierung

### 11.1 Empfohlene Technologien
- **Framework:** React, Vue oder Svelte
- **Styling:** Tailwind CSS
- **Charts:** Chart.js oder Recharts
- **PWA:** Workbox für Service Worker
- **Hosting:** Vercel, Netlify oder GitHub Pages (HTTPS erforderlich)

### 11.2 Browser-APIs benötigt
- Geolocation API
- LocalStorage
- Service Worker
- Web App Manifest

### 11.3 Performance-Ziele
- Initial Load: <3 Sekunden
- Cached Load: <1 Sekunde
- Lighthouse Score: >90

---

## 12. Glossar

**Seeing:** Atmosphärische Ruhe - wie stark die Luft "zittert". Wichtig für Planeten-Details.

**Transparency:** Atmosphärische Durchsichtigkeit - wie weit man ins Universum schauen kann. Wichtig für lichtschwache Objekte.

**Cloudcover:** Wolkendecke in Prozent. 0% = komplett klar.

**Moon Phase:** 0.0 = Neumond (perfekt), 0.5 = Vollmond (schlecht für Deep Sky).

**Ensemble:** Kombination mehrerer Wettermodelle für bessere Vorhersage und Unsicherheits-Angaben.

**Astronomische Dämmerung:** Sonne >18° unter Horizont. Erst dann ist Himmel wirklich dunkel.

**Föhn:** Warmer Fallwind in den Alpen. Bringt klaren Himmel aber schlechtes Seeing.

---

**Ende des Spezifikationsdokuments**

Für Fragen oder Anpassungen, siehe Kontakt im Repository.