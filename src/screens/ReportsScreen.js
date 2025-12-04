import { Ionicons } from '@expo/vector-icons'; // İkon kütüphanesi
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get("window").width;

export default function ReportsScreen() {
  const [stats, setStats] = useState({
    totalFocusTime: 0,
    todayFocusTime: 0,
    totalDistractions: 0
  });
  const [chartData, setChartData] = useState(null);
  const [barData, setBarData] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const existingData = await AsyncStorage.getItem('focusSessions');
      const sessions = existingData ? JSON.parse(existingData) : [];
      calculateStats(sessions);
    } catch (e) {
      console.error(e);
    }
  };

  // --- YENİ EKLENEN: VERİLERİ SİLME FONKSİYONU ---
  const handleClearData = async () => {
    Alert.alert(
      "Verileri Temizle",
      "Tüm odaklanma geçmişiniz silinecek. Emin misiniz?",
      [
        { text: "Vazgeç", style: "cancel" },
        { 
          text: "Sil", 
          style: "destructive", 
          onPress: async () => {
            await AsyncStorage.removeItem('focusSessions');
            setStats({ totalFocusTime: 0, todayFocusTime: 0, totalDistractions: 0 });
            setChartData(null);
            setBarData(null);
            Alert.alert("Başarılı", "Tüm veriler temizlendi.");
          }
        }
      ]
    );
  };

  const calculateStats = (sessions) => {
    const today = new Date().toISOString().split('T')[0];
    let totalTime = 0;
    let todayTime = 0;
    let totalDistract = 0;
    const categoryCounts = {};

    sessions.forEach(session => {
      totalTime += session.duration;
      totalDistract += session.distractions;

      if (session.date === today) {
        todayTime += session.duration;
      }

      if (categoryCounts[session.category]) {
        categoryCounts[session.category] += session.duration;
      } else {
        categoryCounts[session.category] = session.duration;
      }
    });

    setStats({
      totalFocusTime: parseFloat(totalTime.toFixed(1)),
      todayFocusTime: parseFloat(todayTime.toFixed(1)),
      totalDistractions: totalDistract
    });

    const pieColors = ['#f39c12', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6'];
    const pieDataFormatted = Object.keys(categoryCounts).map((key, index) => ({
      name: key,
      population: categoryCounts[key],
      color: pieColors[index % pieColors.length],
      legendFontColor: "#7f7f7f",
      legendFontSize: 12
    }));
    setChartData(pieDataFormatted);

    setBarData({
      labels: ["Bugün"],
      datasets: [{ data: [todayTime] }]
    });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Üst Başlık ve Silme Butonu */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Raporlar</Text>
        <TouchableOpacity onPress={handleClearData} style={styles.clearButton}>
          <Ionicons name="trash-outline" size={24} color="red" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bugün</Text>
          <Text style={styles.cardValue}>{stats.todayFocusTime} dk</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Toplam</Text>
          <Text style={styles.cardValue}>{stats.totalFocusTime} dk</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dikkat D.</Text>
          <Text style={styles.cardValue}>{stats.totalDistractions}</Text>
        </View>
      </View>

      <Text style={styles.chartTitle}>Kategori Dağılımı</Text>
      {chartData && chartData.length > 0 ? (
        <PieChart
          data={chartData}
          width={screenWidth - 30}
          height={220}
          chartConfig={chartConfig}
          accessor={"population"}
          backgroundColor={"transparent"}
          paddingLeft={"15"}
          absolute
        />
      ) : (
        <Text style={styles.noDataText}>Henüz veri yok.</Text>
      )}

      <Text style={styles.chartTitle}>Bugünkü Odaklanma</Text>
      {barData && (
        <BarChart
          data={barData}
          width={screenWidth - 30}
          height={220}
          yAxisLabel=""
          yAxisSuffix="dk"
          chartConfig={chartConfig}
          style={styles.graphStyle}
        />
      )}
    </ScrollView>
  );
}

const chartConfig = {
  backgroundGradientFrom: "#fff",
  backgroundGradientTo: "#fff",
  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  strokeWidth: 2, 
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 15 },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  clearButton: { padding: 5 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 10, width: '30%', alignItems: 'center', elevation: 3 },
  cardTitle: { fontSize: 12, color: 'gray', marginBottom: 5 },
  cardValue: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  chartTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 10, marginBottom: 10, color: '#333' },
  graphStyle: { borderRadius: 16, marginVertical: 8 },
  noDataText: { textAlign: 'center', color: 'gray', marginVertical: 20 }
});