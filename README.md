# CarbonCompass — Personal Carbon Footprint Awareness Platform

CarbonCompass is a modern, responsive, and secure web application designed to help individuals **Understand**, **Track**, and **Reduce** their personal carbon footprint through daily green habits and personalized insights.

---

## 🌟 Mapping Features to the Problem Statement

The platform is designed to address the problem statement directly using three core workflows:

### 1. UNDERSTAND: Baseline Footprint Calculator
- **Onboarding Questionnaire**: A multi-step wizard asks about transport habits (monthly km, mode of travel), dietary choices, monthly home electricity usage, and shopping levels.
- **Baseline Formulation**: Calculates the user's estimated baseline footprint in kilograms of CO2 equivalent per month (`kg CO2e/month`), showing a clean breakdown by category.
- **Initial Reward**: Completing the baseline automatically unlocks the **Baseline Pioneer** badge.

### 2. TRACK: Action Logger & Analytics Dashboard
- **Daily Action Logger**: Users log real-life green actions, including:
  - *Walking/Cycling instead of driving* (saves `0.20 kg/km`)
  - *Eating a plant-based meal* (saves `1.50 kg/meal`)
  - *Air-drying laundry* (saves `1.35 kg/load`)
  - *Lowering home heating* (saves `1.20 kg/day`)
  - *Recycling items* (saves `0.15 kg/item`)
- **Interactive Dashboard**: Displays cumulative carbon savings, estimated current footprint, and historical log pagination.
- **Visual Analytics**: Interactive, fully responsive SVG bar charts show baseline category distribution and compare the user's footprint against global, national, and target sustainable carbon levels.

### 3. REDUCE: Personalized Insights, Goals, and Gamification
- **Personalized Insights Engine**: Analyzes the highest emission category from the user's baseline and recommends 3–5 specific actionable tips, ranked by their carbon reduction impact.
- **Custom Goal Setting**: Users set monthly target reduction percentage challenges (e.g., "Reduce carbon footprint by 10%"). The system dynamically tracks actual logged savings within the goal's duration window.
- **Lightweight Gamification**:
  - **Streaks**: Tracks active days. Daily logging updates streaks, awarding badges at milestones (3-day, 7-day).
  - **Achievements & Badges**: Users unlock specific badges (e.g., *Plant Champion*, *Active Commuter*, *Carbon Clipper*, *Goal Overachiever*) based on their habits and cumulative savings.

---

## 🛡️ Production-Grade Security Measures

1. **Password Hashing**: Uses `bcrypt` to hash user passwords with 10 salt rounds before database storage. Plaintext passwords are never stored.
2. **JWT Session Management**: Sessions are secured using JWT tokens signed via `jose`. Tokens are delivered and stored in **Secure, HTTP-Only, SameSite=Strict cookies** to protect against Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF).
3. **CORS Protections**: Non-wildcard origin checks (restricts access to development localhost and designated production domains) are enforced on all API requests.
4. **Helmet Security Headers**: The custom middleware injects secure HTTP headers into all responses:
  - `Content-Security-Policy` (CSP)
  - `X-Frame-Options: DENY` (prevents Clickjacking)
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security` (HSTS enabled in production)
5. **API Rate Limiting**: Simple, memory-efficient sliding-window rate limiter limits IP requests to a maximum of 60 requests per minute to prevent Denial of Service (DoS) and brute force login attempts.
6. **Input Validation**: Enforces strict payload validation on all entry forms and API routes using `zod` schemas.

---

## 🧪 Testing Suite (100% Pass Rate)

CarbonCompass contains comprehensive test coverage executed using **Vitest** and **React Testing Library** under a JSDOM environment. 

### Tests Covered:
- **Carbon calculations unit tests**: Verifies baseline carbon breakdowns and action savings under standard conditions, boundary inputs (zero km traveled, zero electricity used), negative inputs (clipped to zero), extreme inputs (massive values), and invalid key fallbacks.
- **UI Component tests**: Asserts that `AuthPage` renders, manages tabs switching dynamically, checks validation boundaries, and throws input warning messages.
- **API Integration tests**: Direct API handler tests with mocked Prisma DB providers. Covers register validations, invalid credentials handling, paginated log retrieving, action posting (with carbon calculations and streak modifiers), and insights analysis (category weighting and tip ranking).

To run the test suite:
```bash
npm run test
```
To run test coverage:
```bash
npm run test:coverage
```

---

## ♿ Accessibility Compliance (WCAG 2.1 AA)

1. **Semantic HTML5 Elements**: Uses standard `<nav>`, `<main>`, `<section>`, `<header>`, `<footer>`, and `<h1-h6>` elements to form a clean, logical outline.
2. **Keyboard Navigability**: Interactive components use standard buttons and anchor tags with custom, highly visible focus outlines (`:focus-visible`) for keyboard-only navigation.
3. **Screen Reader Support**: All visual SVG charts have hidden, accessible standard HTML `<table>` elements as data fallbacks so screen readers can consume chart information.
4. **ARIA Roles & Labels**: Appropriate `role="radio"`, `aria-checked`, `role="tab"`, and `aria-label` tags are configured on tab lists, onboarding options, pagination navs, and charts.
5. **Reduced Motion**: Respects browser settings via CSS `@media (prefers-reduced-motion: reduce)` to disable transitions and animations for users with motion sensitivities.
6. **Color Contrast**: Tailored colors ensure a text-to-background contrast ratio of at least 4.5:1, matching WCAG requirements.

---

## 💻 Tech Stack & Architecture

- **Frontend**: React 19, Next.js 16 (App Router), Tailwind CSS v4, Lucide React Icons.
- **Backend**: Next.js API Routes (Serverless-ready).
- **Database Access**: Prisma Client v6.
- **Database Engine**: SQLite (default `dev.db` for self-contained, instant local setup). Relational schemas are fully ready to target PostgreSQL in production.

### Folder Structure
- `prisma/`: Database schema definitions and migrations.
- `src/app/`: App router page layouts and API handler endpoints.
- `src/context/`: Authentication provider.
- `src/lib/`: Prisma client instantiations.
- `src/types/`: Strict TypeScript interface models.
- `src/utils/`: Authentication and carbon calculation helpers.
- `src/test/`: Global testing setups.

---

## ☁️ Google Cloud Platform (GCP) Deployment

This project is configured to run on **Google Cloud Run** (Serverless Containers) under Project ID `carbon1-500115`.

### Prerequisites
1. Ensure your local `gcloud` CLI is logged in. Open your terminal and run:
   ```bash
   gcloud auth login
   ```
2. Follow the browser prompt to log into the Google Account associated with Project ID `carbon1-500115`.

### Deploying the Application
We have provided a deployment script [deploy-gcp.ps1](file:///c:/Users/VARSHA K/Desktop/carbon/deploy-gcp.ps1) in the root of the project. Run it in a PowerShell terminal:
```powershell
./deploy-gcp.ps1
```

Alternatively, you can run the deployment commands manually from any terminal:
```bash
# 1. Set active project
gcloud config set project carbon1-500115

# 2. Upload source, build container in Google Cloud Build, and deploy to Cloud Run
gcloud run deploy carbon-compass \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="JWT_SECRET=secure_production_secret_key_change_me_later"
```
Once complete, the CLI will output your live, secure web app URL hosted on Google Cloud Run.

