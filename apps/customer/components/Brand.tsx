import { SvgXml } from "react-native-svg";
import { Text, View } from "react-native";
import { theme } from "../constants/theme";

const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110"><g fill="none" stroke="#1f6b2e" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 30h16l12 46h46l10-32H34"/></g><circle cx="44" cy="92" r="7" fill="#1f6b2e"/><circle cx="76" cy="92" r="7" fill="#1f6b2e"/><path d="M50 18c4-14 22-18 36-12-2 16-16 24-36 12z" fill="#2e9b3f"/><path d="M52 17c10 2 20 0 30-8" stroke="#fff" stroke-width="2" fill="none"/><rect x="64" y="44" width="14" height="14" rx="3" fill="none" stroke="#1f6b2e" stroke-width="5"/></svg>`;

export function BrandMark({ size = 42 }: { size?: number }) {
  return <SvgXml xml={mark} width={size} height={size * 1.1} />;
}

export function BrandLockup({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <BrandMark size={compact ? 34 : 42} />
      <View>
        <Text style={{ fontFamily: "AmarBazar", color: light ? "#fff" : theme.colors.forest, fontSize: compact ? 17 : 20, lineHeight: compact ? 22 : 26 }}>আমার</Text>
        <Text style={{ fontFamily: "AmarBazar", color: light ? "#f2c44c" : theme.colors.red, fontSize: compact ? 17 : 20, lineHeight: compact ? 22 : 26 }}>বাজার</Text>
      </View>
    </View>
  );
}
