import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, FlatList, ActivityIndicator, SafeAreaView, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { searchTransactions } from '../services/statementService';
import { useAuth } from '../contexts/AuthProvider';

export default function SearchScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { q } = useLocalSearchParams(); // Initial query from dashboard

  const [query, setQuery] = useState((q as string) || '');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If we came from dashboard with text, search immediately
    if (q) performSearch(q as string);
  }, [q]);

  const performSearch = async (text: string) => {
    setQuery(text);
    if (text.length < 2) return; // Don't search for single letters

    setLoading(true);
    const data = await searchTransactions(user?.id as string, text);
    setResults(data);
    setLoading(false);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.row}>
      <View>
        <Text style={styles.desc}>{item.description}</Text>
        <Text style={styles.sub}>
          {item.category} • {item.statements?.month}/{item.statements?.year}
        </Text>
      </View>
      <Text style={[styles.amount, item.type === 'INCOME' ? styles.income : styles.expense]}>
        {item.type === 'INCOME' ? '+' : '-'}R{ (item.amount / 100).toFixed(2) }
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Search Bar */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={{marginRight: 10}}>
           <Ionicons name="arrow-back" size={24} color="#333" />
        </Pressable>
        <View style={styles.inputWrapper}>
          <Ionicons name="search" size={20} color="#666" style={{marginRight: 8}}/>
          <TextInput
            style={styles.input}
            placeholder="Search Uber, Rent, Food..."
            value={query}
            onChangeText={performSearch}
            autoFocus
          />
        </View>
      </View>

      {/* Results */}
      {loading ? (
        <ActivityIndicator style={{marginTop: 50}} color="#000" />
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{padding: 20}}
          ListEmptyComponent={
            query.length > 0 ? (
              <Text style={styles.empty}>No results found for "{query}"</Text>
            ) : (
              <Text style={styles.empty}>Type to search your history</Text>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { 
    flexDirection: 'row', alignItems: 'center', 
    padding: 15, backgroundColor: '#fff', 
    borderBottomWidth: 1, borderBottomColor: '#eee' 
  },
  inputWrapper: { 
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f0f0f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8
  },
  input: { flex: 1, fontSize: 16 },
  
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10
  },
  desc: { fontSize: 16, fontWeight: '600', color: '#333' },
  sub: { fontSize: 12, color: '#999', marginTop: 4 },
  amount: { fontSize: 16, fontWeight: 'bold' },
  income: { color: '#48BB78' },
  expense: { color: '#333' },
  empty: { textAlign: 'center', marginTop: 50, color: '#999' }
});