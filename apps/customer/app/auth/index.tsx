import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppButton, Label, Notice, Page, TextField } from "../../components/UI";
import { requestPhoneOtp, verifyPhoneOtp } from "../../lib/auth";
import { orderErrorMessage } from "../../lib/customerApi";
import { isSupabaseConfigured } from "../../lib/supabase";
import { theme } from "../../constants/theme";

function toE164(value: string) {
  const compact = value.replace(/[\s()-]/g, "");
  if (/^\+8801[3-9]\d{8}$/.test(compact)) return compact;
  if (/^8801[3-9]\d{8}$/.test(compact)) return `+${compact}`;
  if (/^01[3-9]\d{8}$/.test(compact)) return `+88${compact}`;
  throw new Error("Enter a valid Bangladesh mobile number, for example 017XXXXXXXX.");
}

export default function PhoneSignInScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string }>();
  const [phone, setPhone] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestedNext = params.next ?? "";
  const nextPath = requestedNext === "/checkout/index" || requestedNext === "/orders/index" || /^\/orders\/[0-9a-f-]{36}$/i.test(requestedNext)
    ? requestedNext
    : "/(tabs)";

  const sendCode = async () => {
    setError(""); setBusy(true);
    try { const e164 = toE164(phone); await requestPhoneOtp(e164); setNormalizedPhone(e164); setStep("otp"); }
    catch (cause) { setError(cause instanceof Error && cause.message.includes("valid Bangladesh") ? cause.message : orderErrorMessage(cause)); }
    finally { setBusy(false); }
  };

  const verifyCode = async () => {
    setError(""); setBusy(true);
    try { await verifyPhoneOtp(normalizedPhone, code.trim()); router.replace(nextPath as never); }
    catch (cause) { setError(orderErrorMessage(cause)); }
    finally { setBusy(false); }
  };

  return <KeyboardAvoidingView style={{flex:1,backgroundColor:theme.colors.cream}} behavior={Platform.OS==="ios"?"padding":undefined}><Page scroll contentStyle={s.page}>
    <Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={20} color={theme.colors.ink}/><Text style={s.backText}>Back</Text></Pressable>
    <View style={s.mark}><Ionicons name="shield-checkmark" size={28} color={theme.colors.forest}/></View><Label>CUSTOMER ACCOUNT</Label><Text style={s.title}>{step==="phone"?"Sign in to continue":"Check your messages"}</Text>
    <Text style={s.copy}>{step==="phone"?"Use your mobile number to submit and track orders securely.":`Enter the one-time code sent to ${normalizedPhone}.`}</Text>
    {!isSupabaseConfigured?<Notice title="Backend setup is required">Add the Supabase URL and publishable key to apps/customer/.env, then restart Expo. No login or order can be completed without the project connection.</Notice>:null}
    {step==="phone"?<TextField label="Bangladesh mobile number" value={phone} onChangeText={setPhone} placeholder="017XXXXXXXX" keyboardType="phone-pad"/>:<TextField label="Verification code" value={code} onChangeText={setCode} placeholder="Enter SMS code" keyboardType="numeric"/>}
    {error?<Text style={s.error}>{error}</Text>:null}
    <AppButton title={busy?"Please wait…":step==="phone"?"Send verification code":"Verify and sign in"} icon={step==="phone"?"chatbubble-ellipses-outline":"checkmark"} disabled={busy||!isSupabaseConfigured} onPress={()=>void (step==="phone"?sendCode():verifyCode())} style={{marginTop:18}}/>
    {step==="otp"?<Pressable onPress={()=>{setStep("phone");setCode("");setError("")}} style={s.change}><Text style={s.changeText}>Use a different number</Text></Pressable>:null}
    <Text style={s.privacy}>By signing in, you agree to use this number for account access and order-related contact. Order approval is a separate step.</Text>
  </Page></KeyboardAvoidingView>;
}

const s=StyleSheet.create({page:{paddingTop:20,paddingBottom:40},back:{flexDirection:"row",alignItems:"center",gap:8,marginBottom:36},backText:{fontSize:13,fontWeight:"700",color:theme.colors.ink},mark:{height:60,width:60,borderRadius:20,backgroundColor:theme.colors.mint,alignItems:"center",justifyContent:"center",marginBottom:20},title:{fontSize:28,fontWeight:"900",color:theme.colors.ink,marginTop:9},copy:{fontSize:13,lineHeight:20,color:theme.colors.muted,marginTop:8,marginBottom:24},error:{fontSize:12,lineHeight:18,color:theme.colors.error,marginTop:12},change:{alignItems:"center",padding:14},changeText:{fontSize:12,color:theme.colors.forest,fontWeight:"700"},privacy:{fontSize:10,lineHeight:16,color:theme.colors.muted,textAlign:"center",marginTop:22}});
