import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  ScrollView, 
  Pressable, 
  StatusBar, 
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase'; // Adjust path if needed (e.g. '../lib/supabase')
import { useAuth } from '@/contexts/AuthProvider'; // Adjust path if needed

// Define the shape of our data
interface Statement {
  id: string;
  month: number;
  year: number;
  total_income: number; // Stored as cents
  total_expenses: number; // Stored as cents
  created_at: string;
}

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 1. The Fetch Function
  const fetchStatements = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('statements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }); // Newest first

      if (error) throw error;
      setStatements(data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 2. Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchStatements();
    }, [user])
  );

  // 3. Helper Logic
  const hasData = statements.length > 0;
  const latestStatement = hasData ? statements[0] : null;
  
  // Calculate potential (Income - Expenses) / 100 to convert cents to dollars
  const potentialSavings = latestStatement 
    ? (latestStatement.total_income - latestStatement.total_expenses) / 100 
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* ZONE 1: HEADER */}
      <View style={styles.headerContainer}>
        <View style={styles.greetingRow}>
          <Text style={styles.greetingText}>
            Hello, {user?.email?.split('@')[0]} 👋
          </Text>
          <View style={styles.profileIcon} />
        </View>

        <View style={styles.searchBar}>
          <Text style={styles.searchPlaceholder}>Ask AI: "How much did I spend?"</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            fetchStatements();
          }} />
        }
      >
        
        {/* ZONE 2: HERO CARD */}
        {loading ? (
           <View style={[styles.card, {justifyContent:'center', alignItems:'center'}]}>
             <ActivityIndicator color="#000" />
           </View>
        ) : (
          <View style={[styles.card, hasData ? styles.activeCard : styles.emptyCard]}>
            {hasData ? (
              // State B: Active Data
              <View>
                <Text style={styles.cardLabel}>
                  Result for {latestStatement?.month}/{latestStatement?.year}
                </Text>
                <Text style={styles.bigNumber}>
                  R{potentialSavings.toFixed(2)}
                </Text>
                <View style={styles.trendTag}>
                  <Text style={styles.trendText}>Based on last upload</Text>
                </View>
              </View>
            ) : (
              // State A: Empty State
              <View style={styles.centerContent}>
                <Text style={styles.emptyIcon}>📄</Text>
                <Text style={styles.emptyTitle}>No statements yet</Text>
                <Text style={styles.emptySubtext}>
                  Upload your last bank statement to unlock savings insights.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ZONE 3: ACTIONS & HISTORY */}
        <Pressable 
          style={styles.uploadButton}
          onPress={() => router.push('/modal')}
        >
          <Text style={styles.uploadButtonText}>[ + ] Upload New Statement</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Recent Uploads</Text>
        
        {statements.map((stmt) => (
          <View key={stmt.id} style={styles.historyItem}>
            <View>
               <Text style={styles.historyDate}>Statement {stmt.month}/{stmt.year}</Text>
               <Text style={{fontSize:12, color:'#999'}}>
                 In: R{(stmt.total_income/100).toFixed(0)} • Out: R{(stmt.total_expenses/100).toFixed(0)}
               </Text>
            </View>
            <Text style={styles.statusDone}>Processed</Text>
          </View>
        ))}
        
        {!hasData && !loading && (
          <Text style={{color:'#999', textAlign:'center', marginTop: 20}}>
            Your history will appear here.
          </Text>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// Reuse the exact same styles from Day 2
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  headerContainer: { padding: 20, backgroundColor: '#fff', paddingTop: 50 },
  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  greetingText: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  profileIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ddd' },
  searchBar: { backgroundColor: '#f0f0f0', padding: 12, borderRadius: 10 },
  searchPlaceholder: { color: '#888' },
  scrollContent: { padding: 20 },
  card: { padding: 25, borderRadius: 16, marginBottom: 20, minHeight: 180, justifyContent: 'center' },
  emptyCard: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#e0e0e0', borderStyle: 'dashed' },
  activeCard: { backgroundColor: '#2D3748', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5 },
  centerContent: { alignItems: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  emptySubtext: { textAlign: 'center', color: '#666', lineHeight: 20 },
  cardLabel: { color: '#A0AEC0', marginBottom: 5, textTransform: 'uppercase', fontSize: 12, fontWeight: '700' },
  bigNumber: { color: '#fff', fontSize: 42, fontWeight: 'bold' },
  trendTag: { backgroundColor: '#48BB78', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginTop: 10 },
  trendText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  uploadButton: { backgroundColor: '#000', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 30 },
  uploadButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#555' },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#fff', borderRadius: 8, marginBottom: 10, alignItems: 'center' },
  historyDate: { fontWeight: '600', fontSize: 16 },
  statusDone: { color: 'green', fontWeight: 'bold', fontSize: 12 },
});