"use client";

import { useEffect, useRef, useState } from "react";
import { ref, onValue, set, get } from "firebase/database";
import { database, auth } from "../lib/firebase";
import { MeterData, Relays } from "../types/wattwise";
import { signOut, onAuthStateChanged } from "firebase/auth";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import Live from "./components/Live";
import HistoryTab from "./components/HistoryTab";
import ControlTab from "./components/ControlTab";
import LogsTab from "./components/LogsTab";
import { logUserAction } from "../lib/logger";

type Baselines = {
  main: number;
  acu: number;
  co: number;
};

const globalAlertLock: Record<string, string> = { 
  main: "normal", 
  acu: "normal", 
  co: "normal" 
};

type AppTab = "live" | "history" | "control" | "logs" | "settings";
type DeviceId = "main" | "acu" | "co";

type AlertStatus =
  | "normal"
  | "stale"
  | "relay-on-zero-voltage"
  | "critical-voltage"
  | "warning-voltage";

type AlertInfo = {
  status: AlertStatus;
  type: "critical" | "warning" | "system";
  message: string;
};

type AlertStateItem = {
  status: AlertStatus;
  type: "critical" | "warning" | "system";
  message: string;
  updatedAt: number;
};

const STALE_LIMIT_MS = 30000;

function getDeviceAlertInfo({
  name,
  data,
  relayState,
  isStale,
}: {
  name: string;
  data: MeterData | null;
  relayState: number | undefined;
  isStale: boolean;
}): AlertInfo {
  if (!data) {
    return {
      status: "normal",
      type: "system",
      message: `${name} has no meter data.`,
    };
  }
  const voltage = Number(data.v ?? 0);
  const isRelayOn = relayState === undefined ? true : relayState === 1;
  
  if (isStale) {
    return {
      status: "stale",
      type: "critical",
      message: `${name} data is stale. No fresh meter update received.`,
    };
  }
  if (isRelayOn && voltage < 1) {
    return {
      status: "relay-on-zero-voltage",
      type: "critical",
      message: `${name} relay is ON, but voltage is 0V. Possible sensor, wiring, supply, or meter issue.`,
    };
  }
  if (voltage < 207 || voltage > 253) {
    return {
      status: "critical-voltage",
      type: "critical",
      message: `${name} voltage is CRITICAL: ${voltage.toFixed(1)}V.`,
    };
  }
  if (voltage < 210 || voltage > 240) {
    return {
      status: "warning-voltage",
      type: "warning",
      message: `${name} voltage warning: ${voltage.toFixed(1)}V.`,
    };
  }
  return {
    status: "normal",
    type: "system",
    message: `${name} returned to normal condition.`,
  };
}

