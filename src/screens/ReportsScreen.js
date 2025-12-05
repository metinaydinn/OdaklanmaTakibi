import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';

// FIREBASE IMPORTLARI
import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const screenWidth = Dimensions.get("window").width;

export default function ReportsScreen() {
  const [stats, setStats] = useState({
    totalFocusTime: 0,
    todayFocusTime: 0,
    totalDistractions: 0
  });
  const [chartData, setChartData] = useState(null);
  const [barData, setBarData] = useState(null);
  const [loading, setLoading] = useState(false); // Yükleniyor animasyonu için

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // --- FIREBASE'DEN VERİ ÇEKME ---
  const loadData = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "focusSessions"));
      const sessions = [];
      
      querySnapshot.forEach((doc) => {
        // Her dokümanın verisini ve ID'sini alıyoruz
        sessions.push({ ...doc.data(), id: doc.id });
      });

      calculateStats(sessions);
    } catch (e) {
      console.error("Veri çekme hatası:", e);
      Alert.alert("Hata", "Veriler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  // --- FIREBASE VERİLERİNİ SİLME ---
  const handleClearData = async () => {
    Alert.alert(
      "Verileri Temizle",
      "Buluttaki tüm veriler silinecek. Emin misiniz?",
      [
        { text: "Vazgeç", style: "cancel" },
        { 
          text: "Sil", 
          style: "destructive", 
          onPress: async () => {
            setLoading(true);
            try {
              // Önce tüm verileri çek, sonra tek tek sil
              const querySnapshot = await getDocs(collection(db, "focusSessions"));
              const deletePromises = querySnapshot.docs.map((d) => 
                deleteDoc(doc(db, "focusSessions", d.id))
              );
              
              await Promise.all(deletePromises); // Hepsini paralel sil

              setStats({ totalFocusTime: 0, todayFocusTime: 0, totalDistractions: 0 });
              setChartData(null);
              setBarData(null);
              Alert.alert("Başarılı", "Tüm veriler temizlendi.");
            } catch (e) {
              console.error("Silme hatası:", e);
              Alert.alert("Hata", "Veriler silinemedi.");
            } finally {
              setLoading(false);
            }
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
      const duration = parseFloat(session.duration) || 0; // Sayı olduğundan emin ol
      totalTime += duration;
      totalDistract += (session.distractions || 0);

      if (session.date === today) {
        todayTime += duration;
      }

      const cat = session.category || "Diğer";
      if (categoryCounts[cat]) {
        categoryCounts[cat] += duration;
      } else {
        categoryCounts[cat] = duration;
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
    setChartData(pieDataFormatted.length > 0 ? pieDataFormatted : null);

    setBarData({
      labels: ["Bugün"],
      datasets: [{ data: [todayTime] }]
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Raporlar (Bulut)</Text>
        <TouchableOpacity onPress={handleClearData} style={styles.clearButton}>
          <Ionicons name="trash-outline" size={24} color="red" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="tomato" style={{ marginTop: 50 }} />
      ) : (
        <>
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
          {chartData ? (
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
        </>
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