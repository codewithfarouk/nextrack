export const parseDate = (
  dateStr: string | null | undefined,
  rowIndex: number,
  field: string,
  source: string
): { date: Date | null; error: string | null } => {
  if (!dateStr || dateStr === 'null' || dateStr === 'undefined' || dateStr.toString().trim() === '') {
    return { date: null, error: `Ligne ${rowIndex}: Champ ${field} vide ou invalide pour ${source}` };
  }

  const cleanDateStr = dateStr.toString().trim();
  const patterns = [
    {
      regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}):(\d{2}))?$/,
      parser: ([, day, month, year, hour = '0', minute = '0', second = '0']) =>
        new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second)),
    },
    {
      regex: /^(\d{4})-(\d{1,2})-(\d{1,2})(?:T(\d{1,2}):(\d{2}):(\d{2}))?/,
      parser: ([, year, month, day, hour = '0', minute = '0', second = '0']) =>
        new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second)),
    },
    {
      regex: /^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+(\d{1,2}):(\d{2}):(\d{2}))?$/,
      parser: ([, day, month, year, hour = '0', minute = '0', second = '0']) =>
        new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second)),
    },
  ];

  for (const { regex, parser } of patterns) {
    const match = cleanDateStr.match(regex);
    if (match) {
      const date = parser(match);
      if (!isNaN(date.getTime())) {
        return { date, error: null };
      }
      return { date: null, error: `Ligne ${rowIndex}: Format de date invalide pour ${field} dans ${source}: ${cleanDateStr}` };
    }
  }

  const fallbackDate = new Date(cleanDateStr);
  if (!isNaN(fallbackDate.getTime())) {
    console.warn(`Ligne ${rowIndex}: Date ${cleanDateStr} pour ${field} dans ${source} utilisée via fallback`);
    return { date: fallbackDate, error: null };
  }

  return { date: null, error: `Ligne ${rowIndex}: Date non reconnue pour ${field} dans ${source}: ${cleanDateStr}` };
};