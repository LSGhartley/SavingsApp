import React from 'react';
import { StyleSheet, Text, View, Pressable, Image, SafeAreaView, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { classifyTransaction } from '@/services/aiService';

export default function ProfileScreen() {
  const { user } = useAuth();

  const handleTestAI = async () => {
  Alert.alert("Testing AI...", "Sending 'McDonalds' to ChatGPT...");
  const result = await classifyTransaction("McDonalds 555 Main St", 15.50);
  Alert.alert("AI Result", `ChatGPT thinks this is: ${result}`);
};

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert("Error", error.message);
    // The AuthProvider in _layout.tsx will automatically detect the logout 
    // and kick you back to the Login screen.
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Profile Section */}
      <View style={styles.header}>
        <View style={styles.avatar}>
           <Text style={styles.avatarText}>
             {user?.email?.charAt(0).toUpperCase() || "U"}
           </Text>
        </View>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.badge}>Free Plan</Text>
      </View>

      {/* Settings Options */}
      <View style={styles.menu}>
        
        <Pressable style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="settings-outline" size={24} color="#333" />
            <Text style={styles.menuText}>App Preferences</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </Pressable>

        <Pressable style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#333" />
            <Text style={styles.menuText}>Security & Privacy</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </Pressable>

        <Pressable style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <Ionicons name="help-circle-outline" size={24} color="#333" />
            <Text style={styles.menuText}>Help & Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </Pressable>

      </View>
{/* TEST BUTTON */}
  <Pressable 
    style={[styles.logoutButton, { borderColor: '#48BB78', marginBottom: 10 }]} 
    onPress={handleTestAI}
  >
    <Text style={{color: '#48BB78', fontWeight: 'bold'}}>Test AI Connection</Text>
  </Pressable>
      {/* Logout Button */}
      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>

      <Text style={styles.version}>Version 1.0.0 (Week 3 Build)</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: '#fff',
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#2D3748',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 15
  },
  avatarText: { fontSize: 32, color: '#fff', fontWeight: 'bold' },
  email: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  badge: { 
    backgroundColor: '#E2E8F0', paddingHorizontal: 10, paddingVertical: 4, 
    borderRadius: 10, fontSize: 12, color: '#4A5568', fontWeight: 'bold' 
  },
  
  menu: { backgroundColor: '#fff', paddingHorizontal: 20 },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0'
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  menuText: { fontSize: 16, color: '#333' },

  logoutButton: {
    margin: 20, backgroundColor: '#fff', padding: 18, borderRadius: 12,
    alignItems: 'center', borderWidth: 1, borderColor: '#F56565'
  },
  logoutText: { color: '#F56565', fontWeight: 'bold', fontSize: 16 },
  version: { textAlign: 'center', color: '#999', fontSize: 12 }
});