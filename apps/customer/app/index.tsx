import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { BrandLockup, BrandMark } from "../components/Brand";
import { theme } from "../constants/theme";

const ONBOARDING_KEY = "amar-bazar-onboarding-complete-v1";

export default function SplashRoute() {
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      const seen = await AsyncStorage.getItem(ONBOARDING_KEY).catch(() => null);
      if (active) router.replace(seen === "yes" ? "/(tabs)" : "/onboarding");
    }, 850);
    return () => { active = false; clearTimeout(timer); };
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.logo}><BrandMark size={75} /></View>
      <BrandLockup />
      <Text style={styles.tagline}>আপনার বাজার, আমাদের দায়িত্ব</Text>
      <View style={styles.bottom}><ActivityIndicator color={theme.colors.forest} size="small" /><Text style={styles.caption}>A little closer to home</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.mintSoft, alignItems: "center", justifyContent: "center", padding: 28 },
  logo: { width: 114, height: 114, borderRadius: 38, backgroundColor: theme.colors.white, alignItems: "center", justifyContent: "center", marginBottom: 22, shadowColor: theme.colors.forest, shadowOpacity: 0.08, shadowRadius: 24, elevation: 4 },
  tagline: { color: theme.colors.forest, fontFamily: "AmarBazar", fontSize: 15, marginTop: 8 },
  bottom: { position: "absolute", bottom: 62, alignItems: "center", gap: 12 },
  caption: { color: theme.colors.muted, fontSize: 12, letterSpacing: 0.3 },
});
