import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, Pressable, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; 
import { parseBankText, ParsedTransaction } from '../utils/parser';
import { saveTransactions } from '../services/statementService';
// 1. IMPORT THE AI SERVICE
import { classifyTransaction } from '../services/aiService';
import { supabase } from '../lib/supabase';

// Extend the interface locally to include category
interface TransactionWithCategory extends ParsedTransaction {
  category?: string;
}

export default function VerifyScreen() {
  const router = useRouter();
  // 1. ADD 'filePath' to this line:
  const { text, statementId, year, filePath } = useLocalSearchParams();

  const [items, setItems] = useState<TransactionWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Initializing...'); // To show "Analyzing..."

// 2. UPDATE this useEffect to watch for 'filePath':
  useEffect(() => {
    if (text || filePath) { // Check for EITHER one
      runAIProcess();
    }
  }, [text, filePath]);

  // 2. THE NEW SMART PROCESS FUNCTION
const runAIProcess = async () => {
    try {
      let initialData: any[] = [];

      // ---------------------------------------------------------
      // 1. EXTRACT DATA (Source: PDF or Text Paste?)
      // ---------------------------------------------------------
      
      // CASE A: It's a PDF File (from Supabase Storage)
      if (filePath) {
        setStatus("Reading PDF on server...");
        
        const { data, error } = await supabase.functions.invoke('process-pdf', {
          body: { filePath: filePath },
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error || 'Server processing failed');

        // Map the server result to match our app's transaction format
        // (We generate a temporary ID using the index)
        initialData = data.data.map((t: any, index: number) => ({
          id: `pdf-${index}`, 
          date: t.date,
          desc: t.desc, 
          amount: t.amount,
          type: t.type.toLowerCase(), // Ensure 'expense'/'income' is lowercase
          selected: true
        }));
      } 
      
      // CASE B: It's Pasted Text (The old way)
      else if (text) {
        const decodedText = decodeURIComponent(text as string);
        initialData = parseBankText(decodedText, parseInt(year as string || '2025'));
      }

      // ---------------------------------------------------------
      // 2. ENRICH DATA (The "AI Brain")
      // ---------------------------------------------------------
      
      if (initialData.length === 0) {
        Alert.alert("No Data", "Could not find any transactions.");
        setLoading(false);
        return;
      }

      setStatus(`Categorizing ${initialData.length} transactions...`);

      // Run your existing categorization logic on the extracted data
      const enrichedItems = await Promise.all(
        initialData.map(async (item) => {
          // Call the API
          const predictedCategory = await classifyTransaction(item.desc, item.amount);
          
          // Return item with the new category
          return { 
            ...item, 
            category: predictedCategory 
          };
        })
      );

      setItems(enrichedItems);

    } catch (error: any) {
      console.error(error);
      Alert.alert("Processing Error", error.message || "Something went wrong");
      
      // Fallback only works if we had text to parse
      if (text) {
         const decodedText = decodeURIComponent(text as string);
         setItems(parseBankText(decodedText, parseInt(year as string || '2025')));
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (id: string) => {
    setItems(current => 
      current.map(item => item.id === id ? { ...item, selected: !item.selected } : item)
    );
  };

  const totalIncome = items
    .filter(i => i.type === 'income' && i.selected)
    .reduce((sum, i) => sum + i.amount, 0);
    
  const totalExpense = items
    .filter(i => i.type === 'expense' && i.selected)
    .reduce((sum, i) => sum + i.amount, 0);

  const handleConfirm = async () => {
    if (!statementId) {
      alert("Error: Missing Statement ID");
      return;
    }

    setLoading(true);
    setStatus("Saving to database...");

    // 3. Save items (now including the 'category' field!)
    const result = await saveTransactions(statementId as string, items);

    if (result.success) {
      const income = items.filter(i => i.selected && i.type === 'income').reduce((s, i) => s + i.amount, 0);
      const expense = items.filter(i => i.selected && i.type === 'expense').reduce((s, i) => s + i.amount, 0);
      
      router.push({
        pathname: '/result',
        params: { income, expense, statementId: statementId as string }
      });
    } else {
      alert("Failed to save data. Try again.");
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={{ marginTop: 20, color: '#666', fontWeight: '600' }}>{status}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Verify Data</Text>
        <Text style={styles.subtitle}>We found {items.length} transactions.</Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryCol}>
          <Text style={styles.label}>Income</Text>
          <Text style={styles.incomeText}>+R{totalIncome.toFixed(2)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryCol}>
          <Text style={styles.label}>Expenses</Text>
          <Text style={styles.expenseText}>-R{totalExpense.toFixed(2)}</Text>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => toggleItem(item.id)}>
            <View style={styles.rowLeft}>
              <Ionicons 
                name={item.selected ? "checkbox" : "square-outline"} 
                size={24} 
                color={item.selected ? "#000" : "#ccc"} 
              />
              <View style={{marginLeft: 10}}>
                <Text style={{fontSize: 12, color: '#999'}}>{item.date}</Text>
                
                {/* 4. SHOW PREDICTED CATEGORY */}
                <Text style={[styles.itemDesc, !item.selected && styles.dimmed]}>
                  {item.desc}
                </Text>
                <Text style={{ fontSize: 10, color: '#48BB78', fontWeight: '700', marginTop: 2 }}>
                  AI: {item.category || 'Uncategorized'}
                </Text>
              </View>
            </View>
            <Text style={[
              styles.itemAmount, 
              item.type === 'income' ? styles.incomeText : styles.expenseText,
              !item.selected && styles.dimmed
            ]}>
              {item.type === 'income' ? '+' : '-'}R{item.amount.toFixed(2)}
            </Text>
          </Pressable>
        )}
      />

      <View style={styles.footer}>
        <Pressable 
          style={styles.confirmButton} 
          onPress={handleConfirm}
        >
          <Text style={styles.buttonText}>Confirm & Calculate</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#666', marginTop: 5 },
  
  summaryCard: {
    flexDirection: 'row',
    margin: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    justifyContent: 'space-between'
  },
  summaryCol: { flex: 1, alignItems: 'center' },
  divider: { width: 1, backgroundColor: '#eee' },
  label: { fontSize: 12, color: '#999', textTransform: 'uppercase' },
  incomeText: { color: '#48BB78', fontWeight: 'bold', fontSize: 16 },
  expenseText: { color: '#F56565', fontWeight: 'bold', fontSize: 16 },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 8,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 }, // Added flex:1 to prevent overlap
  itemDesc: { fontSize: 16, fontWeight: '500' },
  itemAmount: { fontWeight: 'bold' },
  dimmed: { opacity: 0.3 },

  footer: { padding: 20, backgroundColor: '#fff' },
  confirmButton: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});