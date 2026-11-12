import type { PropsWithChildren, ReactNode } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { theme, shadow } from "../constants/theme";
import type { Product } from "../types";
import { formatMoney } from "../lib/formatMoney";

export function Page({ children, scroll = false, contentStyle, background = theme.colors.cream }: PropsWithChildren<{ scroll?: boolean; contentStyle?: object; background?: string }>) {
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: background }}>
      {scroll
        ? <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.pageContent, contentStyle]}>{children}</ScrollView>
        : <View style={[styles.pageContent, { flex: 1 }, contentStyle]}>{children}</View>}
    </SafeAreaView>
  );
}

export function AppButton({ title, onPress, variant = "primary", icon, disabled = false, style }: {
  title: string; onPress: () => void; variant?: "primary" | "secondary" | "outline" | "ghost"; icon?: keyof typeof Ionicons.glyphMap; disabled?: boolean; style?: object;
}) {
  const primary = variant === "primary";
  const colors = primary
    ? { bg: theme.colors.forest, fg: theme.colors.white, border: theme.colors.forest }
    : variant === "secondary"
      ? { bg: theme.colors.mint, fg: theme.colors.forest, border: theme.colors.mint }
      : variant === "outline"
        ? { bg: "transparent", fg: theme.colors.forest, border: theme.colors.line }
        : { bg: "transparent", fg: theme.colors.forest, border: "transparent" };
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, { backgroundColor: colors.bg, borderColor: colors.border, opacity: disabled ? 0.55 : pressed ? 0.82 : 1 }, style]}>
      <Text style={[styles.buttonText, { color: colors.fg }]}>{title}</Text>
      {icon ? <Ionicons name={icon} size={18} color={colors.fg} /> : null}
    </Pressable>
  );
}

export function IconButton({ name, onPress, color = theme.colors.ink, background = theme.colors.white, size = 42 }: { name: keyof typeof Ionicons.glyphMap; onPress: () => void; color?: string; background?: string; size?: number }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.iconButton, { width: size, height: size, borderRadius: size / 2, backgroundColor: background, opacity: pressed ? 0.72 : 1 }]}><Ionicons name={name} size={19} color={color} /></Pressable>;
}

export function SectionTitle({ title, action, onAction, subtitle }: { title: string; action?: string; onAction?: () => void; subtitle?: string }) {
  return <View style={styles.sectionTitle}><View style={{ flex: 1 }}><Text style={styles.h2}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>{action && onAction ? <Pressable onPress={onAction}><Text style={styles.actionText}>{action}</Text></Pressable> : null}</View>;
}

export function Label({ children, style }: PropsWithChildren<{ style?: object }>) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function Notice({ title, children, icon = "information-circle-outline", tone = "green" }: PropsWithChildren<{ title?: string; icon?: keyof typeof Ionicons.glyphMap; tone?: "green" | "amber" }>) {
  const color = tone === "amber" ? "#956719" : theme.colors.forest;
  const bg = tone === "amber" ? "#fff6dd" : theme.colors.mint;
  return <View style={[styles.notice, { backgroundColor: bg }]}><Ionicons name={icon} size={19} color={color} /><View style={{ flex: 1 }}>{title ? <Text style={[styles.noticeTitle, { color }]}>{title}</Text> : null}<Text style={[styles.noticeText, { color }]}>{children}</Text></View></View>;
}

export function TextField({ label, value, onChangeText, placeholder, keyboardType, multiline, autoCapitalize, error, right }: {
  label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: "default" | "phone-pad" | "numeric"; multiline?: boolean; autoCapitalize?: "none" | "sentences" | "words"; error?: string; right?: ReactNode;
}) {
  return <View style={{ gap: 7 }}><Text style={styles.fieldLabel}>{label}</Text><View style={[styles.inputWrap, error ? { borderColor: theme.colors.error } : null]}><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#9aa59b" keyboardType={keyboardType} multiline={multiline} autoCapitalize={autoCapitalize ?? "sentences"} textAlignVertical={multiline ? "top" : "center"} style={[styles.input, multiline ? { minHeight: 90, paddingTop: 13 } : null]} />{right}</View>{error ? <Text style={styles.errorText}>{error}</Text> : null}</View>;
}

