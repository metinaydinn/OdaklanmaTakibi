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
  const [chartData, setChartData] = useState(null); // Pasta Grafik
  const [barData, setBarData] = useState(null);   // Çubuk Grafik (Son 7 Gün)
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "focusSessions"));
      const sessions = [];
      querySnapshot.forEach((doc) => {
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

  // --- SON 7 GÜNÜ HESAPLAYAN YARDIMCI FONKSİYON ---
  const getLast7Days = () => {
    const dates = [];
    const labels = [];
    const days = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      
      // Tarih formatı: YYYY-MM-DD (Veritabanındaki formatla aynı olmalı)
      const dateStr = d.toISOString().split('T')[0];
      dates.push(dateStr);
      
      // Grafik etiketi: Gün ismi (Örn: Pzt)
      labels.push(days[d.getDay()]);
    }
    return { dates, labels };
  };

  const calculateStats = (sessions) => {
    const today = new Date().toISOString().split('T')[0];
    let totalTime = 0;
    let todayTime = 0;
    let totalDistract = 0;
    const categoryCounts = {};

    // 1. Son 7 günü hazırla
    const { dates, labels } = getLast7Days();
    const weeklyData = [0, 0, 0, 0, 0, 0, 0]; // 7 tane 0 (Sayaçlar)

    sessions.forEach(session => {
      const duration = parseFloat(session.duration) || 0;
      totalTime += duration;
      totalDistract += (session.distractions || 0);

      // İstatistikler: Bugün
      if (session.date === today) {
        todayTime += duration;
      }

      // Kategori Dağılımı
      const cat = session.category || "Diğer";
      if (categoryCounts[cat]) {
        categoryCounts[cat] += duration;
      } else {
        categoryCounts[cat] = duration;
      }

      // 2. Çubuk Grafik Verisi Eşleştirme
      // Eğer bu seansın tarihi, son 7 gün listemizde varsa grafiğe ekle
      const dateIndex = dates.indexOf(session.date);
      if (dateIndex !== -1) {
        weeklyData[dateIndex] += duration;
      }
    });

    setStats({
      totalFocusTime: parseFloat(totalTime.toFixed(1)),
      todayFocusTime: parseFloat(todayTime.toFixed(1)),
      totalDistractions: totalDistract
    });

    // Pasta Grafik Ayarı
    const pieColors = ['#f39c12', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6'];
    const pieDataFormatted = Object.keys(categoryCounts).map((key, index) => ({
      name: key,
      population: categoryCounts[key],
      color: pieColors[index % pieColors.length],
      legendFontColor: "#7f7f7f",
      legendFontSize: 12
    }));
    setChartData(pieDataFormatted.length > 0 ? pieDataFormatted : null);

    // Çubuk Grafik Ayarı (Son 7 Gün)
    setBarData({
      labels: labels, // ["Pzt", "Sal", ...]
      datasets: [{ data: weeklyData }] // [10, 0, 25, ...]
    });
  };

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
              const querySnapshot = await getDocs(collection(db, "focusSessions"));
              const deletePromises = querySnapshot.docs.map((d) => 
                deleteDoc(doc(db, "focusSessions", d.id))
              );
              await Promise.all(deletePromises);
              setStats({ totalFocusTime: 0, todayFocusTime: 0, totalDistractions: 0 });
              setChartData(null);
              setBarData(null);
              Alert.alert("Başarılı", "Tüm veriler temizlendi.");
            } catch (e) {
              Alert.alert("Hata", "Silinemedi.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
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

          <Text style={styles.chartTitle}>Son 7 Günlük Performans</Text>
          {barData && (
            <BarChart
              data={barData}
              width={screenWidth - 30}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={chartConfig}
              style={styles.graphStyle}
              showValuesOnTopOfBars={true} // Barların üstünde sayı yazsın
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
  color: (opacity = 1) => `rgba(255, 99, 71, ${opacity})`, // Tomato rengi
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  strokeWidth: 2, 
  decimalPlaces: 0, // Grafikteki sayılarda virgül olmasın
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