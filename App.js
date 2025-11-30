import { Ionicons } from '@expo/vector-icons'; // İkon kütüphanesi
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';

// Oluşturduğun ekranları buraya çağırıyoruz
import HomeScreen from './src/screens/HomeScreen';
import ReportsScreen from './src/screens/ReportsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Zamanlayıcı') {
              // Odaklanma ekranı için zaman saati ikonu
              iconName = focused ? 'timer' : 'timer-outline';
            } else if (route.name === 'Raporlar') {
              // Raporlar için analiz ikonu
              iconName = focused ? 'bar-chart' : 'bar-chart-outline';
            }

            // İkonu döndür
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: 'tomato', // Seçili sekme rengi
          tabBarInactiveTintColor: 'gray', // Seçili olmayan renk
          headerShown: false, // Üstteki varsayılan başlığı gizle
        })}
      >
        <Tab.Screen name="Zamanlayıcı" component={HomeScreen} />
        <Tab.Screen name="Raporlar" component={ReportsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}