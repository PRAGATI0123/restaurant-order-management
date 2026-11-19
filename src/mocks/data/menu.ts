import type { AddOn, MenuCategory, MenuItem, ModifierGroup } from "@/types/menu";
import { MENU_PHOTOS } from "./menu-photos";

/**
 * SAMPLE MENU, so the app is useful from the first launch.
 * Prices are in paise: 18000 = ₹180. The ids are fixed (not random) so the
 * sample data is identical on every device and every reset.
 */

export const sampleCategories: MenuCategory[] = [
  { id: "cat-starters", name: "Starters", sortOrder: 0 },
  { id: "cat-mains", name: "Mains", sortOrder: 1 },
  { id: "cat-breads", name: "Breads", sortOrder: 2 },
  { id: "cat-rice", name: "Rice & Biryani", sortOrder: 3 },
  { id: "cat-drinks", name: "Drinks", sortOrder: 4 },
  { id: "cat-desserts", name: "Desserts", sortOrder: 5 },
];

// SHARED OPTION GROUPS: dishes point to these by id.
const spiceLevel: ModifierGroup = {
  id: "mod-spice",
  name: "Spice level",
  minSelect: 1,
  maxSelect: 1,
  options: [
    { id: "mod-spice-mild", name: "Mild", pricePaise: 0 },
    { id: "mod-spice-medium", name: "Medium", pricePaise: 0 },
    { id: "mod-spice-hot", name: "Hot", pricePaise: 0 },
  ],
};
const sodaTaste: ModifierGroup = {
  id: "mod-soda",
  name: "Taste",
  minSelect: 1,
  maxSelect: 1,
  options: [
    { id: "mod-soda-sweet", name: "Sweet", pricePaise: 0 },
    { id: "mod-soda-salted", name: "Salted", pricePaise: 0 },
    { id: "mod-soda-mixed", name: "Mixed", pricePaise: 0 },
  ],
};
const noOnionGarlic: ModifierGroup = {
  id: "mod-jain",
  name: "Dietary requests",
  minSelect: 0,
  maxSelect: 2,
  options: [
    { id: "mod-jain-no-onion", name: "No onion", pricePaise: 0 },
    { id: "mod-jain-no-garlic", name: "No garlic", pricePaise: 0 },
  ],
};
export const sampleModifierGroups: ModifierGroup[] = [
  spiceLevel,
  sodaTaste,
  noOnionGarlic,
];

// SHARED ADD-ONS: dishes point to these by id.
const extraCheese: AddOn = { id: "add-cheese", name: "Extra cheese", pricePaise: 4000 };
const extraButter: AddOn = { id: "add-butter", name: "Extra butter", pricePaise: 3000 };
const extraGravy: AddOn = { id: "add-gravy", name: "Extra gravy", pricePaise: 6000 };
const iceCream: AddOn = {
  id: "add-ice-cream",
  name: "Scoop of ice cream",
  pricePaise: 5000,
};
export const sampleAddOns: AddOn[] = [extraCheese, extraButter, extraGravy, iceCream];

/**
 * Builds an item with the common defaults, so the list below stays short.
 * Each sample dish also gets its photo (menu-photos.ts), if it has one.
 */
function item(
  fields: Pick<MenuItem, "id" | "name" | "categoryId" | "pricePaise" | "isVeg"> &
    Partial<MenuItem>,
): MenuItem {
  const photo = MENU_PHOTOS[fields.id];
  return {
    isAvailable: true,
    variants: [],
    addOnIds: [],
    modifierGroupIds: [],
    ...(photo ? { imageUrl: photo.src } : {}),
    ...fields,
  };
}

