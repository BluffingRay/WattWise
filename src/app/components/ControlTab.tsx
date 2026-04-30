"use client";

import { ref, set } from "firebase/database";
import { database } from "../../lib/firebase";
import { Relays } from "../../types/wattwise";
import { motion } from "framer-motion";
import { logUserAction } from "../../lib/logger";

type Props = {
  relays: Relays | null;
  isAdmin: boolean;
  setRelays: (r: Relays) => void;
};

// Map keys to the exact same titles and icons used in the Live tab
const DEVICE_MAP = {
  light: { title: "Light", icon: "💡" },
  acu: { title: "Air Conditioning", icon: "❄️" },
  co: { title: "Convenience Outlet", icon: "🔌" },
} as const;

export default function ControlTab({ relays, isAdmin, setRelays }: Props) {
  const handleToggle = (key: keyof Relays) => {
    if (!relays || !isAdmin) return;
    const next = relays[key] === 1 ? 0 : 1;
    const updated = { ...relays, [key]: next };

    setRelays(updated);
    set(ref(database, `relays/${key}`), next);

    // Fire the logger
    const deviceName = DEVICE_MAP[key].title;
    logUserAction(`Turned ${next === 1 ? 'ON' : 'OFF'} the ${deviceName}`, "control");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-200">Remote Control</h2>
          <p className="text-sm text-gray-500 mt-1">Manually override device power states</p>
        </div>

        <div className={`px-4 py-2 rounded-lg flex items-center gap-2 border ${isAdmin ? 'bg-blue-500/10 border-blue-500/20' : 'bg-gray-800 border-gray-700'}`}>
          <div className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-blue-400 animate-pulse' : 'bg-gray-500'}`} />
          <p className={`text-xs font-bold uppercase tracking-wider ${isAdmin ? 'text-blue-400' : 'text-gray-400'}`}>
            {isAdmin ? "Admin Mode Active" : "View Only Mode"}
          </p>
        </div>
      </div>

      {/* BUTTONS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(["light", "acu", "co"] as const).map((id) => {
          const isOn = relays?.[id] === 1;
          const { title, icon } = DEVICE_MAP[id];

          return (
            <motion.button
              key={id}
              onClick={() => handleToggle(id)}
              disabled={!isAdmin}
              whileTap={isAdmin ? { scale: 0.95 } : {}}
              className={`relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 transition-colors duration-300 overflow-hidden shadow-lg
                ${!isAdmin && "opacity-60 cursor-not-allowed"}
                ${isOn 
                  ? "bg-green-500/10 border-green-500/50 shadow-green-900/20" 
                  : "bg-gray-900 border-gray-800 hover:border-gray-700"
                }
              `}
            >
              {isOn && <div className="absolute inset-0 bg-green-500/5 blur-2xl" />}

              <div className="relative z-10 flex flex-col items-center gap-3">
                <span className="text-4xl bg-gray-950 p-3 rounded-2xl border border-gray-800 shadow-inner">
                  {icon}
                </span>
                <h3 className="font-bold text-gray-200 text-center">{title}</h3>
                
                <div className={`mt-2 px-4 py-1.5 rounded-full border ${isOn ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                  <span className="text-xs font-bold uppercase tracking-widest">
                    {isOn ? "Power On" : "Power Off"}
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}