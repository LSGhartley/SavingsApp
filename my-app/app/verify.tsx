import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, Pressable, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // Built-in icons in Expo
import { parseBankText, ParsedTransaction } from '../utils/parser';
import { saveTransactions } from '../services/statementService';


export default function VerifyScreen() {
  const router = useRouter();
// Grab 'year' from params (default to 2025 if missing)
const { text, statementId, year } = useLocalSearchParams();

  const [items, setItems] = useState<ParsedTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // 2. Parse on mount
  useEffect(() => {
    if (text) {
      // Decode the URL string back to normal text
      const decodedText = decodeURIComponent(text as string);
      // Pass the year (converted to number)
    const parsedItems = parseBankText(decodedText, parseInt(year as string || '2025'));
    setItems(parsedItems);
    }
    setLoading(false);
  }, [text]);

  // Toggle checkbox logic
  const toggleItem = (id: string) => {
    setItems(current => 
      current.map(item => item.id === id ? { ...item, selected: !item.selected } : item)
    );
  };

  // Simple math for the "Summary" header
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

    setLoading(true); // Show a spinner if you have one, or just wait

    // 1. Save to Supabase
    const result = await saveTransactions(statementId as string, items);

    if (result.success) {
      // 2. Calculate final numbers to pass to the Result Screen
      // (We pass them in URL so the Result screen doesn't have to re-fetch)
      const income = items.filter(i => i.selected && i.type === 'income').reduce((s, i) => s + i.amount, 0);
      const expense = items.filter(i => i.selected && i.type === 'expense').reduce((s, i) => s + i.amount, 0);
      
      router.push({
        pathname: '/result',
        params: { income, expense }
      });
    } else {
      alert("Failed to save data. Try again.");
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Verify Data</Text>
        <Text style={styles.subtitle}>We found {items.length} transactions. Uncheck any you want to ignore.</Text>
      </View>

      {/* Summary Card */}
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

      {/* List */}
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => toggleItem(item.id)}>
            <View style={styles.rowLeft}>
              {/* Checkbox Icon */}
              <Ionicons 
                name={item.selected ? "checkbox" : "square-outline"} 
                size={24} 
                color={item.selected ? "#000" : "#ccc"} 
              />
              <Text style={{fontSize: 12, color: '#999'}}>{item.date}</Text>
              <Text style={[styles.itemDesc, !item.selected && styles.dimmed]}>
                {item.desc}
              </Text>
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

      {/* Footer Action */}
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
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
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