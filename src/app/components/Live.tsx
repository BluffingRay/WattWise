"use client";
import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../../lib/firebase";
import { MeterData, Relays } from "../../types/wattwise";
import { motion, AnimatePresence } from "framer-motion";

// ------------------------------------------------------------------
// 1. TYPES AND PURE FUNCTIONS
// ------------------------------------------------------------------
type SystemSettings = {
  rate: number;
  goal: number;
  baselines: {
    main: number;
    acu: number;
    co: number;
  };
};

type DeviceSummaryStatus = {
  label: string;
  color: string;
  dot: string;
  border: string;
  bg: string;
};

const getCost = (watts: number, hours: number, rate: number) => {
  return (watts / 1000) * hours * rate;
};

const evaluateStatus = (
  value: number,
  type: string,
  settings: SystemSettings,
  isMain: boolean = false
) => {
  if (type === "v") {
    if (value < 1) {
      return {
        label: "Off",
        color: "text-gray-400",
        bg: "bg-gray-500/10",
        border: "border-gray-500/20",
      };
    }
    const V_CRITICAL_MIN = 207;
    const V_CRITICAL_MAX = 253;
    const V_WARNING_MIN = 210;
    const V_WARNING_MAX = 240;

    if (value < V_CRITICAL_MIN || value > V_CRITICAL_MAX) {
      return {
        label: "Critical",
        color: "text-red-400",
        bg: "bg-red-400/20",
        border: "border-red-400/30",
      };
    }
    if (value < V_WARNING_MIN || value > V_WARNING_MAX) {
      return {
        label: "Warning",
        color: "text-yellow-400",
        bg: "bg-yellow-400/20",
        border: "border-yellow-400/30",
      };
    }
    return {
      label: "Normal",
      color: "text-green-400",
      bg: "bg-green-400/20",
      border: "border-green-400/30",
    };
  }
  return null;
};

const getDeviceSummaryStatus = ({
  data,
  isOn,
}: {
  data: MeterData | null;
  isOn: boolean;
}): DeviceSummaryStatus => {
  if (!data) {
    return {
      label: "No data available",
      color: "text-red-400",
      dot: "bg-red-500",
      border: "border-red-500/20",
      bg: "bg-red-500/10",
    };
  }
  const voltage = Number(data.v ?? 0);
  if (isOn && voltage < 1) {
    return {
      label: "No voltage detected",
      color: "text-red-400",
      dot: "bg-red-500 animate-pulse",
      border: "border-red-500/30",
      bg: "bg-red-500/10",
    };
  }
  if (!isOn && voltage < 1) {
    return {
      label: "Powered off / no voltage",
      color: "text-gray-400",
      dot: "bg-gray-500",
      border: "border-gray-500/20",
      bg: "bg-gray-500/10",
    };
  }
  if (voltage > 0 && (voltage < 207 || voltage > 253)) {
    return {
      label: "Critical voltage",
      color: "text-red-400",
      dot: "bg-red-500 animate-pulse",
      border: "border-red-500/30",
      bg: "bg-red-500/10",
    };
  }
  return {
    label: "Normal voltage",
    color: "text-green-400",
    dot: "bg-green-500",
    border: "border-green-400/20",
    bg: "bg-green-400/10",
  };
};

