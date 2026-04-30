import { ref, push, set } from "firebase/database";
import { database } from "./firebase";

export type LogType =
  | "control"
  | "settings"
  | "system"
  | "critical"
  | "warning";

export const logUserAction = async (
  message: string,
  type: LogType = "system"
) => {
  try {
    const logRef = push(ref(database, "logs"));

    await set(logRef, {
      message,
      type,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Failed to write log:", error);
  }
};