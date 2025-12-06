import { Ionicons } from '@expo/vector-icons'; // İkon için
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// FIREBASE IMPORTLARI
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function HomeScreen() {
  const [initialMinutes, setInitialMinutes] = useState(25); // Varsayılan 25 dk
  const [timeLeft, setTimeLeft] = useState(25 * 60); 
  const [isActive, setIsActive] = useState(false);
  const [category, setCategory] = useState(null); 
  
  // Modallar
  const [categoryModalVisible, setCategoryModalVisible] = useState(false); 
  const [settingsModalVisible, setSettingsModalVisible] = useState(false); // Süre ayarı için

  const [distractionCount, setDistractionCount] = useState(0); 
  
  const appState = useRef(AppState.currentState);
  const categories = ["Ders Çalışma", "Kodlama", "Proje", "Kitap Okuma"];
  const timeOptions = [15, 25, 30, 45, 60]; // Seçilebilir süreler

  // --- SÜRE DEĞİŞTİRME FONKSİYONU ---
  const changeDuration = (minutes) => {
    setInitialMinutes(minutes);
    setTimeLeft(minutes * 60);
    setSettingsModalVisible(false);
    Haptics.selectionAsync();
  };

  const saveSession = async (isCompleted = false) => {
    Haptics.notificationAsync(
      isCompleted ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
    );

    try {
      const totalSeconds = initialMinutes * 60;
      const timeSpentSeconds = totalSeconds - timeLeft;
      const timeSpentMinutes = parseFloat((timeSpentSeconds / 60).toFixed(1));

      // 1 dakikadan az ise ve tamamlanmadıysa kaydetme
      if (timeSpentSeconds < 60 && !isCompleted) {
        Alert.alert("Uyarı", "1 dakikadan kısa çalışmalar kaydedilmez.");
        handleReset();
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      
      const newSession = {
        date: today,
        category: category,
        duration: isCompleted ? initialMinutes : timeSpentMinutes, // Tamamlandıysa hedef süreyi yaz
        distractions: distractionCount,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, "focusSessions"), newSession);

      Alert.alert("Buluta Kaydedildi! ☁️", `Seans başarıyla kaydedildi.\nSüre: ${newSession.duration} dk`);
      handleReset(); 

    } catch (e) {
      console.error("Firebase Hatası:", e);
      Alert.alert("Hata", "Veri kaydedilirken bir sorun oluştu.");
    }
  };

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      saveSession(true); 
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        if (isActive) {
          setIsActive(false);
          setDistractionCount(prev => prev + 1);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, [isActive]);

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleStartRequest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!category) setCategoryModalVisible(true);
    else setIsActive(true);
  };

  const selectCategory = (cat) => {
    Haptics.selectionAsync();
    setCategory(cat);
    setCategoryModalVisible(false);
    setIsActive(true);
  };

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsActive(false);
    setTimeLeft(initialMinutes * 60); // Seçili süreye dön
    setDistractionCount(0);
    setCategory(null);
  };

  return (
    <View style={styles.container}>
      {/* Üst Bar: Başlık ve Ayarlar */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Odaklanma Takibi</Text>
        <TouchableOpacity onPress={() => setSettingsModalVisible(true)} style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      {category && (
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{category}</Text>
        </View>
      )}

      {/* Sayaç */}
      <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
      <Text style={styles.targetText}>Hedef: {initialMinutes} dk</Text>
      
      {distractionCount > 0 && (
        <Text style={styles.distractionText}>⚠️ Dikkat Dağınıklığı: {distractionCount}</Text>
      )}

      <View style={styles.buttonContainer}>
        {!isActive ? (
          <TouchableOpacity style={[styles.button, styles.startButton]} onPress={handleStartRequest}>
            <Text style={styles.buttonText}>{category ? "Devam Et" : "Başlat"}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.button, styles.pauseButton]} onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsActive(false);
          }}>
            <Text style={styles.buttonText}>Duraklat</Text>
          </TouchableOpacity>
        )}

        {category && (
             <TouchableOpacity style={[styles.button, styles.finishButton]} onPress={() => saveSession(false)}>
               <Text style={styles.buttonText}>Bitir</Text>
             </TouchableOpacity>
        )}
      </View>
      
      <TouchableOpacity style={styles.resetLink} onPress={handleReset}>
          <Text style={styles.resetText}>Vazgeç ve Sıfırla</Text>
      </TouchableOpacity>

      {/* --- KATEGORİ SEÇİM MODALI --- */}
      <Modal animationType="slide" transparent={true} visible={categoryModalVisible}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Bir Kategori Seç</Text>
            {categories.map((cat, index) => (
              <TouchableOpacity key={index} style={styles.modalButton} onPress={() => selectCategory(cat)}>
                <Text style={styles.modalButtonText}>{cat}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.closeButton} onPress={() => setCategoryModalVisible(false)}>
              <Text style={styles.closeButtonText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- SÜRE AYARLARI MODALI --- */}
      <Modal animationType="fade" transparent={true} visible={settingsModalVisible}>
        <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Süre Ayarla (Dakika)</Text>
                <View style={styles.timeOptionsContainer}>
                    {timeOptions.map((time) => (
                        <TouchableOpacity 
                            key={time} 
                            style={[styles.timeOption, initialMinutes === time && styles.timeOptionSelected]} 
                            onPress={() => changeDuration(time)}
                        >
                            <Text style={[styles.timeOptionText, initialMinutes === time && styles.timeOptionTextSelected]}>
                                {time}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <TouchableOpacity style={styles.closeButton} onPress={() => setSettingsModalVisible(false)}>
                    <Text style={styles.closeButtonText}>Kapat</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '80%', marginBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  settingsButton: { padding: 5 },
  
  categoryBadge: { backgroundColor: '#e1f5fe', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 15, marginBottom: 10 },
  categoryText: { color: '#0288d1', fontWeight: '600' },
  
  timerText: { fontSize: 80, fontWeight: 'bold', color: '#2c3e50' },
  targetText: { fontSize: 16, color: 'gray', marginBottom: 20 },

  distractionText: { color: '#e74c3c', marginTop: 10, fontWeight: 'bold' },
  buttonContainer: { flexDirection: 'row', gap: 15, marginTop: 20 },
  button: { paddingVertical: 15, paddingHorizontal: 20, borderRadius: 30, minWidth: 100, alignItems: 'center' },
  startButton: { backgroundColor: '#2ecc71' },
  pauseButton: { backgroundColor: '#f1c40f' },
  finishButton: { backgroundColor: '#3498db' }, 
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  resetLink: { marginTop: 20 },
  resetText: { color: 'gray', textDecorationLine: 'underline' },
  
  // Modal Ortak Stiller
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '80%', backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  modalButton: { width: '100%', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  modalButtonText: { fontSize: 18, color: '#333' },
  closeButton: { marginTop: 20, padding: 10 },
  closeButtonText: { color: 'red', fontSize: 16 },

  // Süre Seçim Özel Stiller
  timeOptionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  timeOption: { padding: 15, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, minWidth: 60, alignItems: 'center' },
  timeOptionSelected: { backgroundColor: '#2c3e50', borderColor: '#2c3e50' },
  timeOptionText: { fontSize: 16, color: '#333' },
  timeOptionTextSelected: { color: 'white', fontWeight: 'bold' }
});