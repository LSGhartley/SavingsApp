import { supabase } from '../lib/supabase';

// Add this helper at the top of the file
const toDateString = (date: Date) => {
  // Safe way to get YYYY-MM-DD in local time to prevent timezone shifts
  const offset = date.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 10);
  return localISOTime;
}

// 1. Get Monthly Spending for the Chart (Last 6 Months)
export const fetchMonthlyTrends = async (userId: string) => {
  const now = new Date();
  
  const labels: string[] = [];
  const totals: number[] = [0, 0, 0, 0, 0, 0];
  const monthMap: Record<string, number> = {}; 

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = d.toLocaleString('default', { month: 'short' });
    const year = d.getFullYear();
    const key = `${monthName}-${year}`;
    
    labels.push(monthName);
    monthMap[key] = 5 - i;
  }

  // FIX: We alias the complex join to "stmt" to make filtering safe
  const { data, error } = await supabase
    .from('transactions')
    .select('amount, date, stmt:statements!transactions_statement_id_fkey!inner(user_id)')
    .eq('stmt.user_id', userId) // <--- Now we can use the nickname here!
    .eq('type', 'EXPENSE');

  if (error) {
    console.error("Chart Error:", error);
    return { labels, datasets: [{ data: totals }] };
  }

  if (!data) return { labels, datasets: [{ data: totals }] };
  console.log("Chart Data Fetched:", data);
  data.forEach((t: any) => {
    const amount = Number(t.amount/100) || 0;
    
    const date = new Date(t.date); 
    const monthName = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    const key = `${monthName}-${year}`;

    if (monthMap[key] !== undefined) {
      const index = monthMap[key];
      totals[index] += (amount / 100); 
    }
  });

  return {
    labels: labels,
    datasets: [{ data: totals }]
  };
};

// 2. Fetch Previous Month's Data for AI
export const fetchPreviousMonthData = async (userId: string) => {
  const now = new Date();
  
  // 1. Calculate dates (First and Last day of previous month)
  const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // 2. Format them as simple Strings (YYYY-MM-DD)
  // This fixes the 400 Bad Request error
  const startStr = toDateString(firstDayPrevMonth);
  const endStr = toDateString(lastDayPrevMonth);

  const { data, error } = await supabase
    .from('transactions')
    .select('description, amount, category, date')
    .gte('date', startStr) // Now sending "2025-11-01"
    .lte('date', endStr)   // Now sending "2025-11-30"
    .eq('type', 'EXPENSE')
    .order('amount', { ascending: false })
    .limit(50);

  if (error) {
    console.error("Dashboard Fetch Error:", error);
    return [];
  }

  return data || [];
};


export const fetchYearlyHabits = async (userId: string, year: number) => {
  // 1. Fetch entire year's expenses
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  const { data, error } = await supabase
    .from('transactions')
    .select('category, amount')
    .eq('statements.user_id', userId) // Assuming alias set up or joined correctly. 
    // If you used the alias 'stmt' in previous steps, ensure consistency or use '!inner'
    .select('category, amount, statements!inner(user_id)') 
    .eq('statements.user_id', userId)
    .gte('date', start)
    .lte('date', end)
    .eq('type', 'EXPENSE');

  if (error || !data || data.length === 0) return null;

  // 2. Aggregate Data (Group by Category)
  // We turn 1000 transactions into ~10 lines of summary for the AI
  const summaryMap: Record<string, { total: number; count: number }> = {};

  data.forEach((t: any) => {
    const cat = t.category || 'Uncategorized';
    if (!summaryMap[cat]) summaryMap[cat] = { total: 0, count: 0 };
    
    summaryMap[cat].total += (t.amount / 100); // Rands
    summaryMap[cat].count += 1;
  });

  // Convert to array
  return Object.keys(summaryMap).map(key => ({
    category: key,
    total: Math.round(summaryMap[key].total),
    count: summaryMap[key].count
  }));
};

// Fetch habits based on the last 3 months of data
export const fetchRecentHabits = async (userId: string) => {
  const now = new Date();
  
  // Calculate start date (3 months ago)
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(now.getMonth() - 3);
  
  const startStr = threeMonthsAgo.toISOString().split('T')[0]; // YYYY-MM-DD
  const endStr = now.toISOString().split('T')[0];

  // Fetch transactions from the last 3 months
  const { data, error } = await supabase
    .from('transactions')
    .select('category, amount, stmt:statements!transactions_statement_id_fkey!inner(user_id)')
    .eq('stmt.user_id', userId)
    .gte('transaction_date', startStr)
    .lte('transaction_date', endStr)
    .eq('type', 'EXPENSE');

  if (error || !data || data.length === 0) return null;

  // Aggregate Data
  const summaryMap: Record<string, { total: number; count: number }> = {};

  data.forEach((t: any) => {
    const cat = t.category || 'Uncategorized';
    if (!summaryMap[cat]) summaryMap[cat] = { total: 0, count: 0 };
    
    summaryMap[cat].total += (t.amount / 100);
    summaryMap[cat].count += 1;
  });

  // Convert to array
  return Object.keys(summaryMap).map(key => ({
    category: key,
    total: Math.round(summaryMap[key].total),
    count: summaryMap[key].count
  }));
};