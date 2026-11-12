import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useCatalog } from "../../context/CatalogContext";
import { AppButton, Label, Notice, TextField } from "../../components/UI";
import { fetchCustomerAddresses, fetchCustomerProfile, newIdempotencyKey, orderErrorMessage, submitOrder } from "../../lib/customerApi";
import type { CustomerAddress } from "../../types";
import { formatMoney } from "../../lib/formatMoney";
import { theme } from "../../constants/theme";

const ATTEMPT_KEY = "amar-bazar-order-attempt-v1";
function toE164(value:string){const compact=value.replace(/[\s()-]/g,"");if(/^\+8801[3-9]\d{8}$/.test(compact))return compact;if(/^8801[3-9]\d{8}$/.test(compact))return `+${compact}`;if(/^01[3-9]\d{8}$/.test(compact))return `+88${compact}`;throw new Error("Enter a valid Bangladesh phone number.")}

export default function CheckoutScreen(){
  const router=useRouter();const {session}=useAuth();const {cart,subtotal,clearCart}=useCart();const {areas,settings,products,loading:catalogLoading,configured}=useCatalog();
  const [addresses,setAddresses]=useState<CustomerAddress[]>([]);const [addressId,setAddressId]=useState("");const [areaId,setAreaId]=useState("");const [name,setName]=useState("");const [phone,setPhone]=useState("");const [addressLine,setAddressLine]=useState("");const [landmark,setLandmark]=useState("");const [note,setNote]=useState("");const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  const area=areas.find(item=>item.id===areaId)??areas[0];
  const load=useCallback(async()=>{if(!session){setLoading(false);return}setLoading(true);try{const [saved,profile]=await Promise.all([fetchCustomerAddresses(),fetchCustomerProfile()]);setAddresses(saved);const defaultAddress=saved.find(item=>item.isDefault)??saved[0];if(defaultAddress){setAddressId(defaultAddress.id);setAreaId(defaultAddress.areaId);setName(defaultAddress.recipientName);setPhone(defaultAddress.phone);setAddressLine(defaultAddress.addressLine);setLandmark(defaultAddress.landmark??"")}else{setName(profile.displayName);setPhone(profile.phone)}}catch(e){setError(orderErrorMessage(e))}finally{setLoading(false)}},[session]);
  useFocusEffect(useCallback(()=>{void load()},[load]));
  useEffect(()=>{if(areas.length&&!areaId)setAreaId(areas[0].id)},[areas,areaId]);
  const selectAddress=(item:CustomerAddress)=>{setAddressId(item.id);setAreaId(item.areaId);setName(item.recipientName);setPhone(item.phone);setAddressLine(item.addressLine);setLandmark(item.landmark??"")};
  const editField=(setter:(value:string)=>void)=>(value:string)=>{setAddressId("");setter(value)};
  const placeOrder=async()=>{
    if(!session){router.push({pathname:"/auth/index",params:{next:"/checkout/index"}} as never);return}
    if(!cart.length){setError("Your basket is empty.");return}
    if(!configured||!settings){setError("The live market backend is not configured. No order can be submitted yet.");return}
    if(!settings.ordersEnabled){setError("The market is not accepting orders right now. Your basket is saved.");return}
    if(!settings.codEnabled){setError("Cash on Delivery is currently unavailable. Please contact support.");return}
    if(!area||!name.trim()||!addressLine.trim()){setError("Enter your name, phone number, delivery area and address.");return}
    let e164="";try{e164=toE164(phone)}catch(e){setError(e instanceof Error?e.message:"Enter a valid phone number.");return}
    if(cart.some(line=>!products.some(product=>product.id===line.productId))){setError("Remove unavailable products from your basket before continuing.");return}
    setBusy(true);setError("");
    const body={areaId:area.id,...(addressId?{addressId}:{recipientName:name.trim(),phone:e164,addressLine:addressLine.trim(),...(landmark.trim()?{landmark:landmark.trim()}:{})}),...(note.trim()?{customerNote:note.trim()}:{}),items:cart.map(line=>({productId:line.productId,quantity:line.quantity}))};
    try{
      const signature=JSON.stringify(body);let key=newIdempotencyKey();
      const existing=await AsyncStorage.getItem(ATTEMPT_KEY).catch(()=>null);
      if(existing){try{const attempt=JSON.parse(existing) as {signature:string;key:string};if(attempt.signature===signature)key=attempt.key}catch{}}
      await AsyncStorage.setItem(ATTEMPT_KEY,JSON.stringify({signature,key}));
      const result=await submitOrder(body,key);
      await AsyncStorage.removeItem(ATTEMPT_KEY).catch(()=>undefined);clearCart();
      router.replace({pathname:"/checkout/success",params:{id:result.orderId,publicCode:result.publicCode,estimatedTotal:result.estimatedTotal}});
    }catch(e){setError(orderErrorMessage(e))}finally{setBusy(false)}
  };
  if(!session)return <View style={{flex:1,backgroundColor:theme.colors.cream,justifyContent:"center",padding:22}}><Notice title="Sign in before checkout">Your order must be connected to your account so only you can view its progress.</Notice><AppButton title="Sign in with phone" icon="arrow-forward" onPress={()=>router.push({pathname:"/auth/index",params:{next:"/checkout/index"}} as never)} style={{marginTop:16}}/></View>;
  return <KeyboardAvoidingView style={{flex:1,backgroundColor:theme.colors.cream}} behavior={Platform.OS==="ios"?"padding":undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
    <Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={19} color={theme.colors.ink}/><Text style={s.backText}>Back to basket</Text></Pressable><Label>SECURE CHECKOUT</Label><Text style={s.title}>Review your order</Text>
    <Notice title="The shop verifies first">This request is not confirmed yet. Our team checks availability and final prices with the shops, then contacts you for approval.</Notice>
    {!configured?<Notice title="Backend not configured">Set the Supabase URL and publishable key, then apply the approved migrations before submitting orders.</Notice>:null}
    {settings&&!settings.ordersEnabled?<Notice title="Ordering is paused" tone="amber">You can keep this basket, but the market is not currently accepting orders.</Notice>:null}
    <View style={s.sectionHead}><Text style={s.section}>Delivery area</Text></View>{catalogLoading||loading?<ActivityIndicator color={theme.colors.forest} style={{marginVertical:10}}/>:null}
    <View style={s.areas}>{areas.map(item=><Pressable key={item.id} onPress={()=>{setAreaId(item.id);if(addresses.find(a=>a.id===addressId)?.areaId!==item.id)setAddressId("")}} style={[s.area,area?.id===item.id&&s.areaSelected]}><View style={[s.radio,area?.id===item.id&&s.radioSelected]}>{area?.id===item.id&&<View style={s.radioDot}/>}</View><Text style={[s.areaName,area?.id===item.id&&{color:theme.colors.forest}]}>{item.name}</Text><Text style={s.fee}>{formatMoney(item.fee)}</Text></Pressable>)}</View>
    <View style={s.sectionHead}><Text style={s.section}>Delivery details</Text><Pressable onPress={()=>router.push("/addresses/new")}><Text style={s.add}>+ Save address</Text></Pressable></View>
    {addresses.length?<View style={{gap:8,marginBottom:16}}>{addresses.map(item=><Pressable key={item.id} onPress={()=>selectAddress(item)} style={[s.saved, addressId===item.id&&s.savedActive]}><Ionicons name={addressId===item.id?"radio-button-on":"radio-button-off"} size={19} color={addressId===item.id?theme.colors.forest:theme.colors.muted}/><View style={{flex:1}}><Text style={s.savedName}>{item.label} · {item.recipientName}</Text><Text style={s.savedCopy}>{item.addressLine} · {areas.find(a=>a.id===item.areaId)?.name??"Service area"}</Text></View></Pressable>)}</View>:null}
    <View style={{gap:14}}><TextField label="Customer name" value={name} onChangeText={editField(setName)} placeholder="Name to receive the order"/><TextField label="Contact phone" value={phone} onChangeText={editField(setPhone)} placeholder="01XXXXXXXXX" keyboardType="phone-pad"/><TextField label="House, road and delivery address" value={addressLine} onChangeText={editField(setAddressLine)} placeholder="Village, road, house or building" multiline/><TextField label="Landmark (optional)" value={landmark} onChangeText={editField(setLandmark)} placeholder="School, mosque, market..."/><TextField label="Delivery instructions (optional)" value={note} onChangeText={setNote} placeholder="Helpful instructions for the delivery team" multiline/></View>
    <View style={s.summary}><Text style={s.section}>Order summary</Text><Row label={`${cart.reduce((sum,line)=>sum+line.quantity,0)} items · estimated subtotal`} value={formatMoney(subtotal)}/><Row label={`Delivery · ${area?.name??"Choose an area"}`} value={area?formatMoney(area.fee):"—"}/><View style={s.line}/><Row label="Estimated total" value={area?formatMoney(subtotal+area.fee):"—"} strong/><Text style={s.summaryNote}>Final prices and availability are confirmed by the shop. The server recalculates the estimate from current catalog data.</Text></View>
    <View style={s.cod}><Ionicons name="cash-outline" size={21} color={theme.colors.forest}/><View style={{flex:1}}><Text style={s.codTitle}>Cash on Delivery</Text><Text style={s.codCopy}>Pay the approved final total when the order is delivered.</Text></View><Ionicons name={settings?.codEnabled?"checkmark-circle":"close-circle"} size={20} color={settings?.codEnabled?theme.colors.forest:theme.colors.error}/></View>
    {error?<Text style={s.error}>{error}</Text>:null}<AppButton title={busy?"Sending order request…":"Request order confirmation"} icon="arrow-forward" disabled={busy||loading||catalogLoading||!configured||!settings?.ordersEnabled||!settings?.codEnabled||!cart.length||!areas.length} onPress={()=>void placeOrder()} style={{marginTop:18}}/><Text style={s.foot}>No charge now · Your request becomes confirmed only after shop checks and your approval</Text>
  </ScrollView></KeyboardAvoidingView>;
}
function Row({label,value,strong=false}:{label:string;value:string;strong?:boolean}){return <View style={{flexDirection:"row",justifyContent:"space-between",marginTop:10,gap:12}}><Text style={{flex:1,fontSize:strong?14:12,fontWeight:strong?"800":"500",color:strong?theme.colors.ink:theme.colors.muted}}>{label}</Text><Text style={{fontSize:strong?15:12,fontWeight:strong?"900":"700",color:strong?theme.colors.forest:theme.colors.ink}}>{value}</Text></View>}
const s=StyleSheet.create({page:{paddingHorizontal:20,paddingTop:20,paddingBottom:44},back:{flexDirection:"row",alignItems:"center",gap:8,marginBottom:20},backText:{fontSize:13,fontWeight:"700",color:theme.colors.ink},title:{fontSize:27,fontWeight:"900",color:theme.colors.ink,marginTop:7,marginBottom:17},sectionHead:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:22,marginBottom:11},section:{fontSize:15,fontWeight:"800",color:theme.colors.ink},add:{fontSize:12,fontWeight:"800",color:theme.colors.forest},areas:{gap:8},area:{padding:12,backgroundColor:"white",borderWidth:1,borderColor:theme.colors.line,borderRadius:14,flexDirection:"row",alignItems:"center",gap:10},areaSelected:{borderColor:theme.colors.forest,backgroundColor:theme.colors.mintSoft},radio:{height:19,width:19,borderRadius:10,borderWidth:1.5,borderColor:theme.colors.muted,alignItems:"center",justifyContent:"center"},radioSelected:{borderColor:theme.colors.forest},radioDot:{height:9,width:9,borderRadius:5,backgroundColor:theme.colors.forest},areaName:{flex:1,fontSize:12,fontWeight:"700",color:theme.colors.ink},fee:{fontSize:12,fontWeight:"800",color:theme.colors.forest},saved:{padding:12,borderRadius:14,borderWidth:1,borderColor:theme.colors.line,backgroundColor:"white",flexDirection:"row",alignItems:"center",gap:10},savedActive:{borderColor:theme.colors.forest,backgroundColor:theme.colors.mintSoft},savedName:{fontSize:12,fontWeight:"800",color:theme.colors.ink},savedCopy:{fontSize:10,color:theme.colors.muted,marginTop:4},summary:{padding:17,borderRadius:18,backgroundColor:"white",borderWidth:1,borderColor:theme.colors.line,marginTop:22},line:{height:1,backgroundColor:theme.colors.line,marginTop:12},summaryNote:{fontSize:10,lineHeight:15,color:theme.colors.muted,marginTop:12},cod:{padding:14,borderRadius:16,backgroundColor:theme.colors.mint,marginTop:14,flexDirection:"row",alignItems:"center",gap:11},codTitle:{fontSize:13,fontWeight:"800",color:theme.colors.ink},codCopy:{fontSize:10,lineHeight:15,color:theme.colors.muted,marginTop:3},error:{fontSize:12,lineHeight:18,color:theme.colors.error,marginTop:12},foot:{fontSize:10,color:theme.colors.muted,textAlign:"center",lineHeight:15,marginTop:10}});