// ------------------------------------------------------------------
// SETTINGS TAB
// ------------------------------------------------------------------
function SettingsTab({
  settings,
  onSave,
  currentMeters,
  isAdmin, // ✨ NEW: We now receive isAdmin here
}: {
  settings: { rate: number; goal: number; baselines: Baselines };
  onSave: (r: number, g: number, b: Baselines) => void;
  currentMeters: Baselines;
  isAdmin: boolean;
}) {
  const [rate, setRate] = useState(settings.rate);
  const [goal, setGoal] = useState(settings.goal);
  const [savedSection, setSavedSection] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<"software" | "hardware" | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const handleSaveRate = () => {
    if (!isAdmin) return;
    onSave(rate, goal, settings.baselines);
    logUserAction(`Updated billing rate to ₱${rate}`, "settings");
    setSavedSection("rate");
    setTimeout(() => setSavedSection(null), 2000);
  };

  const handleSaveGoal = () => {
    if (!isAdmin) return;
    onSave(rate, goal, settings.baselines);
    logUserAction(`Updated usage goal to ${goal} kWh`, "settings");
    setSavedSection("goal");
    setTimeout(() => setSavedSection(null), 2000);
  };

  const executeSoftwareReset = () => {
    if (!isAdmin) return;
    onSave(rate, goal, currentMeters);
    logUserAction("Reset software trip progress to 0 for all devices", "settings");
    setActiveModal(null);
  };

  const executeHardwareReset = async () => {
    if (!isAdmin) return;
    setIsResetting(true);
    try {
      await set(ref(database, "relays/reset"), 1);
      await set(ref(database, "history"), null);
      await set(ref(database, "alertState"), null);
      
      const logsRef = ref(database, "logs");
      const snapshot = await get(logsRef);
      const retainedLogs: Record<string, any> = {};
      if (snapshot.exists()) {
        const allLogs = snapshot.val();
        for (const key in allLogs) {
          if (
            typeof allLogs[key]?.message === "string" &&
            allLogs[key].message.includes("HARDWARE FACTORY RESET")
          ) {
            retainedLogs[key] = allLogs[key];
          }
        }
      }
      await set(logsRef, retainedLogs);
      await logUserAction("Triggered HARDWARE FACTORY RESET on ESP32", "critical");
      onSave(rate, goal, { main: 0, acu: 0, co: 0 });
      setTimeout(() => {
        set(ref(database, "relays/reset"), 0);
        setIsResetting(false);
        setActiveModal(null);
      }, 2000);
    } catch (error) {
      console.error("Failed to complete factory reset:", error);
      setIsResetting(false);
      alert("An error occurred during the factory reset process.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 relative">
      
      {/* ✨ NEW: View Only Warning Banner */}
      {!isAdmin && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z" />
          </svg>
          <div>
            <p className="text-sm font-bold text-gray-200">View-Only Mode</p>
            <p className="text-xs text-gray-400 mt-0.5">You are signed in as a viewer. Only administrators can modify system settings, goals, or execute resets.</p>
          </div>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gray-800/50 px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">Billing Rate</h2>
        </div>
        <div className="p-6 flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full space-y-2">
            <label className="text-sm font-semibold text-gray-400">
              Electricity Rate (₱/kWh)
            </label>
            <input
              type="number"
              value={rate}
              disabled={!isAdmin} // ✨ LOCKED
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <button
            onClick={handleSaveRate}
            disabled={!isAdmin} // ✨ LOCKED
            className={`w-full sm:w-auto px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              savedSection === "rate"
                ? "bg-green-500 text-white"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >
            {savedSection === "rate" ? "Saved!" : "Update Rate"}
          </button>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gray-800/50 px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">Usage Goal & Tracking</h2>
        </div>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end mb-6">
            <div className="flex-1 w-full space-y-2">
              <label className="text-sm font-semibold text-gray-400">
                Notification Goal (kWh)
              </label>
              <input
                type="number"
                value={goal}
                disabled={!isAdmin} // ✨ LOCKED
                onChange={(e) => setGoal(parseFloat(e.target.value))}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <button
              onClick={handleSaveGoal}
              disabled={!isAdmin} // ✨ LOCKED
              className={`w-full sm:w-auto px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                savedSection === "goal"
                  ? "bg-green-500 text-white"
                  : "bg-blue-600 hover:bg-blue-500 text-white"
              }`}
            >
              {savedSection === "goal" ? "Saved!" : "Update Goal"}
            </button>
          </div>
          <div className="pt-6 border-t border-gray-800">
            <button
              onClick={() => setActiveModal("software")}
              disabled={!isAdmin} // ✨ LOCKED
              className="w-full py-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 rounded-xl transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-800"
            >
              Reset Software Trip Progress to 0
            </button>
            <p className="text-[10px] text-gray-500 mt-3 text-center uppercase tracking-widest leading-relaxed">
              Lifetime totals will not be affected. <br />
              This brings all devices back to{" "}
              <span className="text-blue-400 font-bold">0.00 kWh</span> for the
              current trip.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-red-950/20 border border-red-900/50 rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-red-900/20 px-6 py-4 border-b border-red-900/30 flex items-center gap-2">
          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-lg font-bold text-red-500">Danger Zone</h2>
        </div>
        <div className="p-6">
          <button
            onClick={() => setActiveModal("hardware")}
            disabled={!isAdmin} // ✨ LOCKED
            className="w-full py-4 rounded-xl transition-all font-bold flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600 disabled:shadow-none"
          >
            Factory Reset Entire System
          </button>
          <p className="text-[10px] text-red-400/80 mt-3 text-center uppercase tracking-widest leading-relaxed">
            Warning: Wipes hardware non-volatile memory, deletes history charts, clears active alerts, and clears standard logs.
          </p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-lg p-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Account</h3>
          <p className="text-sm text-gray-400">Sign out of your Wattwise session.</p>
        </div>
        <button
          onClick={() => {
            logUserAction(`${isAdmin ? "Admin" : "Viewer"} signed out`, "system");
            signOut(auth);
          }}
          className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 font-semibold rounded-lg transition-colors"
        >
          Sign Out
        </button>
      </div>

      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => !isResetting && setActiveModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`relative w-full max-w-md bg-gray-900 border shadow-2xl rounded-2xl overflow-hidden ${
                activeModal === "hardware" ? "border-red-900/50 shadow-red-900/20" : "border-gray-700"
              }`}
            >
              <div className={`px-6 py-4 border-b flex items-center gap-3 ${activeModal === "hardware" ? "bg-red-900/20 border-red-900/30" : "bg-gray-800/50 border-gray-800"}`}>
                <h2 className={`text-xl font-bold ${activeModal === "hardware" ? "text-red-500" : "text-white"}`}>
                  {activeModal === "hardware" ? "Factory Reset System" : "Reset Trip Progress"}
                </h2>
              </div>
              <div className="p-6">
                {activeModal === "hardware" ? (
                  <div className="space-y-4">
                    <p className="text-gray-300">Are you absolutely sure you want to factory reset the system?</p>
                    <ul className="text-sm text-red-400/90 space-y-2 list-disc pl-5">
                      <li>Wipes all physical ESP32 lifetime memory</li>
                      <li>Deletes all historical graph data</li>
                      <li>Clears all active alert states</li>
                      <li>Clears all logs except past reset records</li>
                    </ul>
                    <p className="text-sm font-bold text-red-500 pt-2">This action CANNOT be undone.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-gray-300">Reset progress bar to 0 for all devices?</p>
                    <p className="text-sm text-gray-400">Lifetime totals on the hardware will remain unchanged. This simply starts a new billing tracking cycle.</p>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 bg-gray-950 border-t border-gray-800 flex justify-end gap-3">
                <button
                  onClick={() => setActiveModal(null)}
                  disabled={isResetting}
                  className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                {activeModal === "hardware" ? (
                  <button
                    onClick={executeHardwareReset}
                    disabled={isResetting}
                    className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 disabled:bg-red-800 disabled:opacity-80"
                  >
                    {isResetting ? "Wiping..." : "Yes, Wipe Everything"}
                  </button>
                ) : (
                  <button
                    onClick={executeSoftwareReset}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-colors"
                  >
                    Confirm Reset
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ------------------------------------------------------------------
// MAIN HOME COMPONENT
// ------------------------------------------------------------------



export default function Home() {
  const [activeTab, setActiveTab] = useState<AppTab>("live");
  const [meters, setMeters] = useState<{ main: MeterData | null; acu: MeterData | null; co: MeterData | null; }>({
    main: null,
    acu: null,
    co: null,
  });
  const [relays, setRelays] = useState<Relays | null>(null);
  const [hasActiveCriticalAlert, setHasActiveCriticalAlert] = useState(false);
  const [settings, setSettings] = useState<{ rate: number; goal: number; baselines: Baselines; }>({
    rate: 11.91,
    goal: 150,
    baselines: { main: 0, acu: 0, co: 0 },
  });
  const [isAdmin, setIsAdmin] = useState(false);

  const isLoggingRef = useRef<Record<DeviceId, boolean>>({ main: false, acu: false, co: false });

  const alertMemoryRef = useRef<Record<DeviceId, AlertStatus>>({ main: "normal", acu: "normal", co: "normal" });
  const activeAlertStateRef = useRef<Partial<Record<DeviceId, AlertStateItem>>>({});
  const lastMeterSnapshotRef = useRef<Record<DeviceId, string>>({ main: "", acu: "", co: "" });
  const lastMeterReceivedAtRef = useRef<Record<DeviceId, number>>({ main: 0, acu: 0, co: 0 });
  const latestMetersRef = useRef<{ main: MeterData | null; acu: MeterData | null; co: MeterData | null; }>({ main: null, acu: null, co: null });
  const latestRelaysRef = useRef<Relays | null>(null);

  const handleTabChange = (tab: AppTab) => {
    setActiveTab(tab);
  };

  // ✨ UPDATED: Admin Security Checker (Now points to "admins" folder)
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const adminRef = ref(database, "admins"); // ✨ Changed from "admin" to "admins"
        
        onValue(adminRef, (snapshot) => {
          const adminData = snapshot.val();
          if (!adminData) {
            setIsAdmin(false);
            return;
          }
          
          let isUserAdmin = false;
          
          // If 'admins' is a folder containing UIDs or Emails:
          if (typeof adminData === 'object') {
             if (adminData[user.uid]) {
               isUserAdmin = true;
             } else {
               // Check if the user's email is saved as a value in the folder
               const values: any[] = Object.values(adminData);
               if (values.includes(user.email)) {
                 isUserAdmin = true;
               }
             }
          } else if (adminData === user.email || adminData === user.uid) {
            // Fallback in case it's a single string
            isUserAdmin = true;
          }

          setIsAdmin(isUserAdmin);
        });
      } else {
        setIsAdmin(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const alertRef = ref(database, "alertState");
    const unsub = onValue(alertRef, (snapshot) => {
      const data = (snapshot.val() || {}) as Partial<Record<DeviceId, AlertStateItem>>;
      activeAlertStateRef.current = data;
      const hasCritical = Object.values(data).some((alert) => alert?.type === "critical");
      setHasActiveCriticalAlert(hasCritical);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubMeters = onValue(ref(database, "meters"), (snap) => {
      const data = snap.val() || {};
      const cleanMeters = {
        main: data.main || null,
        acu: data.acu || null,
        co: data.co || null,
      };
      setMeters(cleanMeters);
      latestMetersRef.current = cleanMeters;
      const now = Date.now();
      const deviceIds: DeviceId[] = ["main", "acu", "co"];
      deviceIds.forEach((id) => {
        const currentData = cleanMeters[id];
        if (!currentData) {
          lastMeterSnapshotRef.current[id] = "";
          lastMeterReceivedAtRef.current[id] = 0;
          return;
        }
        const currentSnapshot = JSON.stringify(currentData);
        if (currentSnapshot !== lastMeterSnapshotRef.current[id]) {
          lastMeterSnapshotRef.current[id] = currentSnapshot;
          lastMeterReceivedAtRef.current[id] = now;
        }
      });
    });
    const unsubRelays = onValue(ref(database, "relays"), (snap) => {
      const data = snap.val();
      setRelays(data);
      latestRelaysRef.current = data;
    });
    const unsubSettings = onValue(ref(database, "settings"), (snap) => {
      const data = snap.val();
      if (data) {
        const defaultBaselines = data.baselines || { main: data.baselineKwh || 0, acu: 0, co: 0 };
        setSettings({ rate: data.rate || 11.91, goal: data.goal || 150, baselines: defaultBaselines });
      }
    });
    return () => {
      unsubMeters();
      unsubRelays();
      unsubSettings();
    };
  }, []);

  useEffect(() => {
    let isChecking = false;
    
    const checkAlerts = async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        const now = Date.now();
        const currentMeters = latestMetersRef.current;
        const currentRelays = latestRelaysRef.current;
        const devices = [
          { id: "main" as const, name: "Main Source", data: currentMeters.main, relayState: currentRelays?.light },
          { id: "acu" as const, name: "Air Conditioning Unit", data: currentMeters.acu, relayState: currentRelays?.acu },
          { id: "co" as const, name: "Convenience Outlet", data: currentMeters.co, relayState: currentRelays?.co },
        ];
        
        for (const device of devices) {
          const lastReceivedAt = lastMeterReceivedAtRef.current[device.id];
          const isStale = !!device.data && (!lastReceivedAt || now - lastReceivedAt > STALE_LIMIT_MS);
          const alertInfo = getDeviceAlertInfo({ name: device.name, data: device.data, relayState: device.relayState, isStale });
          
          // 🛡️ THE GLOBAL SHIELD: Check the status outside the component
          const previousStatus = globalAlertLock[device.id];
          const currentStatus = alertInfo.status;

          // If the hardware state hasn't actually changed, skip everything instantly
          if (currentStatus === previousStatus) continue;

          // Update global memory IMMEDIATELY (blocks any concurrent processes)
          globalAlertLock[device.id] = currentStatus;

          const alertRef = ref(database, `alertState/${device.id}`);

          if (currentStatus !== "normal") {
            await logUserAction(alertInfo.message, alertInfo.type);
            await set(alertRef, { 
              status: currentStatus, 
              type: alertInfo.type, 
              message: alertInfo.message, 
              updatedAt: Date.now() 
            });
          } else {
            // Only log "Normal" if we were actually in an alert before
            if (previousStatus !== "normal") {
              await logUserAction(alertInfo.message, "system");
              await set(alertRef, null);
            }
          }
        }
      } catch (error) {
        console.error("Alert checker failed:", error);
      } finally {
        isChecking = true; // Stay locked until next tick
        setTimeout(() => { isChecking = false; }, 1500); // Debounce
      }
    };

    // Removed the standalone checkAlerts() call here to prevent the mount-burst.
    const interval = setInterval(checkAlerts, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveSettings = (newRate: number, newGoal: number, newBaselines: Baselines) => {
    set(ref(database, "settings"), { rate: newRate, goal: newGoal, baselines: newBaselines });
  };

  const tabTransition = { duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] as [number, number, number, number] };
  const currentMeters: Baselines = { main: meters.main?.kwh || 0, acu: meters.acu?.kwh || 0, co: meters.co?.kwh || 0 };

  return (
    <main className="min-h-screen bg-gray-950 text-white font-sans">
      <div className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/60 shadow-sm">
        <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center px-4 py-4 md:px-8 gap-4">
          <div className="flex items-center gap-3">
            <Image src="/wattwise.png" alt="Logo" width={42} height={42} className="rounded" />
            <div className="flex flex-col leading-tight">
              <h1 className="text-2xl md:text-3xl font-bold text-blue-400 tracking-tight">WATTWISE</h1>
              <p className="text-gray-500 text-xs md:text-sm font-medium">Energy Monitoring System</p>
            </div>
          </div>
          <div className="flex bg-gray-900/50 border border-gray-700/50 p-1 rounded-lg overflow-x-auto w-full md:w-auto shadow-inner">
            {(["live", "control", "history", "logs", "settings"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`relative px-4 py-2 rounded-md text-sm capitalize transition-colors duration-300 ${
                  activeTab === tab ? "text-white font-semibold" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {tab === "logs" && hasActiveCriticalAlert && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                )}
                {activeTab === tab && (
                  <motion.div layoutId="activeTabBackground" className="absolute inset-0 bg-blue-600 rounded-md shadow-md" style={{ zIndex: -1 }} transition={tabTransition} />
                )}
                {tab === "live" ? "Monitoring" : tab}
              </button>
            ))}
          </div>
        </header>
      </div>
      <div className="max-w-7xl mx-auto p-4 md:p-8 pt-6 md:pt-8 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={tabTransition}>
            {activeTab === "live" && <Live meters={meters} relays={relays} settings={settings} onNavigateToSettings={() => setActiveTab("settings")} />}
            {activeTab === "history" && <HistoryTab />}
            {activeTab === "control" && <ControlTab relays={relays} isAdmin={isAdmin} setRelays={setRelays} />}
            {activeTab === "logs" && <LogsTab />}
            
            {/* ✨ UPDATED: SettingsTab now receives isAdmin */}
            {activeTab === "settings" && <SettingsTab settings={settings} onSave={handleSaveSettings} currentMeters={currentMeters} isAdmin={isAdmin} />}
            
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}