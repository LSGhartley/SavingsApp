import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, SafeAreaView, StatusBar} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons'; // For nice icons
import { Modal, Pressable, TouchableOpacity } from 'react-native'; // Add Modal, TouchableOpacity
import { CATEGORIES } from '../../constants/Categories'; // Import your list
import { updateCategory } from '../../services/statementService'; // Import logic
import { ExpensePieChart } from '../../components/ExpensePieChart';
import { Alert } from 'react-native';
import { deleteStatement } from '../../services/statementService';


interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  date: string;
}

interface StatementMeta {
  month: number;
  year: number;
  total_income: number;
  total_expenses: number;
}

export default function StatementDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [meta, setMeta] = useState<StatementMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleOpenCategory = (item: Transaction) => {
    setSelectedTransaction(item);
    setModalVisible(true);
    };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleSelectCategory = async (category: string) => {
    if (!selectedTransaction) return;

    // 1. Optimistic Update (Update UI immediately so it feels fast)
    const updatedList = transactions.map(t => 
      t.id === selectedTransaction.id ? { ...t, category: category } : t
    );
    setTransactions(updatedList);
    setModalVisible(false);

    // 2. Save to Database in background
    await updateCategory(selectedTransaction.id, category);
  };

  const fetchData = async () => {
    try {
      // 1. Fetch the Parent Statement (for the Header)
      const { data: stmtData, error: stmtError } = await supabase
        .from('statements')
        .select('month, year, total_income, total_expenses')
        .eq('id', id)
        .single();
      
      if (stmtError) throw stmtError;
      setMeta(stmtData);

      // 2. Fetch the Transactions (for the List)
      const { data: transData, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('statement_id', id)
        .order('amount', { ascending: false });

      if (transError) throw transError;
      setTransactions(transData || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
  Alert.alert(
    "Delete Statement",
    "Are you sure? This will remove all transactions associated with this upload.",
    [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive", 
        onPress: async () => {
          setLoading(true);
          const result = await deleteStatement(id as string);
          if (result.success) {
            router.back(); // Go back to Dashboard
          } else {
            alert("Failed to delete. Please try again.");
            setLoading(false);
          }
        }
      }
    ]
  );
};

  // Helper to format date "2025-11-01" -> "Nov 1"
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('default', { month: 'short', day: 'numeric' });
  };

  const renderHeader = () => {
    if (!meta) return null;
    const savings = (meta.total_income - meta.total_expenses) / 100;
    const isPositive = savings > 0;

    // Convert month number to name
    const monthName = new Date(meta.year, meta.month - 1).toLocaleString('default', { month: 'long' });

    return (
      <View style={styles.headerContainer}>
        <Text style={styles.headerDate}>{monthName} {meta.year}</Text>
        <Text style={styles.headerLabel}>NET SAVINGS</Text>
        <Text style={[styles.headerAmount, { color: isPositive ? '#48BB78' : '#F56565' }]}>
          {isPositive ? '+' : ''}R{savings.toFixed(2)}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
             <Text style={styles.statLabel}>INCOME</Text>
             <Text style={styles.statValue}>R{(meta.total_income / 100).toFixed(0)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
             <Text style={styles.statLabel}>EXPENSES</Text>
             <Text style={styles.statValue}>R{(meta.total_expenses / 100).toFixed(0)}</Text>
          </View>
        </View>
      </View>
    );
  };

const renderItem = ({ item }: { item: Transaction }) => {
    // Find icon based on current category (default to Uncategorized if missing)
    // Note: You need to ensure your 'transactions' state includes the 'category' field now!
    // If TypeScript complains, add 'category: string' to your Transaction interface.
    const catDetails = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[8];

    return (
      <TouchableOpacity 
        style={styles.row} 
        onPress={() => handleOpenCategory(item)} // <--- CLICK LISTENER
        activeOpacity={0.7}
      >
        <View style={styles.rowLeft}>
          <View style={[styles.iconBox, { backgroundColor: catDetails.color + '20' }]}>
            <Ionicons 
              name={catDetails.icon as any} 
              size={20} 
              color={catDetails.color} 
            />
          </View>
          <View>
            <Text style={styles.desc}>{item.description}</Text>
            {/* Show Category Name */}
            <Text style={styles.date}>{catDetails.id} • {formatDate(item.date)}</Text>
          </View>
        </View>
        <Text style={[
          styles.amount, 
          item.type === 'INCOME' ? styles.income : styles.expense
        ]}>
          {item.type === 'INCOME' ? '+' : '-'}R{ (item.amount / 100).toFixed(2) }
        </Text>
      </TouchableOpacity>
    );
  };
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
      options={{ 
        title: '', 
        headerBackTitle: 'Dashboard', 
        headerShadowVisible: false, 
        headerStyle: { backgroundColor: '#F5F5F5' },
        headerRight: () => (
          <TouchableOpacity onPress={handleDelete} style={{ padding: 10 }}>
            {/* I added padding to make the touch area bigger */}
            <Ionicons name="trash-outline" size={24} color="#F56565" />
          </TouchableOpacity>
        )
      }} 
    />
      <StatusBar barStyle="dark-content" />

      {loading ? (
        <ActivityIndicator style={{marginTop: 50}} color="#000" />
      ) : (
        <FlatList
    data={transactions}
    keyExtractor={(item) => item.id}
    renderItem={renderItem}
    // MODIFIED HEADER: Combines Stats + Pie Chart
    ListHeaderComponent={
      <View>
        {renderHeader()} 
        {/* Pass the transactions to the chart */}
        <ExpensePieChart transactions={transactions} />
        <Text style={{fontSize: 16, fontWeight: 'bold', marginVertical: 15, color: '#555'}}>Transactions</Text>
      </View>
    }
    contentContainerStyle={styles.listContent}
  />
      )}
      {/* CATEGORY MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <Text style={styles.modalSub}>{selectedTransaction?.description}</Text>
            
            <View style={styles.grid}>
              {CATEGORIES.map((cat) => (
                <Pressable 
                  key={cat.id} 
                  style={styles.gridItem}
                  onPress={() => handleSelectCategory(cat.id)}
                >
                  <View style={[styles.gridIcon, { backgroundColor: cat.color }]}>
                    <Ionicons name={cat.icon as any} size={24} color="#fff" />
                  </View>
                  <Text style={styles.gridLabel}>{cat.id}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  listContent: { padding: 20 },
  
  // Header Styles
  headerContainer: {
    marginBottom: 25,
    alignItems: 'center',
  },
  headerDate: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  headerLabel: { fontSize: 12, fontWeight: '700', color: '#999', letterSpacing: 1 },
  headerAmount: { fontSize: 36, fontWeight: 'bold', marginVertical: 10 },
  
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    width: '100%',
    justifyContent: 'space-around',
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    marginTop: 10,
  },
  statItem: { alignItems: 'center' },
  statLabel: { fontSize: 10, color: '#999', fontWeight: 'bold', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  divider: { width: 1, backgroundColor: '#eee' },

  // List Item Styles
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#f7f7f7',
    justifyContent: 'center', alignItems: 'center'
  },
  desc: { fontSize: 15, fontWeight: '600', color: '#333' },
  date: { fontSize: 12, color: '#999' },
  amount: { fontSize: 15, fontWeight: 'bold' },
  income: { color: '#48BB78' }, 
  expense: { color: '#333' },

  // Modal Styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, height: '50%'
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
  modalSub: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '30%', alignItems: 'center', marginBottom: 20 },
  gridIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  gridLabel: { fontSize: 12, color: '#333' },
  closeButton: { marginTop: 10, padding: 15, alignItems: 'center' },
  closeText: { fontSize: 16, color: '#666', fontWeight: 'bold' }
});