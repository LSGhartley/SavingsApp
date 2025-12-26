import React from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { CATEGORIES } from '../constants/Categories';

const screenWidth = Dimensions.get('window').width;

interface Transaction {
  amount: number;
  category: string;
  type: string;
}

export const ExpensePieChart = ({ transactions }: { transactions: Transaction[] }) => {
  // 1. Filter only Expenses (Ignore Income)
  const expenses = transactions.filter(t => t.type === 'EXPENSE');

  if (expenses.length === 0) return null;

  // 2. Group by Category
  // We create a map: { "Food": 5000, "Transport": 2000 }
  const totals: Record<string, number> = {};
  
  expenses.forEach(t => {
    const cat = t.category || 'Uncategorized';
    if (!totals[cat]) totals[cat] = 0;
    totals[cat] += t.amount;
  });

  // 3. Format for the Chart Library
  const chartData = Object.keys(totals).map(catName => {
    const catDetails = CATEGORIES.find(c => c.id === catName) || CATEGORIES[8]; // Default to gray
    
    return {
      name: catName,
      population: totals[catName] / 100, // Convert cents to dollars
      color: catDetails.color,
      legendFontColor: "#7F7F7F",
      legendFontSize: 12
    };
  });

  // Sort largest to smallest so the chart looks neat
  chartData.sort((a, b) => b.population - a.population);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Spending Breakdown</Text>
      <PieChart
        data={chartData}
        width={screenWidth - 40}
        height={220}
        chartConfig={{
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        accessor={"population"}
        backgroundColor={"transparent"}
        paddingLeft={"15"}
        center={[10, 0]}
        absolute // Shows numbers (values) instead of percentages on the chart
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginVertical: 10,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    alignSelf: 'flex-start',
    color: '#333'
  }
});