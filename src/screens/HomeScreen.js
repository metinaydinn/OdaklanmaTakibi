import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { addDoc, collection } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig'; // Auth importu önemli!

export default function HomeScreen() {
  const [initialMinutes, setInitialMinutes] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60); 
  const [isActive, setIsActive] = useState(false);
  const [category, setCategory] = useState(null); 
  const [quote, setQuote] = useState(""); 
  
  const [categoryModalVisible, setCategoryModalVisible] = useState(false); 
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  const [distractionCount, setDistractionCount] = useState(0); 
  
  // --- KATEGORİ YÖNETİMİ ---
  const [categories, setCategories] = useState(["Ders Çalışma", "Kodlama", "Proje", "Kitap Okuma"]);
  const [newCategoryText, setNewCategoryText] = useState(""); 
  
  // --- MANUEL SÜRE YÖNETİMİ (YENİ) ---
  const [customMinutes, setCustomMinutes] = useState(""); 

  const appState = useRef(AppState.currentState);
  const timeOptions = [15, 25, 30, 45, 60];

  const quotes = [
    "Başarı, her gün tekrarlanan küçük çabaların toplamıdır.",
    "Gelecek, bugünden hazırlananlara aittir.",
    "Odaklanmak, hayır diyebilmektir.",
    "Bir saatlik çalışma, bir saatlik hayal kurmaktan iyidir.",
    "Zaman en değerli sermayendir.",
    "Bugün yapacağın fedakarlık, yarınki zaferindir."
  ];

  useEffect(() => {
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    loadSavedCategories(); 
  }, []);

  const loadSavedCategories = async () => {
    try {
      const saved = await AsyncStorage.getItem('customCategories');
      if (saved) {
        setCategories(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Kategori yükleme hatası", e);
    }
  };

  const handleAddCategory = async () => {
    if (newCategoryText.trim().length === 0) {
      Alert.alert("Uyarı", "Lütfen bir kategori ismi yazın.");
      return;
    }

    if (categories.includes(newCategoryText.trim())) {
      Alert.alert("Uyarı", "Bu kategori zaten var.");
      return;
    }

    const updatedCategories = [...categories, newCategoryText.trim()];
    setCategories(updatedCategories);
    setNewCategoryText(""); 
    Keyboard.dismiss(); 
    
    try {
      await AsyncStorage.setItem('customCategories', JSON.stringify(updatedCategories));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error("Kategori kaydetme hatası", e);
    }
  };

  // Hazır butonlar için süre değişimi
  const changeDuration = (minutes) => {
    setInitialMinutes(minutes);
    setTimeLeft(minutes * 60);
    setSettingsModalVisible(false);
    setCustomMinutes(""); // Manuel girişi temizle
    Haptics.selectionAsync();
  };

  // --- YENİ: MANUEL SÜRE UYGULAMA ---
  const applyCustomDuration = () => {
    const minutes = parseInt(customMinutes);
    if (isNaN(minutes) || minutes <= 0) {
      Alert.alert("Hata", "Lütfen geçerli bir süre girin (Örn: 43)");
      return;
    }
    if (minutes > 180) {
        Alert.alert("Uyarı", "Çok uzun bir süre girdiniz. En fazla 180 dk önerilir.");
    }
    
    changeDuration(minutes);
  };

  const saveSession = async (isCompleted = false) => {
    Haptics.notificationAsync(
      isCompleted ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
    );

    try {
      const totalSeconds = initialMinutes * 60;
      const timeSpentSeconds = totalSeconds - timeLeft;
      const timeSpentMinutes = parseFloat((timeSpentSeconds / 60).toFixed(1));

      if (timeSpentSeconds < 60 && !isCompleted) {
        Alert.alert("Uyarı", "1 dakikadan kısa çalışmalar kaydedilmez.");
        handleReset();
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      
      const newSession = {
        userId: auth.currentUser ? auth.currentUser.uid : "anonymous",
        date: today,
        category: category,
        duration: isCompleted ? initialMinutes : timeSpentMinutes,
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
    setTimeLeft(initialMinutes * 60);
    setDistractionCount(0);
    setCategory(null);
  };

  return (
    <View style={styles.container}>
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
      
      <View style={styles.quoteContainer}>
        <Ionicons name="bulb-outline" size={20} color="#f1c40f" style={{marginBottom: 5}}/>
        <Text style={styles.quoteText}>"{quote}"</Text>
      </View>

      {/* --- KATEGORİ MODALI --- */}
      <Modal animationType="slide" transparent={true} visible={categoryModalVisible}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Bir Kategori Seç</Text>
            
            <View style={styles.addCategoryContainer}>
                <TextInput 
                    style={styles.input}
                    placeholder="Yeni kategori ekle..."
                    value={newCategoryText}
                    onChangeText={setNewCategoryText}
                />
                <TouchableOpacity style={styles.addButton} onPress={handleAddCategory}>
                    <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
            </View>

            <ScrollView style={{maxHeight: 300, width: '100%'}}>
                {categories.map((cat, index) => (
                <TouchableOpacity key={index} style={styles.modalButton} onPress={() => selectCategory(cat)}>
                    <Text style={styles.modalButtonText}>{cat}</Text>
                    <Ionicons name="chevron-forward" size={18} color="#ccc" />
                </TouchableOpacity>
                ))}
            </ScrollView>

            <TouchableOpacity style={styles.closeButton} onPress={() => setCategoryModalVisible(false)}>
              <Text style={styles.closeButtonText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- SÜRE AYARLARI MODALI (GÜNCELLENDİ) --- */}
      <Modal animationType="fade" transparent={true} visible={settingsModalVisible}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Süre Ayarla (Dakika)</Text>
                
                {/* 1. Hazır Seçenekler */}
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

                {/* 2. Manuel Giriş Alanı (YENİ) */}
                <Text style={{marginTop: 20, marginBottom: 10, color: 'gray', fontSize: 14}}>— Veya Manuel Gir —</Text>
                <View style={styles.customTimeContainer}>
                    <TextInput 
                        style={styles.input}
                        placeholder="Örn: 43"
                        keyboardType="numeric"
                        value={customMinutes}
                        onChangeText={setCustomMinutes}
                        maxLength={3} // En fazla 3 hane
                    />
                    <TouchableOpacity style={[styles.addButton, {backgroundColor: '#3498db'}]} onPress={applyCustomDuration}>
                        <Text style={{color:'white', fontWeight:'bold'}}>Uygula</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.closeButton} onPress={() => setSettingsModalVisible(false)}>
                    <Text style={styles.closeButtonText}>Kapat</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
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
  
  quoteContainer: { marginTop: 50, paddingHorizontal: 30, alignItems: 'center', opacity: 0.8 },
  quoteText: { fontStyle: 'italic', color: '#7f8c8d', textAlign: 'center', marginTop: 5 },

  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  modalButton: { width: '100%', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection:'row', justifyContent:'space-between', alignItems: 'center' },
  modalButtonText: { fontSize: 18, color: '#333' },
  closeButton: { marginTop: 20, padding: 10 },
  closeButtonText: { color: 'red', fontSize: 16 },

  // Girdi Alanları
  addCategoryContainer: { flexDirection: 'row', width: '100%', marginBottom: 15, gap: 10 },
  customTimeContainer: { flexDirection: 'row', width: '100%', gap: 10, alignItems: 'center' },
  
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#f9f9f9', textAlign: 'center' },
  addButton: { backgroundColor: '#2ecc71', borderRadius: 10, width: 60, height: 45, justifyContent: 'center', alignItems: 'center' },

  timeOptionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  timeOption: { padding: 15, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, minWidth: 60, alignItems: 'center' },
  timeOptionSelected: { backgroundColor: '#2c3e50', borderColor: '#2c3e50' },
  timeOptionText: { fontSize: 16, color: '#333' },
  timeOptionTextSelected: { color: 'white', fontWeight: 'bold' }
});