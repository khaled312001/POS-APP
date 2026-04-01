export type PizzaTopping = {
  name: string;
  names: string[];
  icon: string;
  category: string;
};

export const PIZZA_TOPPINGS: PizzaTopping[] = [
  { name: "Tomato Sauce", names: ["Tomato Sauce", "Tomatensauce", "Extra Tomatensauce"], icon: "🍅", category: "Sauces" },
  { name: "Tomatoes", names: ["Tomatoes", "Tomaten", "Extra Tomaten"], icon: "🍅", category: "Vegetables" },
  { name: "Sliced Tomatoes", names: ["Sliced Tomatoes", "Tomatenscheiben", "Extra Tomatenscheiben"], icon: "🍅", category: "Vegetables" },
  { name: "Garlic", names: ["Garlic", "Knoblauch", "Extra Knoblauch"], icon: "🧄", category: "Vegetables" },
  { name: "Onions", names: ["Onions", "Zwiebeln", "Extra Zwiebeln"], icon: "🧅", category: "Vegetables" },
  { name: "Capers", names: ["Capers", "Kapern", "Extra Kapern"], icon: "🫛", category: "Vegetables" },
  { name: "Olives", names: ["Olives", "Oliven", "Extra Oliven"], icon: "🫒", category: "Vegetables" },
  { name: "Oregano", names: ["Oregano", "Extra Oregano"], icon: "🌿", category: "Others" },
  { name: "Vegetables", names: ["Vegetables", "Gemüse", "Extra Gemüse"], icon: "🥦", category: "Vegetables" },
  { name: "Spinach", names: ["Spinach", "Spinat", "Extra Spinat"], icon: "🥬", category: "Vegetables" },
  { name: "Bell Peppers", names: ["Bell Peppers", "Peperoni", "Paprika", "Extra Peperoni"], icon: "🫑", category: "Vegetables" },
  { name: "Corn", names: ["Corn", "Mais", "Extra Mais"], icon: "🌽", category: "Vegetables" },
  { name: "Broccoli", names: ["Broccoli", "Extra Broccoli"], icon: "🥦", category: "Vegetables" },
  { name: "Artichokes", names: ["Artichokes", "Artischocken", "Artischoken", "Extra Artischocken"], icon: "🌿", category: "Vegetables" },
  { name: "Arugula", names: ["Arugula", "Rucola", "Rukola", "Extra Rucola"], icon: "🥬", category: "Vegetables" },
  { name: "Egg", names: ["Egg", "Ei", "Extra Ei"], icon: "🥚", category: "Others" },
  { name: "Pineapple", names: ["Pineapple", "Ananas", "Extra Ananas"], icon: "🍍", category: "Others" },
  { name: "Mushrooms", names: ["Mushrooms", "Pilze", "Champignons", "Extra Pilze", "Extra Champignons"], icon: "🍄", category: "Vegetables" },
  { name: "Ham", names: ["Ham", "Schinken", "Extra Schinken"], icon: "🥩", category: "Meat" },
  { name: "Spicy Salami", names: ["Spicy Salami", "Scharfe Salami", "Salami scharf", "Extra Scharfe Salami", "Diavola"], icon: "🌶️", category: "Meat" },
  { name: "Salami", names: ["Salami", "Extra Salami"], icon: "🥩", category: "Meat" },
  { name: "Bacon", names: ["Bacon", "Speck", "Extra Speck"], icon: "🥓", category: "Meat" },
  { name: "Prosciutto", names: ["Prosciutto", "Rohschinken", "Raw Ham", "Extra Rohschinken"], icon: "🥩", category: "Meat" },
  { name: "Lamb", names: ["Lamb", "Lammfleisch", "Extra Lammfleisch"], icon: "🥩", category: "Meat" },
  { name: "Chicken", names: ["Chicken", "Poulet", "Hähnchen", "Extra Poulet"], icon: "🍗", category: "Meat" },
  { name: "Kebab", names: ["Kebab", "Kebabfleisch", "Extra Kebabfleisch"], icon: "🥙", category: "Meat" },
  { name: "Minced Meat", names: ["Minced Meat", "Hackfleisch", "Extra Hackfleisch"], icon: "🥩", category: "Meat" },
  { name: "Anchovies", names: ["Anchovies", "Sardellen", "Extra Sardellen"], icon: "🐟", category: "Seafood" },
  { name: "Shrimp", names: ["Shrimp", "Crevetten", "Garnelen", "Extra Crevetten"], icon: "🍤", category: "Seafood" },
  { name: "Tuna", names: ["Tuna", "Thunfisch", "Thon", "Extra Thunfisch"], icon: "🐟", category: "Seafood" },
  { name: "Mayonnaise", names: ["Mayonnaise", "Mayo", "Mayonaise"], icon: "🫙", category: "Sauces" },
  { name: "Ketchup", names: ["Ketchup"], icon: "🫙", category: "Sauces" },
  { name: "Cocktail Sauce", names: ["Cocktail Sauce", "Cocktailsauce", "Cocktail"], icon: "🫙", category: "Sauces" },
  { name: "Spicy Sauce", names: ["Spicy Sauce", "Scharfe Sauce", "SCHARF", "Extra Scharf"], icon: "🌶️", category: "Sauces" },
  { name: "Garlic Sauce", names: ["Garlic Sauce", "Knoblauchsauce"], icon: "🫙", category: "Sauces" },
  { name: "Yogurt Sauce", names: ["Yogurt Sauce", "Joghurtsauce", "Joghurt"], icon: "🫙", category: "Sauces" },
  { name: "Mozzarella", names: ["Mozzarella", "Extra Mozzarella", "Käse", "Extra Käse"], icon: "🧀", category: "Cheese" },
  { name: "Gorgonzola", names: ["Gorgonzola", "Extra Gorgonzola"], icon: "🧀", category: "Cheese" },
  { name: "Parmesan", names: ["Parmesan", "Extra Parmesan"], icon: "🧀", category: "Cheese" },
  { name: "Mascarpone", names: ["Mascarpone", "Extra Mascarpone"], icon: "🧀", category: "Cheese" },
  { name: "Kaeserand", names: ["Kaeserand", "Käserand", "Käserand (33cm)", "Käserand (45cm)", "Cheese Crust"], icon: "🧀", category: "Cheese" },
];

