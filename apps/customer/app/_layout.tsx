import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { CartProvider } from "../context/CartContext";
import { AuthProvider } from "../context/AuthContext";
import { CatalogProvider } from "../context/CatalogContext";
import { theme } from "../constants/theme";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ AmarBazar: require("../assets/fonts/Codepotro.ttf") });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <AuthProvider>
      <CatalogProvider>
       <CartProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.cream }, animation: "fade_from_bottom" }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
        <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
        <Stack.Screen name="category/[slug]" />
        <Stack.Screen name="product/[id]" />
        <Stack.Screen name="checkout/index" />
        <Stack.Screen name="checkout/success" options={{ gestureEnabled: false }} />
        <Stack.Screen name="orders/index" />
        <Stack.Screen name="orders/[id]" />
        <Stack.Screen name="addresses/index" />
        <Stack.Screen name="addresses/new" />
        <Stack.Screen name="auth/index" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      </Stack>
       </CartProvider>
      </CatalogProvider>
    </AuthProvider>
  );
}
