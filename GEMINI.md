# RT Tools - Project Overview

A collection of static web-based tools for Radiographic Testing (RT) professionals, designed to perform technical calculations and provide reference information on-site.

## Project Type
**Code Project:** Static HTML/CSS/JS web application (Progressive Web App).

## Main Technologies
- **Frontend:** Vanilla HTML5, CSS3, and JavaScript.
- **Icons:** [FontAwesome 6](https://fontawesome.com/).
- **Fonts:** [Google Fonts](https://fonts.google.com/) (Roboto Condensed, Handlee).
- **Offline Capabilities:** Service Worker implementation for PWA support (Stale-While-Revalidate strategy).
- **Data Storage:** Flat CSV files (`bronnen.csv`) for source isotope data.

## Architecture
- **Multi-page Application:** Each tool is a standalone `.html` file (e.g., `stralingstijd.html`, `verval2.html`).
- **Central Hub:** `index.html` serves as the main dashboard and features a dynamic search bar that aggregates tools from multiple sub-pages.
- **Shared Logic:**
  - `script.js`: Common UI logic (e.g., modal management).
  - `styles.css`: Global design system (dark theme with yellow highlights).
  - `service-worker.js`: Handles caching and offline availability.

## Key Files
- `index.html`: Main landing page and search interface.
- `manifest.json`: Web app manifest for PWA installation.
- `service-worker.js`: PWA caching logic.
- `bronnen.csv`: Database of radioactive sources (Name, Type, Activity, Date, Size).
- `styles.css`: Core styling and variables.
- `script.js`: Global helper functions.

## Development Conventions
- **Language:** The user interface and documentation are in **Dutch** (`nl`).
- **Styling:**
  - Uses CSS variables for colors (defined in `:root`).
  - Dark background (`#4a4a4a`) with high-contrast yellow elements (`#F5DF4D`).
  - Many tools contain page-specific `<style>` blocks for specialized layouts.
- **Tool Structure:**
  - Most tools include a "home" icon (FontAwesome `fa-home`) linking back to `index.html`.
  - Calculations are typically performed client-side using vanilla JS triggered by `oninput` or `onchange` events.
- **Data Loading:** Calculation tools often fetch `bronnen.csv` to populate source selections and perform decay calculations based on the stored initial activity and date.

## Usage & Deployment
- **Deployment:** Can be hosted as a static site (e.g., GitHub Pages, Netlify).
- **Installation:** Users can "Install" the app via their browser to use it offline.
- **Offline Support:** The `service-worker.js` caches all critical assets listed in `FILES_TO_CACHE`.