export function ProductCard({ product, onPress, onAdd, width }: { product: Product; onPress: () => void; onAdd: () => void; width?: number | string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.productCard, width !== undefined ? { width } : null, { opacity: pressed ? 0.88 : 1 }]}>
      <View style={styles.productImageWrap}><Image source={product.image} style={styles.productImage} resizeMode="cover" />{product.badge ? <View style={styles.badge}><Text style={styles.badgeText}>{product.badge}</Text></View> : null}</View>
      <View style={styles.productBody}><Text numberOfLines={1} style={styles.productName}>{product.name}</Text><Text numberOfLines={1} style={styles.productUnit}>{product.unit} · {product.shop}</Text><View style={styles.productFoot}><Text style={styles.price}>{formatMoney(product.price)}<Text style={styles.priceUnit}> / {product.unit.replace("per ", "")}</Text></Text><Pressable accessibilityLabel={`Add ${product.name} to cart`} onPress={(event) => { event.stopPropagation(); onAdd(); }} style={({ pressed }) => [styles.addCircle, pressed ? { transform: [{ scale: 0.92 }] } : null]}><Ionicons name="add" size={21} color={theme.colors.white} /></Pressable></View></View>
    </Pressable>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string; action?: ReactNode }) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name={icon} size={29} color={theme.colors.forest} /></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyBody}>{body}</Text>{action}</View>;
}

export function Divider() { return <View style={styles.divider} />; }

const styles = StyleSheet.create({
  pageContent: { paddingHorizontal: 20, paddingBottom: 34 },
  button: { minHeight: 52, paddingHorizontal: 20, borderRadius: theme.radius.pill, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  buttonText: { fontSize: 15, fontWeight: "700", letterSpacing: 0.1 },
  iconButton: { alignItems: "center", justifyContent: "center", ...shadow },
  sectionTitle: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  h2: { fontSize: 20, lineHeight: 26, letterSpacing: -0.45, fontWeight: "800", color: theme.colors.ink },
  subtitle: { marginTop: 3, fontSize: 12, color: theme.colors.muted, lineHeight: 18 },
  actionText: { color: theme.colors.forest, fontSize: 13, fontWeight: "700" },
  label: { fontSize: 10, letterSpacing: 1.45, textTransform: "uppercase", fontWeight: "800", color: theme.colors.muted },
  notice: { flexDirection: "row", gap: 10, alignItems: "flex-start", padding: 14, borderRadius: 16 },
  noticeTitle: { fontSize: 12, fontWeight: "800", marginBottom: 3 },
  noticeText: { fontSize: 11, lineHeight: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: theme.colors.ink },
  inputWrap: { minHeight: 52, borderWidth: 1, borderColor: theme.colors.line, backgroundColor: theme.colors.white, borderRadius: 15, paddingHorizontal: 14, flexDirection: "row", alignItems: "center" },
  input: { flex: 1, color: theme.colors.ink, fontSize: 14, paddingVertical: 12 },
  errorText: { color: theme.colors.error, fontSize: 11 },
  productCard: { width: 174, backgroundColor: theme.colors.white, borderRadius: 20, padding: 8, borderWidth: 1, borderColor: "#edf0ea", ...shadow },
  productImageWrap: { height: 126, borderRadius: 15, overflow: "hidden", backgroundColor: theme.colors.mint, position: "relative" },
  productImage: { width: "100%", height: "100%" },
  badge: { position: "absolute", top: 8, left: 8, borderRadius: 20, backgroundColor: "rgba(255,255,255,.93)", paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { color: theme.colors.forest, fontSize: 8, fontWeight: "800" },
  productBody: { paddingHorizontal: 3, paddingTop: 10, paddingBottom: 3 },
  productName: { color: theme.colors.ink, fontSize: 14, fontWeight: "800" },
  productUnit: { color: theme.colors.muted, fontSize: 10, marginTop: 4 },
  productFoot: { marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  price: { color: theme.colors.forest, fontSize: 16, fontWeight: "800" },
  priceUnit: { fontSize: 9, fontWeight: "500", color: theme.colors.muted },
  addCircle: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.forest },
  empty: { alignItems: "center", paddingHorizontal: 24, paddingVertical: 44, gap: 10 },
  emptyIcon: { width: 64, height: 64, backgroundColor: theme.colors.mint, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { color: theme.colors.ink, fontSize: 17, fontWeight: "800", textAlign: "center" },
  emptyBody: { color: theme.colors.muted, fontSize: 12, lineHeight: 18, textAlign: "center", maxWidth: 290, marginBottom: 6 },
  divider: { height: 1, backgroundColor: theme.colors.line },
});