// ------------------------------------------------------------------
// 2. SUB-COMPONENTS
// ------------------------------------------------------------------
const ParameterCard = ({
  label,
  value,
  unit,
  type,
  settings,
  isMain = false,
}: {
  label: string;
  value: number;
  unit: string;
  type: string;
  settings: SystemSettings;
  isMain?: boolean;
}) => {
  const status = evaluateStatus(value, type, settings, isMain);
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-400">{label}</p>
        {status && (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.color} ${status.bg} ${status.border}`}
          >
            {status.label}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <p
          className={`${type === "kwh" ? "text-xl" : "text-2xl"} font-bold ${
            status && status.label !== "Normal" && status.label !== "Off"
              ? status.color
              : "text-white"
          }`}
        >
          {value?.toFixed(type === "kwh" ? 3 : type === "i" || type === "pf" ? 2 : 1) ?? "0.0"}
        </p>
        <p className="text-xs text-gray-400 ml-1">{unit}</p>
      </div>
    </div>
  );
};

const DeviceSection = ({
  id,
  title,
  icon,
  desc,
  data,
  relayState,
  isMain = false,
  hasRelay = true,
  isExpanded,
  onToggle,
  settings,
}: {
  id: "main" | "acu" | "co";
  title: string;
  icon: string;
  desc: string;
  data: MeterData | null;
  relayState: number | undefined;
  isMain?: boolean;
  hasRelay?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  settings: SystemSettings;
}) => {
  const isOn = hasRelay ? (relayState === 1) : true; 
  const voltage = data ? Number(data.v ?? 0) : 0;
  const power = data ? Number(data.p ?? 0) : 0;

  const summaryStatus = getDeviceSummaryStatus({
    data,
    isOn,
  });

  const springTransition = {
    duration: 0.4,
    ease: [0.04, 0.62, 0.23, 0.98] as [number, number, number, number],
  };

  // ✨ CALCULATING THE SHARE OF GOAL FOR THE RESTORED CARD
  const deviceBaseline = settings.baselines ? settings.baselines[id] || 0 : 0;
  const currentUsage = data ? Math.max(0, data.kwh - deviceBaseline) : 0;

  return (
    <div
      className={`bg-gray-900 border ${
        isExpanded
          ? "border-blue-500/50 shadow-blue-900/20"
          : "border-gray-800 hover:border-gray-700"
      } rounded-2xl overflow-hidden shadow-lg transition-colors duration-300`}
    >
      <button
        onClick={onToggle}
        className="w-full p-5 flex items-center justify-between gap-4 bg-gray-800/20 hover:bg-gray-800/40 transition-colors text-left"
      >
        <div className="flex items-center gap-4 min-w-0">
          <span className="text-3xl bg-gray-800 p-2 rounded-xl border border-gray-700 shrink-0">
            {icon}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-white">{title}</h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${summaryStatus.color} ${summaryStatus.bg} ${summaryStatus.border}`}
              >
                {summaryStatus.label}
              </span>
            </div>
            {isExpanded ? (
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            ) : (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${summaryStatus.dot}`} />
                  <span className={`text-xs font-semibold ${summaryStatus.color}`}>
                    {data ? "Online" : "Offline"}
                  </span>
                </div>
                {hasRelay && (
                  <>
                    <span className="text-gray-600 text-xs">•</span>
                    <span
                      className={`text-xs font-bold ${
                        isOn ? "text-green-400" : "text-gray-500"
                      }`}
                    >
                      {isOn ? "RELAY ON" : "RELAY OFF"}
                    </span>
                  </>
                )}
                {data && (
                  <>
                    <span className="text-gray-600 text-xs">•</span>
                    <span
                      className={`text-xs font-bold ${
                        voltage < 1 && isOn && hasRelay ? "text-red-400" : "text-blue-400"
                      }`}
                    >
                      {voltage.toFixed(1)} V
                    </span>
                    <span className="text-gray-600 text-xs">•</span>
                    <span className="text-xs font-bold text-blue-400">
                      {power.toFixed(1)} W
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <motion.svg
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={springTransition}
          className="w-6 h-6 text-gray-500 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={springTransition}
            className="overflow-hidden"
          >
            <div className="p-5 border-t border-gray-800 bg-gray-900/50">
              {data ? (
                <div className="space-y-4">
                  {hasRelay && isOn && voltage < 1 && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                      <p className="text-sm font-bold text-red-400">
                        No voltage detected while relay is ON
                      </p>
                      <p className="text-xs text-red-300/80 mt-1 leading-relaxed">
                        The device relay is currently ON, but the meter reports
                        0V. Possible sensor, wiring, or power supply issue.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <ParameterCard label="Voltage" value={data.v} unit="V" type="v" settings={settings} isMain={isMain} />
                    <ParameterCard label="Current" value={data.i} unit="A" type="i" settings={settings} isMain={isMain} />
                    <ParameterCard label="Power" value={data.p} unit="W" type="p" settings={settings} isMain={isMain} />
                    <ParameterCard label="Energy Used" value={data.kwh} unit="kWh" type="kwh" settings={settings} />
                    <ParameterCard label="Power Factor" value={(data as any).pf ?? 0.95} unit="" type="pf" settings={settings} isMain={isMain} />
                    <ParameterCard label="Frequency" value={(data as any).hz ?? 60.0} unit="Hz" type="hz" settings={settings} isMain={isMain} />
                  </div>

                  {/* ✨ RESTORED: THE DETAILED SUMMARY FOOTER */}
                  <div className="mt-4 space-y-3">
                    {/* Blue Cost Box */}
                    <div className="bg-blue-600 rounded-xl p-4 shadow-inner flex justify-between items-center">
                      <div>
                        <p className="text-xs text-blue-100 font-medium mb-1">Estimated Hourly Cost</p>
                        <div className="flex items-baseline">
                          <p className="text-2xl font-bold text-white">₱{getCost(data.p, 1, settings.rate).toFixed(2)}</p>
                          <p className="text-xs text-blue-200 ml-1">/hour</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-blue-100 font-medium mb-1">Daily Estimate</p>
                        <p className="text-xl font-bold text-white">₱{getCost(data.p, 24, settings.rate).toFixed(2)}</p>
                      </div>
                    </div>

                    {/* 3-Card Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* System Status Card */}
                      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">System Status</p>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${isOn ? 'bg-green-500' : 'bg-gray-500'}`} />
                          <p className={`text-sm font-bold ${isOn ? 'text-green-400' : 'text-gray-400'}`}>
                            {isOn ? 'Powered ON' : 'Powered OFF'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Active Rate Card */}
                      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Active Rate</p>
                        <p className="text-sm font-bold text-gray-200">
                          ₱{settings.rate.toFixed(2)} <span className="text-[10px] text-gray-500 font-normal">/ kWh</span>
                        </p>
                      </div>

                      {/* Share of Goal Card */}
                      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Share of Goal</p>
                        <p className="text-sm font-bold text-blue-400">
                          {currentUsage.toFixed(2)} <span className="text-[10px] text-gray-500 font-normal">/ {settings.goal} kWh</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* ✨ END RESTORED SECTION */}

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                  <p className="text-sm font-semibold text-gray-300">No Data Available</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ------------------------------------------------------------------
// 3. MAIN COMPONENT
// ------------------------------------------------------------------
export default function Live({
  meters,
  relays,
  settings,
  onNavigateToSettings,
}: {
  meters: {
    main: MeterData | null;
    acu: MeterData | null;
    co: MeterData | null;
  };
  relays: Relays | null;
  settings: SystemSettings;
  onNavigateToSettings?: () => void;
}) {
  const [expandedDevice, setExpandedDevice] = useState<string | null>("main");
  const [showNecp, setShowNecp] = useState(false);
  const [isStale, setIsStale] = useState(false);

  const handleToggle = (id: string) => {
    setExpandedDevice(expandedDevice === id ? null : id);
  };

  // Instantly reads the global alertState to know if the system is stale
  useEffect(() => {
    const unsub = onValue(ref(database, "alertState"), (snap) => {
      const data = snap.val() || {};
      const staleFound = Object.values(data).some((alert: any) => alert?.status === "stale");
      setIsStale(staleFound);
    });
    return () => unsub();
  }, []);

  const isDisconnected = !meters.main && !meters.acu && !meters.co;
  const connectionStatus = isDisconnected ? "disconnected" : isStale ? "stale" : "connected";

  const mainBaseline = settings.baselines?.main || 0;
  const mainUsage = meters.main ? Math.max(0, meters.main.kwh - mainBaseline) : 0;
  const globalProgressPercent = Math.min(100, (mainUsage / settings.goal) * 100);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-gray-800/50">
        <div>
          <h2 className="text-xl font-semibold text-gray-200">System Overview</h2>
          <p className="text-sm text-gray-500 mt-1">Real-time electrical parameters & compliance</p>
        </div>
        
        <div
          className={`px-3 py-1.5 rounded-full flex items-center gap-2 border transition-colors ${
            connectionStatus === "connected"
              ? "bg-green-500/10 border-green-500/20"
              : connectionStatus === "stale"
              ? "bg-yellow-500/10 border-yellow-500/20"
              : "bg-red-500/10 border-red-500/20"
          }`}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              connectionStatus === "connected" ? "bg-green-400 animate-pulse" 
              : connectionStatus === "stale" ? "bg-yellow-400" 
              : "bg-red-400"
            }`}
          />
          <p
            className={`text-[10px] font-bold uppercase tracking-wider ${
              connectionStatus === "connected" ? "text-green-400" 
              : connectionStatus === "stale" ? "text-yellow-400" 
              : "text-red-400"
            }`}
          >
            {connectionStatus === "connected" ? "Receiving Live Data" 
             : connectionStatus === "stale" ? "Connection Lost (Stale Data)" 
             : "Disconnected"}
          </p>
        </div>
      </div>

      {/* TRIP PROGRESS BAR */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-lg">
        <div className="flex justify-between items-end mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Current Trip Progress</p>
              {onNavigateToSettings && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToSettings();
                  }}
                  className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 rounded text-[10px] font-bold uppercase transition-colors flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add New Goal
                </button>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-200">
              {mainUsage.toFixed(2)} <span className="text-gray-500 font-normal text-sm">/ {settings.goal} kWh</span>
            </p>
          </div>
          <p
            className={`text-lg font-bold ${
              globalProgressPercent >= 100 ? "text-red-400" : globalProgressPercent >= 75 ? "text-yellow-400" : "text-blue-400"
            }`}
          >
            {globalProgressPercent.toFixed(1)}%
          </p>
        </div>
        <div className="h-3 w-full bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${globalProgressPercent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full ${
              mainUsage >= settings.goal ? "bg-red-500" : mainUsage >= settings.goal * 0.75 ? "bg-yellow-500" : "bg-blue-500"
            }`}
          />
        </div>
      </div>

      {/* DEVICE SECTIONS */}
      <div className="flex flex-col gap-4">
        <DeviceSection
          id="main"
          title="Main Source"
          icon="⚡"
          desc="Primary electrical input"
          data={meters.main}
          relayState={undefined} 
          hasRelay={false}       
          isMain={true}
          isExpanded={expandedDevice === "main"}
          onToggle={() => handleToggle("main")}
          settings={settings}
        />
        <DeviceSection
          id="acu"
          title="Air Conditioning Unit"
          icon="❄️"
          desc="ACU power consumption"
          data={meters.acu}
          relayState={relays?.acu}
          hasRelay={true}
          isExpanded={expandedDevice === "acu"}
          onToggle={() => handleToggle("acu")}
          settings={settings}
        />
        <DeviceSection
          id="co"
          title="Convenience Outlet"
          icon="🔌"
          desc="General outlet usage"
          data={meters.co}
          relayState={relays?.co}
          hasRelay={true}
          isExpanded={expandedDevice === "co"}
          onToggle={() => handleToggle("co")}
          settings={settings}
        />
      </div>

      {/* NECP STANDARDS GUIDE */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 shadow-lg mt-8 overflow-hidden">
        <button
          onClick={() => setShowNecp(!showNecp)}
          className="w-full p-4 flex items-center justify-between bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
        >
          <h3 className="text-sm font-bold text-white flex items-center gap-2">🇵🇭 NECP Compliance Standards Guide</h3>
          <motion.svg
            animate={{ rotate: showNecp ? 180 : 0 }}
            className="w-5 h-5 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
        </button>
        <AnimatePresence>
          {showNecp && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-5 border-t border-gray-800 bg-gray-900/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700/50">
                    <p className="text-xs font-semibold text-gray-400 mb-1">Voltage</p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Normal: 210V - 240V <br />
                      Critical: &lt;207V or &gt;253V
                    </p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700/50">
                    <p className="text-xs font-semibold text-gray-400 mb-1">Current</p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Max Safe: 16.0A <br />
                      Critical: &gt;20.0A
                    </p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700/50">
                    <p className="text-xs font-semibold text-gray-400 mb-1">Power Factor (PF)</p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Normal: &ge; 0.85 <br />
                      Poor: &lt; 0.85 (Inefficient usage)
                    </p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700/50">
                    <p className="text-xs font-semibold text-gray-400 mb-1">Frequency</p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Standard: 60.0 Hz <br />
                      Tolerance: 59.7 Hz - 60.3 Hz
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
