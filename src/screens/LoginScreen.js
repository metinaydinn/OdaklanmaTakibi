import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../firebaseConfig';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true); // Giriş mi Kayıt mı?

  const handleAuth = async () => {
    if (email === '' || password === '') {
      Alert.alert("Hata", "Lütfen tüm alanları doldurun.");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        // GİRİŞ YAP
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // KAYIT OL
        await createUserWithEmailAndPassword(auth, email, password);
        Alert.alert("Başarılı", "Hesabınız oluşturuldu!");
      }
    } catch (error) {
      let msg = error.message;
      if (msg.includes('invalid-email')) msg = "Geçersiz e-posta adresi.";
      if (msg.includes('weak-password')) msg = "Şifre en az 6 karakter olmalı.";
      if (msg.includes('user-not-found')) msg = "Kullanıcı bulunamadı.";
      if (msg.includes('wrong-password')) msg = "Hatalı şifre.";
      if (msg.includes('email-already-in-use')) msg = "Bu e-posta zaten kullanımda.";
      
      Alert.alert("Hata", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Odaklanma Takibi</Text>
      <Text style={styles.subtitle}>{isLogin ? "Giriş Yap" : "Kayıt Ol"}</Text>

      <TextInput
        style={styles.input}
        placeholder="E-posta"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Şifre"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {loading ? (
        <ActivityIndicator size="large" color="#3498db" />
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleAuth}>
          <Text style={styles.buttonText}>{isLogin ? "Giriş Yap" : "Kayıt Ol"}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchButton}>
        <Text style={styles.switchText}>
          {isLogin ? "Hesabın yok mu? Kayıt Ol" : "Zaten hesabın var mı? Giriş Yap"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f6fa', padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#2c3e50', marginBottom: 10 },
  subtitle: { fontSize: 18, color: '#7f8c8d', marginBottom: 30 },
  input: { width: '100%', backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#dcdde1' },
  button: { width: '100%', backgroundColor: '#3498db', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  switchButton: { marginTop: 20 },
  switchText: { color: '#3498db' }
});