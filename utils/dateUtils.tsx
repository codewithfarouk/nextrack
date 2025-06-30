import { format, parse } from "date-fns";
import { fr } from "date-fns/locale";

export const parseFrenchDate = (dateStr: string | number): Date => {
  try {
    if (!dateStr) return new Date();

    // Excel serial number format (e.g., 45123.52431)
    if (typeof dateStr === "number") {
      const baseDate = new Date((dateStr - 25569) * 86400 * 1000); // UTC base
      const year = baseDate.getUTCFullYear();
      const month = baseDate.getUTCMonth();
      const day = baseDate.getUTCDate();
      const hours = baseDate.getUTCHours();
      const minutes = baseDate.getUTCMinutes();
      const seconds = baseDate.getUTCSeconds();

      // Rebuild in local time
      return new Date(year, month, day, hours, minutes, seconds);
    }

    // Format: "dd/MM/yyyy HH:mm:ss" or "dd/MM/yyyy"
    const [datePart, timePart = "00:00:00"] = dateStr.trim().split(" ");
    const [day, month, year] = datePart.split("/").map(Number);
    const [hours = 0, minutes = 0, seconds = 0] = timePart.split(":").map(Number);

    // Build local time date
    return new Date(year, month - 1, day, hours, minutes, seconds);
  } catch (error) {
    console.error("Failed to parse date:", dateStr);
    return new Date();
  }
};



export const formatDate = (date: Date, pattern: string): string => {
  return format(date, pattern, { locale: fr });
};