export const TOPPING_PRICE = 2;

export const TOPPING_GRID: { color: string; textColor: string; items: (string | null)[] }[] = [
  { color: "#1455A4", textColor: "#fff", items: ["Tomato Sauce", "Sliced Tomatoes", "Garlic", "Onions", "Capers", "Olives", "Oregano"] },
  { color: "#1976D2", textColor: "#fff", items: ["Vegetables", "Spinach", "Bell Peppers", null, "Corn", "Broccoli", "Artichokes"] },
  { color: "#E8EAF6", textColor: "#1a1a2e", items: ["Egg", "Pineapple", null, null, null, null, "Arugula"] },
  { color: "#E8EAF6", textColor: "#1a1a2e", items: ["Mushrooms", null, null, null, null, null, null] },
  { color: "#B71C1C", textColor: "#fff", items: ["Ham", "Spicy Salami", "Salami", "Bacon", "Prosciutto", null, null] },
  { color: "#B71C1C", textColor: "#fff", items: ["Lamb", "Chicken", "Kebab", "Minced Meat", null, null, null] },
  { color: "#BF360C", textColor: "#fff", items: ["Anchovies", "Shrimp", "Tuna", null, null, null, null] },
  { color: "#1B5E20", textColor: "#fff", items: [null, null, null, null, null, null, "Spicy Sauce"] },
  { color: "#F9A825", textColor: "#1a1a2e", items: ["Mozzarella", "Gorgonzola", "Parmesan", "Mascarpone", "Kaeserand", null, null] },
];

export const SAUCE_ROW: { name: string; color: string; textColor: string }[] = [
  { name: "Mayonnaise", color: "#B71C1C", textColor: "#fff" },
  { name: "Ketchup", color: "#BF360C", textColor: "#fff" },
  { name: "Cocktail Sauce", color: "#1B5E20", textColor: "#fff" },
  { name: "Yogurt Sauce", color: "#F9A825", textColor: "#1a1a2e" },
];

export const SAUCE_NAMES = SAUCE_ROW.map(s => s.name);

export const getToppingPrice = (topping: string, selectedSizeLabel?: string | null): number => {
  if (SAUCE_NAMES.includes(topping)) return 0;

  const normalized = topping.toLowerCase();
  if (normalized.includes("kaeserand") || normalized.includes("käserand") || normalized.includes("cheese crust")) {
    const selectedSize = (selectedSizeLabel || "").toLowerCase();
    if (selectedSize.includes("45")) return 6;
    return 3;
  }

  return TOPPING_PRICE;
};

export const calcToppingsPrice = (toppings: string[], selectedSizeLabel?: string | null): number =>
  toppings.reduce((sum, topping) => sum + getToppingPrice(topping, selectedSizeLabel), 0);

