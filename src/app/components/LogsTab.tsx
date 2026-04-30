"use client";

import { useEffect, useState } from "react";
import { ref, onValue, query, limitToLast } from "firebase/database";
import { database } from "../../lib/firebase";
import { motion } from "framer-motion";

type LogEntry = {
  id: string;
  message: string;
  type: "control" | "settings" | "system" | "critical" | "warning";
  timestamp: number;
};

export default function LogsTab() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const logsQuery = query(ref(database, "logs"), limitToLast(50));

    const unsub = onValue(logsQuery, (snapshot) => {
      const data = snapshot.val();

      if (data) {
        const parsedLogs: LogEntry[] = Object.keys(data)
          .map((key) => ({
            id: key,
            ...data[key],
          }))
          .sort((a, b) => b.timestamp - a.timestamp);

        setLogs(parsedLogs);
      } else {
        setLogs([]);
      }
    });

    return () => unsub();
  }, []);

  const getLogStyle = (type: string) => {
    switch (type) {
      case "critical":
        return {
          icon: "🚨",
          color: "text-red-400",
          bg: "bg-red-500/10",
          border: "border-red-500/20",
        };

      case "warning":
        return {
          icon: "⚠️",
          color: "text-yellow-400",
          bg: "bg-yellow-500/10",
          border: "border-yellow-500/20",
        };

      case "control":
        return {
          icon: "🎚️",
          color: "text-blue-400",
          bg: "bg-blue-500/10",
          border: "border-blue-500/20",
        };

      case "settings":
        return {
          icon: "⚙️",
          color: "text-gray-300",
          bg: "bg-gray-800/50",
          border: "border-gray-700",
        };

      case "system":
      default:
        return {
          icon: "🤖",
          color: "text-gray-400",
          bg: "bg-gray-800/30",
          border: "border-gray-800",
        };
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gray-800/50 px-6 py-5 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">
            System Audit & Alerts
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Real-time recording of system activities, warnings, and critical
            events.
          </p>
        </div>

        <div className="p-6">
          {logs.length === 0 ? (
            <p className="text-center text-gray-500 py-10">
              No activities recorded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {logs.map((log, index) => {
                const style = getLogStyle(log.type);

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${style.bg} ${style.border}`}
                  >
                    <div className="text-xl bg-gray-900/50 p-2 rounded-lg border border-gray-700/50 shadow-inner">
                      {style.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${style.color}`}>
                        {log.message}
                      </p>

                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${style.border} ${style.color} opacity-70`}
                        >
                          {log.type}
                        </span>

                        <p className="text-[10px] text-gray-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}