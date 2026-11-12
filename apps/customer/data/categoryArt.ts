import type { ImageSourcePropType } from "react-native";

export const categoryArt: Record<string, { image: ImageSourcePropType; color: string }> = {
  vegetables: { image: require("../assets/products/vegetables.jpg"), color: "#e8f4e5" },
  rice: { image: require("../assets/products/rice.jpg"), color: "#fff2d8" },
  lentils: { image: require("../assets/products/lentil.jpg"), color: "#f7e8df" },
  oil: { image: require("../assets/products/oil.jpg"), color: "#fff0cb" },
  spices: { image: require("../assets/products/spice.jpg"), color: "#f9e6df" },
  snacks: { image: require("../assets/products/snack.jpg"), color: "#f4e8dc" },
  drinks: { image: require("../assets/products/tea.jpg"), color: "#e5f1eb" },
  food: { image: require("../assets/products/halftime-burger.jpg"), color: "#fce9e3" },
};

export const defaultCategoryArt = categoryArt.vegetables;
