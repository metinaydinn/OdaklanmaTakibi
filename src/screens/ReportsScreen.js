import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';

// FIREBASE IMPORTLARI (signOut eklendi)
import { signOut } from 'firebase/auth'; // <--- Çıkış işlemi için gerekli
import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

const screenWidth = Dimensions.get("window").width;

export default function ReportsScreen() {
  const [stats, setStats] = useState({ totalFocusTime: 0, todayFocusTime: 0, totalDistractions: 0 });
  const [chartData, setChartData] = useState(null);
  const [barData, setBarData] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false); 
  const [hasData, setHasData] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData().then(() => setRefreshing(false));
  }, []);

  const loadData = async () => {
    if (!refreshing) setLoading(true);
    try {
      // Sadece giriş yapan kullanıcının verilerini çek
      if (!auth.currentUser) return;

      const q = query(
        collection(db, "focusSessions"), 
        where("userId", "==", auth.currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const sessions = [];
      querySnapshot.forEach((doc) => {
        sessions.push({ ...doc.data(), id: doc.id });
      });

      if (sessions.length > 0) {
        setHasData(true);
        // Tarihe göre sırala (En yeniden en eskiye)
        sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        calculateStats(sessions);
        setRecentSessions(sessions.slice(0, 10)); // Son 10 hareketi göster
      } else {
        setHasData(false);
        setStats({ totalFocusTime: 0, todayFocusTime: 0, totalDistractions: 0 });
        setChartData(null);
        setBarData(null);
        setRecentSessions([]);
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
    
    const dateMap = {}; 
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        last7DaysLabels.push(days[d.getDay()]); 
        dateMap[dateStr] = 6 - i; 
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

      if (dateMap[session.date] !== undefined) {
        last7DaysValues[dateMap[session.date]] += duration;
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
      labels: last7DaysLabels,
      datasets: [{ data: last7DaysValues }]
    });
  };

  // --- ÇIKIŞ YAPMA FONKSİYONU (YENİ) ---
  const handleSignOut = () => {
    Alert.alert(
      "Çıkış Yap",
      "Hesabından çıkış yapmak istediğine emin misin?",
      [
        { text: "Vazgeç", style: "cancel" },
        { 
          text: "Çıkış Yap", 
          style: "destructive", 
          onPress: async () => {
            try {
                await signOut(auth);
                // App.js otomatik olarak Login ekranına yönlendirecek
            } catch (error) {
                Alert.alert("Hata", "Çıkış yapılırken bir sorun oluştu.");
            }
          }
        }
      ]
    );
  };

  const handleDeleteItem = async (id) => {
    Alert.alert("Sil", "Bu kaydı silmek istediğine emin misin?", [
        { text: "Vazgeç", style: "cancel" },
        { 
            text: "Sil", 
            style: "destructive", 
            onPress: async () => {
                try {
                    await deleteDoc(doc(db, "focusSessions", id));
                    onRefresh(); 
                } catch (e) {
                    Alert.alert("Hata", "Silinemedi.");
                }
            }
        }
    ]);
  };

  const handleClearData = async () => {
    Alert.alert(
      "Tümünü Sil",
      "Sadece sana ait tüm veriler silinecek. Emin misiniz?",
      [
        { text: "Vazgeç", style: "cancel" },
        { 
          text: "Sil", 
          style: "destructive", 
          onPress: async () => {
            setLoading(true);
            try {
              const q = query(collection(db, "focusSessions"), where("userId", "==", auth.currentUser.uid));
              const querySnapshot = await getDocs(q);
              
              const deletePromises = querySnapshot.docs.map((d) => 
                deleteDoc(doc(db, "focusSessions", d.id))
              );
              await Promise.all(deletePromises);
              
              setStats({ totalFocusTime: 0, todayFocusTime: 0, totalDistractions: 0 });
              setChartData(null);
              setBarData(null);
              setRecentSessions([]);
              setHasData(false);
              
              Alert.alert("Başarılı", "Veriler temizlendi.");
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
        
        {/* Butonlar Grubu: Çöp Kutusu ve Çıkış */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
            {hasData && (
            <TouchableOpacity onPress={handleClearData} style={styles.iconButton}>
                <Ionicons name="trash-outline" size={24} color="#ff6b6b" />
            </TouchableOpacity>
            )}
            
            <TouchableOpacity onPress={handleSignOut} style={styles.iconButton}>
                <Ionicons name="log-out-outline" size={24} color="#2c3e50" />
            </TouchableOpacity>
        </View>
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

          {/* SON HAREKETLER LİSTESİ */}
          <View style={styles.listContainer}>
            <Text style={styles.chartTitle}>Son Aktiviteler</Text>
            {recentSessions.map((session, index) => (
              <View key={index} style={styles.listItem}>
                <View style={styles.listItemLeft}>
                  <View style={styles.listIcon}>
                    <Ionicons name="checkmark-circle" size={24} color="#2ecc71" />
                  </View>
                  <View>
                    <Text style={styles.listCategory}>{session.category}</Text>
                    <Text style={styles.listDate}>{session.date}</Text>
                  </View>
                </View>
                
                <View style={{flexDirection:'row', alignItems:'center'}}>
                    <View style={styles.listItemRight}>
                        <Text style={styles.listDuration}>{session.duration} dk</Text>
                        {session.distractions > 0 && (
                            <Text style={styles.listDistraction}>⚠️ {session.distractions}</Text>
                        )}
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteItem(session.id)} style={{padding:5, marginLeft: 10}}>
                        <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                    </TouchableOpacity>
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
  
  // İkon butonları için ortak stil
  iconButton: { padding: 8, backgroundColor: '#fff', borderRadius: 20, elevation: 2 },
  
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

  listContainer: { marginTop: 10, marginBottom: 30 },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
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