export const getToppingDisplayName = (name: string, language: string): string => {
  const de: Record<string, string> = {
    "Tomato Sauce": "Tomatensauce", "Sliced Tomatoes": "Tomatenscheiben", "Garlic": "Knoblauch",
    "Onions": "Zwiebeln", "Capers": "Kapern", "Olives": "Oliven", "Oregano": "Oregano",
    "Vegetables": "Gemüse", "Spinach": "Spinat", "Bell Peppers": "Peperoni",
    "Corn": "Mais", "Broccoli": "Broccoli", "Artichokes": "Artischoken",
    "Egg": "Ei", "Pineapple": "Ananas", "Arugula": "Rukola", "Mushrooms": "Champignons",
    "Ham": "Schinken", "Spicy Salami": "Salami scharf", "Salami": "Salami",
    "Bacon": "Speck", "Prosciutto": "Rohschinken",
    "Lamb": "Lammfleisch", "Chicken": "Poulet", "Kebab": "Kebab",
    "Minced Meat": "Hackfleisch", "Mayonnaise": "Mayonaise",
    "Anchovies": "Sardellen", "Shrimp": "Crevetten", "Tuna": "Thon",
    "Ketchup": "Ketchup", "Cocktail Sauce": "Cocktail", "Spicy Sauce": "SCHARF",
    "Mozzarella": "Mozzarella", "Gorgonzola": "Gorgonzola", "Parmesan": "Käse",
    "Mascarpone": "Mascarpone", "Kaeserand": "Käserand", "Yogurt Sauce": "Joghurt",
  };
  const ar: Record<string, string> = {
    "Tomato Sauce": "صلصة طماطم", "Sliced Tomatoes": "طماطم مقطعة", "Garlic": "ثوم",
    "Onions": "بصل", "Capers": "كابر", "Olives": "زيتون", "Oregano": "أوريغانو",
    "Vegetables": "خضار", "Spinach": "سبانخ", "Bell Peppers": "فلفل", "Corn": "ذرة",
    "Broccoli": "بروكلي", "Artichokes": "أرضي شوكي", "Egg": "بيض", "Pineapple": "أناناس",
    "Arugula": "جرجير", "Mushrooms": "مشروم", "Ham": "هام", "Spicy Salami": "سلامي حار",
    "Salami": "سلامي", "Bacon": "لحم مدخن", "Prosciutto": "بروشوتو",
    "Lamb": "لحم ضأن", "Chicken": "دجاج", "Kebab": "كباب", "Minced Meat": "لحم مفروم",
    "Mayonnaise": "مايونيز", "Anchovies": "أنشوجة", "Shrimp": "جمبري", "Tuna": "تونة",
    "Ketchup": "كاتشاب", "Cocktail Sauce": "صلصة كوكتيل", "Spicy Sauce": "حار",
    "Mozzarella": "موزاريلا", "Gorgonzola": "جورجونزولا", "Parmesan": "جبنة",
    "Mascarpone": "ماسكاربوني", "Kaeserand": "حافة جبنة", "Yogurt Sauce": "زبادي",
  };
  if (language === "de") return de[name] || name;
  if (language === "ar") return ar[name] || name;
  return name;
};

export const getToppingEmoji = (name: string): string => {
  const map: Record<string, string> = {
    "Tomato Sauce": "🍅", "Sliced Tomatoes": "🍅", "Garlic": "🧄", "Onions": "🧅",
    "Capers": "🫛", "Olives": "🫒", "Oregano": "🌿", "Vegetables": "🥦",
    "Spinach": "🥬", "Bell Peppers": "🫑", "Corn": "🌽", "Broccoli": "🥦",
    "Artichokes": "🌿", "Arugula": "🥬", "Egg": "🥚", "Pineapple": "🍍",
    "Mushrooms": "🍄", "Ham": "🥩", "Spicy Salami": "🌶️", "Salami": "🥩",
    "Bacon": "🥓", "Prosciutto": "🥩", "Lamb": "🐑", "Chicken": "🍗",
    "Kebab": "🥙", "Minced Meat": "🥩", "Mayonnaise": "🫙", "Anchovies": "🐟",
    "Shrimp": "🍤", "Tuna": "🐟", "Ketchup": "🍅", "Cocktail Sauce": "🥂",
    "Spicy Sauce": "🌶️", "Mozzarella": "🧀", "Gorgonzola": "🧀",
    "Parmesan": "🧀", "Mascarpone": "🧀", "Kaeserand": "🧀", "Yogurt Sauce": "🥛",
  };
  return map[name] || "✨";
};

export const getToppingInfo = (label: string) => {
  const clean = label.toLowerCase()
    .replace(/^(extra|zusatz|mit)\s+/i, "")
    .trim();
  const found = PIZZA_TOPPINGS.find(t =>
    t.name.toLowerCase() === clean ||
    (t.names && t.names.some(n => n.toLowerCase() === clean)) ||
    label.toLowerCase().includes(t.name.toLowerCase()) ||
    (t.names && t.names.some(n => label.toLowerCase().includes(n.toLowerCase())))
  );
  return found || { icon: "✨", category: "Others" };
};