export const sampleMenuItems: MenuItem[] = [
  // Starters
  item({
    id: "item-paneer-tikka",
    name: "Paneer Tikka",
    categoryId: "cat-starters",
    pricePaise: 32000,
    isVeg: true,
    variants: [
      { id: "var-paneer-half", name: "Half", pricePaise: 18000 },
      { id: "var-paneer-full", name: "Full", pricePaise: 32000 },
    ],
    addOnIds: [extraCheese.id],
    modifierGroupIds: [spiceLevel.id],
  }),
  item({
    id: "item-chicken-tikka",
    name: "Chicken Tikka",
    categoryId: "cat-starters",
    pricePaise: 38000,
    isVeg: false,
    variants: [
      { id: "var-chicken-tikka-half", name: "Half", pricePaise: 22000 },
      { id: "var-chicken-tikka-full", name: "Full", pricePaise: 38000 },
    ],
    modifierGroupIds: [spiceLevel.id],
  }),
  item({
    id: "item-hara-bhara",
    name: "Hara Bhara Kabab",
    categoryId: "cat-starters",
    pricePaise: 24000,
    isVeg: true,
  }),
  item({
    id: "item-crispy-corn",
    name: "Crispy Corn",
    categoryId: "cat-starters",
    pricePaise: 21000,
    isVeg: true,
  }),
  item({
    id: "item-fish-amritsari",
    name: "Fish Amritsari",
    categoryId: "cat-starters",
    pricePaise: 36000,
    isVeg: false,
    isAvailable: false,
  }),

  // Mains
  item({
    id: "item-butter-chicken",
    name: "Butter Chicken",
    categoryId: "cat-mains",
    pricePaise: 42000,
    isVeg: false,
    addOnIds: [extraGravy.id],
    modifierGroupIds: [spiceLevel.id],
  }),
  item({
    id: "item-dal-makhani",
    name: "Dal Makhani",
    categoryId: "cat-mains",
    pricePaise: 28000,
    isVeg: true,
    addOnIds: [extraButter.id],
    modifierGroupIds: [noOnionGarlic.id],
  }),
  item({
    id: "item-paneer-butter-masala",
    name: "Paneer Butter Masala",
    categoryId: "cat-mains",
    pricePaise: 32000,
    isVeg: true,
    addOnIds: [extraGravy.id, extraButter.id],
    modifierGroupIds: [spiceLevel.id],
  }),
  item({
    id: "item-rogan-josh",
    name: "Mutton Rogan Josh",
    categoryId: "cat-mains",
    pricePaise: 52000,
    isVeg: false,
    modifierGroupIds: [spiceLevel.id],
  }),
  item({
    id: "item-kadai-veg",
    name: "Kadai Vegetable",
    categoryId: "cat-mains",
    pricePaise: 26000,
    isVeg: true,
    modifierGroupIds: [spiceLevel.id, noOnionGarlic.id],
  }),

  // Breads
  item({
    id: "item-butter-naan",
    name: "Butter Naan",
    categoryId: "cat-breads",
    pricePaise: 6000,
    isVeg: true,
  }),
  item({
    id: "item-garlic-naan",
    name: "Garlic Naan",
    categoryId: "cat-breads",
    pricePaise: 8000,
    isVeg: true,
  }),
  item({
    id: "item-tandoori-roti",
    name: "Tandoori Roti",
    categoryId: "cat-breads",
    pricePaise: 3000,
    isVeg: true,
    addOnIds: [extraButter.id],
  }),
  item({
    id: "item-laccha-paratha",
    name: "Laccha Paratha",
    categoryId: "cat-breads",
    pricePaise: 7000,
    isVeg: true,
  }),

  // Rice & Biryani
  item({
    id: "item-veg-biryani",
    name: "Veg Biryani",
    categoryId: "cat-rice",
    pricePaise: 30000,
    isVeg: true,
    modifierGroupIds: [spiceLevel.id, noOnionGarlic.id],
  }),
  item({
    id: "item-chicken-biryani",
    name: "Chicken Biryani",
    categoryId: "cat-rice",
    pricePaise: 38000,
    isVeg: false,
    variants: [
      { id: "var-biryani-half", name: "Half", pricePaise: 24000 },
      { id: "var-biryani-full", name: "Full", pricePaise: 38000 },
    ],
    modifierGroupIds: [spiceLevel.id],
  }),
  item({
    id: "item-jeera-rice",
    name: "Jeera Rice",
    categoryId: "cat-rice",
    pricePaise: 18000,
    isVeg: true,
  }),

  // Drinks
  item({
    id: "item-sweet-lassi",
    name: "Sweet Lassi",
    categoryId: "cat-drinks",
    pricePaise: 12000,
    isVeg: true,
  }),
  item({
    id: "item-masala-chaas",
    name: "Masala Chaas",
    categoryId: "cat-drinks",
    pricePaise: 8000,
    isVeg: true,
  }),
  item({
    id: "item-lime-soda",
    name: "Fresh Lime Soda",
    categoryId: "cat-drinks",
    pricePaise: 9000,
    isVeg: true,
    modifierGroupIds: [sodaTaste.id],
  }),
  item({
    id: "item-cold-coffee",
    name: "Cold Coffee",
    categoryId: "cat-drinks",
    pricePaise: 15000,
    isVeg: true,
    addOnIds: [iceCream.id],
  }),

  // Desserts
  item({
    id: "item-gulab-jamun",
    name: "Gulab Jamun",
    categoryId: "cat-desserts",
    pricePaise: 11000,
    isVeg: true,
  }),
  item({
    id: "item-rasmalai",
    name: "Rasmalai",
    categoryId: "cat-desserts",
    pricePaise: 14000,
    isVeg: true,
  }),
  item({
    id: "item-brownie",
    name: "Brownie with Ice Cream",
    categoryId: "cat-desserts",
    pricePaise: 22000,
    isVeg: true,
    isAvailable: false,
  }),
];
