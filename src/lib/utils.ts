import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// IST Timezone Utilities (UTC+5:30)
const IST_FORMATTER = new Intl.DateTimeFormat('sv', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

const IST_DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  weekday: 'short',
  month: 'long',
  day: 'numeric',
  year: 'numeric'
});

export function getISTDateStr(date: Date = new Date()): string {
  // Format date as YYYY-MM-DD in IST
  const parts = IST_FORMATTER.formatToParts(date);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

export function parseISTDate(dateStr: string): Date {
  // Parse YYYY-MM-DD as IST midnight
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 5, 30)); // UTC+5:30 = IST midnight
  date.setMinutes(date.getMinutes() + date.getTimezoneOffset()); // Localize if needed
  return date;
}

export function formatISTDate(dateStr: string, options: Intl.DateTimeFormatOptions = {}): string {
  // Format dateStr (assumed IST date) with IST timezone
  try {
    const date = parseISTDate(dateStr);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      ...options
    }).format(date);
  } catch {
    return dateStr;
  }
}

// For backward compatibility
export const getTodayIST = () => getISTDateStr();
