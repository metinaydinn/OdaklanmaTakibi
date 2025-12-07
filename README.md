# 🎯 Odaklanma Takibi ve Raporlama Uygulaması

Sakarya Üniversitesi BSM 447 - Mobil Uygulama Geliştirme Dersi Dönem Projesi

Bu uygulama, Pomodoro tekniğini kullanarak kullanıcıların odaklanma sürelerini yönetmelerini, dikkat dağınıklıklarını takip etmelerini ve verimliliklerini raporlamalarını sağlar.

## 🚀 Özellikler

* **⏱ Özelleştirilebilir Zamanlayıcı:** 15, 25, 45, 60 dakika gibi farklı odaklanma süreleri seçilebilir.
* **📂 Kategori Yönetimi:** Çalışmalarınızı (Ders, Kodlama, Kitap vb.) kategorize edebilirsiniz.
* **⚠️ Dikkat Dağınıklığı Takibi (App State):** Odaklanma sırasında uygulamadan çıkılırsa sayaç durur ve ihlal olarak kaydedilir.
* **☁️ Bulut Tabanlı Kayıt (Firebase):** Tüm veriler Firebase Firestore üzerinde güvenle saklanır.
* **📊 Detaylı Raporlar:**
    * Son 7 günün performans grafiği (Bar Chart).
    * Kategori dağılım analizi (Pie Chart).
* **📳 Haptics (Titreşim):** Buton etkileşimlerinde ve uyarılarında titreşim geri bildirimi.

## 🛠 Kullanılan Teknolojiler

* **React Native** (Expo Framework)
* **Firebase Firestore** (Veritabanı)
* **React Navigation** (Sayfa Geçişleri)
* **React Native Chart Kit** (Grafikler)
* **Expo Haptics** (Titreşim)
* **AsyncStorage** (Yerel Önbellek Yönetimi)

## 📸 Ekran Görüntüleri

*(Buraya uygulamanın ekran görüntülerini ekleyebilirsiniz)*

## 📦 Kurulum ve Çalıştırma

Projeyi yerel ortamınızda çalıştırmak için aşağıdaki adımları izleyin:

1.  Repoyu klonlayın:
    ```bash
    git clone [https://github.com/metinaydinn/OdaklanmaTakibi.git](https://github.com/metinaydinn/OdaklanmaTakibi.git)
    ```

2.  Proje dizinine gidin:
    ```bash
    cd OdaklanmaTakibi
    ```

3.  Gerekli paketleri yükleyin:
    ```bash
    npm install
    ```

4.  Uygulamayı başlatın:
    ```bash
    npx expo start
    ```

## 👤 Geliştirici

**Ad Soyad:** [Metin Aydın]
**Bölüm:** Bilgisayar Mühendisliği