import { useRef, useState } from "react";
import { Dimensions, FlatList, Image, NativeScrollEvent, NativeSyntheticEvent, Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "../components/UI";
import { BrandLockup } from "../components/Brand";
import { theme } from "../constants/theme";

const { width } = Dimensions.get("window");
const slides = [
  { image: require("../assets/delivery/amar-bazar-hero.jpg"), kicker: "LOCAL SHOPS, AT YOUR DOOR", title: "Your neighborhood market, closer.", body: "Fresh groceries and everyday favorites from the shops you know in Amishapara Bazar." },
  { image: require("../assets/products/vegetables.jpg"), kicker: "A LITTLE BIT OF EVERYTHING", title: "Choose what your home needs.", body: "Browse local produce, pantry staples and food from nearby partner shops." },
  { image: require("../assets/delivery/amar-bazar-journey.png"), kicker: "A MORE PERSONAL WAY TO SHOP", title: "We check before we confirm.", body: "Our team checks availability and current prices, then shares the final total for your approval." },
];

export default function OnboardingScreen() {
  const listRef = useRef<FlatList>(null);
  const [page, setPage] = useState(0);
  const finish = async () => {
    await AsyncStorage.setItem("amar-bazar-onboarding-complete-v1", "yes").catch(() => undefined);
    router.replace("/(tabs)");
  };
  const move = () => page < slides.length - 1 ? listRef.current?.scrollToIndex({ index: page + 1, animated: true }) : finish();
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(event.nativeEvent.contentOffset.x / width));

  return (
    <View style={styles.root}>
      <FlatList ref={listRef} data={slides} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll} keyExtractor={(_, index) => String(index)} renderItem={({ item }) => (
        <View style={{ width }}>
          <View style={styles.photoWrap}><Image source={item.image} style={styles.photo} resizeMode="cover" /><View style={styles.photoWash} /><View style={styles.brand}><BrandLockup light compact /></View><View style={styles.imagePill}><Ionicons name="location" size={13} color={theme.colors.forest} /><Text style={styles.pillText}>Amishapara Bazar</Text></View></View>
          <View style={styles.copy}><Text style={styles.kicker}>{item.kicker}</Text><Text style={styles.title}>{item.title}</Text><Text style={styles.body}>{item.body}</Text></View>
        </View>
      )} />
      <View style={styles.footer}>
        <View style={styles.dots}>{slides.map((_, index) => <Pressable accessibilityLabel={`Go to page ${index + 1}`} key={index} onPress={() => listRef.current?.scrollToIndex({ index, animated: true })} style={[styles.dot, page === index && styles.dotActive]} />)}</View>
        <AppButton title={page === slides.length - 1 ? "Explore Amar Bazar" : "Continue"} icon="arrow-forward" onPress={move} />
        {page < slides.length - 1 ? <Pressable onPress={finish} style={styles.skip}><Text style={styles.skipText}>Skip intro</Text></Pressable> : <Text style={styles.footNote}>A local pilot · Orders are checked before confirmation</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.white },
  photoWrap: { height: "53%", minHeight: 310, maxHeight: 500, overflow: "hidden", backgroundColor: theme.colors.mint },
  photo: { width: "100%", height: "100%" },
  photoWash: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(13,70,42,0.12)" },
  brand: { position: "absolute", top: 58, left: 24, padding: 12, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.91)" },
  imagePill: { position: "absolute", bottom: 16, left: 20, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: theme.colors.white, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 20 },
  pillText: { color: theme.colors.forest, fontSize: 11, fontWeight: "800" },
  copy: { paddingHorizontal: 26, paddingTop: 25, paddingBottom: 16 },
  kicker: { color: theme.colors.leaf, fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  title: { marginTop: 10, color: theme.colors.ink, fontSize: 29, lineHeight: 35, fontWeight: "800", letterSpacing: -0.7 },
  body: { marginTop: 10, color: theme.colors.muted, fontSize: 14, lineHeight: 21, maxWidth: 360 },
  footer: { marginTop: "auto", paddingHorizontal: 24, paddingBottom: 26, gap: 14 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8, paddingBottom: 3 },
  dot: { width: 7, height: 7, borderRadius: 5, backgroundColor: "#dbe5d9" },
  dotActive: { width: 21, backgroundColor: theme.colors.forest },
  skip: { alignItems: "center", paddingVertical: 4 },
  skipText: { color: theme.colors.muted, fontSize: 12, fontWeight: "600" },
  footNote: { textAlign: "center", color: theme.colors.muted, fontSize: 10 },
});
