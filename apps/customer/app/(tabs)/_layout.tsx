import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "../../context/CartContext";
import { theme } from "../../constants/theme";

export default function TabLayout() {
  const { cartCount } = useCart();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: theme.colors.forest,
      tabBarInactiveTintColor: "#9aa59a",
      tabBarLabelStyle: { fontSize: 10, fontWeight: "700", marginBottom: 3 },
      tabBarStyle: { height: 70, paddingTop: 8, borderTopColor: theme.colors.line, backgroundColor: theme.colors.white, elevation: 12 },
    }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "home" : "home-outline"} color={String(color)} size={size} /> }} />
      <Tabs.Screen name="categories" options={{ title: "Categories", tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "grid" : "grid-outline"} color={String(color)} size={size} /> }} />
      <Tabs.Screen name="search" options={{ title: "Search", tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "search" : "search-outline"} color={String(color)} size={size} /> }} />
      <Tabs.Screen name="cart" options={{ title: "Cart", tabBarBadge: cartCount > 0 ? cartCount : undefined, tabBarBadgeStyle: { backgroundColor: theme.colors.yellow as string, color: theme.colors.forest as string, fontSize: 9 }, tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "basket" : "basket-outline"} color={String(color)} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Account", tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "person" : "person-outline"} color={String(color)} size={size} /> }} />
    </Tabs>
  );
}
