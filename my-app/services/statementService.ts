import { supabase } from '../lib/supabase';

// The shape of the data we are sending
interface UploadData {
  userId: string;
  month: number;
  year: number;
  rawText: string;
}

export const uploadStatement = async ({ userId, month, year, rawText }: UploadData) => {
  try {
    
    // 1. Insert the "Noun" (Statement)
    const { data, error } = await supabase
      .from('statements')
      .insert([
        {
          user_id: userId,
          month: month,
          year: year,
          raw_text: rawText,
          total_income: 0, // Default to 0 until parsed
          total_expenses: 0,
          file_url: 'none', // Placeholder until we add file uploads
          processing_status: 'PENDING', // Mark as pending so AI can pick it up later
        },
      ])
      .select()
      .single();

    if (error) throw error;
    
    return { success: true, data };

  } catch (error) {
    console.error('Error uploading statement:', error);
    return { success: false, error };
  }
};

export const saveTransactions = async (statementId: string, transactions: any[]) => {
  try {
    // 1. Calculate Totals (in Cents)
    let totalIncome = 0;
    let totalExpense = 0;

    const records = transactions
      .filter(t => t.selected)
      .map(t => {
        const amountCents = Math.round(t.amount * 100); // Convert $45.20 -> 4520 (Cents)
        if (t.type === 'income') totalIncome += amountCents;
        else totalExpense += amountCents;

        return {
          statement_id: statementId,
          description: t.desc,
          amount: amountCents,
          type: t.type.toUpperCase(), // 'INCOME' or 'EXPENSE'
          category: 'Uncategorized',
          date: t.date // date in ISO format (YYYY-MM-DD)
        };
      });

    if (records.length === 0) return { success: true };

    // 2. Bulk Insert Transactions (Existing Code)
    const { error: insertError } = await supabase
      .from('transactions')
      .insert(records);

    if (insertError) throw insertError;

    // 3. UPDATE THE STATEMENT TOTALS (*** NEW STEP ***)
    const { error: updateError } = await supabase
      .from('statements')
      .update({ 
        total_income: totalIncome,
        total_expenses: totalExpense,
        processing_status: 'COMPLETED'
      })
      .eq('id', statementId);

    if (updateError) throw updateError;

    return { success: true };

  } catch (error) {
    console.error('Error saving transactions:', error);
    return { success: false, error };
  }
};

export const updateCategory = async (transactionId: string, newCategory: string) => {
  try {
    const { error } = await supabase
      .from('transactions')
      .update({ category: newCategory })
      .eq('id', transactionId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating category:', error);
    return { success: false, error };
  }
};

export const deleteStatement = async (statementId: string) => {
  try {
    // 1. Delete the Statement
    // (If your DB is set up correctly with 'Cascade', this kills the transactions too.
    // If not, we will fix that in the SQL step below.)
    const { error } = await supabase
      .from('statements')
      .delete()
      .eq('id', statementId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting statement:', error);
    return { success: false, error };
  }
};

// services/statementService.ts
// services/statementService.ts

export const searchTransactions = async (userId: string, query: string) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        statements!transactions_statement_id_fkey ( month, year )
      `)
      // Search description OR category
      .or(`description.ilike.%${query}%,category.ilike.%${query}%`)
      // --- DELETED THE .eq('statements....') LINE ---
      // We rely on RLS to filter users automatically
      .order('date', { ascending: false });

    if (error) throw error;
    
    // Filter out any broken links just in case
    return data.filter(item => item.statements !== null);
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};