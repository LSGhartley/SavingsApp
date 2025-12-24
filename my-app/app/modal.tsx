import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { uploadStatement } from '../services/statementService';
import { useAuth } from '../contexts/AuthProvider';

export default function ModalScreen() {
  const { user } = useAuth(); // <--- Get the real user
  const router = useRouter();
  
  // State for the form
  const [month, setMonth] = useState('11'); // Default to current month (example)
  const [year, setYear] = useState('2025');
  const [rawText, setRawText] = useState('');

  const handleNext = async () => {
    // A. Visual Feedback: Change button text or show spinner (Simple alert for now)
    console.log("Saving to Supabase...");
    
    // B. Call the service
    // HARDCODED USER ID FOR TESTING: 
    // Go to Supabase -> Authentication -> Users. Copy a UUID or create a fake one if empty.
    // If you have NO users in Supabase yet, create a dummy row in 'profiles' table and use that ID.
    const TEST_USER_ID = 'fe0c2354-7ea8-4bf9-83b4-0d9958dbff12';
  
    const result = await uploadStatement({
      userId: user?.id as string,  // <--- Pass the real ID
      month: parseInt(month),
      year: parseInt(year),
      rawText,
    });

    if (result.success) {
      // URL Encode the text so it doesn't break the link
      const encodedText = encodeURIComponent(rawText);
      console.log("Success! Statement ID:", result.data.id);
       // Pass the text AND the Statement ID (we need this to save transactions later)
    console.log("DEBUG RAW TEXT:", rawText);
    // Add &year=${year} to the end
      router.push(`/verify?text=${encodedText}&statementId=${result.data.id}&year=${year}`);
    } else {
      alert("Error saving statement. Please try again.");
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>New Statement</Text>
        <Text style={styles.subtitle}>Copy text from your bank PDF or CSV and paste it here.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Date Selection */}
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Month (1-12)</Text>
            <TextInput 
              style={styles.input} 
              keyboardType="numeric"
              value={month}
              onChangeText={setMonth}
              maxLength={2}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Year</Text>
            <TextInput 
              style={styles.input} 
              keyboardType="numeric"
              value={year}
              onChangeText={setYear}
              maxLength={4}
            />
          </View>
        </View>

        {/* The Big Paste Area */}
        <Text style={styles.label}>Statement Data</Text>
        <TextInput
          style={styles.textArea}
          multiline
          placeholder="Paste your transaction history here...
          
Example:
Nov 01   Uber         $15.20
Nov 02   Starbucks    $5.40"
          placeholderTextColor="#999"
          value={rawText}
          onChangeText={setRawText}
          textAlignVertical="top" // Important for Android
        />

        {/* Action Button */}
        <Pressable style={styles.processButton} onPress={handleNext}>
          <Text style={styles.buttonText}>Process Data →</Text>
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginTop: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  scrollContent: {
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  inputGroup: {
    width: '48%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
    height: 250, // Tall box for pasting
    marginBottom: 20,
  },
  processButton: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 40,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});