import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

// Define the shape of our grouped data
interface CategoryGroup {
  name: string;
  total: number;
  color: string;
  count: number;
}

export default function ResultScreen() {
  const router = useRouter();
  const { income, expense, statementId } = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [breakdown, setBreakdown] = useState<CategoryGroup[]>([]);

  useEffect(() => {
    if (statementId) fetchCategoryBreakdown();
  }, [statementId]);

  const fetchCategoryBreakdown = async () => {
    // 1. Fetch all expenses for this statement
    const { data, error } = await supabase
      .from('transactions')
      .select('category, amount')
      .eq('statement_id', statementId)
      .eq('type', 'EXPENSE');

    if (error || !data) {
      setLoading(false);
      return;
    }

    // 2. Group by Category manually
    const groups: Record<string, number> = {};
    const counts: Record<string, number> = {};

    data.forEach((t: any) => {
      const cat = t.category || 'Uncategorized';
      groups[cat] = (groups[cat] || 0) + t.amount;
      counts[cat] = (counts[cat] || 0) + 1;
    });

    // 3. Convert to Array and Sort by highest spend
    const result = Object.keys(groups).map(cat => ({
      name: cat,
      total: groups[cat],
      count: counts[cat],
      color: getColorForCategory(cat)
    })).sort((a, b) => b.total - a.total); // Highest first

    setBreakdown(result);
    setLoading(false);
  };

  // Helper to give nice colors
  const getColorForCategory = (cat: string) => {
    const colors: Record<string, string> = {
      'Food': '#F6E05E',
      'Transport': '#F6AD55',
      'Utilities': '#63B3ED',
      'Entertainment': '#9F7AEA',
      'Shopping': '#F687B3',
      'Health': '#48BB78',
      'Uncategorized': '#CBD5E0'
    };
    return colors[cat] || '#CBD5E0';
  };

  const formatMoney = (cents: any) => {
    const amount = parseFloat(cents) / 100; // Convert cents to dollars/rands
    return amount.toFixed(2);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 25 }}>
        
        {/* Success Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark" size={40} color="#fff" />
          </View>
          <Text style={styles.title}>Analysis Complete!</Text>
          <Text style={styles.subtitle}>Your statement has been processed.</Text>
        </View>

        {/* Big Numbers Card */}
        <View style={styles.card}>
          <View style={styles.row}>
            <View>
              <Text style={styles.label}>Total Income</Text>
              <Text style={styles.income}>+R{formatMoney(income)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.label}>Total Spent</Text>
              <Text style={styles.expense}>-R{formatMoney(expense)}</Text>
            </View>
          </View>
        </View>

        {/* Category Breakdown */}
        <Text style={styles.sectionTitle}>Where your money went</Text>
        
        {loading ? (
          <ActivityIndicator color="#000" style={{marginTop: 20}} />
        ) : (
          breakdown.map((item) => (
            <View key={item.name} style={styles.catRow}>
              <View style={styles.catLeft}>
                <View style={[styles.dot, { backgroundColor: item.color }]} />
                <View>
                  <Text style={styles.catName}>{item.name}</Text>
                  <Text style={styles.catCount}>{item.count} transactions</Text>
                </View>
              </View>
              <Text style={styles.catAmount}>R{formatMoney(item.total)}</Text>
            </View>
          ))
        )}

      </ScrollView>

      {/* Done Button */}
      <View style={styles.footer}>
        <Pressable style={styles.button} onPress={() => router.push('/(tabs)')}>
          <Text style={styles.buttonText}>Done</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { alignItems: 'center', marginVertical: 30 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#48BB78', justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 5 },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 5 },
  
  card: { backgroundColor: '#f9f9f9', padding: 20, borderRadius: 16, marginBottom: 30, borderWidth: 1, borderColor: '#eee' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 14, color: '#999', marginBottom: 5 },
  income: { fontSize: 24, fontWeight: 'bold', color: '#48BB78' },
  expense: { fontSize: 24, fontWeight: 'bold', color: '#F56565' },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  
  catRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  catName: { fontSize: 16, fontWeight: '600' },
  catCount: { fontSize: 12, color: '#999' },
  catAmount: { fontSize: 16, fontWeight: 'bold' },

  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  button: { backgroundColor: '#000', padding: 18, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});