import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator, Alert, SafeAreaView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthProvider';
import { uploadStatement } from '../services/statementService';

export default function ModalScreen() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  // 1. PICK THE PDF
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'], // Allow PDF or Images
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      // Check size (e.g. limit to 5MB)
      if (file.size && file.size > 5 * 1024 * 1024) {
        Alert.alert("File too large", "Please choose a file under 5MB.");
        return;
      }
      setSelectedFile(file);
    } catch (err) {
      console.error('Pick error:', err);
    }
  };

  // 2. UPLOAD TO SUPABASE
const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    try {
      // 1. Prepare Blob
      const response = await fetch(selectedFile.uri);
      const blob = await response.blob();

      // 2. Upload to Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('statements')
        .upload(fileName, blob, {
          contentType: selectedFile.mimeType || 'application/pdf',
          upsert: false
        });

      if (error) throw error;

      console.log("Upload Success:", data.path);

      // 3. CREATE DATABASE RECORD (The Missing Step!)
      // We use the existing service to create a statement row
      // FIX: Calculate month/year automatically based on today
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // JS months are 0-11
      const currentYear = now.getFullYear();

      const stmtResult = await uploadStatement({
        userId: user.id,
        month: currentMonth, 
        year: currentYear,
        rawText: `PDF Upload: ${selectedFile.name}`, // Placeholder text
      });

      if (!stmtResult.success) {
        throw new Error("Failed to create statement record in database");
      }

      // 4. Navigate with the ID
      router.push({
        pathname: '/verify',
        params: { 
          filePath: data.path,
          fileName: selectedFile.name,
          statementId: stmtResult.data.id, // <--- PASS THE NEW ID HERE
          year: currentYear.toString()
        }
      });

    } catch (error: any) {
      console.error("Upload Error:", error);
      Alert.alert("Upload Failed", error.message);
    } finally {
      setUploading(false);
    }
  };
  // Helper to decode Base64 for Supabase (React Native specific)
  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Upload Statement</Text>
        <Text style={styles.subtitle}>We accept PDF bank statements</Text>
      </View>

      <View style={styles.content}>
        
        {/* DROP ZONE UI */}
        <Pressable style={styles.dropZone} onPress={pickDocument}>
          {selectedFile ? (
            // STATE: File Selected
            <View style={styles.filePreview}>
              <Ionicons name="document-text" size={48} color="#48BB78" />
              <Text style={styles.fileName}>{selectedFile.name}</Text>
              <Text style={styles.fileSize}>
                {(selectedFile.size ? selectedFile.size / 1024 : 0).toFixed(0)} KB
              </Text>
              <Text style={styles.changeText}>Tap to change</Text>
            </View>
          ) : (
            // STATE: Empty
            <View style={styles.emptyPreview}>
              <View style={styles.iconCircle}>
                <Ionicons name="cloud-upload-outline" size={32} color="#666" />
              </View>
              <Text style={styles.dropText}>Tap to select a PDF</Text>
            </View>
          )}
        </Pressable>

        {/* SECURITY NOTE */}
        <View style={styles.securityNote}>
          <Ionicons name="lock-closed" size={14} color="#666" />
          <Text style={styles.securityText}>
            Your files are encrypted and processed privately.
          </Text>
        </View>

      </View>

      {/* FOOTER ACTION */}
      <View style={styles.footer}>
        <Pressable 
          style={[styles.processButton, (!selectedFile || uploading) && styles.disabledBtn]} 
          onPress={handleUpload}
          disabled={!selectedFile || uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Process with AI →</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// Add 'atob' polyfill for React Native if not present
if (typeof global.atob === 'undefined') {
  global.atob = (input) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = String(input).replace(/=+$/, '');
    let output = '';
    for (
      let bc = 0, bs = 0, buffer, idx = 0;
      (buffer = str.charAt(idx++));
      ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
        ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
        : 0
    ) {
      buffer = chars.indexOf(buffer);
    }
    return output;
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 25, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  subtitle: { fontSize: 15, color: '#666' },
  content: { flex: 1, padding: 25, justifyContent: 'center' },
  
  dropZone: {
    borderWidth: 2, borderColor: '#e0e0e0', borderStyle: 'dashed',
    borderRadius: 20, height: 250, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#fafafa'
  },
  emptyPreview: { alignItems: 'center' },
  iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  dropText: { fontSize: 16, fontWeight: '600', color: '#555' },
  
  filePreview: { alignItems: 'center' },
  fileName: { fontSize: 16, fontWeight: 'bold', marginTop: 10, textAlign: 'center' },
  fileSize: { color: '#999', marginBottom: 10 },
  changeText: { color: '#3182CE', fontWeight: 'bold' },

  securityNote: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, gap: 5 },
  securityText: { color: '#666', fontSize: 12 },

  footer: { padding: 25 },
  processButton: { backgroundColor: '#000', padding: 18, borderRadius: 12, alignItems: 'center' },
  disabledBtn: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});