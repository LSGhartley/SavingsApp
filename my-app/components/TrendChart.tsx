import React from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

// Get screen width to make chart full width
const screenWidth = Dimensions.get('window').width;

interface TrendChartProps {
  labels: string[]; // e.g., ["Jan", "Feb", "Mar"]
  data: number[];   // e.g., [500, 1200, 800]
}

export const TrendChart = ({ labels, data }: TrendChartProps) => {
  // Guard Clause: If no data, show nothing (or a placeholder)
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Not enough data to show trends</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Savings Trend (6 Months)</Text>
      
      <LineChart
        data={{
          labels: labels,
          datasets: [
            {
              data: data,
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`, // Line color
              strokeWidth: 2 
            }
          ]
        }}
        width={screenWidth - 40} // Full width minus padding
        height={220}
        yAxisLabel="R"
        yAxisSuffix=""
        yAxisInterval={1} // Optional, defaults to 1
        chartConfig={{
          backgroundColor: "#2D3748",
          backgroundGradientFrom: "#2D3748", // Dark Blue (Matches your card)
          backgroundGradientTo: "#1A202C",   // Slightly darker
          decimalPlaces: 0, // No cents on the axis
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          style: {
            borderRadius: 16
          },
          propsForDots: {
            r: "6",
            strokeWidth: "2",
            stroke: "#48BB78" // Green dots for money
          }
        }}
        bezier // Makes the line curvy
        style={{
          marginVertical: 8,
          borderRadius: 16
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    alignItems: 'center'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    alignSelf: 'flex-start',
    marginLeft: 10
  },
  emptyContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eee',
    borderRadius: 12,
    marginBottom: 20
  },
  emptyText: {
    color: '#999'
  }
});