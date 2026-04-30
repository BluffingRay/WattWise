# ⚡ WattWise: IoT Energy Monitoring Dashboard

WattWise is a real-time energy monitoring and management system. It interfaces with **ESP32** hardware and **PZEM-004T** sensors to provide live data on voltage, current, and power consumption, helping users track their energy footprint through a modern web interface.

---

## 🚀 Live Demo

Check out the live application here:
https://wattwise-4ebde.web.app/

<img width="1901" height="905" alt="image" src="https://github.com/user-attachments/assets/0ccd7704-3ba0-4b7a-8314-0cdf169cffe1" />
<img width="1897" height="904" alt="image" src="https://github.com/user-attachments/assets/630b8044-2e3a-4dc5-a4db-5688b2640789" />
<img width="1919" height="902" alt="image" src="https://github.com/user-attachments/assets/2a38ba28-8c7d-462f-957d-82abd209992c" />

---

## ✨ Features

* **Real-time Monitoring:** Live tracking of voltage (V), current (A), and power (W).
* **IoT Integration:** Seamless data synchronization with ESP32 microcontrollers via Firebase.
* **Automated Deployment:** Integrated with GitHub Actions for CI/CD — every push to `main` automatically deploys to Firebase Hosting.
* **Secure Access:** Role-based authentication for administrators.
* **System Audit Logs:** Tracks system activity and power fluctuations.

---

## 🛠️ Tech Stack

* **Frontend:** Next.js (React)
* **Styling:** Tailwind CSS
* **Backend/Database:** Firebase (Realtime Database & Authentication)
* **Hardware:** ESP32, PZEM-004T Energy Sensor
* **Automation:** GitHub Actions (CI/CD)

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

* **Raymar Serondo** — Lead Developer
* **Rechie Arnado** — ESP & Board Designer
* **Ronie Gems Arpon** — UI Design


