import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';

// FIREBASE IMPORTLARI
import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const screenWidth = Dimensions.get("window").width;

export default function ReportsScreen() {
  const [stats, setStats] = useState({ totalFocusTime: 0, todayFocusTime: 0, totalDistractions: 0 });
  const [chartData, setChartData] = useState(null);
  const [barData, setBarData] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]); // Son seanslar listesi
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // Yenileme durumu
  const [hasData, setHasData] = useState(false);

  // Sayfaya her gelindiğinde çalışır
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Aşağı çekip yenileme fonksiyonu
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData().then(() => setRefreshing(false));
  }, []);

  const loadData = async () => {
    // Eğer yenileme yapılmıyorsa yükleniyor ikonunu göster
    if (!refreshing) setLoading(true);
    
    try {
      const querySnapshot = await getDocs(collection(db, "focusSessions"));
      const sessions = [];
      querySnapshot.forEach((doc) => {
        sessions.push({ ...doc.data(), id: doc.id });
      });

      if (sessions.length > 0) {
        setHasData(true);
        // Tarihe göre sırala (En yeniden en eskiye)
        sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        calculateStats(sessions);
        setRecentSessions(sessions.slice(0, 5)); // Sadece son 5 tanesini al
      } else {
        setHasData(false);
      }
      
    } catch (e) {
      console.error("Veri çekme hatası:", e);
      Alert.alert("Hata", "Veriler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (sessions) => {
    const today = new Date().toISOString().split('T')[0];
    let totalTime = 0;
    let todayTime = 0;
    let totalDistract = 0;
    const categoryCounts = {};
    
    // Haftalık grafik verileri
    const days = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
    const last7DaysLabels = [];
    const last7DaysValues = [0, 0, 0, 0, 0, 0, 0];
    
    // Son 7 günün tarihlerini oluştur
    const dateMap = {}; // Tarih -> Index eşleşmesi
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        last7DaysLabels.push(days[d.getDay()]); // Gün ismini ekle
        dateMap[dateStr] = 6 - i; // Bugün en sonda (index 6) olsun
    }

    sessions.forEach(session => {
      const duration = parseFloat(session.duration) || 0;
      totalTime += duration;
      totalDistract += (session.distractions || 0);

      if (session.date === today) {
        todayTime += duration;
      }

      const cat = session.category || "Diğer";
      if (categoryCounts[cat]) categoryCounts[cat] += duration;
      else categoryCounts[cat] = duration;

      // Haftalık grafik eşleşmesi
      if (dateMap[session.date] !== undefined) {
        last7DaysValues[dateMap[session.date]] += duration;
      }
    });

    setStats({
      totalFocusTime: parseFloat(totalTime.toFixed(1)),
      todayFocusTime: parseFloat(todayTime.toFixed(1)),
      totalDistractions: totalDistract
    });

    // Pasta Grafik Formatı
    const pieColors = ['#f39c12', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6'];
    const pieDataFormatted = Object.keys(categoryCounts).map((key, index) => ({
      name: key,
      population: categoryCounts[key],
      color: pieColors[index % pieColors.length],
      legendFontColor: "#7f7f7f",
      legendFontSize: 12
    }));
    setChartData(pieDataFormatted.length > 0 ? pieDataFormatted : null);

    // Çubuk Grafik Formatı
    setBarData({
      labels: last7DaysLabels,
      datasets: [{ data: last7DaysValues }]
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
              
              // State'leri sıfırla
              setStats({ totalFocusTime: 0, todayFocusTime: 0, totalDistractions: 0 });
              setChartData(null);
              setBarData(null);
              setRecentSessions([]);
              setHasData(false);
              
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
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={{ paddingBottom: 50 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Raporlar</Text>
        {hasData && (
          <TouchableOpacity onPress={handleClearData} style={styles.clearButton}>
            <Ionicons name="trash-outline" size={24} color="#ff6b6b" />
          </TouchableOpacity>
        )}
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="tomato" style={{ marginTop: 100 }} />
      ) : !hasData ? (
        <View style={styles.emptyContainer}>
            <Ionicons name="bar-chart-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>Henüz veri bulunmuyor.</Text>
            <Text style={styles.emptySubText}>İlk odaklanma seansını başlatmak için Zamanlayıcı sayfasına git!</Text>
        </View>
      ) : (
        <>
          {/* İstatistik Kartları */}
          <View style={styles.statsContainer}>
            <View style={[styles.card, styles.shadowProp]}>
              <Ionicons name="today-outline" size={24} color="#3498db" style={{marginBottom: 5}}/>
              <Text style={styles.cardTitle}>Bugün</Text>
              <Text style={styles.cardValue}>{stats.todayFocusTime} dk</Text>
            </View>
            <View style={[styles.card, styles.shadowProp]}>
              <Ionicons name="time-outline" size={24} color="#f39c12" style={{marginBottom: 5}}/>
              <Text style={styles.cardTitle}>Toplam</Text>
              <Text style={styles.cardValue}>{stats.totalFocusTime} dk</Text>
            </View>
            <View style={[styles.card, styles.shadowProp]}>
              <Ionicons name="alert-circle-outline" size={24} color="#e74c3c" style={{marginBottom: 5}}/>
              <Text style={styles.cardTitle}>Dikkat D.</Text>
              <Text style={styles.cardValue}>{stats.totalDistractions}</Text>
            </View>
          </View>

          {/* Grafikler */}
          <View style={[styles.chartContainer, styles.shadowProp]}>
            <Text style={styles.chartTitle}>Kategori Dağılımı</Text>
            {chartData ? (
                <PieChart
                  data={chartData}
                  width={screenWidth - 60}
                  height={200}
                  chartConfig={chartConfig}
                  accessor={"population"}
                  backgroundColor={"transparent"}
                  paddingLeft={"15"}
                  absolute
                />
            ) : null}
          </View>

          <View style={[styles.chartContainer, styles.shadowProp]}>
            <Text style={styles.chartTitle}>Haftalık Performans</Text>
            {barData && (
                <BarChart
                  data={barData}
                  width={screenWidth - 60}
                  height={220}
                  yAxisLabel=""
                  yAxisSuffix=""
                  chartConfig={chartConfig}
                  style={styles.graphStyle}
                  showValuesOnTopOfBars={true}
                  fromZero={true}
                />
            )}
          </View>

          {/* YENİ BÖLÜM: Son Hareketler Listesi */}
          <View style={styles.listContainer}>
            <Text style={styles.chartTitle}>Son Aktiviteler</Text>
            {recentSessions.map((session, index) => (
              <View key={index} style={styles.listItem}>
                <View style={styles.listItemLeft}>
                  <View style={styles.listIcon}>
                    <Ionicons name="checkmark-circle" size={20} color="#2ecc71" />
                  </View>
                  <View>
                    <Text style={styles.listCategory}>{session.category}</Text>
                    <Text style={styles.listDate}>{session.date}</Text>
                  </View>
                </View>
                <View style={styles.listItemRight}>
                  <Text style={styles.listDuration}>{session.duration} dk</Text>
                  {session.distractions > 0 && (
                     <Text style={styles.listDistraction}>⚠️ {session.distractions}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>

        </>
      )}
    </ScrollView>
  );
}

const chartConfig = {
  backgroundGradientFrom: "#fff",
  backgroundGradientTo: "#fff",
  color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  strokeWidth: 2, 
  decimalPlaces: 0, 
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20 },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 10 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50' },
  clearButton: { padding: 10, backgroundColor: '#fff', borderRadius: 50, elevation: 2 },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: '#7f8c8d', marginTop: 20 },
  emptySubText: { fontSize: 14, color: '#95a5a6', textAlign: 'center', marginTop: 10, width: '70%' },

  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 16, width: '30%', alignItems: 'center' },
  cardTitle: { fontSize: 13, color: '#7f8c8d', marginBottom: 5, fontWeight: '600' },
  cardValue: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  
  shadowProp: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5, 
  },

  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 15,
    marginBottom: 20,
    alignItems: 'center'
  },
  chartTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#34495e', alignSelf: 'flex-start' },
  graphStyle: { borderRadius: 16, marginVertical: 8 },

  // LİSTE STİLLERİ
  listContainer: { marginTop: 10, marginBottom: 30 },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    // Hafif gölge
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  listItemLeft: { flexDirection: 'row', alignItems: 'center' },
  listIcon: { marginRight: 15 },
  listCategory: { fontWeight: 'bold', color: '#2c3e50', fontSize: 16 },
  listDate: { color: '#95a5a6', fontSize: 12 },
  listItemRight: { alignItems: 'flex-end' },
  listDuration: { fontWeight: 'bold', color: '#3498db', fontSize: 16 },
  listDistraction: { color: '#e74c3c', fontSize: 12, marginTop: 2 }
});