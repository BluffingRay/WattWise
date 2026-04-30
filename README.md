# <img src="https://github.com/user-attachments/assets/56cdc89c-5f4a-4e42-b713-74915eb3a27c" width="32" alt="WattWise Logo" /> WattWise: Energy Monitoring Dashboard

WattWise is a real-time energy monitoring and management system that integrates **ESP32** hardware with **PZEM-004T** sensors to stream live electrical data. It provides an interactive web dashboard for tracking voltage, current, power consumption, and overall energy usage.

---

## 🚀 Live Demo

🔗 https://wattwise-4ebde.web.app/

> ⚠️ **Demo Note:** This deployment is connected to a single ESP32 device for demonstration purposes.

---

## 📊 Dashboard Preview

<img width="1901" src="https://github.com/user-attachments/assets/0ccd7704-3ba0-4b7a-8314-0cdf169cffe1" />
<img width="1897" src="https://github.com/user-attachments/assets/630b8044-2e3a-4dc5-a4db-5688b2640789" />
<img width="1919" src="https://github.com/user-attachments/assets/2a38ba28-8c7d-462f-957d-82abd209992c" />

---

## ✨ Features

* **Real-time Monitoring** — Live tracking of voltage (V), current (A), and power (W)
* **IoT Integration** — Seamless communication between ESP32 and Firebase Realtime Database
* **CI/CD Automation** — Auto-deployment via GitHub Actions on every push to `main`
* **Secure Access Control** — Role-based authentication using Firebase Auth
* **Audit Logging** — Tracks system activity and energy fluctuations

---

## 🛠️ Tech Stack

* **Frontend:** Next.js (React)
* **Styling:** Tailwind CSS
* **Backend:** Firebase (Realtime Database & Authentication)
* **Hardware:** ESP32, PZEM-004T
* **DevOps:** GitHub Actions + Firebase Hosting

---

## 📦 Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/BluffingRay/WattWise.git
cd wattwise-dashboard
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Create a `.env.local` file and add your Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_database_url
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
```

### 4. Run the development server

```bash
npm run dev
```

---

## 🤖 CI/CD Workflow

This project uses GitHub Actions. When code is pushed to the `main` branch:

* GitHub triggers a build process (`npm run build`)
* The production-ready files are automatically deployed to Firebase Hosting
* You can view the deployment status in the **Actions** tab of the repository

---

## 👥 Contributors

* **Raymar Serondo** — Full-stack development & embedded systems
* **Rechie Arnado** — Hardware design & system concept
* **Ronie Gems Arpon** — UI Design

---

Note: A demo, so only connected to one main ESP.
