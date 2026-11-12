import type { Category, DeliveryArea, Product } from "../types";
import { theme } from "../constants/theme";

export const categories: Category[] = [
  { id: "vegetables", title: "Vegetables", subtitle: "Fresh picks", icon: "leaf", color: "#e8f4e5", image: require("../assets/products/vegetables.jpg") },
  { id: "rice", title: "Rice & grains", subtitle: "Daily staples", icon: "grain", color: "#fff2d8", image: require("../assets/products/rice.jpg") },
  { id: "lentils", title: "Pulses", subtitle: "Goodness in every meal", icon: "seed", color: "#f7e8df", image: require("../assets/products/lentil.jpg") },
  { id: "oil", title: "Cooking oil", subtitle: "Kitchen essentials", icon: "oil", color: "#fff0cb", image: require("../assets/products/oil.jpg") },
  { id: "spices", title: "Spices", subtitle: "Bring flavor home", icon: "spice", color: "#f9e6df", image: require("../assets/products/spice.jpg") },
  { id: "snacks", title: "Snacks", subtitle: "A little treat", icon: "cookie", color: "#f4e8dc", image: require("../assets/products/snack.jpg") },
  { id: "drinks", title: "Tea & drinks", subtitle: "Sip something nice", icon: "cup", color: "#e5f1eb", image: require("../assets/products/tea.jpg") },
  { id: "food", title: "Prepared food", subtitle: "From local kitchens", icon: "food", color: "#fce9e3", image: require("../assets/products/halftime-burger.jpg") },
];

export const products: Product[] = [
  { id: "p-rice", name: "Local rice", categoryId: "rice", category: "Rice & grains", price: 78, unit: "per kg", shop: "Amishapara Grocery", image: require("../assets/products/rice.jpg"), badge: "Daily essential", description: "A familiar everyday staple for your home. This pilot price is illustrative and will need shop confirmation." },
  { id: "p-lentil", name: "Red lentils", categoryId: "lentils", category: "Pulses", price: 125, unit: "per kg", shop: "Amishapara Grocery", image: require("../assets/products/lentil.jpg"), description: "A pantry favorite for comforting family meals. Pilot listing; final availability and price are confirmed by the shop." },
  { id: "p-oil", name: "Mustard oil", categoryId: "oil", category: "Cooking oil", price: 190, unit: "per litre", shop: "Amishapara Grocery", image: require("../assets/products/oil.jpg"), description: "A flavorful kitchen essential. Product details and pilot price are for preview only." },
  { id: "p-veg", name: "Seasonal vegetables", categoryId: "vegetables", category: "Vegetables", price: 60, unit: "per bundle", shop: "Fresh Produce Shop", image: require("../assets/products/vegetables.jpg"), badge: "Seasonal", description: "A seasonal selection from the local bazar. The shop will confirm the exact items and price before an order is accepted." },
  { id: "p-spice", name: "Ground turmeric", categoryId: "spices", category: "Spices", price: 35, unit: "per 100 g", shop: "Amishapara Grocery", image: require("../assets/products/spice.jpg"), description: "A pantry staple for everyday cooking. Sample listing; confirm the pack and final price with the shop." },
  { id: "p-snack", name: "Local snack mix", categoryId: "snacks", category: "Snacks", price: 30, unit: "per pack", shop: "Local Snack Shop", image: require("../assets/products/snack.jpg"), description: "A little something to enjoy between meals. Sample product image and price for this prototype." },
  { id: "p-tea", name: "Tea leaves", categoryId: "drinks", category: "Tea & drinks", price: 95, unit: "per 200 g", shop: "Amishapara Grocery", image: require("../assets/products/tea.jpg"), description: "A warm cup starts with good tea. Pilot listing; the shop confirms stock and final price." },
  { id: "p-mango-juice", name: "Mango juice", categoryId: "food", category: "Prepared food", price: 99, unit: "per glass", shop: "Half Time Cafe", image: require("../assets/products/halftime-juice-mango.jpg"), description: "A menu item transcribed from the supplied Half Time Cafe menu. Availability and current price require confirmation." },
  { id: "p-coffee", name: "Cold coffee", categoryId: "food", category: "Prepared food", price: 99, unit: "per glass", shop: "Half Time Cafe", image: require("../assets/products/halftime-coffee.jpg"), description: "A menu item transcribed from the supplied Half Time Cafe menu. Availability and current price require confirmation." },
  { id: "p-burger", name: "Regular burger", categoryId: "food", category: "Prepared food", price: 99, unit: "each", shop: "Half Time Cafe", image: require("../assets/products/halftime-burger.jpg"), description: "A menu item transcribed from the supplied Half Time Cafe menu. Availability and current price require confirmation." },
  { id: "p-kebab", name: "Mixed kebab platter", categoryId: "food", category: "Prepared food", price: 320, unit: "per platter", shop: "Royal Restaurant & Kebab Ghor", image: require("../assets/products/royal-kebab.jpg"), description: "A restaurant sample listing. Confirm exact serving, availability and price with the partner." },
  { id: "p-pizza", name: "Chicken pizza", categoryId: "food", category: "Prepared food", price: 350, unit: "each", shop: "Foodi Goodi", image: require("../assets/products/foodi-pizza.jpg"), description: "A restaurant sample listing. Confirm exact size, availability and price with the partner." },
];

export const deliveryAreas: DeliveryArea[] = [
  { id: "amishapara", name: "Amishapara", fee: 50 },
  { id: "amultoli", name: "Amultoli", fee: 60 },
  { id: "bachairgaon", name: "Bachairgaon", fee: 70 },
  { id: "barahipur", name: "Barahipur", fee: 120 },
  { id: "dhanpur", name: "Dhanpur", fee: 100 },
  { id: "noagaon", name: "Noagaon", fee: 120 },
  { id: "paniyashala", name: "Paniyashala", fee: 60 },
  { id: "satbaria", name: "Satbaria", fee: 100 },
];

export const formatMoney = (value: number) => `৳${Math.round(value).toLocaleString("en-BD")}`;

export const categoryColor = (id: string) => categories.find((item) => item.id === id)?.color ?? theme.colors.mint;
