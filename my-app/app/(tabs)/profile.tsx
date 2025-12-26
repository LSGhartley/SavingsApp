import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, RefreshControl, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthProvider'; // Adjust path if needed
import { supabase } from '@/lib/supabase';        // Adjust path if needed

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [statements, setStatements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load statements when screen opens
  useEffect(() => {
    fetchStatements();
  }, []);

  const fetchStatements = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('statements')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
      
    if (data) setStatements(data);
    setLoading(false);
  };

  const handleDelete = async (id: string, fileName: string) => {
    Alert.alert("Delete Statement", `Are you sure you want to delete ${fileName}?`, [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive",
        onPress: async () => {
          // Supabase Cascade will automatically delete the transactions/chunks too
          const { error } = await supabase.from('statements').delete().eq('id', id);
          if (error) Alert.alert("Error", error.message);
          else fetchStatements(); // Refresh list
        }
      }
    ]);
  };

  // Helper to get initials
  const getInitials = () => {
    const email = user?.email || "User";
    return email.substring(0, 2).toUpperCase();
  };

  const renderStatement = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        <Ionicons name="document-text" size={24} color="#4A5568" />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.bank}>{item.origin_bank || 'Unknown Bank'}</Text>
        <Text style={styles.meta}>
          {item.month}/{item.year} • {item.account_number || '****'}
        </Text>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item.id, item.raw_text)} style={{padding: 5}}>
        <Ionicons name="trash-outline" size={20} color="#E53E3E" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials()}</Text>
        </View>
        <Text style={styles.name}>My Profile</Text>
        <Text style={styles.email}>{user?.email}</Text>
        
        <TouchableOpacity 
          style={styles.logoutBtn} 
          onPress={() => signOut()} // Call the function
        >
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Data</Text>
        <Text style={styles.sectionSub}>Manage your uploaded statements</Text>
        
        {loading && statements.length === 0 ? (
          <ActivityIndicator style={{marginTop: 20}} />
        ) : (
          <FlatList
            data={statements}
            keyExtractor={i => i.id}
            renderItem={renderStatement}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchStatements} />}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No statements uploaded yet.</Text>
            }
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC' },
  header: { alignItems: 'center', padding: 30, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#EDF2F7' },
  avatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#2D3748', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#2D3748' },
  email: { fontSize: 14, color: '#718096', marginBottom: 15 },
  logoutBtn: { paddingVertical: 8, paddingHorizontal: 20, backgroundColor: '#EDF2F7', borderRadius: 20 },
  logoutText: { color: '#2D3748', fontWeight: '600', fontSize: 13 },

  section: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3748' },
  sectionSub: { fontSize: 13, color: '#718096', marginBottom: 15 },
  
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#EDF2F7', justifyContent: 'center', alignItems: 'center' },
  bank: { fontWeight: '600', fontSize: 15, color: '#2D3748' },
  meta: { fontSize: 12, color: '#718096', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#A0AEC0', marginTop: 20 }
});