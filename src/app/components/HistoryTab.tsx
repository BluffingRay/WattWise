"use client";

import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../../lib/firebase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

interface HistoryRecord {
  main_kwh: number;
  acu_kwh: number;
  co_kwh: number;
}

interface ChartEntry {
  date: string;
  fullDate: string;
  kwh: number; 
}

export default function HistoryTab() {
  const [rawData, setRawData] = useState<Record<string, HistoryRecord>>({});
  const [chartData, setChartData] = useState<ChartEntry[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [calcRate, setCalcRate] = useState<number>(11.91); // Updated default to match settings

  useEffect(() => {
    const historyRef = ref(database, "history");
    
    const unsubscribe = onValue(historyRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      setRawData(data);
      const sortedDates = Object.keys(data).sort();
      setAvailableDates(sortedDates);

      const processed = sortedDates.map((date, index) => {
        const currentTotal = data[date].main_kwh;
        let dailyUsage = 0;

        if (index > 0) {
          const prevTotal = data[sortedDates[index - 1]].main_kwh;
          dailyUsage = Math.max(0, currentTotal - prevTotal);
        }

        return {
          date: date.substring(5), 
          fullDate: date,
          kwh: Number(dailyUsage.toFixed(2))
        };
      }).slice(-30); 

      setChartData(processed);

      if (sortedDates.length > 0 && !startDate) {
        setStartDate(sortedDates[Math.max(0, sortedDates.length - 8)]);
        setEndDate(sortedDates[sortedDates.length - 1]);
      }
    });

    return () => unsubscribe();
  }, [startDate]);

  const getConsumptionInRange = () => {
    if (!rawData[startDate] || !rawData[endDate]) return 0;
    const endValue = rawData[endDate].main_kwh;
    const startIndex = availableDates.indexOf(startDate);
    let baselineValue = 0;

    if (startIndex > 0) {
      baselineValue = rawData[availableDates[startIndex - 1]].main_kwh;
    } else {
      baselineValue = rawData[startDate].main_kwh; 
    }

    return Math.max(0, endValue - baselineValue);
  };

  const totalKwh = getConsumptionInRange();
  const calculatedTotal = (totalKwh * calcRate).toFixed(2);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto pb-10">
      
      {/* 📊 BAR GRAPH SECTION */}
      <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-lg flex flex-col">
        <div className="mb-6 border-b border-gray-800/50 pb-4">
          <h2 className="text-xl font-semibold text-gray-200">Daily Consumption</h2>
          <p className="text-sm text-gray-500 mt-1">Main line energy usage over time (kWh)</p>
        </div>
        
        <div className="h-[350px] w-full flex-grow">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} opacity={0.5} />
              <XAxis dataKey="date" stroke="#6B7280" fontSize={12} tickMargin={12} axisLine={false} tickLine={false} />
              <YAxis stroke="#6B7280" fontSize={12} axisLine={false} tickLine={false} />
              <Tooltip 
                cursor={{ fill: '#1F2937', opacity: 0.4 }}
                contentStyle={{ 
                    backgroundColor: '#111827', 
                    borderColor: '#374151', 
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                }}
                itemStyle={{ color: '#60A5FA', fontWeight: 'bold' }} 
                labelStyle={{ color: '#9CA3AF', fontWeight: 'bold', marginBottom: '8px' }} 
              />
              <Bar dataKey="kwh" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.fullDate >= startDate && entry.fullDate <= endDate ? "#2563EB" : "#374151"} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 🧾 BILLING CALCULATOR SECTION */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-lg flex flex-col h-full">
        <div className="mb-6 border-b border-gray-800/50 pb-4">
          <h2 className="text-xl font-semibold text-gray-200">Billing Calculator</h2>
          <p className="text-sm text-gray-500 mt-1">Estimate costs for a specific period</p>
        </div>
        
        <div className="space-y-6 flex-grow">
          {/* Side-by-Side Date Chooser */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">From Date</label>
              <select 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              >
                {availableDates.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">To Date</label>
              <select 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              >
                {availableDates.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Rate per kWh (₱)</label>
            <input 
              type="number" 
              value={calcRate}
              onChange={(e) => setCalcRate(parseFloat(e.target.value) || 0)}
              className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              step="0.5"
            />
          </div>

          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex justify-between items-center">
            <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Total Usage</p>
            <div className="flex items-baseline gap-1">
              <p className="text-xl font-bold text-blue-400">{totalKwh.toFixed(2)}</p>
              <p className="text-xs text-gray-500 font-medium">kWh</p>
            </div>
          </div>
        </div>

        <div className="bg-emerald-500/10 p-6 rounded-xl border border-emerald-500/20 mt-6 shadow-inner">
          <p className="text-xs text-center text-emerald-400/70 uppercase font-bold tracking-widest mb-2">Estimated Cost</p>
          <div className="flex items-center justify-center gap-1">
            <p className="text-2xl text-emerald-500 font-bold">₱</p>
            <p className="text-4xl font-bold text-emerald-400">{calculatedTotal}</p>
          </div>
        </div>
      </div>

    </div>
  );
}