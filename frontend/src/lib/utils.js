import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// The backend fixes "today" to IST (UTC+5:30) regardless of server timezone
// (see backend/src/utils/dateRange.js) — this mirrors that here so a
// receptionist's browser in a different timezone still gets a date filter
// that lines up with what the server considers "today".
const IST_OFFSET_MINUTES = 5 * 60 + 30;

export function todayInIST() {
  const now = new Date();
  const shifted = new Date(now.getTime() + IST_OFFSET_MINUTES * 60_000);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}