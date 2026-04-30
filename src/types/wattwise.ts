export interface MeterData {
  v: number;   // Voltage
  i: number;   // Current
  p: number;   // Power (Watts)
  kwh: number; // Energy
  php: number; // Cost
  pf: number;
  hz: number;
}

export interface Relays {
  light: number; // 1 or 0
  acu: number;   // 1 or 0
  co: number;    // 1 or 0
}