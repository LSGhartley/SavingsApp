// utils/parser.ts

export interface ParsedTransaction {
  id: string; // Temporary ID for the UI
  date: string; // ISO String (YYYY-MM-DD) for database
  desc: string;
  amount: number;
  type: 'income' | 'expense';
  selected: boolean;
}


// Helper to convert "Nov 12" or "11/12" into "2025-11-12"
const extractDate = (line: string, year: number): string | null => {
  // Regex for "Nov 12" or "Jan 1"
  const textDateMatch = line.match(/([A-Za-z]{3})\s+(\d{1,2})/);
  if (textDateMatch) {
    const monthStr = textDateMatch[1]; // "Nov"
    const day = textDateMatch[2]; // "12"
    // Create date object (Month is 0-indexed in JS)
    const date = new Date(`${monthStr} ${day}, ${year} 12:00:00`); 
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
  }

  // Regex for "11/12" or "11-12"
  const numDateMatch = line.match(/(\d{1,2})[\/-](\d{1,2})/);
  if (numDateMatch) {
    const month = numDateMatch[1];
    const day = numDateMatch[2];
    const date = new Date(`${year}-${month}-${day} 12:00:00`);
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
  }

  return null;
};

export const parseBankText = (rawText: string, year: number): ParsedTransaction[] => {
  const lines = rawText.split('\n');
  const results: ParsedTransaction[] = [];

  lines.forEach((line, index) => {
    const cleanLine = line.trim();
    if (!cleanLine) return;

    // 1. Regex to find money (e.g., $15.00, 1,200.50, -50.00)
    // Looks for optional 'R', optional '-', digits, optional commas, dots, and 2 decimals
    const allNumbers = cleanLine.match(/[-+]?\R?[\d,]+(\.\d{1,2})?/g);

    if (allNumbers && allNumbers.length > 0) {
      // 1. Grab the LAST number found (Safest bet for bank lines)
      const moneyStr = allNumbers[allNumbers.length - 1];
      // Clean it up: Remove 'R', commas, and spaces
      const cleanAmountStr = moneyStr.replace(/[R,]/g, '');
      const amount = parseFloat(cleanAmountStr);
      // Validation: If it's NaN or 0, skip it
      if (isNaN(amount) || amount === 0) return;
      // 2. Determine Type (Income vs Expense)
      let type: 'income' | 'expense' = 'expense';
      // Heuristic: If it has a "+" sign OR words like "Deposit/Salary"
      if (moneyStr.includes('+') || 
          cleanLine.toLowerCase().includes('deposit') || 
          cleanLine.toLowerCase().includes('salary') ||
          cleanLine.toLowerCase().includes('credit')
      ) {
        type = 'income';
      }

      // 2. Extract Date (NEW)
      const dateStr = extractDate(cleanLine, year) || `${year}-01-01`; // Default fallback if no date found

    // 3. Extract Description
      // Remove the money string from the line to see what's left
      let desc = cleanLine.replace(moneyStr, '').trim();
      
      // Cleanup: Remove common date formats from the start (e.g., "Nov 12")
      desc = desc.replace(/^\w{3}\s\d{1,2}/, '').trim(); // Removes "Nov 12"
      desc = desc.replace(/^\d{1,2}\/\d{1,2}/, '').trim(); // Removes "11/12"
      
      // Fallback: If description is empty, use "Unknown Transaction"
      if (!desc) desc = "Unknown Transaction";

      results.push({
        id: `temp-${index}`,
        date: dateStr, // Save the date
        desc: desc,
        amount: Math.abs(amount),
        type: type,
        selected: true,
      });
    }
  });

  return results;
};