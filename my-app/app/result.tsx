import React from 'react';
import { StyleSheet, Text, View, Pressable, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function ResultScreen() {
  const router = useRouter();
    // 1. Grab params from the URL (we passed these from Verify screen)
    // 1. Get the real numbers
  const params = useLocalSearchParams();
  const income = parseFloat(params.income as string || '0');
  const expense = parseFloat(params.expense as string || '0');
  
  // 2. Do the Math
  const potentialSavings = income - expense;
  const isPositive = potentialSavings > 0;

  const handleDone = () => {
    // Navigate back to the very start (Home)
    router.dismissAll(); 
    router.replace('/'); 
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        <Text style={styles.emoji}>🎉</Text>
        
        <Text style={styles.label}>NEXT MONTH'S POTENTIAL</Text>
        {/* Dynamic Number */}
        <Text style={styles.bigNumber}>
          R{potentialSavings.toFixed(2)}
        </Text>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>The Breakdown</Text>
          <Text style={styles.cardBody}>
            Income: <Text style={styles.bold}>R{income.toFixed(2)}</Text>
            {"\n"}
            Expenses: <Text style={styles.bold}>R{expense.toFixed(2)}</Text>
            {"\n\n"}
            {isPositive 
              ? (
                <>
                  You have a surplus! Consider moving at least <Text style={styles.bold}>R{(potentialSavings * 0.10).toFixed(2)}</Text> to a savings account immediately.
                </>
              )
              : "You are spending more than you earn. Review your largest expenses."
            }
          </Text>
        </View>

      </View>

      <View style={styles.footer}>
        <Pressable style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.buttonText}>Save to Dashboard</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2D3748' }, // Dark background for impact
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  
  emoji: { fontSize: 60, marginBottom: 20 },
  label: { color: '#A0AEC0', letterSpacing: 1, fontWeight: 'bold', marginBottom: 10 },
  bigNumber: { color: '#fff', fontSize: 50, fontWeight: 'bold', marginBottom: 40 },
  
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    borderRadius: 16,
    width: '100%',
  },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  cardBody: { color: '#E2E8F0', lineHeight: 24, fontSize: 16 },
  bold: { fontWeight: 'bold', color: '#fff' },

  footer: { padding: 20 },
  doneButton: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: { color: '#2D3748', fontWeight: 'bold', fontSize: 16 },
});