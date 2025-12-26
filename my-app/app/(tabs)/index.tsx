import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl, Dimensions, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { LineChart } from 'react-native-chart-kit'; // <--- The new library
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthProvider';
import { supabase } from '@/lib/supabase';
import { fetchMonthlyTrends, fetchPreviousMonthData, fetchRecentHabits } from '@/services/dashboardService';


const screenWidth = Dimensions.get("window").width;

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [refreshing, setRefreshing] = useState(false);
  const [chartData, setChartData] = useState<any>(null);
  const [insight, setInsight] = useState<string>('Analyzing your spending...');
  const [insightLoading, setInsightLoading] = useState(true);
// ... inside component ...
const [habitInsight, setHabitInsight] = useState('');
const [habitLoading, setHabitLoading] = useState(false);

  const loadDashboard = async () => {
    if (!user) return;
    setRefreshing(true);

    // 1. Load Chart Data
    const trends = await fetchMonthlyTrends(user.id);
    setChartData(trends);
    // 2. Load AI Insight (Background)
    generateAiInsight();

    // NEW: Yearly Habit Analysis
  generateHabitInsight();

    setRefreshing(false);
  };

  const generateAiInsight = async () => {
    setInsightLoading(true);
    // A. Get raw data
    const txData = await fetchPreviousMonthData(user!.id);
    
    if (txData.length === 0) {
      setInsight("No transactions found for the previous month to analyze.");
      setInsightLoading(false);
      return;
    }

    // B. Ask Cloud Function
    const { data, error } = await supabase.functions.invoke('generate-insight', {
      body: { transactions: txData }
    });

    if (data?.insight) setInsight(data.insight);
    else setInsight("Could not generate insight at this time.");
    
    setInsightLoading(false);
  };

const generateHabitInsight = async () => {
  setHabitLoading(true);

  // 1. Get Aggregated Data (Last 3 Months)
  const summary = await fetchRecentHabits(user!.id);

  if (!summary) {
    setHabitInsight("Upload more statements to unlock your personality!");
    setHabitLoading(false);
    return;
  }

  // 2. Ask AI
  const { data } = await supabase.functions.invoke('analyze-habits', {
    body: { summary } // No need to pass 'year' anymore
  });

  if (data?.result) setHabitInsight(data.result);
  setHabitLoading(false);
};

  // Load on enter
  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadDashboard} />}
      >
        {/* Header */}
   {/* Updated Header */}
<View style={styles.header}>
  <View>
    <Text style={styles.greeting}>Hi {user?.email?.split('@')[0]},</Text>
    <Text style={styles.subGreeting}>Unwrap Your Finances</Text>
  </View>
  <Pressable style={styles.uploadBtn} onPress={() => router.push('/modal')}>
    <Ionicons name="add" size={24} color="#fff" />
  </Pressable>
</View>

{/* ... Chart ... */}

{/* ... Monthly Insight Card ... */}

{/* NEW: HABIT CARD */}
<View style={[styles.insightCard, { borderLeftColor: '#3182CE', backgroundColor: '#EBF8FF' }]}>
  <View style={styles.insightHeader}>
     <Ionicons name="person" size={18} color="#3182CE" />
     <Text style={[styles.insightTitle, { color: '#2B6CB0' }]}>Your Financial Vibe</Text>
  </View>

  {habitLoading ? (
    <ActivityIndicator color="#3182CE" style={{ marginTop: 10 }} />
  ) : (
    <Text style={[styles.insightText, { color: '#2C5282' }]}>{habitInsight}</Text>
  )}
</View>

        {/* Search Bar */}
        <Pressable style={styles.searchBar} onPress={() => router.push('/search')}>
          <Ionicons name="search" size={20} color="#999" style={{ marginRight: 10 }} />
          <Text style={{ color: '#999' }}>Ask AI about your finances...</Text>
        </Pressable>

        {/* 1. NEW: SPENDING TREND CHART */}
        <Text style={styles.sectionTitle}>6 Month Trend (Expenses)</Text>
        {chartData ? (
          <LineChart
            data={chartData}
            width={screenWidth - 40} // Fit to screen with padding
            height={220}
            yAxisLabel="R"
            yAxisSuffix="k" // Optional: Format numbers if huge
            fromZero={true}
            chartConfig={{
              backgroundColor: "#ffffff",
              backgroundGradientFrom: "#ffffff",
              backgroundGradientTo: "#ffffff",
              decimalPlaces: 0, 
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: "6", strokeWidth: "2", stroke: "#000" }
            }}
            bezier // Makes the line curved
            style={{ marginVertical: 8, borderRadius: 16, alignSelf: 'center' }}
          />
        ) : (
          <ActivityIndicator color="#000" />
        )}

        {/* 2. NEW: AI ANALYST CARD */}
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
             <Ionicons name="sparkles" size={18} color="#805AD5" />
             <Text style={styles.insightTitle}>Last Month's Insight</Text>
          </View>
          
          {insightLoading ? (
            <ActivityIndicator color="#805AD5" style={{ marginTop: 10 }} />
          ) : (
            <Text style={styles.insightText}>{insight}</Text>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 20 },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#1A202C' },
  subGreeting: { fontSize: 14, color: '#718096' },
  uploadBtn: { backgroundColor: '#000', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 25, elevation: 1 },
  
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 15, color: '#2D3748' },
  
  insightCard: { backgroundColor: '#FAF5FF', padding: 20, borderRadius: 16, marginTop: 20, borderLeftWidth: 4, borderLeftColor: '#805AD5' },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  insightTitle: { fontSize: 16, fontWeight: 'bold', color: '#6B46C1' },
  insightText: { fontSize: 15, color: '#553C9A', lineHeight: 22 }
});