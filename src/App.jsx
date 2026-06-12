import React, { useState, useEffect, useMemo, useReducer, useRef, useContext } from "react";
import logoUrl from "./assets/logo.png";

// Per-venue branding (logo, name, colors) — defaults to the Sundaze look.
// App fills this from the menu API; components read it via useBrand().
const DEFAULT_BRAND = { text: "SunDaze", logo: logoUrl, tagline: null };
const BrandContext = React.createContext(DEFAULT_BRAND);
const useBrand = () => useContext(BrandContext);

// Build a CSS override that re-skins the SAME layout with a venue's colors.
const THEME_VARS = ["sand", "sand2", "card", "ink", "muted", "terra", "terra2", "palm", "brz", "line"];
const FONT_VARS = { body: "--font-body", serif: "--font-serif", brand: "--font-brand" };
function themeCss(branding) {
  const colors = branding.colors || null;
  const fonts = branding.fonts || null;
  let decls = "";
  if (colors) decls += THEME_VARS.filter((k) => colors[k]).map((k) => `--${k}:${colors[k]}`).join(";");
  if (fonts) decls += ";" + Object.keys(FONT_VARS).filter((k) => fonts[k]).map((k) => `${FONT_VARS[k]}:${fonts[k]}`).join(";");
  const bg = colors && colors.bg1 && colors.bg2 ? `.sd{background:linear-gradient(180deg,${colors.bg1} 0%,${colors.bg2} 100%)}` : "";
  // load the venue's web fonts if it ships a Google Fonts URL
  const fontImport = branding.fontImport ? `@import url('${branding.fontImport}');` : "";
  return `${fontImport}.sd{${decls}}${bg}`;
}

// ============================================================================
// SUNDAZE — MENU DATA
// Parsed from the live hellorest.app menu (EN render). Prices in TRY (₺).
// Images are referenced from the original CDN; swap for your own host later.
// Item `id` matches the source product id so a future POS/menu sync can map 1:1.
// Localised names (TR/RU) load later from the source `?lng=` feed — kept EN now.
// ============================================================================

const IMG = "https://sundaze-menu.hellorest.app/fileUploads/sundaze/prd/";
const CAT_IMG = "https://sundaze-menu.hellorest.app/fileUploads/sundaze/cat/";
// The live menu stores full image URLs; the inline fallback uses bare filenames.
// Use a value as-is if it's already absolute, otherwise prefix the CDN base.
const imgUrl = (src, base) => (!src ? "" : /^https?:\/\//.test(src) ? src : base + src);
const CURRENCY = "₺";

// helper shape: { id, name, price, desc?, img?, isNew?, soldOut? }
// FALLBACK_MENU is the offline/seed copy. At runtime the app fetches the live
// menu from /api/v/<venue>/menu (see api.menu + buildMenu) and only falls back
// to this if the network/API is unavailable.
const FALLBACK_MENU = [
  {
    key: "breakfast", label: "Breakfast & Bowls", img: "1756732054537_IMG_8796_1.webp",
    groups: [
      { name: "Breakfast (08:00–16:00)", items: [
        { id: 383, name: "Çakallı Menemeni", price: 380, desc: "Roasted tomatoes, Vakfıkebir butter", img: "1756724811752_IMG_8794_1.webp" },
        { id: 384, name: "Spring Breakfast", price: 520, desc: "Quinoa strawberry arugula salad, buffalo mozzarella, avocado, boiled eggs (2 pcs)", img: "1760696365200_bahar_kahvalt__.webp" },
        { id: 385, name: "Protein Breakfast", price: 550, desc: "Chicken (120g), scrambled eggs (3), avocado, black rice, hellim cheese, field tomatoes, seasonal greens", img: "1756727749318_IMG_8796_1.webp" },
        { id: 386, name: "Sundaze Breakfast", price: 650, desc: "Three onion eggs (2), roasted potatoes, kaymak, Ezine & chechil cheese, olives, muhammara, fresh yufka", img: "1760696396531_sundaze_kahvalt__.webp" },
        { id: 543, name: "Maia Breakfast (min 2 ppl, per person)", price: 1900, desc: "Avocado, clotted cream, sahine, muhammara, gypsy pilaf, walnuts, butter eggs, cheeses, olives, sucuk, halloumi, thermos tea", img: "1762890456383_IMG_9368_1.webp", isNew: true },
      ]},
      { name: "Bowls", items: [
        { id: 246, name: "Acai Bowl", price: 550, desc: "Acai mix, coconut milk, blueberries, homemade granola, chia, peanut butter", img: "1756727955334_IMG_8663_1.webp" },
        { id: 247, name: "Granola Bowl", price: 480, desc: "Oats, molasses, olive oil, nuts, seeds, cinnamon, yoghurt, honey, seasonal fruits", img: "1760696460353_granola_bowl.webp" },
        { id: 390, name: "Syrniki", price: 480, desc: "Local Slavic breakfast, homemade jam, sour cream, seasonal fruits", img: "1756727827160_IMG_8668_1.webp" },
        { id: 391, name: "Pancakes", price: 380, desc: "Seasonal fruits, chocolate, honey", img: "1756727847103_IMG_8660_1.webp" },
      ]},
      { name: "Omelettes (08:00–16:00)", items: [
        { id: 243, name: "Vegetarian Omelette", price: 400, desc: "Mushrooms, spinach, zucchini, fresh herbs", img: "1760696516628_vejeteryan_omlet.webp" },
        { id: 379, name: "Sundaze Omelette", price: 500, desc: "Roasted sausage, Afyon mashed potatoes, pickled cucumber", img: "1756728071266_IMG_8788_1.webp" },
        { id: 380, name: "Avocado Omelette", price: 450, desc: "Alanya avocado, mozzarella, herbs, dried tomatoes & olives", img: "1760696553780_avokado_omlet.webp" },
        { id: 381, name: "Cheese Omelette", price: 400, desc: "Hellim, chechil & kolot cheese, fresh herbs", img: "1760696532947_peynirli_omlet.webp" },
        { id: 382, name: "4 Seasons Omelette", price: 550, desc: "Asparagus, baby spinach, oyster mushrooms, summer tomatoes, smoked beef, herbs", img: "1760696587803_4_mevsim_omlet.webp" },
      ]},
    ],
  },
  {
    key: "croissant", label: "Croissant · Toast · Sandwich", img: "1756732155786_IMG_8766_1.webp",
    groups: [
      { name: "Croissants", items: [
        { id: 248, name: "Plain Croissant", price: 170, img: "1756728092335_IMG_8770_1.webp" },
        { id: 249, name: "Breakfast Club", price: 780, desc: "Scrambled eggs, smoked meat, kashar cheese", img: "1756728373745_IMG_8762_1.webp" },
        { id: 250, name: "Royal Club", price: 780, desc: "Smoked meat, avocado, kashar cheese", img: "1756728405227_IMG_8772_1.webp" },
        { id: 251, name: "Egg Benedict", price: 760, desc: "Smoked beef, baby spinach, poached eggs, hollandaise", img: "1760696639195_egg_benedict.webp" },
        { id: 252, name: "Protein Croissant", price: 620, desc: "Guacamole, smoked turkey, 2 poached eggs, olive oil, paprika, black cumin", img: "1760696616355_protein_croissant.webp" },
        { id: 253, name: "Avocado Lovers", price: 450, desc: "Scrambled eggs, avocado, cheese", img: "1756728141570_IMG_8747_1.webp" },
        { id: 254, name: "Fresh Start", price: 500, desc: "Labneh, avocado, cherry tomatoes, arugula, dried tomatoes, balsamic", img: "1756728206160_IMG_8753_1.webp" },
        { id: 394, name: "Scrambled Egg Croissant", price: 360, img: "1756728118358_IMG_8746_1.webp" },
        { id: 395, name: "Grilled Chicken Croissant", price: 550, desc: "Caramelized onion, mushroom, parmesan, cheddar, pesto, cherry tomatoes", img: "1756728185225_IMG_8757_1.webp" },
        { id: 396, name: "Avocado Toast Croissant", price: 480, desc: "Poached eggs, avocado, arugula, parmesan", img: "1756728227950_IMG_8754_1.webp" },
        { id: 397, name: "Egg and Hotdog", price: 680, desc: "Scrambled eggs, mozzarella, hotdog, black sesame", img: "1756728321256_IMG_8761_1.webp" },
        { id: 398, name: "Salmon Cucumber", price: 680, desc: "Smoked salmon, labneh, egg, cucumber, arugula", img: "1760696660012_salmon_cucumber.webp" },
      ]},
      { name: "Sweet Croissants", items: [
        { id: 359, name: "Nutella Croissant", price: 400, desc: "Chocolate, walnuts", img: "1756728483655_IMG_8775_1.webp" },
        { id: 360, name: "Nutella Fruit Croissant", price: 450, desc: "Nutella, walnuts, seasonal fruits", img: "1756728505047_IMG_8776_1.webp" },
      ]},
      { name: "Toasts", items: [
        { id: 256, name: "Mediterranean Toast", price: 450, desc: "Ezine cheese, tomatoes, pesto, cucumbers, olives", img: "1760696682074_akdeniz_tost.webp" },
        { id: 388, name: "Sundaze Toast", price: 500, desc: "Avocado, smoked turkey, goat cheese, pesto, greens, sourdough", img: "1756728643026_IMG_8662_1.webp" },
        { id: 389, name: "Pepperoni Toast", price: 540, desc: "Italian salami, cheddar, greens, sourdough", img: "1756728667776_IMG_8659_1.webp" },
      ]},
      { name: "Sandwich", items: [
        { id: 403, name: "Barbecue Sandwich", price: 550, desc: "Grilled chicken, caramelized onions, mushrooms, BBQ sauce, wood-fired bread", img: "1756728695314_IMG_8666_1.webp" },
        { id: 404, name: "Caprese Sandwich", price: 540, desc: "Buffalo mozzarella, field tomatoes, pesto, arugula, wood-fired bread", img: "1756728716384_IMG_8665_1.webp" },
      ]},
    ],
  },
  {
    key: "starters", label: "Starters", img: "1756732181196_IMG_8633_1.webp",
    items: [
      { id: 245, name: "French Fries", price: 280, desc: "Standard / parmesan / truffle-parmesan", img: "1758699262448_IMG_9362_1.webp" },
      { id: 267, name: "Shrimp Tempura", price: 650, desc: "Sweet & sour aioli", img: "1758804618006_IMG_9354_1.webp" },
      { id: 271, name: "Fish & Chips", price: 680, desc: "Tempura haddock, coleslaw, fries", img: "1758804642943_IMG_9366_1.webp" },
      { id: 414, name: "Guacamole", price: 500, desc: "Avocado, tomato, cucumber, onion, cilantro, anchovy, olive paste, tortilla", img: "1760696745350_guacamole.webp" },
      { id: 415, name: "Burrata", price: 1100, desc: "Garden tomatoes, chives, balsamic, olive oil", img: "1756728766074_IMG_8639_1.webp" },
      { id: 416, name: "Bonfile Carpaccio", price: 1250, desc: "Aged thin steak, truffle mayo, parmesan, mustard seed pickle", img: "1758804676564_IMG_9356_1.webp" },
      { id: 417, name: "Fried Local Calamari", price: 1050, desc: "Hazelnut tartar, arugula, lime" },
    ],
  },
  {
    key: "salad-pasta", label: "Salad & Pasta", img: "1756732238682_IMG_8670_1.webp",
    groups: [
      { name: "Salads", items: [
        { id: 421, name: "Green Salad", price: 480, desc: "Green apple, pumpkin seeds, raw almonds, field greens, citrus sauce", img: "1779117231663_YE____L_SALATA.webp" },
        { id: 425, name: "Purslane Strawberry", price: 580, desc: "Wild purslane, strawberry, baby zucchini, roasted hazelnuts", img: "1756728895927_IMG_8670_1.webp" },
        { id: 702, name: "Shrimp Salad", price: 670, desc: "Grilled shrimp, asparagus, avocado, tomatoes, parmesan, arugula, tomato citronette", img: "1779117118095_KAR__DES_SALATA.webp", isNew: true },
        { id: 703, name: "Caesar Salad", price: 580, desc: "Grilled chicken, asparagus, brioche crisps, lettuce, parmesan, caesar sauce", img: "1779117151461_SEZAR_SALATA.webp", isNew: true },
        { id: 704, name: "Salmon Salad", price: 780, desc: "Grilled salmon, beetroot, avocado, quinoa tabbouleh, orange, greens, lemon vinaigrette", img: "1779117178675_SOMON_SALATA.webp", isNew: true },
        { id: 705, name: "Mozzarella Salad", price: 760, desc: "Fried mozzarella, roasted peppers, green olives, walnuts, greens, balsamic", img: "1779117210263_MOZZARELLA.webp", isNew: true },
        { id: 706, name: "Horiatiki", price: 450, desc: "Tomatoes, cucumbers, red onions, peppers, olives, capers, feta, olive oil", img: "1779117257659_HOR__AT__K__.webp", isNew: true },
      ]},
      { name: "Pastas", items: [
        { id: 260, name: "Penne Chicken", price: 550, desc: "Grilled chicken, broccoli, baby spinach, garlic, cream, cajun peanuts, parmesan", img: "1756729349518_IMG_8658_1.webp" },
        { id: 426, name: "Rigatoni Ragu", price: 750, desc: "Slow-cooked beef ragu, lemon, fresh herbs", img: "1758804711245_IMG_9365_1.webp", isNew: true },
        { id: 427, name: "Fettuccine Burrata", price: 920, desc: "Truffle paste, green asparagus, parmesan", img: "1760696819093_fettucine_burrata.webp" },
        { id: 428, name: "Spaghetti Aglio Olio Shrimp", price: 700, desc: "Grilled shrimp, garlic, chili, parsley, chives", img: "1756729472520_IMG_8654_1.webp" },
        { id: 429, name: "Smoked Fettuccine", price: 680, desc: "Smoked beef, ricotta, parmesan, mushrooms, parsley", img: "1758804729678_IMG_9364_1.webp" },
        { id: 430, name: "Sailor's Risotto", price: 1100, desc: "Arborio rice, local shrimp, baby squid, sea bass, saffron", img: "1758804754684_IMG_9360_1.webp", isNew: true },
      ]},
    ],
  },
  {
    key: "burgers", label: "Burgers", img: "1758699636352_IMG_9331_1.webp",
    items: [
      { id: 399, name: "Basic Burger", price: 720, desc: "Roasted mushrooms, caramelized onions, cheddar, gherkins, burger sauce, fries", img: "1760696919034_basic_burger.webp" },
      { id: 400, name: "Truffle Burger", price: 820, desc: "Beef bacon, scamorza, truffle butter, red onion, truffle mayo, fries", img: "1760696944286_truffle_burger.webp" },
      { id: 401, name: "12 Hour Burger", price: 890, desc: "Oak-smoked brisket, roasted eggplant & peppers, red onion, cheddar, spicy mayo, fries", img: "1760696932781_12_hour_burger.webp" },
      { id: 402, name: "Ultimate Chicken Burger", price: 550, desc: "Crispy breaded chicken, tartar, purple cabbage, cheddar, fries", img: "1760696906681_ultimate_chicken_burger.webp" },
    ],
  },
  {
    key: "pizzas", label: "Pizzas", img: "1756732560020_IMG_8784_1.webp",
    items: [
      { id: 293, name: "Margarita Pizza", price: 650, desc: "Tomato sauce, fior di latte, basil, olive oil, parmesan", img: "1756729659345_IMG_8783_1.webp" },
      { id: 294, name: "4 Cheese Pizza", price: 650, desc: "Emmental, gouda, roquefort, fior di latte", img: "1756729958729_IMG_8785_1.webp" },
      { id: 295, name: "Mushroom Pizza", price: 680, desc: "Mascarpone-ricotta sauce, fior di latte, mushroom, cherry tomato, pesto", img: "1756729908825_IMG_8792_1.webp" },
      { id: 297, name: "Mexican Pizza", price: 720, desc: "Spicy tomato sauce, chicken, jalapeño, corn, cheddar, gouda, fior di latte", img: "1756730065185_IMG_8797_1.webp" },
      { id: 300, name: "Pepperoni Pizza", price: 1100, desc: "Italian salami, tomato sauce, fior di latte", img: "1756730117887_IMG_8793_1.webp" },
      { id: 301, name: "Smoke Ribs Pizza", price: 1300, desc: "12h oak-smoked beef rib, tomato sauce, roasted capsicum, cherry tomatoes, fior di latte", img: "1756730141231_IMG_8795_1.webp" },
      { id: 303, name: "Marinara Burrata", price: 1050, desc: "Tomato sauce, burrata, garlic, thyme, pistachios, zucchini flowers, arugula, olive oil", img: "1756730517473_IMG_8799_1.webp" },
      { id: 305, name: "Smoked Meat Pizza", price: 1450, desc: "Tomato sauce, smoked meat, cherry tomatoes, fior di latte, arugula, parmesan", img: "1752491361670_fume.webp" },
      { id: 410, name: "Deluxe Pizza", price: 750, desc: "Fior di latte, tomato sauce, sucuk, mushrooms, roasted peppers, olives", img: "1756729743859_IMG_8787_1.webp" },
      { id: 411, name: "Grilled Shrimp Pizza", price: 700, desc: "Fior di latte, tomato sauce, sea beans, chimichurri, grilled shrimp, garlic, parmesan", img: "1756730094824_IMG_8791_1.webp" },
      { id: 412, name: "Verde Pizza", price: 720, desc: "Fior di latte, herbed ricotta, zucchini, spinach, asparagus, mushrooms", img: "1756729682081_IMG_8801_1.webp" },
    ],
  },
  {
    key: "mains", label: "Main Dishes", img: "1756732290562_IMG_8970_1.webp",
    items: [
      { id: 262, name: "Mushroom Risotto", price: 740, desc: "Arborio rice, oyster, porcini & yellow mushrooms, spring onions", img: "1756729450968_IMG_8676_1.webp" },
      { id: 268, name: "Sea Bass", price: 1250, desc: "Potatoes & sea beans, capers, onions, olives, fresh herbs", img: "1756730837560_IMG_8941_1.webp" },
      { id: 269, name: "Chicken Masala", price: 650, desc: "Chicken breast, red onion, garam masala, parsley, garlic butter basmati", img: "1756730615114_IMG_8938_1.webp" },
      { id: 272, name: "Chicken Schnitzel", price: 700, desc: "Breaded chicken breast, potato salad, arugula, lime", img: "1756730689851_IMG_8959_1.webp" },
      { id: 273, name: "Chicken Wings", price: 750, desc: "Spicy samurai sauce, garlic mayo, fries", img: "1758804780797_IMG_9337_1.webp" },
      { id: 408, name: "Chicken Quesadilla", price: 450, desc: "Sautéed peppers & onions, Mexican cheese, nachos, 3 sauces, mini salad", img: "1762942836691_QUASED__LLA_SUDNDAZE.webp" },
      { id: 431, name: "Salmon", price: 950, desc: "Baby potatoes, greens with avocado & quinoa, citrus purée, chives, beurre monté", img: "1756730789802_IMG_8962_1.webp" },
      { id: 432, name: "Chicken Orzo", price: 550, desc: "Chicken thigh, spinach, yellow zucchini, roasted shallots, gravy, herbs", img: "1756730554805_IMG_8948_1.webp" },
      { id: 433, name: "Chicken Mushroom", price: 650, desc: "Chicken breast, baby potatoes, porcini, chestnuts, oyster mushrooms, herbs", img: "1756730651706_IMG_8950_1.webp" },
      { id: 434, name: "Half Chicken", price: 750, desc: "Seasonal vegetables, mashed potatoes", img: "1756730578338_IMG_8952_1.webp" },
      { id: 437, name: "Pepper Steak", price: 1850, desc: "Butter-cooked steak, cheese potato croquettes, broccoli, pepper sauce", img: "1756730814017_IMG_8970_1.webp" },
      { id: 438, name: "Wood-Fired Yogurt Meatballs", price: 1050, desc: "Grilled meatballs, tomato sauce, yogurt, black-eyed peas, wood-fired bread", img: "1756730715202_IMG_8953_1.webp" },
    ],
  },
  {
    key: "sushi", label: "Sushi", img: "1758449897965_salmon_spicy.webp",
    groups: [
      { name: "Omakase", items: [
        { id: 707, name: "Vegetarian Set (16 pcs)", price: 1050, desc: "Veggie roll, kappa maki, asparagus maki, avocado nigiri", img: "1779868957469_vejeteryan_set.webp", isNew: true },
        { id: 708, name: "Nigiri Selection Set (8 pcs)", price: 1300, desc: "Sake, salmon aburi, suzuki, surimi, ebi, avocado, unagi, asparagus", img: "1779868947609_nigiri_selection.webp", isNew: true },
        { id: 709, name: "Tempura Mix Set (24 pcs)", price: 1800, desc: "Golden crunchy roll, truffle & suzuki roll, tempura shrimp roll", isNew: true },
        { id: 710, name: "Sashimi Selection Set (15 pcs)", price: 2200, desc: "Sake, suzuki, ebi, unagi, surimi sashimi, avocado, goma wakame", isNew: true },
        { id: 711, name: "Maia Signature Set (28 pcs)", price: 2300, desc: "Truffle shrimp tempura, red tower, salmon aburi nigiri, ocean duo roll", isNew: true },
        { id: 712, name: "Classic Set (28 pcs)", price: 2550, desc: "Philadelphia, california, rainbow rolls, sake & unagi nigiri", isNew: true },
      ]},
      { name: "Starters", items: [
        { id: 470, name: "Edamame", price: 400, desc: "Boiled soybeans, maldon salt", img: "1758444047232_WhatsApp_G__rsel_2025_09_16_saat_14.54.webp", isNew: true },
        { id: 471, name: "Spicy Edamame", price: 400, desc: "Soy, sesame oil, togarashi", img: "1758747816825_WhatsApp_G__rsel_2025_09_24_saat_22.11.webp", isNew: true },
        { id: 472, name: "Goma Wakame Salad", price: 550, desc: "With avocado & teriyaki", img: "1758444247986_WhatsApp_G__rsel_2025_09_16_saat_14.54.webp", isNew: true },
        { id: 473, name: "Tropical Salmon Tartar", price: 650, desc: "Salmon, mango, goma wakame, avocado, chives, orange ponzu, tobiko, microgreens", img: "1758747745318_WhatsApp_G__rsel_2025_09_24_saat_22.11.webp", isNew: true },
      ]},
      { name: "Sashimi (4 pcs)", items: [
        { id: 475, name: "Sake Sashimi", price: 550, desc: "Salmon, thinly sliced", img: "1758445398929_WhatsApp_G__rsel_2025_09_16_saat_14.54.webp" },
        { id: 476, name: "Suzuki Sashimi", price: 450, desc: "Sea bass, thinly sliced", img: "1758445479432_WhatsApp_G__rsel_2025_09_16_saat_14.54.webp", isNew: true },
        { id: 477, name: "Unagi Sashimi", price: 700, desc: "Eel, teriyaki, sesame", img: "1758445548793_WhatsApp_G__rsel_2025_09_16_saat_14.54.webp", isNew: true },
      ]},
      { name: "Nigiri (2 pcs)", items: [
        { id: 480, name: "Sake Nigiri", price: 400, desc: "Salmon & rice", img: "1758445728225_WhatsApp_G__rsel_2025_09_16_saat_14.54.webp", isNew: true },
        { id: 481, name: "Salmon Aburi Nigiri", price: 420, desc: "Smoked salmon, rice, teriyaki, chives", img: "1758445784149_WhatsApp_G__rsel_2025_09_16_saat_14.54.webp", isNew: true },
        { id: 482, name: "Suzuki Nigiri", price: 400, desc: "Sea bass, rice, truffle mayo", img: "1758445962452_WhatsApp_G__rsel_2025_09_16_saat_14.54.webp", isNew: true },
        { id: 483, name: "Unagi Nigiri", price: 480, desc: "Eel, rice, teriyaki, sesame", img: "1758446040880_WhatsApp_G__rsel_2025_09_16_saat_14.54.webp", isNew: true },
      ]},
      { name: "Maki (6 pcs)", items: [
        { id: 485, name: "Sake Maki", price: 450, desc: "Seaweed, rice, salmon", img: "1758449696355_salmon_maki.webp" },
        { id: 487, name: "Unagi Maki", price: 650, desc: "Seaweed, rice, eel, teriyaki, sesame", img: "1758446378057_WhatsApp_G__rsel_2025_09_16_saat_14.54.webp", isNew: true },
        { id: 488, name: "Avocado Maki", price: 400, desc: "Seaweed, rice, avocado", img: "1758449707188_avokado_maki.webp" },
        { id: 489, name: "Kappa Maki", price: 350, desc: "Cucumber, rice, nori", img: "1758449677961_kappa_maki.webp" },
      ]},
      { name: "Classic Rolls (8 pcs)", items: [
        { id: 491, name: "Philadelphia Roll", price: 700, desc: "In: cream cheese, avocado, cucumber / Out: salmon, teriyaki", img: "1758449819836_philadephia_roll.webp" },
        { id: 492, name: "California Roll", price: 680, desc: "In: surimi, spicy mayo, avocado, cucumber / Out: orange tobiko", img: "1758449852837_california_roll.webp" },
        { id: 493, name: "Tempura Shrimp Roll", price: 600, desc: "In: tempura shrimp, cucumber / Out: sesame, teriyaki", img: "1779868808581_tempura_shr__mp_roll.webp" },
        { id: 494, name: "Unagi Roll", price: 750, desc: "In: avocado, cucumber, cream cheese / Out: eel, sesame", img: "1758448985134_WhatsApp_G__rsel_2025_09_16_saat_14.54.webp" },
        { id: 495, name: "Spicy Salmon Roll", price: 720, desc: "In: avocado, cucumber / Out: spicy salmon tartar, sesame, spicy mayo, tobiko", img: "1758449865413_salmon_spicy.webp" },
        { id: 496, name: "Veggie Roll", price: 500, desc: "In: cream cheese, asparagus, carrot, cucumber / Out: roasted pepper, avocado, yuzu mayo", img: "1779868784858_veggie_roll.webp" },
        { id: 713, name: "Rainbow Roll", price: 700, desc: "In: cream cheese, surimi, avocado, cucumber / Out: salmon, sea bass, shrimp, avocado, tobiko", img: "1779868824622_rainbow_roll.webp", isNew: true },
      ]},
      { name: "Special Rolls (8 pcs)", items: [
        { id: 498, name: "Truffle & Suzuki Roll", price: 650, desc: "In: tempura sea bass, capia pepper, cucumber / Out: truffle mayo, panko, chives", img: "1779868859252_truffle_suzuki_roll.webp", isNew: true },
        { id: 499, name: "Sundaze Roll", price: 630, desc: "In: avocado, cucumber / Out: spicy salmon tartar, teriyaki, chives, avocado", img: "1779868842860_sundaze_roll.webp", isNew: true },
        { id: 501, name: "Tokyo Roll", price: 780, desc: "In: eel, cream cheese, cucumber, avocado / Out: tempura shrimp, teriyaki, chives", img: "1779868929258_tokyo_roll.webp", isNew: true },
        { id: 714, name: "Red Tower Roll", price: 700, desc: "In: tempura shrimp, avocado / Out: torched salmon, teriyaki, spicy mayo, pepper thread", img: "1779868871133_red_tower_roll.webp", isNew: true },
        { id: 715, name: "Truffle Shrimp Tempura Roll", price: 700, desc: "In: tempura shrimp, avocado, cucumber / Out: truffle aioli, sweet potato matchsticks, teriyaki", img: "1779868886480_truffle_shrimp_tempura_roll.webp" },
        { id: 716, name: "Ocean Duo Roll", price: 720, desc: "In: salmon, sea bass, cucumber / Out: avocado, cream cheese, togarashi", img: "1779868906563_ocean_duo_roll.webp", isNew: true },
        { id: 717, name: "Golden Crunchy Roll", price: 750, desc: "In: cream cheese, avocado, salmon, cucumber / Out: teriyaki, potato matchsticks", img: "1779868918263_cruncy_golden_roll.webp", isNew: true },
      ]},
    ],
  },
  {
    key: "desserts", label: "Desserts", img: "1758699084622_IMG_9344_1.webp",
    items: [
      { id: 283, name: "Cheesecake", price: 300, img: "1769154082223_IMG_0773_1.webp" },
      { id: 282, name: "San Sebastian Cheesecake", price: 420, img: "1769154104151_IMG_0774_1.webp" },
      { id: 284, name: "Profiterole 250g", price: 350, img: "1762942929013_IMG_9312_1.webp" },
      { id: 285, name: "Profiterole 500g", price: 500, img: "1758019940725_20240923tatlilar_cafe_local_alanya_7_skwxhr.webp" },
      { id: 376, name: "Fruit Plate", price: 750, desc: "Seasonal fruits", img: "1769154176151_IMG_0768_1.webp" },
      { id: 378, name: "Melon Plate", price: 400, img: "1758699050971_IMG_9351_1.webp" },
    ],
  },
  {
    key: "icecream", label: "Ice Creams", img: "1758304567161_1757509078793_20230826Bu__yu__k_IMG_1823_1_hiioye.webp",
    items: [
      { id: 455, name: "Vanilla Ice Cream", price: 180, img: "1778140927953_vanilya.webp", isNew: true },
      { id: 456, name: "Chocolate Ice Cream", price: 180, img: "1778140941397___ikolata.webp", isNew: true },
      { id: 457, name: "Strawberry Ice Cream", price: 180, img: "1778140950879___ilek.webp", isNew: true },
      { id: 696, name: "Tiramisu Ice Cream", price: 180, img: "1778418911792_1764165124737_IMG_6417.webp", isNew: true },
      { id: 697, name: "Oreo Ice Cream", price: 180, img: "1778418993538_1764165023794_IMG_6418.webp", isNew: true },
      { id: 698, name: "Pistachio Ice Cream", price: 180, img: "1778419111742_1764164690731_IMG_6419.webp", isNew: true },
      { id: 699, name: "Lotus Ice Cream", price: 180, img: "1779195243542_1764164742669_IMG_6417.webp", isNew: true },
      { id: 700, name: "Lemon Ice Cream", price: 180, img: "1779195253227_1764164666385_IMG_6413.webp", isNew: true },
    ],
  },
  {
    key: "coffees", label: "Coffees", img: "1758700422335_cappucino.webp",
    groups: [
      { name: "Iced Coffees · Julius Meinl", items: [
        { id: 136, name: "Ice Filter Coffee", price: 210, img: "1758700104291_20241009Bu__yu__k_ice_filter_tbmcbv.webp" },
        { id: 137, name: "Iced Americano", price: 240, img: "1758700120816_20241009Bu__yu__k___ce_americano_fd2z7x.webp" },
        { id: 138, name: "Ice Latte", price: 260, img: "1758700139619_20241009Bu__yu__k___ce_latte_l6nopp.webp" },
        { id: 139, name: "Frappe", price: 300, img: "1758700154880_20240923frappe_q6srkl.webp" },
        { id: 140, name: "Espresso Tonic", price: 320, img: "1758700168394_20240923Buyuk_espresso_tonic_i6cyzh.webp" },
        { id: 660, name: "Bumble Coffee", price: 320, img: "1775211573331_20240923Bumble_coffe_tcz9hy.webp", isNew: true },
      ]},
      { name: "Hot Coffees · Julius Meinl", items: [
        { id: 142, name: "Turkish Coffee", price: 200, img: "1758700454352_t__rk_kahvesi.webp" },
        { id: 143, name: "Double Espresso", price: 200, img: "1758700468430_espresso.webp" },
        { id: 144, name: "Filter Coffee", price: 200, img: "1758700480839_filtre_kahve.webp" },
        { id: 145, name: "Americano", price: 220, img: "1758700498453_amerikano.webp" },
        { id: 146, name: "Coffee Latte", price: 250, img: "1758700514502_caffe_katte.webp" },
        { id: 147, name: "Flat White", price: 250, img: "1758700525962_flat_white.webp" },
        { id: 148, name: "Cappuccino", price: 250, img: "1758700539491_cappucino.webp" },
      ]},
    ],
  },
  {
    key: "hotdrinks", label: "Hot Drinks", img: "1766350567915_1758012464445_20230826Bu__yu__k_IMG_1864_1_rwiur9.webp",
    items: [
      { id: 459, name: "Green Dragon", price: 200, desc: "China · Green tea", img: "1758011969983_20230826Bu__yu__k_IMG_1866_1_frmpcw.webp", isNew: true },
      { id: 460, name: "Herbs & Ginger", price: 200, desc: "Nigeria · ginger, anise, fennel, licorice, lemongrass, chamomile, rose", img: "1758012051683_20230826Bu__yu__k_IMG_1862_1_vmftcr.webp", isNew: true },
      { id: 461, name: "Earl Grey", price: 200, desc: "India · black tea, bergamot", img: "1758012131377_20231023IMG_4210_hnaqxv.webp", isNew: true },
      { id: 462, name: "Morgentau", price: 200, desc: "China · green sencha, rose petals, mango, bergamot", img: "1758012173398_20231023IMG_4210_hnaqxv.webp" },
      { id: 463, name: "English Breakfast", price: 200, desc: "Sri Lanka · black ceylon", img: "1758012234406_20230826Bu__yu__k_IMG_1867_1_oiaiso.webp", isNew: true },
      { id: 464, name: "White Tea & Cassis", price: 200, desc: "China", img: "1758012390992_20240323IMG_9507_vo4lmd.webp", isNew: true },
      { id: 465, name: "Rooibos Cream Orange", price: 200, desc: "South Africa · rooibos, orange peel, vanilla", img: "1758012464445_20230826Bu__yu__k_IMG_1864_1_rwiur9.webp", isNew: true },
      { id: 466, name: "Glass of Tea", price: 100, img: "1758016556079_20240923DEMLEME_C__AY_fywspc.webp", isNew: true },
      { id: 467, name: "Double Tea", price: 150, img: "1758016595522_20240923Buyuk_IMG_2487_1_menu_mpkyjk.webp", isNew: true },
      { id: 658, name: "Hot Chocolate", price: 300, img: "1765533668181_20240923Buyuk_sicak_cikolata_b4g36n.webp", isNew: true },
    ],
  },
  {
    key: "beverages", label: "Beverages", img: "1758176170553_202409238010001_yan_fb0c69_1650x1650_1_g0nz17.webp",
    groups: [
      { name: "Water & Mineral Water", items: [
        { id: 101, name: "Uludağ Premium Water 750ml", price: 140, img: "1760866158471_uluda___premium_750.webp" },
        { id: 102, name: "Uludağ Premium Water 330ml", price: 90, img: "1760866254784_uluda___su_330.webp" },
        { id: 103, name: "Uludağ Premium Sparkling 750ml", price: 200, img: "1760866205278_uluda___premium_1.webp" },
        { id: 105, name: "San Pellegrino 250ml", price: 200, img: "1758176257870_20240923san_pellegrino_dogal_mineralli_su_250_ml_6.webp" },
        { id: 106, name: "Beypazarı Sparkling Water", price: 100, img: "1758176187200_BEYPAZARI.webp" },
        { id: 542, name: "Uludağ Premium Sparkling 250ml", price: 140, img: "1760866424765_uluda___premium_250ml.webp" },
      ]},
      { name: "Soft Drinks", items: [
        { id: 107, name: "Coca Cola", price: 160, img: "1758176275447_202409238010001_yan_fb0c69_1650x1650_1_g0nz17.webp" },
        { id: 108, name: "Coca Cola Zero", price: 160, img: "1758176295478_202409238010202_yan_493823_1650x1650_1_emrubh.webp" },
        { id: 109, name: "Schweppes Tonic", price: 160, img: "1758176583827_schweppes_indiantonic_product_image.webp" },
        { id: 111, name: "Thomas Henry Tonic Grapefruit", price: 200, img: "1758176609119_THOMAS.webp" },
        { id: 112, name: "Fuse Tea Lemon", price: 160, img: "1758176333583_20241102images_tv2jnu.webp" },
        { id: 113, name: "Fuse Tea Peach", price: 160, img: "1758176353032_20241102TUR5449000002952_A1NG_yan_d31993_foppea.webp" },
        { id: 114, name: "Fuse Tea Pineapple & Mango", price: 160, img: "1758176371931_FUSE_TEA_MANGO.webp" },
        { id: 115, name: "Fanta", price: 160, img: "1758176387786_20240923c4997_Portakal_330_Ml_wzhlok.webp" },
        { id: 116, name: "Sprite", price: 160, img: "1758176399476_20240923TUR5449000006288_A1NG_yan_881eaf_o5u5de.webp" },
        { id: 117, name: "Lemonade", price: 200, img: "1779111771240_L__MONATA.webp" },
        { id: 118, name: "Red Bull", price: 180, img: "1758176460921_2024092308110030_a4b666_1650x1650_1_uzpja1.webp" },
        { id: 119, name: "Ayran", price: 150, img: "1758176425528_202409238850698436658_1684311268048_x4mq8s.webp" },
        { id: 375, name: "Sugar-free Red Bull", price: 180, img: "1758176597336___EKERS__Z_REDBULL.webp" },
        { id: 558, name: "Strawberry Lemonade", price: 240, img: "1779111743461_____LEKL___L__MONATA.webp" },
        { id: 669, name: "Thomas Henry Ginger Ale", price: 200, img: "1778049635777_8110080_73f209.webp", isNew: true },
        { id: 670, name: "Thomas Henry Dry Tonic", price: 200, img: "1778049659789_8110088_24fc6d_1650x1650.webp", isNew: true },
      ]},
    ],
  },
  {
    key: "smoothies", label: "Smoothies & Frozen", img: "1777446836238_____LEK_FROZEN.webp",
    groups: [
      { name: "Milkshake", items: [
        { id: 701, name: "Milkshakes", price: 320, desc: "Vanilla, chocolate, strawberry, pistachio, oreo, lotus", img: "1779111799684_M__LKSHANE.webp", isNew: true },
      ]},
      { name: "Smoothies", items: [
        { id: 368, name: "Sundaze Sunrise", price: 300, desc: "Green apple, pineapple, mango, coconut milk", img: "1777446728240_SUNDAZE_SUNR__SE.webp" },
        { id: 370, name: "Sundaze Berries", price: 270, desc: "Black mulberry, blackberry, raspberry, blueberry, coconut milk", img: "1777446700443_SUNDAZE_BERR__ES.webp" },
        { id: 371, name: "Sundaze Sunset", price: 300, desc: "Banana, strawberry, honey, coconut milk", img: "1777446746334_SUNDAZE_SUNSET.webp" },
      ]},
      { name: "Frozen", items: [
        { id: 131, name: "Strawberry Frozen", price: 280, img: "1777446758983_____LEK_FROZEN.webp" },
        { id: 132, name: "Raspberry Frozen", price: 280, img: "1777446772350_KARADUT_FROZEN.webp" },
        { id: 133, name: "Mango Frozen", price: 320, img: "1777446797577_MANGO_FROZEN.webp" },
        { id: 135, name: "Blueberry Frozen", price: 280, img: "1777446783495_KARADUT_YABAN_MERS__N_FROZEN.webp" },
      ]},
    ],
  },
  {
    key: "juices", label: "Fresh Juices", img: "1758175979481_ENERG.webp",
    groups: [
      { name: "Fresh Juices", items: [
        { id: 120, name: "Orange Juice", price: 220, img: "1758175751141_20241008Bu__yu__k_portakal_dvomht.webp" },
        { id: 121, name: "Apple Juice", price: 220, img: "1758175767521_20241008Bu__yu__k_elma_ffnnnd.webp" },
        { id: 122, name: "Grapefruit Juice", price: 220, img: "1758175785208_20241008Bu__yu__k_greyfurt_u6go7r.webp" },
        { id: 123, name: "Carrot Juice", price: 220, img: "1758175806651_20241008Bu__yu__k_havuc___suyu_xfg0tm.webp" },
        { id: 124, name: "Special Mix Juice", price: 250, desc: "Apple, carrot, orange", img: "1758175826061_20241008Bu__yu__k_kar__s____k_qgsxpw.webp" },
        { id: 125, name: "Tropicana", price: 300, desc: "Orange, mango", img: "1758175854697_TROP__CANA.webp" },
      ]},
      { name: "Vitamin A/C", items: [
        { id: 126, name: "Ener-G", price: 200, img: "1758175876499_ENERG.webp" },
        { id: 127, name: "Doctor Away", price: 200, img: "1758175888513_DOCTOR_AWAY.webp" },
        { id: 128, name: "Cucumber Parsley Detox", price: 250, img: "1778331460467_1758175917528_SPEC__AL_DETOKS.webp" },
        { id: 129, name: "Pineapple Detox", price: 350, img: "1758175929664_ANANAS_DETOKS.webp" },
        { id: 130, name: "Special Detox", price: 240, img: "1758175917528_SPEC__AL_DETOKS.webp" },
      ]},
    ],
  },
  {
    key: "cocktails", label: "Cocktails", img: "1755256985705_cosmopolitan.webp",
    groups: [
      { name: "Sundaze Signature Cocktails", items: [
        { id: 1, name: "Satsuma", price: 750, desc: "Chivas Regal 12, satsuma cordial, citrus & sour mix", img: "1755256184227_satsuma.webp" },
        { id: 2, name: "Green Sorrel", price: 750, desc: "Tanqueray gin, Cointreau, green sorrel cordial, lime", img: "1755256203523_kuzukula____.webp" },
        { id: 3, name: "Black Mulberry", price: 750, desc: "Absolut Raspberry, black mulberry cordial, satsuma, pomegranate molasses", img: "1766652506900_karadut.webp" },
        { id: 5, name: "Elderberry Lime", price: 750, desc: "Tanqueray gin, elderflower-lime syrup, apple cider vinegar, grapefruit, sour mix", img: "1755256133177_m__rver_lime.webp" },
        { id: 7, name: "Italian Aperitiki", price: 750, desc: "Havana Club 3, Aperol, pineapple, orgeat, orange peel, lemon", img: "1766652517168_italian_aperitiki.webp" },
        { id: 8, name: "Sundaze Calling", price: 750, desc: "Absolut, Campari, Safari, house fassionola, lemon", img: "1756288435368_1755951008765_1755256257970_sundaze_calling.webp" },
        { id: 441, name: "Dragonkiss", price: 750, desc: "Gordon's Pink gin, Safari, sweet & sour, dragon cordial", img: "1766652527560_dragonkiss.webp" },
      ]},
      { name: "Sundaze Coolers", items: [
        { id: 10, name: "Frozen Daiquiri", price: 750, desc: "Rum, strawberry, mango, passion fruit, blackberry or peach", img: "1755256478100_frozen_daiquri.webp" },
        { id: 11, name: "Mojito's", price: 750, desc: "Rum, strawberry, mango, passion fruit, blackberry or peach", img: "1778502030669_WhatsApp_Image_2026_05_09_at_20.33.47.webp" },
      ]},
      { name: "Maia Signature Cocktails", items: [
        { id: 237, name: "Sundaze Daydream", price: 750, desc: "Tanqueray gin, peach liqueur, basil-hibiscus cordial, prosecco", img: "1766652583856_summer_day_dream.webp" },
        { id: 238, name: "Velvet Fig", price: 750, desc: "Fig-leaf Absolut, fig cordial, St-Germain", img: "1766668312373_sweet_lies.webp" },
        { id: 679, name: "Emerald Kiss", price: 750, desc: "Absolut Vanilia, kiwi cordial, lime, house orange liqueur", img: "1777447020508_1769155134581_emerald_kiss.webp", isNew: true },
      ]},
      { name: "Classic Cocktails", items: [
        { id: 4, name: "Aperol Spritz", price: 750, desc: "Aperol, prosecco, soda", img: "1755256866304_aperol_spritz.webp" },
        { id: 12, name: "Margarita", price: 700, desc: "Olmeca Silver, Cointreau, lemon", img: "1755256909368_margarita.webp" },
        { id: 14, name: "Mojito", price: 750, desc: "Havana 3, mint, lime, sugar, soda", img: "1778502041011_WhatsApp_Image_2026_05_09_at_20.33.47.webp" },
        { id: 15, name: "Pina Colada", price: 700, desc: "Captain Morgan White, Malibu, pineapple, milk", img: "1766652749825_pina_colada.webp" },
        { id: 16, name: "Whiskey Sour", price: 700, desc: "Jim Beam, sweet & sour", img: "1755256682354_whisyk_sour.webp" },
        { id: 17, name: "Hugo", price: 700, desc: "St-Germain, prosecco, soda, mint, lime", img: "1755256702297_hugo.webp" },
        { id: 18, name: "Espresso Martini", price: 700, desc: "Absolut Vanilia, Kahlua, fresh espresso", img: "1755256829576_espresso_martini.webp" },
        { id: 19, name: "Negroni", price: 650, desc: "Campari, Martini Rosso, Gordon's gin", img: "1755256752787_negroni.webp" },
        { id: 291, name: "Sundaze Long Island", price: 900, desc: "Bacardi, Olmeca, gin, Smirnoff, Cointreau, sour mix, cola", img: "1755256939552_long_island.webp" },
        { id: 361, name: "Limoncello Spritz", price: 650, desc: "Limoncello, Serena prosecco, soda, lime", img: "1755256888267_lemongrass.webp" },
        { id: 363, name: "Cosmopolitan", price: 650, desc: "Smirnoff, Cointreau, lemon, sour cherry", img: "1755256810295_cosmopolitan.webp" },
        { id: 442, name: "Moscow Mule", price: 650, desc: "Smirnoff, Thomas Henry ginger beer, lime", img: "1766652761233_moskow_mule.webp" },
        { id: 538, name: "Irish Coffee", price: 600, desc: "Jameson, filter coffee, milk foam", img: "1766652729404_irish_coffee.webp" },
        { id: 539, name: "Baileys Coffee", price: 600, desc: "Smooth, creamy coffee cocktail", img: "1766652720159_baileys_coffee.webp" },
        { id: 680, name: "Pornstar Martini", price: 700, desc: "Absolut Vanilia, passion fruit, lime, prosecco, foamer", img: "1777447310000_1769155156317_pornstar.webp", isNew: true },
        { id: 681, name: "Amaretto Sour", price: 650, desc: "Amaretto, orange, lemon", img: "1779111755956_AMARETTO_SOUR.webp", isNew: true },
      ]},
      { name: "Non-Alcoholic Cocktails", items: [
        { id: 290, name: "Non-Alcoholic Mojito", price: 500, desc: "Lime, sugar, mint, sprite", img: "1778502052436_WhatsApp_Image_2026_05_09_at_20.33.47.webp" },
        { id: 686, name: "Golden Wave", price: 500, desc: "Satsuma cordial, orange, passion fruit, lemon, vanilla", img: "1777448188065_golden_wawe.webp", isNew: true },
        { id: 687, name: "Purple Rush", price: 500, desc: "Black mulberry cordial, lemon, sprite", img: "1777448208541_purple_rush.webp", isNew: true },
        { id: 688, name: "Hibiscus Sour Blaze", price: 500, desc: "Hibiscus cordial, lime, yuzu, soda", img: "1777448237022_hibiskus_sour_blaze.webp", isNew: true },
        { id: 689, name: "Mystic Dragon", price: 500, desc: "Dragon cordial, pineapple, orange, sweet & sour", img: "1777448255775_mystic_dragon.webp", isNew: true },
      ]},
    ],
  },
  {
    key: "shots", label: "Shots", img: "1779695986754_1779111783713_B52.webp",
    items: [
      { id: 362, name: "B52", price: 450, desc: "Kahlua, Baileys, Cointreau", img: "1779111783713_B52.webp" },
      { id: 367, name: "Jager Bomb", price: 500, desc: "Jägermeister, Red Bull", img: "1779111827020_JAGER_BOMB.webp" },
    ],
  },
  {
    key: "vodka-gin-rum", label: "Vodka · Gin · Rum", img: "1751035284914_absolut.webp",
    groups: [
      { name: "Vodka", items: [
        { id: 25, name: "Absolut Vodka", price: 500, img: "1751030976515_absolut.webp" },
        { id: 26, name: "Absolut Citron", price: 500, img: "1751031052089_ABS_CI__TRON.webp" },
        { id: 27, name: "Absolut Raspberry", price: 500, img: "1751031159213_ABS_RASP.webp" },
        { id: 28, name: "Absolut Vanilia", price: 500, img: "1751031203732_abs_vanil.webp" },
        { id: 29, name: "Smirnoff", price: 500, img: "1758176731195_448198_smirnoff_red_label_votka_prozent37_5_hacim.webp" },
        { id: 30, name: "Belvedere", price: 800, img: "1751031340116_17056_belvedere_vodka_10l_40_vol.webp" },
        { id: 31, name: "Grey Goose", price: 850, img: "1751031380322_grey_goose_vodka_750_ml_keg_n_bottle_663290.webp" },
        { id: 32, name: "Beluga Noble", price: 750, img: "1751031433041_Beluga20Noble.webp" },
      ]},
      { name: "Gin", items: [
        { id: 34, name: "Gordon's Gin", price: 400, img: "1751031527597_GORDON_S_GIN.webp" },
        { id: 35, name: "Gordon's Pink", price: 450, img: "1751031557340_GORDON_S_PINK.webp" },
        { id: 36, name: "Tanqueray", price: 550, img: "1751031679302_TANQUERAY.webp" },
        { id: 37, name: "Tanqueray No.Ten", price: 700, img: "1751031780673_TANQUERAY_NO.TEN.webp" },
        { id: 39, name: "Hendrick's", price: 750, img: "1751031911182_HENDRICKS.webp" },
        { id: 40, name: "Malfy Originale", price: 700, img: "1751033440829_MALFY_ORIGINALE.webp" },
        { id: 41, name: "Gin Mare", price: 850, img: "1751033514606_446891_gin_mare_prozent42_7_hacim_ispanya.webp" },
        { id: 42, name: "Bombay Sapphire", price: 600, img: "1751033556459_BOMBAY_SAPPHIRE.webp" },
        { id: 692, name: "Monkey 47", price: 700, img: "1778140681882_Monkey_47_Schwarzwald_Dry_Gin_375ML_BTL_447f32e2_b.webp" },
      ]},
      { name: "Vermouth", items: [
        { id: 532, name: "Martini Bianco", price: 450, img: "1760864566933_martini_bianco.webp" },
        { id: 533, name: "Martini Extra Dry", price: 450, img: "1760864579304_martini_extra_dry.webp" },
        { id: 534, name: "Martini Rosso", price: 450, img: "1760864589838_martini_rosso.webp" },
      ]},
      { name: "Rum", items: [
        { id: 43, name: "Captain Morgan White", price: 450, img: "1751033616924_CAPTAIN_MORGAN_WHITE.webp" },
        { id: 44, name: "Captain Morgan Gold", price: 400, img: "1751033663725_CAPTAIN_MORGAN_GOLD.webp" },
        { id: 45, name: "Havana 3 Años", price: 500, img: "1751033768380_HAVANA_3_ANOS.webp" },
        { id: 307, name: "Bacardi", price: 550, img: "1758176815456_BACARD__.webp" },
        { id: 308, name: "Havana 7 Años", price: 600, img: "1758176825831_HavanaClub_7YearsOld_Rumbottle.webp" },
      ]},
    ],
  },
  {
    key: "tequila-liqueur", label: "Tequila · Mezcal · Cognac · Liqueur", img: "1751035340379_MARTELL_VS.webp",
    groups: [
      { name: "Tequila", items: [
        { id: 46, name: "Olmeca Silver", price: 450, img: "1751033831713_olmeca_silver.webp" },
        { id: 47, name: "Olmeca Gold", price: 450, img: "1751033973135_Bu__yu__k_OLMECA_GOLD.webp" },
        { id: 48, name: "Don Julio Blanco", price: 650, img: "1751034012282_DON_JULIO_BLANCO.webp" },
        { id: 309, name: "Silver Patron", price: 700, img: "1758023765180_Patron_Silver_Tequila_bf27a4c9_58fe_4b46_bdad_c903.webp" },
        { id: 453, name: "Avion Silver", price: 650, img: "1758176871096_113383750_1_fr.webp" },
      ]},
      { name: "Mezcal", items: [
        { id: 49, name: "Conejos Joven", price: 600, img: "1751034058315_CONEJOS_JOVEN.webp" },
        { id: 454, name: "Ojo de Tigre", price: 650, img: "1760864705973_ojo_de_tihre.webp" },
      ]},
      { name: "Cognac & Brandy", items: [
        { id: 50, name: "Napoleon Duclos Brandy", price: 500, img: "1751034130130_NAPOLEON_DUCLOS_BRANDY.webp" },
        { id: 51, name: "Hennessy XO", price: 2800, img: "1751034178484_HENNESSY_XO.webp" },
        { id: 52, name: "Martell VS", price: 600, img: "1751034224639_MARTELL_VS.webp" },
        { id: 524, name: "Hennessy VS", price: 750, img: "1760864796772_hennesy_vs.webp" },
      ]},
      { name: "Liqueur", items: [
        { id: 54, name: "Jägermeister", price: 450, img: "1751034313209_JAGERMEISTER.webp" },
        { id: 55, name: "Baileys", price: 450, img: "1751034428337_BAILEYS.webp" },
        { id: 57, name: "Campari", price: 450, img: "1751034534518_CAMPARI.webp" },
        { id: 58, name: "Kahlua", price: 450, img: "1751034566568__KAHLUA.webp" },
        { id: 59, name: "Cointreau", price: 600, img: "1751034611536_cointreau_triple_sec_orange_liqueur_50cl_414138559.webp" },
        { id: 60, name: "Chambord", price: 450, img: "1751034659312__CHAMBORD.webp" },
        { id: 61, name: "Aperol", price: 450, img: "1751034734843_APEROL.webp" },
        { id: 62, name: "Limoncello", price: 450, img: "1751037813189_Bottega_Limoncino_Liqueur.webp" },
        { id: 449, name: "Safari", price: 450, img: "1758177034416_SAFARI_HOLLANDA.webp" },
        { id: 450, name: "Malibu", price: 450, img: "1758177051302_447215_malibu_romlu_hindistan_cevizi_likoru_prozen.webp" },
        { id: 451, name: "Disaronno", price: 600, img: "1758177072153_U6bd1b02dc04d40c68dccfda0c0bd768b1.webp" },
        { id: 452, name: "Sambuca", price: 450, img: "1758177087993_sambuka.webp" },
        { id: 525, name: "Archers", price: 450, img: "1760864992620_archers.webp" },
        { id: 526, name: "Sheridans", price: 450, img: "1760864981770_sheriidans.webp" },
        { id: 527, name: "St.Germain", price: 800, img: "1760865015683_st.germain.webp" },
        { id: 528, name: "Amaretto", price: 500, img: "1760865005241_amaretto.webp" },
      ]},
    ],
  },
  {
    key: "whiskey", label: "Whiskey", img: "1751036200871_JACK_DANIELS_HONEY.webp",
    groups: [
      { name: "Blended Whiskey", items: [
        { id: 81, name: "Chivas Regal 12yrs", price: 650, img: "1751035746533_CHIVAS_REGAL.webp" },
        { id: 82, name: "Chivas Regal 18yrs", price: 750, img: "1751035798198_CHIVAS_REGAL_18YRS.webp" },
        { id: 84, name: "Black Label", price: 600, img: "1751035903595_BLACK_LABEL.webp" },
        { id: 85, name: "Red Label", price: 450, img: "1751035940930_RED_LABEL.webp" },
        { id: 86, name: "Blue Label", price: 2000, img: "1751035985160_BLUE_LABEL.webp" },
        { id: 87, name: "Green Label", price: 850, img: "1751036022424_GREEN_LABEL.webp" },
        { id: 88, name: "J.Walker 18yrs", price: 850, img: "1751036084858_J.WALKER_18_YRS.webp" },
        { id: 89, name: "JB", price: 450, img: "1751036124687_JB.webp" },
        { id: 468, name: "Black Label Ruby", price: 550, img: "1758026474936_cd4d69_9d2631d9f54c459e97aff0d459e3201c_mv2.webp", isNew: true },
        { id: 536, name: "The Deacon", price: 600, img: "1760865511880_the_deacon.webp" },
      ]},
      { name: "Tennessee Whiskey", items: [
        { id: 79, name: "Jack Daniel's Single Barrel", price: 750, img: "1751035648435_JACK_DANIELS_SINGLE_BARREL.webp" },
        { id: 80, name: "Gentleman Jack", price: 550, img: "1751035699347_GENTLEMAN_JACK.webp" },
        { id: 76, name: "Jack Daniel's", price: 550, img: "1751035536796_JACK_DANIELS.webp" },
        { id: 77, name: "Jack Daniel's Honey", price: 550, img: "1751035571980_JACK_DANIELS_HONEY.webp" },
        { id: 78, name: "Jack Daniel's Apple", price: 550, img: "1751035608655_JACK_DANIELS_APPLE.webp" },
      ]},
      { name: "Single Malt Whiskey", items: [
        { id: 90, name: "Macallan Sherry 12yrs", price: 900, img: "1751037373504_MACALLAN_SHERRY_12_YRS.webp" },
        { id: 91, name: "Yoichi", price: 800, img: "1751026648250_51BFk_oQOeL.webp" },
        { id: 92, name: "Glenfiddich 12yrs", price: 750, img: "1751037664126_GLENFIDDICH_12_YRS.webp" },
        { id: 93, name: "Glenfiddich 15yrs", price: 1000, img: "1751037853356_GLENFIDDICH_15_YRS.webp" },
        { id: 97, name: "Talisker 10yrs", price: 650, img: "1751038101205_talisker.webp" },
        { id: 98, name: "Lagavulin 16yrs", price: 1200, img: "1751038134189_LAGAVULIN_16_YRS.webp" },
        { id: 99, name: "Cardhu 15yrs", price: 950, img: "1751038196567_CARDHU_15_YRS.webp" },
        { id: 100, name: "Highland Park 12yrs", price: 700, img: "1751038235671_HIGHLAND_PARK_12_YRS.webp" },
        { id: 310, name: "The Glenrothes", price: 900, img: "1758024342157_glenrothers.webp" },
        { id: 311, name: "The Glenlivet", price: 750, img: "1758024308576_glenlivet.webp" },
        { id: 312, name: "The Dalmore", price: 800, img: "1758024325655_dalmore.webp" },
        { id: 530, name: "Mortlach", price: 800, img: "1760865750811_mortlach.webp" },
        { id: 531, name: "Glenmorangie", price: 3500, img: "1760865793931_glenmorangie.webp" },
        { id: 693, name: "Scapa", price: 900, img: "1778141116747_Scapa_Scotch_Whisky_10_Year_Old_Whisky.webp", isNew: true },
        { id: 694, name: "Aberlour", price: 1200, img: "1778141168900_images.webp", isNew: true },
      ]},
      { name: "Bourbons & Rye", items: [
        { id: 529, name: "WhistlePig", price: 1200, img: "1760865772920_whistlepig.webp" },
        { id: 537, name: "Jim Beam", price: 450, img: "1760865424304_jim_beam.webp" },
        { id: 73, name: "Bulleit Bourbon", price: 600, img: "1751035229714_BULLEIT_BOURBON.webp" },
        { id: 74, name: "Woodford Reserve", price: 700, img: "1751035441832_WOODFORD_RESERVE.webp" },
      ]},
      { name: "Irish Whiskey", items: [
        { id: 535, name: "Jameson", price: 550, img: "1760865498608_jameson.webp" },
        { id: 96, name: "The Sexton", price: 550, img: "1751038000349_THE_SEXTON.webp" },
      ]},
    ],
  },
  {
    key: "raki", label: "Rakı", img: "1758020490094_4661526932.webp",
    items: [
      { id: 313, name: "Yeni Rakı", price: 300, img: "1758020146117_images.webp" },
      { id: 314, name: "Yeni Rakı Yeni Seri", price: 320, img: "1758020245879_41oIwdsLLiL._UF894_1000_QL80_.webp" },
      { id: 315, name: "Beylerbeyi Göbek", price: 380, img: "1758020449954_4661526932.webp" },
      { id: 316, name: "Efe Gold", price: 360, img: "1758020074469_efeGold_6_X0_7_L.webp" },
      { id: 317, name: "Tekirdağ Gold", price: 340, img: "1758020410175_raki_tek1.webp" },
      { id: 522, name: "Yeni Rakı Yeni Ala", price: 350, img: "1760865939974_yeni_rak___ala.webp" },
      { id: 352, name: "Yeni Rakı Yeni Seri (70cl)", price: 2500, desc: "70cl bottle", img: "1758026664942_41oIwdsLLiL._UF894_1000_QL80_.webp" },
      { id: 353, name: "Beylerbeyi Göbek (70cl)", price: 3700, desc: "70cl bottle", img: "1758026803528_4661526932.webp" },
      { id: 355, name: "Tekirdağ Gold (70cl)", price: 2800, desc: "70cl bottle", img: "1758026741207_raki_tek1.webp" },
      { id: 523, name: "Yeni Rakı Yeni Ala (70cl)", price: 2800, desc: "70cl bottle", img: "1760865899649_yeni_rak___ala.webp" },
    ],
  },
  {
    key: "bottle-service", label: "Bottle Service", img: "1758020629232_Patron_Silver_Tequila_bf27a4c9_58fe_4b46_bdad_c903.webp",
    groups: [
      { name: "Vodka", items: [
        { id: 319, name: "Absolut Vodka", price: 7000, desc: "Absolut / Citron / Raspberry / Vanilla", img: "1757757382982_1751030976515_absolut.webp" },
        { id: 323, name: "Grey Goose", price: 11900, img: "1757757531556_grey_goose.webp" },
        { id: 324, name: "Beluga", price: 10500, img: "1757757549759_beluga.webp" },
        { id: 325, name: "Belvedere", price: 11200, img: "1757757565559_belveder.webp" },
      ]},
      { name: "Gin", items: [
        { id: 326, name: "Malfy Gin", price: 9800, img: "1757757686846_malfy.webp" },
        { id: 327, name: "Tanqueray", price: 7700, img: "1757757669314_tanquery.webp" },
        { id: 328, name: "Hendrick's", price: 10500, img: "1757757706129_hendricks.webp" },
      ]},
      { name: "Tequila", items: [
        { id: 330, name: "Olmeca Silver", price: 6300, img: "1757757803340_olmeca_silver.webp" },
        { id: 331, name: "Olmeca Gold", price: 6300, img: "1757757825819_olmeca_gold.webp" },
        { id: 332, name: "Don Julio", price: 9100, img: "1757757850771_don_julio.webp" },
        { id: 333, name: "Silver Patron", price: 9800, img: "1758020587103_Patron_Silver_Tequila_bf27a4c9_58fe_4b46_bdad_c903.webp" },
      ]},
      { name: "Mezcal", items: [
        { id: 334, name: "Joven Mezcal", price: 8400, img: "1758020755222_ilegal_mezcal_joven.webp" },
      ]},
      { name: "Blended Whiskey", items: [
        { id: 335, name: "Red Label", price: 6300, img: "1758020871359_1751035940930_RED_LABEL.webp" },
        { id: 336, name: "Black Label", price: 8400, img: "1758020936654_1751035903595_BLACK_LABEL.webp" },
        { id: 337, name: "Blue Label", price: 28000, img: "1758020995741_1751035985160_BLUE_LABEL.webp" },
        { id: 338, name: "Jack Daniel's", price: 7700, desc: "Jack / Apple / Honey", img: "1758020892058_1751035536796_JACK_DANIELS.webp" },
        { id: 339, name: "Chivas 12yrs", price: 9100, img: "1758020912317_1751035746533_CHIVAS_REGAL.webp" },
        { id: 340, name: "Chivas 18yrs", price: 10500, img: "1758020976335_1751035798198_CHIVAS_REGAL_18YRS.webp" },
        { id: 341, name: "Gentleman Jack", price: 7700, img: "1758020957166_1751035699347_GENTLEMAN_JACK.webp" },
        { id: 469, name: "Black Label Ruby", price: 7700, img: "1758026618072_cd4d69_9d2631d9f54c459e97aff0d459e3201c_mv2.webp" },
      ]},
      { name: "Single Malt Whiskey", items: [
        { id: 342, name: "Talisker 10yrs", price: 9100, img: "1758024109588_1751038101205_talisker.webp" },
        { id: 343, name: "Highland Park 12yrs", price: 9800, img: "1758024176072_1751038235671_HIGHLAND_PARK_12_YRS.webp" },
        { id: 344, name: "Lagavulin", price: 16800, img: "1758024263629_1751038134189_LAGAVULIN_16_YRS.webp" },
        { id: 345, name: "The Glenlivet", price: 10500, img: "1758024090086_glenlivet.webp" },
        { id: 346, name: "The Glenrothes", price: 12600, img: "1758024224040_glenrothers.webp" },
        { id: 347, name: "Cardhu", price: 13300, img: "1758024137295_1751038196567_CARDHU_15_YRS.webp" },
        { id: 348, name: "Glenfiddich 15yrs", price: 14000, img: "1758024243103_1751037853356_GLENFIDDICH_15_YRS.webp" },
        { id: 349, name: "The Macallan", price: 12600, img: "1758024152781_1751037373504_MACALLAN_SHERRY_12_YRS.webp" },
        { id: 350, name: "The Dalmore", price: 11200, img: "1758024195526_dalmore.webp" },
        { id: 351, name: "Yoichi", price: 11200, img: "1758024281831_1751026648250_51BFk_oQOeL.webp" },
      ]},
    ],
  },
  {
    key: "beers", label: "Beers", img: "1758173712816_20240923AMSTERDAM_dvtakn.webp",
    items: [
      { id: 66, name: "Efes Pilsen", price: 300, img: "1758173565216_EFES_P__LSEN.webp" },
      { id: 67, name: "Efes Malt", price: 300, img: "1758173580948_20240923EFES_MALT_50_CL_ywzys2.webp" },
      { id: 68, name: "Bomonti Unfiltered", price: 350, img: "1758173628004_20240923BOMONTI_FI__LTRESI__Z_qmzv1k.webp" },
      { id: 69, name: "Beck's", price: 400, img: "1758173647939_20240923BECKS_33_CL_jzkw2w.webp" },
      { id: 70, name: "Amsterdam", price: 480, img: "1758173697080_20240923AMSTERDAM_dvtakn.webp" },
      { id: 71, name: "Miller", price: 300, img: "1758173597641_20240923MILLER_yelrad.webp" },
      { id: 72, name: "Corona Cerveza", price: 400, img: "1758173665234_20240923CORONA_33_CL_jku6kx.webp" },
      { id: 372, name: "Duvel", price: 580, img: "1758173745900_debe712e_83f1_4f5d_9406_c1d6e93990d7_295452565.webp" },
      { id: 373, name: "Erdinger", price: 450, img: "1758173682240_20240923ERDINGER_uwxijm.webp" },
      { id: 458, name: "Draft Bud Beer", price: 280, img: "1779111815075_DRUFT_B__RA.webp", isNew: true },
    ],
  },
  {
    key: "red-wines", label: "Red Wines", img: "1764077899715_1764067904349_images.webp",
    groups: [
      { name: "Imported Red Wines", items: [
        { id: 560, name: "Maison Kavaklıdere La Folie", price: 2000, desc: "France · Merlot / Cabernet Sauvignon", img: "1764067038682_BD6651CF_60B8_4477_8D25_126B7FF33B7E_1024x1024.webp" },
        { id: 561, name: "Tormaresca Neprica", price: 2150, desc: "Italy · Primitivo", img: "1764067189516_103354_tormaresca_neprica_primitivo.webp" },
        { id: 562, name: "Dezzani Otto Bucce Rosso", price: 2450, desc: "Italy · blend", img: "1764067383419_dezzani_piemonte_doc_rosso_otto_bucce_286185.webp" },
        { id: 563, name: "Manieri", price: 2650, desc: "Italy · Montepulciano", img: "1764067429279_manieri_montepulciano_dabruzzo_299537_10e8563c_547.webp" },
        { id: 663, name: "Canto Andino Carmenere", price: 1800, desc: "Carmenere", img: "1768894362563_VF4qT_qqCUAAAAAAAAoHVQ.webp", isNew: true },
        { id: 564, name: "Manieri Puglia", price: 3000, desc: "Italy · Primitivo", img: "1764067525156_manieri_primitivo_670464.webp" },
        { id: 565, name: "Santa Cristina Chianti DOCG", price: 3550, desc: "Italy · Sangiovese", img: "1764067555176_santa_cristina_chianti_superiore_228462.webp" },
        { id: 566, name: "Marques De Caceres Crianza Rioja", price: 3600, desc: "Spain · Tempranillo", img: "1764067627853_images.webp" },
        { id: 567, name: "Tussock Jumper", price: 3000, desc: "Argentina · Malbec", img: "1764067692371_images.webp" },
        { id: 568, name: "Louis Bernard Chateauneuf Du Pape", price: 8550, desc: "France · Grenache / Syrah", img: "1764067779255_Bottle_Shot_LB_Chateauneuf_du_Pape.webp" },
        { id: 569, name: "Gabbia D'oro Amarone della Valpolicella", price: 6950, desc: "Italy · Corvina / Rondinella / Molinara", img: "1764067863735_gabbia_doro_amarone_della_valpolicella_186222.webp" },
        { id: 570, name: "Dezzani San Carlo Barolo DOCG", price: 8400, desc: "Italy · Nebbiolo", img: "1764067904349_images.webp" },
        { id: 668, name: "Alamos", price: 2500, desc: "Malbec", img: "1778141630994_alamos_malbec_799110.webp", isNew: true },
        { id: 675, name: "Vecchio Marrone Primitivo", price: 2650, img: "1778141673048_Wine_108.webp", isNew: true },
        { id: 676, name: "Terra Argenta Malbec", price: 2850, img: "1778141735990_images.webp", isNew: true },
        { id: 677, name: "Chemin des Papes", price: 2900, img: "1778141763973_036056.thumb_.1280.1280.webp", isNew: true },
        { id: 682, name: "Suvla Malbec 2022", price: 2900, img: "1778141793250_suvla_malbec_937636.webp", isNew: true },
        { id: 683, name: "Suvla Reserve Petit Verdot Karasakız 2019", price: 5100, img: "1778141825207_suvla_reserve_petit_verdot_karasakiz_104106.webp", isNew: true },
      ]},
      { name: "Local Red Wines", items: [
        { id: 571, name: "Saint Nicolas of Lycia (Off-Dry)", price: 1800, desc: "Kalecik Karası / Syrah", img: "1764075529791_Ekran_g__r__nt__s___2025_11_25_155847aa.webp" },
        { id: 573, name: "Chateau Numuz", price: 2100, desc: "Cabernet Sauvignon", img: "1764075627271_Ekran_g__r__nt__s___2025_11_25_160028bb.webp" },
        { id: 574, name: "Prodom", price: 3150, desc: "Syrah / Petit Verdot / Cabernet Franc", img: "1764075692926_prodom_blend_817328.webp" },
        { id: 575, name: "Chamlıja", price: 2500, desc: "Pinot Noir", img: "1764068300030_chamlija_pinot_noir_659323.webp" },
        { id: 577, name: "Hus La Zona", price: 2300, desc: "Carignan / Alicante", img: "1764068409911_hus_la_zona_741337.webp" },
        { id: 578, name: "Turasan Years CSMS", price: 2700, desc: "Cabernet Sauvignon / Merlot / Syrah", img: "1764068738964_turasan_seneler_blend_829701.webp" },
        { id: 581, name: "Hus", price: 2450, desc: "Öküzgözü / Boğazkere", img: "1764068668380_images.webp" },
        { id: 582, name: "Turasan Seneler", price: 2700, desc: "Cabernet Sauvignon", img: "1764068870559_turasan_cabernet_sauvignon_773895_619e7068_b3b6_45.webp" },
        { id: 583, name: "Urla Vourla", price: 3700, desc: "Syrah / Cabernet / Merlot / Boğazkere", img: "1764068822407_Urla_Vourla_High_Quality.jpg.webp" },
        { id: 584, name: "Yedibilgeler Pythagoras", price: 2950, desc: "Cabernet Sauvignon / Merlot / Cabernet Franc / Petit Verdot", img: "1764068960117_7_bilgeler_pythagoras_329871_0cbf7a2c_56d6_4b44_9f.webp" },
        { id: 585, name: "Urla Nexus", price: 3200, desc: "Merlot / Nero d'Avola / Cabernet Franc", img: "1764069033972_urla_winery_nexus.webp" },
        { id: 587, name: "Chamlıja Pinot Felix Culpa", price: 3200, desc: "Pinot Noir", img: "1764069083163_chamlija_felix_culpa_pinot_noir_730753.webp" },
        { id: 588, name: "Kavaklıdere Egeo", price: 3750, desc: "Merlot", img: "1764069119022_kavaklidere_egeo_merlot_106470.webp" },
        { id: 589, name: "Likya Arkeo", price: 3250, desc: "Acıkara", img: "1764069232055_acikara_st_2023_High_Quality_3.jpg.webp" },
        { id: 590, name: "Chamlıja", price: 3500, desc: "Kalecik Karası", img: "1764069272223_j3Sk_9hxRG_DcNApS8SfBA_pb_600x600.webp" },
        { id: 591, name: "Urla", price: 4000, desc: "Nero d'Avola / Urla Karası", img: "1764069347838_images.webp" },
        { id: 592, name: "Chamlıja Nevi Şahsına Münhasır", price: 3900, desc: "Cabernet / Cabernet Franc / Merlot / Petit Verdot", img: "1764069388238_chamlija_nevi_sahsina_munhasir_855975_ca91d839_515.webp" },
        { id: 593, name: "Midin Baluto", price: 3750, desc: "Boğazkere / Raşegurnik / Öküzgözü", img: "1764069436151_3183.webp" },
        { id: 594, name: "Porta Caeli", price: 6800, desc: "Cabernet Franc / Cabernet / Petit Verdot", img: "1764069468669_porta_caeli_2018_783782_ccb7ef0b_05e7_44be_92af_f1.webp" },
        { id: 650, name: "Lucien Arkas Meandros", price: 4500, desc: "Merlot / Shiraz / Cabernet Sauvignon", img: "1764075019761_lucien_arkas_meandros_758695.webp" },
        { id: 651, name: "Kayra Buzbağ Reserve", price: 2750, desc: "Öküzgözü / Boğazkere", img: "1764077705678_asdsad.webp" },
        { id: 667, name: "Urla", price: 2000, desc: "Boğazkere", img: "1778141859386_504URLUBR075_62831720_5dd2_4470_8f61_43654801fd2d.webp" },
      ]},
    ],
  },
  {
    key: "white-wines", label: "White Wines", img: "1764077940271_1764076819253_Ekran_g__r__nt__s___2025_11_25_16201.webp",
    groups: [
      { name: "Imported White Wines", items: [
        { id: 596, name: "Barone Montalto Due Mondi", price: 1900, desc: "Italy · Pinot Grigio", img: "1764075795788_Ekran_g__r__nt__s___2025_11_25_160318cc.webp" },
        { id: 598, name: "Covinas Enterrizo", price: 2000, desc: "Spain · Macabeo", img: "1764075962408_dd.webp" },
        { id: 599, name: "Dezzani 4 Bucce Bianco", price: 2450, desc: "Italy · Cortese / Sauvignon Blanc / Chardonnay / Timorasso", img: "1764069814590_dezzani_piemonte_bianco_4_bucce_782793.webp", soldOut: true },
        { id: 662, name: "UBY No:1", price: 1900, desc: "Sauvignon Blanc", img: "1768894452390_download.webp", isNew: true },
        { id: 600, name: "Manieri Sauvignon Trevenezie DOC", price: 2500, desc: "Italy · Sauvignon Blanc", img: "1764069862258_manieri_savignon_blanc_trevenezie.webp" },
        { id: 602, name: "Petit Vellebois", price: 3200, desc: "France · Sauvignon Blanc", img: "1764076646369_Ekran_g__r__nt__s___2025_11_25_161730.webp" },
        { id: 603, name: "H.P. Schreiner Feinherb", price: 3400, desc: "Germany · Riesling", img: "1764070069831_hp_schreiner_riesling_732140_dc3eaa95_a16b_489e_b6.webp", soldOut: true },
        { id: 604, name: "Michele Chiarlo (Off-Dry)", price: 3600, desc: "Italy · Moscato d'Asti Nivole", img: "1764070100460_michele_chiarlo_nivole_654020.webp" },
        { id: 605, name: "Bersano Gavi del Comune di Gavi", price: 4500, desc: "Italy · Cortese", img: "1764076819253_Ekran_g__r__nt__s___2025_11_25_162010.webp", soldOut: true },
        { id: 672, name: "Hans Bear Riesling", price: 2150, img: "1778142043378_Wine_063.webp", isNew: true },
      ]},
      { name: "Local White Wines", items: [
        { id: 684, name: "Suvla Fumé Blanc 2023", price: 3600, img: "1778142243563_Ekran_g__r__nt__s___2026_05_07_112337.webp", isNew: true },
        { id: 685, name: "Suvla Sauvignon Blanc Semillon 2023", price: 1800, img: "1778141995168_suvla_sauvignon_blanc_semillon_448026_5444218d_3f9.webp", isNew: true },
        { id: 606, name: "Prodom", price: 1750, desc: "Narince", img: "1764070189015_prodom_narince_213949.webp" },
        { id: 610, name: "Likya Arykanda", price: 2150, desc: "Sauvignon Blanc", img: "1764070889339_869915338064.webp" },
        { id: 611, name: "Yedibilgeler Anaxagoras", price: 3150, desc: "Chardonnay", img: "1764070942754_yedi_bilgeler_anaxagoras_chardonnay_980740.webp" },
        { id: 613, name: "Porta Caeli Pacem", price: 2250, desc: "Sauvignon Blanc", img: "1764070993863_images.webp" },
        { id: 614, name: "Likya Vineyards", price: 2550, desc: "Chardonnay", img: "1764077003018_aaaa.webp" },
        { id: 616, name: "Urla", price: 2750, desc: "Chardonnay", img: "1764071128303_imageedit_11_9087161728.webp" },
        { id: 617, name: "Hus", price: 2900, desc: "Bornova Misketi", img: "1764071157548_hus_bornova_misketi_314023.webp" },
        { id: 618, name: "Kavaklıdere Egeo Fumé Blanc", price: 4000, desc: "Sauvignon Blanc", img: "1764071175933_kavaklidere_egeo_fume_blanc_931102_b7c5bb79_d748_4.webp" },
        { id: 619, name: "Chamlıja", price: 4600, desc: "Riesling", img: "1764071202159_images.webp" },
        { id: 620, name: "Chamlıja Quartz Fumé", price: 5000, desc: "Sauvignon Blanc", img: "1764071227641_chamlija_quartz_fume_980795_751de959_a3dc_41b3_959.webp" },
        { id: 652, name: "Vinkara Reserve", price: 2400, desc: "Narince", img: "1764077100382_Ekran_g__r__nt__s___2025_11_25_162504.webp", isNew: true },
      ]},
    ],
  },
  {
    key: "rose-wines", label: "Rosé Wines", img: "1764077967559_1764071306618_mateus_rose_original.webp",
    groups: [
      { name: "Imported Rosé Wines", items: [
        { id: 621, name: "Barone Montalto Acquerello", price: 1900, desc: "Italy · Pinot Grigio Blush", img: "1764071272295_images.webp" },
        { id: 690, name: "UBY No:6", price: 1900, desc: "Cabernet Franc / Cabernet / Merlot", img: "1778142374233_UBY_COLOR_N6_ROSE.webp", isNew: true },
      ]},
      { name: "Local Rosé Wines", items: [
        { id: 623, name: "Chateau Nuzun", price: 1550, desc: "Merlot / Zinfandel / Öküzgözü / Çatalkarası", img: "1764077306894_Ekran_g__r__nt__s___2025_11_25_162833.webp", soldOut: true },
        { id: 626, name: "Kayra Allure Rose", price: 2250, desc: "Kalecik Karası", img: "1764077417205_Ekran_g__r__nt__s___2025_11_25_163015.webp", soldOut: true },
        { id: 653, name: "Vinkara Atelier (Off-Dry)", price: 1550, desc: "Kalecik Karası / Öküzgözü", img: "1764077145808_vinkara_atelier_kalecik_karasi_511285.webp", soldOut: true },
      ]},
    ],
  },
  {
    key: "sparkling", label: "Sparkling Wines", img: "1764077990839_1764072582264_bottega_gold_Photoroom.webp",
    items: [
      { id: 627, name: "Serena Prosecco", price: 1650, desc: "Italy · Glera", img: "1764072066303_serena_1881_prosecco_152483.webp" },
      { id: 628, name: "Penascal Blanc (Off-Dry)", price: 1950, desc: "Spain · Verdejo / Macabeo / Sauvignon Blanc", img: "1764072269294_Penascal_Blanco_01_1.webp" },
      { id: 629, name: "Penascal Rose (Off-Dry)", price: 1950, desc: "Spain · Tempranillo / Shiraz / Bobal / Garnacha", img: "1764072322758_penascal_rosado_900x900.webp" },
      { id: 630, name: "Tallero Prosecco di Treviso Frizzante", price: 2100, desc: "Italy · Glera", img: "1764072402767_tallero_prosecco_di_treviso_frizzante_913850_bc0b4.webp" },
      { id: 631, name: "Covinas Enterrizo Brut Cava", price: 4000, desc: "Spain · Macabeo / Parellada", img: "1764072546190_Enterizo_Cava_Brut_p.webp" },
      { id: 632, name: "Bottega Gold Prosecco Brut", price: 5000, desc: "Italy · Glera", img: "1764072582264_bottega_gold_Photoroom.webp" },
      { id: 633, name: "Bottega White Gold Prosecco Brut", price: 5000, desc: "Italy · Glera", img: "1764072632629_bottega_white_gold_1200x630.webp" },
      { id: 634, name: "Bottega Rose Gold Prosecco Brut", price: 5000, desc: "Italy · Glera", img: "1764072657640_images.webp" },
      { id: 654, name: "Vinkara Yaşasın Méthode Traditionnelle", price: 4500, desc: "Kalecik Karası", img: "1764077448008_images.webp" },
    ],
  },
  {
    key: "champagnes", label: "Champagnes", img: "1764078009868_1764073564707_581666_sampanya_dom_perignon_2015_vi.webp",
    items: [
      { id: 645, name: "Moët & Chandon Brut", price: 7750, desc: "France · Pinot Meunier / Pinot Noir / Chardonnay", img: "1764073391884_moet_chandon_imperial_314291.webp" },
      { id: 646, name: "Moët & Chandon Ice", price: 8750, desc: "France · Pinot Noir / Pinot Meunier / Chardonnay", img: "1764073380417_moet_chandon_ice_imperial_311777.webp" },
      { id: 647, name: "Moët & Chandon Rosé", price: 8750, desc: "France · Pinot Noir / Pinot Meunier / Chardonnay", img: "1764073460503_moet_chandon_rose_imperial_646451.webp" },
      { id: 648, name: "Dom Pérignon", price: 28000, desc: "France · Chardonnay / Pinot Noir", img: "1764073564707_581666_sampanya_dom_perignon_2015_vintage_brut_pro.webp" },
    ],
  },
  {
    key: "wines-glass", label: "Wines by the Glass", img: "1764078033949_1764073255774_turasan_blush_kalecik_karasi_663810.webp",
    groups: [
      { name: "Red Wines by the Glass", items: [
        { id: 635, name: "Turasan Years", price: 500, desc: "Camomile", img: "1778240803460_IMG_8122.webp" },
        { id: 671, name: "Canto Andino", price: 450, desc: "Carmenere", img: "1778240940647_IMG_8123.webp", isNew: true },
      ]},
      { name: "White Wines by the Glass", items: [
        { id: 656, name: "UBY No.1", price: 500, desc: "Sauvignon Blanc", img: "1778241043447_IMG_8124.webp" },
      ]},
      { name: "Rosé Wines by the Glass", items: [
        { id: 655, name: "Vinkara Atelier (Off-Dry)", price: 430, desc: "Kalecik Karası / Öküzgözü", img: "1764077781883_1764077145808_vinkara_atelier_kalecik_karasi_51128.webp" },
        { id: 691, name: "UBY No:6", price: 500, desc: "Cabernet Franc / Cabernet / Merlot", img: "1778142499028_UBY_COLOR_N6_ROSE.webp", isNew: true },
      ]},
      { name: "Prosecco by the Glass", items: [
        { id: 643, name: "Serena Prosecco", price: 450, desc: "Italy · Glera", img: "1764073300030_1764072066303_serena_1881_prosecco_152483.webp" },
        { id: 644, name: "Bottega Gold Prosecco Brut 20cl", price: 1050, desc: "Italy · Glera", img: "1764073315231_gold.webp" },
      ]},
    ],
  },
];

/* ============================================================================
   SUNDAZE — QR Table/Sunbed Ordering  ·  prototype
   Single-file React app. Three screens behind the same code:
     • Guest:  scan QR → ?loc=B12 (Beach Sunbed 12) → browse → cart → pay → done
     • Staff:  ?view=staff  → live order board, fed from the same OrderSink
     • Links:  ?view=links  → printable QR + URL for every spot (auto from VENUE)
   Mock payment + mock order routing TODAY, real iyzico/Stripe + POS LATER —
   both sit behind a single swappable interface (see ADAPTERS below).
   ========================================================================== */


/* ===========================================================================
   VENUE — the only place to change spot counts, codes and minimums.
   Add/remove a type or change a count; the whole app (QR links, parsing,
   minimum-spend bars, staff zones) follows automatically.
   Codes:  T = Table,  P = Poolside Sunbed,  B = Beach Sunbed.
   `min` = minimum spend for that spot (₺). Set 0 for no minimum. EDIT FREELY.
   =========================================================================== */
// Offline fallback. At runtime the live spot config comes from the API
// (/menu → spotTypes, see buildVenueTypes); this is only used if that's
// unavailable. Counts/minimums here may lag the DB — the API is authoritative.
const FALLBACK_VENUE = {
  types: {
    table:    { code: "T", count: 50, min: 2500, icon: "🍽", name: { tr: "Masa",            en: "Table",           ru: "Стол" } },
    poolside: { code: "P", count: 30, min: 4000, icon: "🏖", name: { tr: "Havuz Şezlongu",  en: "Poolside Sunbed", ru: "Шезлонг у бассейна" } },
    beach:    { code: "B", count: 30, min: 6000, icon: "🌊", name: { tr: "Plaj Şezlongu",   en: "Beach Sunbed",    ru: "Пляжный шезлонг" } },
  },
};

// Build the spot-types map from the API menu payload's `spotTypes`.
function buildVenueTypes(data) {
  if (!data?.spotTypes?.length) return null;
  const out = {};
  for (const s of data.spotTypes) {
    out[s.key] = { code: s.code, count: s.count, min: Number(s.minSpend) || 0, icon: s.icon || "📍", name: s.name };
  }
  return out;
}

// QR encodes the spot, e.g. ?loc=B12 / ?loc=T7 / ?loc=P3. Zones (tens) are staff-side only.
// `types` is the resolved spot-types map (live from API, or FALLBACK_VENUE.types).
function parseLocation(raw, types) {
  if (!raw) return null;
  const m = String(raw).trim().toUpperCase().match(/^([A-Z])\s*0*(\d{1,3})$/);
  if (!m) return null;
  const entry = Object.entries(types).find(([, v]) => v.code === m[1]);
  if (!entry) return null;
  const [type, t] = entry;
  const num = parseInt(m[2], 10);
  if (num < 1 || num > t.count) return null;
  return { type, num, zone: Math.ceil(num / 10), code: t.code + num, min: t.min };
}
const locName = (loc, l, types) => (types[loc.type]?.name?.[l] || loc.type) + " " + loc.num;
const locIcon = (loc, types) => types[loc.type]?.icon || "📍";

/* ===========================================================================
   BACKEND — talk to the Virgo platform API. Payment + POS are handled server-side.
   API_BASE: your server deployment. Override per-load with ?api=https://...
   Venue slug: a <venue>.virgos.io subdomain, or ?v=<slug>, else 'sundaze'.
   =========================================================================== */
const Q = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
const HOST = typeof window !== "undefined" ? window.location.hostname : "";
// On a *.virgos.io domain, talk to api.virgos.io; otherwise the current server URL.
// Override anytime with ?api=https://your-server
const API_BASE = Q.get("api") || (HOST.endsWith("virgos.io") ? "https://api.virgos.io" : "https://virgo-platform.vercel.app");
function detectVenue() {
  if (Q.get("v")) return Q.get("v");
  if (HOST.endsWith("virgos.io")) { const s = HOST.split(".")[0]; if (s && s !== "www" && s !== "virgos") return s; }
  // Each venue repo (fork of the template) declares its slug here.
  return (import.meta.env && import.meta.env.VITE_VENUE_SLUG) || "sundaze";
}
const VENUE_SLUG = detectVenue();

// Customer session token (cross-origin → bearer, not cookie). Persisted so the
// login survives reloads; namespaced by venue so accounts don't bleed across.
const TOKEN_KEY = `vc_token_${VENUE_SLUG}`;
const tokenStore = {
  get() { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; } },
  set(t) { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ } },
};

const api = {
  base: `${API_BASE}/api/v/${VENUE_SLUG}`,
  authHeader() { const t = tokenStore.get(); return t ? { Authorization: `Bearer ${t}` } : {}; },
  async authStart(phone, channel) {
    const r = await fetch(`${this.base}/auth/start`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, channel }),
    });
    const j = await r.json().catch(() => ({ error: "bad_response" }));
    if (!r.ok) throw new Error(j.error || "http_" + r.status);
    return j;   // { ok, channel, devCode? }
  },
  async authVerify(phone, code) {
    const r = await fetch(`${this.base}/auth/verify`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, code }),
    });
    const j = await r.json().catch(() => ({ error: "bad_response" }));
    if (!r.ok) throw new Error(j.error || "http_" + r.status);
    tokenStore.set(j.token);
    return j.account;
  },
  async me() {
    if (!tokenStore.get()) return null;
    try {
      const r = await fetch(`${this.base}/me`, { headers: { ...this.authHeader() } });
      if (!r.ok) { if (r.status === 401) tokenStore.set(""); return null; }
      return (await r.json()).account;
    } catch { return null; }
  },
  async logout() {
    try { await fetch(`${this.base}/auth/logout`, { method: "POST", headers: { ...this.authHeader() } }); } catch { /* ignore */ }
    tokenStore.set("");
  },
  async menu() {
    const r = await fetch(`${this.base}/menu`);
    const j = await r.json().catch(() => ({ error: "bad_response" }));
    if (!r.ok) throw new Error(j.error || "http_" + r.status);
    return j;
  },
  async submit(payload) {
    const r = await fetch(`${this.base}/orders`, {
      method: "POST", headers: { "Content-Type": "application/json", ...this.authHeader() }, body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => ({ error: "bad_response" }));
    if (!r.ok) throw new Error(j.error || "http_" + r.status);
    return j;
  },
  async list() {
    try { const r = await fetch(`${this.base}/orders`); const j = await r.json(); return j.orders || []; }
    catch { return []; }
  },
  async update(id, status) {
    await fetch(`${this.base}/orders/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
  },
  // Mode B: open/join a table session, or read its current state.
  async tableJoin(spot) {
    const r = await fetch(`${this.base}/table`, {
      method: "POST", headers: { "Content-Type": "application/json", ...this.authHeader() }, body: JSON.stringify({ spot }),
    });
    if (!r.ok) return null;
    return r.json();
  },
};

/* ===========================================================================
   i18n — UI chrome in TR / EN / RU. Menu item text stays source-language for now.
   =========================================================================== */
const LANGS = { tr: "TR", en: "EN", ru: "RU" };
const T = {
  tagline: { tr: "The Celebration of Life Society", en: "The Celebration of Life Society", ru: "The Celebration of Life Society" },
  yourSpot: { tr: "Konumun", en: "Your spot", ru: "Ваше место" },
  zone: { tr: "Bölge", en: "Zone", ru: "Зона" },
  search: { tr: "Menüde ara…", en: "Search the menu…", ru: "Поиск по меню…" },
  menu: { tr: "Menü", en: "Menu", ru: "Меню" },
  add: { tr: "Ekle", en: "Add", ru: "Добавить" },
  isNew: { tr: "Yeni", en: "New", ru: "Новинка" },
  sold: { tr: "Tükendi", en: "Sold out", ru: "Нет в наличии" },
  back: { tr: "Geri", en: "Back", ru: "Назад" },
  cart: { tr: "Sepet", en: "Your order", ru: "Ваш заказ" },
  empty: { tr: "Sepetin boş", en: "Your basket is empty", ru: "Корзина пуста" },
  total: { tr: "Toplam", en: "Total", ru: "Итого" },
  note: { tr: "Mutfağa not (opsiyonel)", en: "Note to the kitchen (optional)", ru: "Примечание (необязательно)" },
  name: { tr: "Adın (opsiyonel)", en: "Your name (optional)", ru: "Ваше имя (необязательно)" },
  checkout: { tr: "Ödemeye geç", en: "Checkout", ru: "К оплате" },
  payWith: { tr: "Ödeme yöntemi", en: "Payment method", ru: "Способ оплаты" },
  payNow: { tr: "Öde", en: "Pay", ru: "Оплатить" },
  placeOrder: { tr: "Siparişi gönder", en: "Place order", ru: "Оформить заказ" },
  placing: { tr: "Gönderiliyor…", en: "Placing your order…", ru: "Отправляем заказ…" },
  done: { tr: "Siparişin alındı!", en: "Order placed!", ru: "Заказ принят!" },
  orderNo: { tr: "Sipariş no", en: "Order no.", ru: "Номер заказа" },
  onWay: { tr: "Bir görevli geliyor.", en: "A waiter is on the way to your spot.", ru: "Официант уже идёт к вам." },
  newOrder: { tr: "Yeni sipariş", en: "New order", ru: "Новый заказ" },
  whereSit: { tr: "Neredesiniz?", en: "Where are you sitting?", ru: "Где вы находитесь?" },
  pickNumber: { tr: "numaranızı seçin", en: "pick your number", ru: "выберите номер" },
  // login / account
  login: { tr: "Giriş", en: "Log in", ru: "Войти" },
  logout: { tr: "Çıkış", en: "Log out", ru: "Выйти" },
  loginTitle: { tr: "Telefonla giriş", en: "Log in with your phone", ru: "Вход по телефону" },
  welcome: { tr: "Hoş geldiniz", en: "Welcome", ru: "Добро пожаловать" },
  loginSub: { tr: "Sipariş vermek için telefon numaranızla giriş yapın", en: "Sign in with your phone number to start ordering", ru: "Войдите по номеру телефона, чтобы сделать заказ" },
  codeSentTo: { tr: "Doğrulama kodu şuraya gönderildi:", en: "We sent a verification code to", ru: "Мы отправили код подтверждения на" },
  changeNum: { tr: "Numarayı değiştir", en: "Change number", ru: "Изменить номер" },
  phoneLabel: { tr: "Telefon numarası", en: "Phone number", ru: "Номер телефона" },
  sendCode: { tr: "Kod gönder", en: "Send code", ru: "Отправить код" },
  codeLabel: { tr: "Doğrulama kodu", en: "Verification code", ru: "Код подтверждения" },
  verify: { tr: "Doğrula", en: "Verify", ru: "Подтвердить" },
  sending: { tr: "Gönderiliyor…", en: "Sending…", ru: "Отправка…" },
  resend: { tr: "Tekrar gönder", en: "Resend", ru: "Отправить снова" },
  viaSms: { tr: "SMS", en: "SMS", ru: "SMS" },
  viaWa: { tr: "WhatsApp", en: "WhatsApp", ru: "WhatsApp" },
  wallet: { tr: "Bakiye", en: "Wallet", ru: "Баланс" },
  points: { tr: "Puan", en: "Points", ru: "Баллы" },
  // delivery mode (Mode A)
  deliveryTo: { tr: "Teslimat", en: "Delivery", ru: "Доставка" },
  chooseSpotLater: { tr: "Konumu ödemede seç", en: "Choose your spot at checkout", ru: "Выберите место при оплате" },
  whereDeliver: { tr: "Nereye getirelim?", en: "Where should we bring it?", ru: "Куда принести?" },
  changeSpot: { tr: "Değiştir", en: "Change", ru: "Изменить" },
  pickSpotFirst: { tr: "Önce konum seçin", en: "Pick a spot first", ru: "Сначала выберите место" },
  // table mode (Mode B)
  atTableWith: { tr: "Masada:", en: "At this table:", ru: "За столом:" },
  guest: { tr: "Misafir", en: "Guest", ru: "Гость" },
  // minimum spend
  minSpend: { tr: "Minimum harcama", en: "Minimum spend", ru: "Минимальный заказ" },
  // customization + allergens
  customize: { tr: "Özelleştir — çıkarmak için dokun", en: "Customize — tap to remove", ru: "Изменить — нажмите, чтобы убрать" },
  allergensT: { tr: "Alerjenler", en: "Allergens", ru: "Аллергены" },
  dietT: { tr: "Beslenme", en: "Dietary", ru: "Питание" },
  allergenNote: { tr: "Bilgi amaçlıdır — lütfen personele danışın.", en: "Indicative only — please confirm with staff.", ru: "Информация ориентировочная — уточняйте у персонала." },
  remove: { tr: "Kaldır", en: "Remove", ru: "Удалить" },
  // payment methods
  pmOnline: { tr: "Online kart", en: "Online card", ru: "Карта онлайн" },
  pmOnlineSub: { tr: "Şimdi uygulamadan öde", en: "Pay now, in the app", ru: "Оплатить сейчас в приложении" },
  pmCash: { tr: "Nakit", en: "Cash", ru: "Наличные" },
  pmCashSub: { tr: "Garsona nakit öde", en: "Pay the waiter in cash", ru: "Оплата официанту наличными" },
  pmCard: { tr: "Kart (yerinde)", en: "Card at your spot", ru: "Карта на месте" },
  pmCardSub: { tr: "Garson POS cihazını getirir", en: "Waiter brings the card machine", ru: "Официант принесёт терминал" },
  // staff
  board: { tr: "Sipariş Ekranı", en: "Order Board", ru: "Заказы" },
  allZones: { tr: "Tüm bölgeler", en: "All zones", ru: "Все зоны" },
  noOrders: { tr: "Henüz sipariş yok", en: "No orders yet", ru: "Заказов пока нет" },
  stNew: { tr: "Yeni", en: "New", ru: "Новый" },
  stPrep: { tr: "Hazırlanıyor", en: "Preparing", ru: "Готовится" },
  stServed: { tr: "Servis edildi", en: "Served", ru: "Подан" },
  start: { tr: "Hazırlamaya başla", en: "Start preparing", ru: "Начать готовить" },
  serve: { tr: "Servis edildi", en: "Mark served", ru: "Отметить поданным" },
  refresh: { tr: "Yenile", en: "Refresh", ru: "Обновить" },
  payPaid: { tr: "Ödendi (online)", en: "Paid online", ru: "Оплачено онлайн" },
  payCash: { tr: "Nakit — yerinde", en: "Cash — collect", ru: "Наличные — получить" },
  payCard: { tr: "Kart — POS götür", en: "Card — bring POS", ru: "Карта — принести терминал" },
  // links view
  linksTitle: { tr: "QR Bağlantıları", en: "QR Links", ru: "QR-ссылки" },
  linksSub: { tr: "Her konum için yazdırılabilir QR", en: "Printable QR for every spot", ru: "QR для каждого места" },
  copy: { tr: "Kopyala", en: "Copy", ru: "Копировать" },
  copied: { tr: "Kopyalandı", en: "Copied", ru: "Скопировано" },
};
const tx = (k, l) => (T[k] ? T[k][l] : k);
const money = (n) => `${n.toLocaleString("tr-TR")} ${CURRENCY}`;

/* ===========================================================================
   ALLERGENS / DIET — registry of symbols + names, and a TRANSPARENT keyword
   tagger. NOTE: derived from item text only and is INDICATIVE. The kitchen must
   verify/override these before go-live. To set explicit tags later, add
   `allergens:[...]` / `diet:[...]` to an item in menu data and prefer those.
   =========================================================================== */
const ALLERGENS = {
  gluten:    { icon: "🌾", name: { tr: "Gluten", en: "Gluten", ru: "Глютен" } },
  dairy:     { icon: "🥛", name: { tr: "Süt", en: "Dairy", ru: "Молочное" } },
  egg:       { icon: "🥚", name: { tr: "Yumurta", en: "Egg", ru: "Яйцо" } },
  fish:      { icon: "🐟", name: { tr: "Balık", en: "Fish", ru: "Рыба" } },
  shellfish: { icon: "🦐", name: { tr: "Kabuklu deniz ürünü", en: "Shellfish", ru: "Моллюски" } },
  nuts:      { icon: "🌰", name: { tr: "Sert kabuklu yemiş", en: "Tree nuts", ru: "Орехи" } },
  peanut:    { icon: "🥜", name: { tr: "Yer fıstığı", en: "Peanut", ru: "Арахис" } },
  soy:       { icon: "🫘", name: { tr: "Soya", en: "Soy", ru: "Соя" } },
  sesame:    { icon: "⚫", name: { tr: "Susam", en: "Sesame", ru: "Кунжут" } },
  alcohol:   { icon: "🍸", name: { tr: "Alkol", en: "Alcohol", ru: "Алкоголь" } },
};
const DIETS = {
  vegetarian: { icon: "🌱", name: { tr: "Vejetaryen", en: "Vegetarian", ru: "Вегетарианское" } },
  vegan:      { icon: "🥬", name: { tr: "Vegan", en: "Vegan", ru: "Веганское" } },
  spicy:      { icon: "🌶️", name: { tr: "Acı", en: "Spicy", ru: "Острое" } },
};
const KW = {
  gluten: ["bread", "sourdough", "toast", "croissant", "pasta", "penne", "fettuccine", "spaghetti", "rigatoni", "orzo", "pizza", "panko", "tempura", "breaded", "brioche", "nachos", "tortilla", "granola", "oats", "pancake", "yufka", "schnitzel", "quesadilla", "crunchy", "matchstick"],
  dairy: ["cheese", "mozzarella", "parmesan", "cheddar", "gouda", "feta", "ricotta", "mascarpone", "burrata", "cream", "butter", "yogurt", "yoghurt", "milk", "labneh", "kaymak", "hellim", "halloumi", "scamorza", "emmental", "roquefort", "latte", "cappuccino", "milkshake", "baileys", "kahlua", "ice cream", "clotted", "goat cheese"],
  egg: ["egg", "omelette", "omelet", "mayonnaise", "mayo", "hollandaise", "aioli", "benedict", "menemen", "syrniki"],
  fish: ["salmon", "sea bass", "suzuki", "unagi", "eel", "haddock", "anchovy", "tuna", "sashimi", "somon"],
  shellfish: ["shrimp", "prawn", "calamari", "squid", "crab", "surimi", "ebi", "karides"],
  nuts: ["walnut", "hazelnut", "almond", "pistachio", "nutella", "orgeat", "pesto", "chestnut", "cashew"],
  peanut: ["peanut"],
  soy: ["soy", "edamame", "teriyaki", "tofu", "miso", "ponzu"],
  sesame: ["sesame", "tahini", "togarashi", "goma"],
};
const SPICY = ["spicy", "jalapeño", "jalapeno", "chili", "chilli", "samurai", "togarashi"];
const ALC_CATS = new Set(["cocktails", "shots", "vodka-gin-rum", "tequila-liqueur", "whiskey", "raki", "bottle-service", "beers", "red-wines", "white-wines", "rose-wines", "sparkling", "champagnes", "wines-glass"]);
const FOOD_CATS = new Set(["breakfast", "croissant", "starters", "salad-pasta", "burgers", "pizzas", "mains", "sushi", "desserts"]);

function deriveTags(item, catKey) {
  if (item.allergens || item.diet) return { allergens: item.allergens || [], diet: item.diet || [] }; // explicit overrides
  const t = ((item.name || "") + " " + (item.desc || "")).toLowerCase();
  const allergens = [];
  for (const a in KW) if (KW[a].some((w) => t.includes(w))) allergens.push(a);
  if (ALC_CATS.has(catKey)) allergens.push("alcohol");
  const diet = [];
  if (/vegetarian|veggie|vejeteryan/.test(t)) diet.push("vegetarian");
  if (/vegan/.test(t)) diet.push("vegan");
  if (SPICY.some((w) => t.includes(w))) diet.push("spicy");
  return { allergens: [...new Set(allergens)], diet };
}
// split a description into removable ingredient chips (food items only)
function ingredientsOf(item, catKey) {
  if (!FOOD_CATS.has(catKey) || !item.desc) return [];
  return item.desc.split(/[,;·]| and /i).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 36).slice(0, 12);
}

/* ===========================================================================
   STYLES — elegant beach-club identity: SunDaze cream, terracotta script,
   espresso ink, classical serif. Matches the venue logo & brand palette.
   =========================================================================== */
const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Italianno&family=Jost:wght@400;500;600;700&display=swap');
:root{--sand:#ECDDCA;--sand2:#F6EFE3;--card:#FCF8F0;--ink:#33231A;--muted:#8C7A67;--terra:#9C3A1F;--terra2:#B9512C;--palm:#5F7355;--brz:#A9824C;--line:rgba(51,35,26,.12);--font-body:'Jost',sans-serif;--font-serif:'Cormorant Garamond',serif;--font-brand:'Italianno',cursive}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
.sd{font-family:var(--font-body);color:var(--ink);min-height:100vh;background:linear-gradient(180deg,#F8F1E5 0%,#EFE2CF 100%);display:flex;justify-content:center}
.wrap{width:100%;max-width:480px;min-height:100vh;position:relative;padding-bottom:96px;overflow:hidden}
.serif{font-family:var(--font-serif)}
.hdr{position:sticky;top:0;z-index:40;padding:14px 18px 14px;background:linear-gradient(180deg,rgba(247,240,228,.97),rgba(247,240,228,.82));backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.brandrow{display:flex;align-items:center;justify-content:space-between;gap:12px}
.brandrow>div:first-child{min-width:0}
.brand{font-family:var(--font-brand);font-weight:400;font-size:37px;line-height:.85;color:var(--terra)}
.brandlogo{height:42px;width:auto;max-width:180px;object-fit:contain;display:block}
.tag{font-family:var(--font-serif);font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--terra);opacity:.85;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.langs{display:flex;gap:4px;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:3px;flex:none}
.lang{border:0;background:transparent;font-family:inherit;font-weight:600;font-size:12px;color:var(--muted);padding:5px 9px;border-radius:999px;cursor:pointer}
.lang.on{background:var(--ink);color:#F6EFE3}
.spot{display:flex;align-items:center;gap:11px;margin-top:13px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px 14px;box-shadow:0 8px 22px -16px rgba(51,35,26,.45)}
.spot .ic{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;font-size:18px;flex:none;background:linear-gradient(135deg,#E8D6BC,var(--sand));border:1px solid var(--line)}
.spot>div{min-width:0;flex:1}
.spot .lab{font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);line-height:1.2}
.spot .val{font-family:var(--font-serif);font-weight:600;font-size:19px;line-height:1.2;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.minbar{margin-top:11px}
.minrow{display:flex;justify-content:space-between;font-size:11.5px;color:var(--muted);margin-bottom:6px;font-weight:500}
.minrow b{color:var(--ink);font-weight:600}
.minrow .ok{color:var(--palm)}
.mintrack{height:7px;border-radius:999px;background:rgba(51,35,26,.10);overflow:hidden}
.minfill{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--terra2),var(--terra));transition:width .55s cubic-bezier(.2,.8,.2,1)}
.minfill.done{background:var(--palm)}
.search{margin:14px 18px 0;display:flex;align-items:center;gap:9px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:11px 13px}
.search input{border:0;outline:0;font-family:inherit;font-size:15px;width:100%;background:transparent;color:var(--ink)}
.search input::placeholder{color:var(--muted)}
.h2{font-family:var(--font-serif);font-weight:600;font-size:22px;margin:20px 18px 10px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:11px;padding:0 18px}
.cat{position:relative;border-radius:16px;overflow:hidden;aspect-ratio:1.18;border:1px solid var(--line);cursor:pointer;background:#E4D4BD;box-shadow:0 12px 26px -20px rgba(51,35,26,.65)}
.cat img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s ease}
.cat:active img{transform:scale(1.06)}
.cat .ov{position:absolute;inset:0;background:linear-gradient(180deg,rgba(31,18,9,0) 30%,rgba(31,18,9,.74) 100%)}
.cat .nm{position:absolute;left:12px;right:12px;bottom:11px;color:#F6EFE3;font-family:var(--font-serif);font-weight:600;font-size:17px;line-height:1.1;text-shadow:0 1px 8px rgba(0,0,0,.4)}
.chiprow{position:sticky;top:0;z-index:30;display:flex;gap:8px;overflow-x:auto;padding:12px 18px;background:linear-gradient(180deg,rgba(247,240,228,.97),rgba(247,240,228,.86));backdrop-filter:blur(8px);border-bottom:1px solid var(--line);scrollbar-width:none}
.chiprow::-webkit-scrollbar{display:none}
.chip{flex:none;border:1px solid var(--line);background:var(--card);font-family:inherit;font-weight:600;font-size:13px;color:var(--ink);padding:8px 14px;border-radius:999px;cursor:pointer;white-space:nowrap}
.chip.on{background:var(--ink);color:#F6EFE3;border-color:var(--ink)}
.grp{font-family:var(--font-serif);font-weight:600;font-size:19px;margin:20px 18px 8px;display:flex;align-items:center;gap:10px}
.grp:after{content:"";height:1px;flex:1;background:var(--line)}
.row{display:flex;gap:13px;padding:11px 18px;align-items:flex-start}
.row+.row{border-top:1px solid var(--line)}
.thumb{width:74px;height:74px;border-radius:13px;object-fit:cover;flex:none;background:#E7D8C2}
.thumb.ph{display:grid;place-items:center;color:#F6EFE3;font-family:var(--font-serif);font-weight:600;font-size:22px;background:linear-gradient(135deg,var(--terra2),var(--terra))}
.it{flex:1;min-width:0}
.it h4{font-size:15px;font-weight:600;margin:1px 0 0;line-height:1.2;display:flex;gap:7px;align-items:center;flex-wrap:wrap}
.it p{font-size:12.5px;color:var(--muted);line-height:1.35;margin:4px 0 0}
.it .pr{font-family:var(--font-serif);font-weight:700;font-size:16px;margin-top:6px;color:var(--terra)}
.alle{display:inline-flex;gap:3px;margin-left:2px}
.alle span{font-size:12px;opacity:.9}
.badge{font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:2px 6px;border-radius:6px}
.badge.new{background:rgba(156,58,31,.12);color:var(--terra)}
.badge.sold{background:rgba(140,122,103,.16);color:var(--muted)}
.addbtn{flex:none;width:34px;height:34px;border-radius:11px;border:0;cursor:pointer;color:#F6EFE3;font-size:20px;display:grid;place-items:center;background:var(--terra);box-shadow:0 8px 16px -8px var(--terra);align-self:center}
.addbtn:active{transform:scale(.92);background:var(--terra2)}
.soldrow{opacity:.5;filter:grayscale(.8)}
.fab{position:fixed;left:50%;transform:translateX(-50%);bottom:18px;z-index:50;width:calc(100% - 36px);max-width:444px;border:0;cursor:pointer;color:#F6EFE3;font-family:inherit;font-weight:600;font-size:15px;border-radius:16px;padding:15px 18px;display:flex;align-items:center;justify-content:space-between;background:linear-gradient(100deg,var(--ink),#4A352A);box-shadow:0 16px 30px -14px rgba(51,35,26,.8);animation:pop .25s ease}
.fab .ct{background:var(--terra);border-radius:999px;min-width:24px;height:24px;display:grid;place-items:center;font-size:12px;padding:0 6px}
@keyframes pop{from{transform:translate(-50%,12px);opacity:0}to{transform:translate(-50%,0);opacity:1}}
.scrim{position:fixed;inset:0;z-index:60;background:rgba(33,21,11,.5);backdrop-filter:blur(2px);display:flex;align-items:flex-end;justify-content:center;animation:fade .2s ease}
@keyframes fade{from{opacity:0}to{opacity:1}}
.sheet{width:100%;max-width:480px;background:var(--sand2);border-radius:24px 24px 0 0;max-height:92vh;overflow:auto;animation:rise .28s cubic-bezier(.2,.8,.2,1)}
@keyframes rise{from{transform:translateY(100%)}to{transform:translateY(0)}}
.sheet .hero{width:100%;height:210px;object-fit:cover;display:block;background:#E7D8C2}
.sheet .hero.ph{display:grid;place-items:center;color:#F6EFE3;font-family:var(--font-serif);font-size:40px;background:linear-gradient(135deg,var(--terra2),var(--terra))}
.sbody{padding:18px 20px 22px}
.sbody h3{font-family:var(--font-serif);font-weight:600;font-size:25px;margin:0;line-height:1.1}
.sbody .d{color:var(--muted);font-size:14px;line-height:1.5;margin:9px 0 0}
.sbody .pr{font-family:var(--font-serif);font-weight:700;font-size:23px;margin:14px 0 0;color:var(--terra)}
.tagsec{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin-top:18px;margin-bottom:8px}
.tags{display:flex;flex-wrap:wrap;gap:6px}
.tagc{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:500;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:5px 9px}
.tagc .e{font-size:13px}
.disc{font-size:11px;color:var(--muted);margin-top:9px;font-style:italic;line-height:1.4}
.ings{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}
.ing{font-size:12.5px;border:1px solid var(--line);background:var(--card);border-radius:10px;padding:7px 10px;cursor:pointer;color:var(--ink);font-family:inherit}
.ing.off{text-decoration:line-through;color:var(--muted);background:#EBDFC9;opacity:.75}
.qrow{display:flex;align-items:center;gap:14px;margin-top:18px}
.stp{width:42px;height:42px;border-radius:13px;border:1px solid var(--line);background:var(--card);font-size:22px;cursor:pointer;color:var(--ink)}
.qn{font-family:var(--font-serif);font-weight:700;font-size:21px;min-width:24px;text-align:center}
.ta{width:100%;margin-top:14px;border:1px solid var(--line);border-radius:13px;padding:12px;font-family:inherit;font-size:14px;resize:none;background:var(--card);color:var(--ink)}
.cta{width:100%;margin-top:16px;border:0;cursor:pointer;color:#F6EFE3;font-family:inherit;font-weight:600;letter-spacing:.02em;font-size:16px;border-radius:15px;padding:16px;background:linear-gradient(100deg,var(--terra),var(--terra2));box-shadow:0 14px 26px -12px var(--terra);display:flex;align-items:center;justify-content:center;gap:8px}
.cta.dark{background:linear-gradient(100deg,var(--ink),#4A352A);box-shadow:0 14px 26px -14px rgba(51,35,26,.8)}
.cta:disabled{opacity:.7}
.shead{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 6px}
.shead h3{font-family:var(--font-serif);font-weight:600;font-size:23px;margin:0}
.x{border:0;background:var(--card);border:1px solid var(--line);width:34px;height:34px;border-radius:11px;font-size:18px;cursor:pointer;color:var(--ink)}
.cl{display:flex;gap:11px;padding:14px 20px;align-items:center}
.cl+.cl{border-top:1px solid var(--line)}
.cl .nm{flex:1;font-weight:600;font-size:14.5px;min-width:0}
.cl .nm small{display:block;color:var(--muted);font-weight:400;font-size:12px;margin-top:2px}
.cl .pp{font-family:var(--font-serif);font-weight:700}
.mini{width:30px;height:30px;border-radius:9px;border:1px solid var(--line);background:var(--card);font-size:17px;cursor:pointer;color:var(--ink);flex:none}
.rm{display:block;margin-top:4px;border:0;background:transparent;color:var(--terra);font-size:12px;cursor:pointer;padding:0;font-family:inherit;font-weight:500}
.totrow{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 4px}
.totrow .l{color:var(--muted);font-weight:500}
.totrow .v{font-family:var(--font-serif);font-weight:700;font-size:26px}
.field{margin:10px 20px 0}
.field input{width:100%;border:1px solid var(--line);border-radius:13px;padding:13px;font-family:inherit;font-size:15px;background:var(--card);color:var(--ink)}
.pmsec{margin:16px 20px 0;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
.pm{margin:8px 20px 0;border:1px solid var(--line);border-radius:14px;padding:13px 14px;display:flex;align-items:center;gap:12px;background:var(--card);cursor:pointer}
.pm.on{border-color:var(--terra);box-shadow:0 0 0 2px rgba(156,58,31,.14)}
.pm .r{width:20px;height:20px;border-radius:999px;border:2px solid var(--line);flex:none;display:grid;place-items:center}
.pm.on .r{border-color:var(--terra)}
.pm.on .r:after{content:"";width:10px;height:10px;border-radius:999px;background:var(--terra)}
.pm .t{font-weight:600;font-size:14.5px}
.pm small{display:block;color:var(--muted);font-weight:400;font-size:12px;margin-top:1px}
.pm .e{font-size:20px;margin-left:auto}
.success{padding:46px 26px 30px;text-align:center}
.tick{width:78px;height:78px;border-radius:999px;margin:0 auto 18px;display:grid;place-items:center;color:#F6EFE3;font-size:40px;background:var(--palm);box-shadow:0 16px 30px -12px var(--palm)}
.ono{font-family:var(--font-serif);font-weight:700;font-size:32px;margin:8px 0 0}
.spin{width:18px;height:18px;border:2.5px solid rgba(246,239,227,.5);border-top-color:#F6EFE3;border-radius:999px;display:inline-block;animation:sp .7s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
.center{padding:90px 30px;text-align:center;color:var(--muted)}
.center .big{font-family:var(--font-serif);font-size:46px;color:var(--ink)}
.stwrap{max-width:820px}
.stbar{position:sticky;top:0;z-index:20;display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:14px 18px;background:rgba(247,240,228,.96);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.ocard{background:var(--card);border:1px solid var(--line);border-radius:18px;margin:14px 18px;overflow:hidden;box-shadow:0 12px 26px -22px rgba(51,35,26,.65)}
.ohead{display:flex;align-items:center;gap:9px;padding:13px 16px;border-bottom:1px solid var(--line);flex-wrap:wrap}
.ohead .loc{font-family:var(--font-serif);font-weight:600;font-size:19px}
.ohead .tm{margin-left:auto;font-size:12px;color:var(--muted)}
.pill{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:4px 8px;border-radius:999px}
.pill.new{background:rgba(156,58,31,.14);color:var(--terra)}
.pill.preparing{background:rgba(169,130,76,.18);color:#8A6630}
.pill.served{background:rgba(95,115,85,.16);color:var(--palm)}
.pill.zone{background:rgba(95,115,85,.10);color:var(--palm)}
.pill.pay{background:rgba(51,35,26,.06);color:var(--ink)}
.pill.pay.paid{background:rgba(95,115,85,.16);color:var(--palm)}
.oline{display:flex;justify-content:space-between;padding:8px 16px;font-size:14px}
.oline small{color:var(--muted)}
.note{margin:2px 16px 10px;font-size:12.5px;color:var(--muted);font-style:italic}
.ofoot{display:flex;gap:10px;padding:12px 16px;border-top:1px solid var(--line);align-items:center}
.ofoot .t{font-family:var(--font-serif);font-weight:700;font-size:17px;margin-right:auto}
.btn{border:0;border-radius:11px;padding:10px 14px;font-family:inherit;font-weight:600;font-size:13px;cursor:pointer;color:#F6EFE3}
.btn.amber{background:linear-gradient(100deg,var(--brz),#8A6630)}
.btn.sea{background:var(--palm)}
.btn.ghost{background:var(--card);border:1px solid var(--line);color:var(--ink)}
.lkhead{padding:16px 18px 4px}
.lkgrp{font-family:var(--font-serif);font-weight:600;font-size:19px;margin:20px 18px 4px}
.lk{display:flex;align-items:center;gap:12px;padding:12px 18px;border-top:1px solid var(--line)}
.lk img{width:62px;height:62px;border-radius:10px;background:var(--card);border:1px solid var(--line);flex:none}
.lk .u{flex:1;min-width:0}
.lk .u b{font-family:var(--font-serif);font-size:16px;display:block;margin-bottom:2px}
.lk .u span{font-size:11.5px;color:var(--muted);word-break:break-all}
.pick{padding:26px 18px 40px}
.pickh{font-family:var(--font-serif);font-weight:600;font-size:23px;line-height:1.2;margin-bottom:18px}
.typegrid{display:flex;flex-direction:column;gap:12px}
.typecard{display:flex;align-items:center;gap:14px;width:100%;text-align:left;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px;cursor:pointer;font-family:inherit;box-shadow:0 10px 24px -18px rgba(51,35,26,.55)}
.typecard:active{transform:scale(.99)}
.typecard .tcic{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;font-size:23px;flex:none;background:linear-gradient(135deg,#E8D6BC,var(--sand));border:1px solid var(--line)}
.typecard .tcname{font-family:var(--font-serif);font-weight:600;font-size:20px;flex:1}
.typecard .tcarrow{color:var(--muted);font-size:22px}
.numgrid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.numchip{aspect-ratio:1;border:1px solid var(--line);background:var(--card);border-radius:14px;font-family:var(--font-serif);font-weight:700;font-size:19px;color:var(--ink);cursor:pointer}
.numchip:active{transform:scale(.94);background:var(--sand)}
/* delivery destination picker (Mode A checkout) */
.destpick{margin:0 20px 12px;background:var(--sand);border:1px solid var(--line);border-radius:14px;padding:12px 14px}
.destpick .pmsec{margin:0 0 10px}
.destchosen{display:flex;align-items:center;justify-content:space-between;gap:10px;font-family:'Fraunces',serif;font-weight:600;font-size:16px}
.desttypes{display:flex;flex-direction:column;gap:8px}
.desttype{border:1px solid var(--line);background:#fff;border-radius:12px;padding:12px 14px;font-family:inherit;font-weight:700;font-size:15px;color:var(--ink);cursor:pointer;text-align:left}
.desttype:active{transform:scale(.98)}
.destnums{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.destnums .rm{grid-column:1/-1;justify-self:start;margin-bottom:2px}
/* table mode mates banner */
.tableband{display:flex;align-items:center;gap:8px;margin-top:11px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:10px 13px;font-size:13px;color:var(--ink)}
.tableband .tbicon{flex:none}
/* login + account */
.acctbtn{flex:none;border:1px solid var(--line);background:var(--card);border-radius:999px;padding:6px 11px;font-family:inherit;font-weight:600;font-size:12px;color:var(--ink);cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.acctbtn .dot{width:7px;height:7px;border-radius:999px;background:var(--terra)}
.acctmenu{position:absolute;right:0;top:calc(100% + 6px);z-index:60;background:var(--card);border:1px solid var(--line);border-radius:14px;box-shadow:0 16px 34px -18px rgba(51,35,26,.6);padding:12px;min-width:190px}
.acctmenu .row{display:flex;justify-content:space-between;font-size:13px;padding:5px 0;color:var(--muted)}
.acctmenu .row b{color:var(--ink)}
.acctmenu .lo{margin-top:8px;width:100%;border:1px solid var(--line);background:var(--card);border-radius:10px;padding:8px;font-family:inherit;font-weight:600;font-size:13px;color:var(--terra);cursor:pointer}
.acctwrap{position:relative;flex:none}
.loginsheet{max-width:420px}
.lh{font-family:var(--font-serif);font-weight:600;font-size:22px;margin-bottom:14px}
.seg{display:flex;gap:6px;background:var(--sand);border-radius:12px;padding:4px;margin-bottom:16px}
.segb{flex:1;border:0;background:transparent;font-family:inherit;font-weight:600;font-size:13px;color:var(--muted);padding:9px;border-radius:9px;cursor:pointer}
.segb.on{background:var(--card);color:var(--ink);box-shadow:0 2px 8px -4px rgba(51,35,26,.4)}
.lf{display:block;margin-bottom:12px}
.lf span{display:block;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
.lf input{width:100%;border:1px solid var(--line);border-radius:13px;padding:13px;font-family:inherit;font-size:16px;background:var(--card);color:var(--ink)}
.lf input:focus{outline:none;border-color:var(--terra);box-shadow:0 0 0 3px rgba(156,58,31,.12)}
.lerr{color:var(--terra);font-size:13px;margin-bottom:8px}
.lhint{color:var(--palm);font-size:12px;margin-bottom:8px}
.llink{display:block;margin:12px auto 0;border:0;background:transparent;color:var(--muted);font-size:13px;cursor:pointer;font-family:inherit}
/* full-page OTP login (shown before spot selection) */
.lscreen{min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:30px 24px 40px}
.lscreen .langs{align-self:flex-end}
.lslogo{width:158px;height:158px;border-radius:999px;margin:7vh auto 0;display:block;object-fit:contain;box-shadow:0 22px 50px -22px rgba(51,35,26,.55),0 0 0 1px var(--line);background:var(--sand)}
.lswelcome{font-family:var(--font-serif);font-weight:600;font-size:30px;text-align:center;margin:26px 0 4px;line-height:1.1}
.lssub{text-align:center;color:var(--muted);font-size:14px;margin-bottom:24px;line-height:1.5}
.lscard{width:100%;max-width:380px;background:var(--card);border:1px solid var(--line);border-radius:22px;padding:22px 20px;box-shadow:0 24px 50px -30px rgba(51,35,26,.6)}
.lscard .cta{margin-top:6px}
.otpin{width:100%;border:1px solid var(--line);border-radius:14px;padding:14px;background:var(--sand2);color:var(--ink);font-family:var(--font-serif);font-weight:700;font-size:30px;text-align:center;letter-spacing:.45em;text-indent:.45em}
.otpin:focus{outline:none;border-color:var(--terra);box-shadow:0 0 0 3px rgba(156,58,31,.12)}
.lssent{text-align:center;color:var(--muted);font-size:13px;margin:0 0 14px;line-height:1.5}
.lssent b{color:var(--ink);font-weight:600}
.lsfoot{font-family:var(--font-serif);font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:var(--muted);margin-top:auto;padding-top:34px;text-align:center}
`;

/* ===========================================================================
   CART reducer — lines keyed by a signature (id + note) so customised variants
   of the same dish stay separate.
   =========================================================================== */
function lineKey(id, note) { return id + "|" + (note || ""); }
function cartReducer(state, a) {
  switch (a.type) {
    case "add": {
      const key = lineKey(a.item.id, a.note);
      const ex = state.find((l) => l.key === key);
      if (ex) return state.map((l) => (l.key === key ? { ...l, qty: l.qty + a.qty } : l));
      return [...state, { key, id: a.item.id, name: a.item.name, price: a.item.price, qty: a.qty, note: a.note || "" }];
    }
    case "inc": return state.map((l) => (l.key === a.key ? { ...l, qty: l.qty + 1 } : l));
    case "dec": return state.flatMap((l) => (l.key === a.key ? (l.qty > 1 ? [{ ...l, qty: l.qty - 1 }] : []) : [l]));
    case "remove": return state.filter((l) => l.key !== a.key);
    case "clear": return [];
    default: return state;
  }
}

// Falls back to a letter placeholder when there's no image OR the URL 404s
// (some source-CDN files are gone), so broken images never show a broken icon.
function Thumb({ src, name, big }) {
  const [failed, setFailed] = useState(false);
  const url = imgUrl(src, IMG);
  if (!url || failed) return <div className={big ? "hero ph" : "thumb ph"}>{(name || "?").trim()[0]}</div>;
  return <img className={big ? "hero" : "thumb"} src={url} alt="" loading="lazy" onError={() => setFailed(true)} />;
}

// Transform the flat API payload (categories/groups/items, i18n name objects)
// into the nested shape the guest UI renders. Returns null if there's nothing
// usable, so callers can fall back to FALLBACK_MENU.
function buildMenu(data, lang) {
  if (!data?.categories?.length) return null;
  const L = (v) => (typeof v === "string" ? v : (v && (v[lang] || v.en || Object.values(v)[0])) || "");
  const mapItem = (it) => ({
    id: String(it.extId ?? it.id),
    name: L(it.name),
    price: Number(it.price),
    desc: it.description ? L(it.description) : undefined,
    img: it.image || undefined,
    isNew: !!it.isNew,
    soldOut: !!it.soldOut,
    allergens: it.allergens || undefined,
    diet: it.diet || undefined,
  });
  const by = (a, b) => (a.sort ?? 0) - (b.sort ?? 0);
  const cats = [...data.categories].sort(by);
  const groups = [...(data.groups || [])].sort(by);
  const items = [...(data.items || [])].sort(by);
  return cats
    .map((c) => {
      const catItems = items.filter((it) => it.categoryId === c.id);
      const catGroups = groups.filter((g) => g.categoryId === c.id);
      // If the category image is missing/404, fall back to a real item photo.
      const fallbackImg = (catItems.find((it) => it.image) || {}).image;
      const node = { key: c.key, label: L(c.name), img: c.image || undefined, fallbackImg };
      if (catGroups.length) {
        const built = catGroups
          .map((g) => ({ name: L(g.name), items: catItems.filter((it) => it.groupId === g.id).map(mapItem) }))
          .filter((g) => g.items.length);
        const ungrouped = catItems.filter((it) => !it.groupId);
        if (ungrouped.length) built.unshift({ name: "", items: ungrouped.map(mapItem) });
        node.groups = built;
      } else {
        node.items = catItems.map(mapItem);
      }
      return node;
    })
    .filter((c) => (c.groups ? c.groups.length : c.items.length));
}

// Flatten any menu (fallback or live) into a searchable item list.
const flattenItems = (m) =>
  m.flatMap((c) => (c.groups ? c.groups.flatMap((g) => g.items) : c.items).map((i) => ({ ...i, cat: c.label, catKey: c.key })));

/* ===========================================================================
   Minimum-spend bar (informational, never blocks checkout)
   =========================================================================== */
function MinBar({ spent, min, lang }) {
  if (!min) return null;
  const pct = Math.min(100, Math.round((spent / min) * 100));
  const reached = spent >= min;
  return (
    <div className="minbar">
      <div className="minrow">
        <span>{tx("minSpend", lang)}</span>
        <span><b>{money(spent)}</b> / {money(min)} {reached && <span className="ok">✓</span>}</span>
      </div>
      <div className="mintrack"><div className={"minfill" + (reached ? " done" : "")} style={{ width: pct + "%" }} /></div>
    </div>
  );
}

function TagChips({ tags, lang }) {
  if (!tags.allergens.length && !tags.diet.length) return null;
  return (
    <>
      {tags.diet.length > 0 && (<>
        <div className="tagsec">{tx("dietT", lang)}</div>
        <div className="tags">{tags.diet.map((d) => <span className="tagc" key={d}><span className="e">{DIETS[d].icon}</span>{DIETS[d].name[lang]}</span>)}</div>
      </>)}
      {tags.allergens.length > 0 && (<>
        <div className="tagsec">{tx("allergensT", lang)}</div>
        <div className="tags">{tags.allergens.map((a) => <span className="tagc" key={a}><span className="e">{ALLERGENS[a].icon}</span>{ALLERGENS[a].name[lang]}</span>)}</div>
        <div className="disc">{tx("allergenNote", lang)}</div>
      </>)}
    </>
  );
}

/* ===========================================================================
   GUEST APP
   =========================================================================== */
function Guest({ loc, deliveryMode, tableMode, lang, setLang, venueTypes, rawMenu, acct }) {
  const brand = useBrand();
  const menu = useMemo(() => buildMenu(rawMenu, lang) || FALLBACK_MENU, [rawMenu, lang]);
  const allItems = useMemo(() => flattenItems(menu), [menu]);

  // Mode A: the destination spot is chosen at checkout, not upfront.
  const [destination, setDestination] = useState(null);
  const [destType, setDestType] = useState(null);
  const activeSpot = deliveryMode ? destination : loc;

  // Mode B: open/join this table's session on arrival; show who's here.
  const [table, setTable] = useState(null);
  useEffect(() => {
    if (!tableMode || !loc) return;
    let on = true;
    api.tableJoin(loc.code).then((v) => { if (on && v) setTable(v); });
    return () => { on = false; };
  }, [tableMode, loc]);

  const [screen, setScreen] = useState("home");
  const [activeCat, setActiveCat] = useState(menu[0].key);
  const [detail, setDetail] = useState(null);
  const [detailQty, setDetailQty] = useState(1);
  const [detailNote, setDetailNote] = useState("");
  const [removed, setRemoved] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [method, setMethod] = useState("online");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(null);
  const [name, setName] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [q, setQ] = useState("");
  const [spentSoFar, setSpentSoFar] = useState(0);
  const [cart, dispatch] = useReducer(cartReducer, []);
  const chipRef = useRef(null);
  // Stable idempotency token for the current order attempt. Reused across
  // retries (so a network retry can't double-place), cleared after success.
  const tokenRef = useRef(null);

  const count = cart.reduce((n, l) => n + l.qty, 0);
  const total = cart.reduce((n, l) => n + l.qty * l.price, 0);
  const cat = menu.find((c) => c.key === activeCat) || menu[0];
  const results = q.trim().length > 1
    ? allItems.filter((i) => (i.name + " " + (i.desc || "")).toLowerCase().includes(q.toLowerCase()))
    : null;

  // running spend for THIS spot = already-placed orders here + current cart
  useEffect(() => {
    if (!activeSpot) { setSpentSoFar(0); return; }
    let on = true;
    (async () => {
      const all = await api.list();
      if (on) setSpentSoFar(all.filter((o) => o.spot_code === activeSpot.code).reduce((n, o) => n + Number(o.total || 0), 0));
    })();
    return () => { on = false; };
  }, [activeSpot, placed]);

  const openDetail = (it) => { setDetail(it); setDetailQty(1); setDetailNote(""); setRemoved([]); };
  const addQuick = (it) => dispatch({ type: "add", item: it, qty: 1, note: "" });

  function addDetail() {
    const parts = [];
    if (removed.length) parts.push(removed.map((r) => "No " + r).join(", "));
    if (detailNote.trim()) parts.push(detailNote.trim());
    dispatch({ type: "add", item: detail, qty: detailQty, note: parts.join(" · ") });
    setDetail(null);
  }

  async function placeOrder() {
    if (!activeSpot) return;   // delivery mode: a destination must be chosen first
    setPlacing(true);
    if (!tokenRef.current) {
      tokenRef.current = (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2));
    }
    try {
      // server prices the order, charges online cards, and saves it.
      const res = await api.submit({
        spot: activeSpot.code,
        lang,
        customerName: name.trim(),
        note: orderNote.trim(),
        paymentMethod: method,
        clientToken: tokenRef.current,
        items: cart.map((l) => ({ itemId: String(l.id), qty: l.qty, note: l.note })),
      });
      setPlaced({ id: res.id, total: res.total ?? total });
      tokenRef.current = null;   // success → next order gets a fresh token
      setCheckout(false); setCartOpen(false); dispatch({ type: "clear" });
    } catch (e) {
      alert("Order failed: " + (e && e.message ? e.message : "unknown") + ". Please try again.");
    } finally { setPlacing(false); }
  }

  const detailTags = detail ? deriveTags(detail, detail.catKey) : null;
  const detailIngs = detail ? ingredientsOf(detail, detail.catKey) : [];

  return (
    <div className="wrap">
      <div className="hdr">
        <div className="brandrow">
          <div>{brand.hasLogo ? <img className="brandlogo" src={brand.logo} alt={brand.text} /> : <div className="brand">{brand.text}</div>}<div className="tag">{tx("tagline", lang)}</div></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
            {acct && <AccountControl {...acct} lang={lang} />}
            <div className="langs">
              {Object.keys(LANGS).map((l) => (
                <button key={l} className={"lang" + (l === lang ? " on" : "")} onClick={() => setLang(l)}>{LANGS[l]}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="spot">
          <div className="ic">{activeSpot ? locIcon(activeSpot, venueTypes) : "🛎️"}</div>
          <div>
            <div className="lab">{activeSpot ? tx("yourSpot", lang) : tx("deliveryTo", lang)}</div>
            <div className="val">{activeSpot ? locName(activeSpot, lang, venueTypes) : tx("chooseSpotLater", lang)}</div>
          </div>
        </div>
        {activeSpot && <MinBar spent={spentSoFar + total} min={activeSpot.min} lang={lang} />}
        {tableMode && table && table.members && table.members.length > 0 && (
          <div className="tableband">
            <span className="tbicon">👥</span>
            <span>{tx("atTableWith", lang)} {table.members.map((m) => m.name || tx("guest", lang)).join(", ")}</span>
          </div>
        )}
      </div>

      {screen === "home" && (
        <>
          <div className="search">
            <span style={{ color: "var(--muted)" }}>⌕</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx("search", lang)} />
          </div>
          {results ? (
            <>
              <div className="h2">{results.length} ·</div>
              {results.map((it) => <ItemRow key={it.id} it={it} catKey={it.catKey} lang={lang} onOpen={openDetail} onAdd={addQuick} />)}
            </>
          ) : (
            <>
              <div className="h2">{tx("menu", lang)}</div>
              <div className="grid">
                {menu.map((c) => (
                  <div key={c.key} className="cat" onClick={() => { setActiveCat(c.key); setScreen("category"); }}>
                    <img src={imgUrl(c.img, CAT_IMG) || imgUrl(c.fallbackImg, IMG)} alt="" loading="lazy"
                      onError={(e) => {
                        const fb = imgUrl(c.fallbackImg, IMG);
                        if (fb && e.currentTarget.src !== fb) e.currentTarget.src = fb;   // try a real item photo
                        else e.currentTarget.style.visibility = "hidden";
                      }} />
                    <div className="ov" /><div className="nm">{c.label}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {screen === "category" && (
        <>
          <div className="chiprow" ref={chipRef}>
            <button className="chip" onClick={() => setScreen("home")}>‹ {tx("back", lang)}</button>
            {menu.map((c) => (
              <button key={c.key} className={"chip" + (c.key === activeCat ? " on" : "")}
                onClick={() => { setActiveCat(c.key); chipRef.current.scrollTo({ left: 0, behavior: "smooth" }); }}>
                {c.label}
              </button>
            ))}
          </div>
          {cat.groups
            ? cat.groups.map((g) => (
                <div key={g.name}>
                  <div className="grp">{g.name}</div>
                  {g.items.map((it) => <ItemRow key={it.id} it={it} catKey={cat.key} lang={lang} onOpen={openDetail} onAdd={addQuick} />)}
                </div>
              ))
            : cat.items.map((it) => <ItemRow key={it.id} it={it} catKey={cat.key} lang={lang} onOpen={openDetail} onAdd={addQuick} />)}
        </>
      )}

      {count > 0 && !cartOpen && !detail && !placed && (
        <button className="fab" onClick={() => setCartOpen(true)}>
          <span><span className="ct">{count}</span> &nbsp;{tx("cart", lang)}</span>
          <span>{money(total)} ›</span>
        </button>
      )}

      {/* ITEM DETAIL */}
      {detail && (
        <div className="scrim" onClick={() => setDetail(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <Thumb src={detail.img} name={detail.name} big />
            <div className="sbody">
              <h3>{detail.name}</h3>
              {detail.desc && <p className="d">{detail.desc}</p>}
              <div className="pr">{money(detail.price)}</div>

              <TagChips tags={detailTags} lang={lang} />

              {detailIngs.length > 0 && (<>
                <div className="tagsec">{tx("customize", lang)}</div>
                <div className="ings">
                  {detailIngs.map((ing) => {
                    const off = removed.includes(ing);
                    return (
                      <button key={ing} className={"ing" + (off ? " off" : "")}
                        onClick={() => setRemoved(off ? removed.filter((r) => r !== ing) : [...removed, ing])}>
                        {off ? "+ " : "− "}{ing}
                      </button>
                    );
                  })}
                </div>
              </>)}

              <textarea className="ta" rows={2} placeholder={tx("note", lang)} value={detailNote} onChange={(e) => setDetailNote(e.target.value)} />
              <div className="qrow">
                <button className="stp" onClick={() => setDetailQty(Math.max(1, detailQty - 1))}>−</button>
                <span className="qn">{detailQty}</span>
                <button className="stp" onClick={() => setDetailQty(detailQty + 1)}>+</button>
              </div>
              <button className="cta" onClick={addDetail}>{tx("add", lang)} · {money(detail.price * detailQty)}</button>
            </div>
          </div>
        </div>
      )}

      {/* CART */}
      {cartOpen && !checkout && (
        <div className="scrim" onClick={() => setCartOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="shead"><h3>{tx("cart", lang)}</h3><button className="x" onClick={() => setCartOpen(false)}>×</button></div>
            {cart.length === 0 ? (
              <div className="center">{tx("empty", lang)}</div>
            ) : (
              <>
                {cart.map((l) => (
                  <div className="cl" key={l.key}>
                    <button className="mini" onClick={() => dispatch({ type: "dec", key: l.key })}>−</button>
                    <span className="qn">{l.qty}</span>
                    <button className="mini" onClick={() => dispatch({ type: "inc", key: l.key })}>+</button>
                    <div className="nm">{l.name}{l.note && <small>{l.note}</small>}
                      <button className="rm" onClick={() => dispatch({ type: "remove", key: l.key })}>{tx("remove", lang)}</button>
                    </div>
                    <div className="pp">{money(l.price * l.qty)}</div>
                  </div>
                ))}
                <MinBarInCart spent={spentSoFar + total} min={activeSpot ? activeSpot.min : 0} lang={lang} />
                <div className="totrow"><span className="l">{tx("total", lang)}</span><span className="v">{money(total)}</span></div>
                <div className="sbody" style={{ paddingTop: 8 }}>
                  <button className="cta" onClick={() => setCheckout(true)}>{tx("checkout", lang)} ›</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* CHECKOUT */}
      {checkout && (
        <div className="scrim" onClick={() => !placing && setCheckout(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="shead"><h3>{tx("checkout", lang)}</h3><button className="x" onClick={() => !placing && setCheckout(false)}>×</button></div>
            {deliveryMode && (
              <div className="destpick">
                <div className="pmsec">{tx("whereDeliver", lang)}</div>
                {destination ? (
                  <div className="destchosen">
                    <span>{locIcon(destination, venueTypes)} {locName(destination, lang, venueTypes)}</span>
                    <button className="rm" onClick={() => { setDestination(null); setDestType(null); }}>{tx("changeSpot", lang)}</button>
                  </div>
                ) : !destType ? (
                  <div className="desttypes">
                    {Object.entries(venueTypes).map(([key, v]) => (
                      <button key={key} className="desttype" onClick={() => setDestType(key)}>{v.icon} {v.name[lang]}</button>
                    ))}
                  </div>
                ) : (
                  <div className="destnums">
                    <button className="rm" onClick={() => setDestType(null)}>‹ {tx("back", lang)}</button>
                    {Array.from({ length: venueTypes[destType].count }, (_, i) => (
                      <button key={i} className="numchip" onClick={() => { const l = parseLocation(venueTypes[destType].code + (i + 1), venueTypes); if (l) setDestination(l); }}>{i + 1}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="field"><input placeholder={tx("name", lang)} value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="field"><input placeholder={tx("note", lang)} value={orderNote} onChange={(e) => setOrderNote(e.target.value)} /></div>
            <div className="pmsec">{tx("payWith", lang)}</div>
            {[
              { k: "online", e: "💳", t: "pmOnline", s: "pmOnlineSub" },
              { k: "cash", e: "💵", t: "pmCash", s: "pmCashSub" },
              { k: "card_spot", e: "🧾", t: "pmCard", s: "pmCardSub" },
            ].map((m) => (
              <div key={m.k} className={"pm" + (method === m.k ? " on" : "")} onClick={() => setMethod(m.k)}>
                <span className="r" /><div><div className="t">{tx(m.t, lang)}</div><small>{tx(m.s, lang)}</small></div><span className="e">{m.e}</span>
              </div>
            ))}
            <div className="totrow"><span className="l">{tx("total", lang)}</span><span className="v">{money(total)}</span></div>
            <div className="sbody" style={{ paddingTop: 8 }}>
              <button className="cta dark" disabled={placing || (deliveryMode && !destination)} onClick={placeOrder}>
                {placing ? (<><span className="spin" /> {tx("placing", lang)}</>)
                  : (deliveryMode && !destination) ? tx("pickSpotFirst", lang)
                  : method === "online" ? (<>{tx("payNow", lang)} · {money(total)}</>)
                  : (<>{tx("placeOrder", lang)} · {money(total)}</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS */}
      {placed && (
        <div className="scrim">
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="success">
              <div className="tick">✓</div>
              <h3 className="serif" style={{ fontSize: 26, margin: 0 }}>{tx("done", lang)}</h3>
              <div style={{ color: "var(--muted)", marginTop: 6 }}>{tx("orderNo", lang)}</div>
              <div className="ono">{placed.id}</div>
              <p style={{ color: "var(--muted)", marginTop: 14, lineHeight: 1.5 }}>{tx("onWay", lang)}<br />{locName(loc, lang, venueTypes)}</p>
              <button className="cta" style={{ maxWidth: 280, margin: "22px auto 0" }} onClick={() => { setPlaced(null); setScreen("home"); }}>{tx("newOrder", lang)}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MinBarInCart({ spent, min, lang }) {
  if (!min) return null;
  return <div style={{ padding: "14px 20px 0" }}><MinBar spent={spent} min={min} lang={lang} /></div>;
}

function ItemRow({ it, catKey, lang, onOpen, onAdd }) {
  const tags = deriveTags(it, catKey);
  return (
    <div className={"row" + (it.soldOut ? " soldrow" : "")}>
      <div onClick={() => !it.soldOut && onOpen({ ...it, catKey })}><Thumb src={it.img} name={it.name} /></div>
      <div className="it" onClick={() => !it.soldOut && onOpen({ ...it, catKey })}>
        <h4>
          {it.name}
          {it.isNew && <span className="badge new">{tx("isNew", lang)}</span>}
          {it.soldOut && <span className="badge sold">{tx("sold", lang)}</span>}
          {tags.allergens.length > 0 && <span className="alle">{tags.allergens.slice(0, 4).map((a) => <span key={a}>{ALLERGENS[a].icon}</span>)}</span>}
        </h4>
        {it.desc && <p>{it.desc}</p>}
        <div className="pr">{money(it.price)}</div>
      </div>
      {!it.soldOut && <button className="addbtn" onClick={() => onAdd({ ...it, catKey })}>+</button>}
    </div>
  );
}

/* ===========================================================================
   STAFF BOARD  (?view=staff)
   =========================================================================== */
function Staff({ lang, venueTypes }) {
  const brand = useBrand();
  const [orders, setOrders] = useState([]);
  const [zone, setZone] = useState("all");
  const [loading, setLoading] = useState(true);
  async function load() { setOrders(await api.list()); setLoading(false); }
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, []);
  async function advance(o, status) { await api.update(o.id, status); setOrders((p) => p.map((x) => (x.id === o.id ? { ...x, status } : x))); }

  const labelFor = (o) => (venueTypes[o.spot_type] ? venueTypes[o.spot_type].name[lang] : o.spot_type) + " " + o.spot_num;
  const payLabel = (o) => o.payment_status === "paid" ? tx("payPaid", lang) : o.payment_method === "cash" ? tx("payCash", lang) : tx("payCard", lang);
  const zones = [...new Set(orders.map((o) => o.zone))].sort((a, b) => a - b);
  const shown = (zone === "all" ? orders : orders.filter((o) => o.zone === Number(zone))).filter((o) => o.status !== "done" && o.status !== "cancelled");

  return (
    <div className="wrap stwrap">
      <div className="hdr">
        <div className="brandrow">
          <div>{brand.hasLogo ? <img className="brandlogo" src={brand.logo} alt={brand.text} /> : <div className="brand">{brand.text}</div>}<div className="tag">{tx("board", lang)}</div></div>
          <button className="btn ghost" onClick={load}>↻ {tx("refresh", lang)}</button>
        </div>
      </div>
      <div className="stbar">
        <button className={"chip" + (zone === "all" ? " on" : "")} onClick={() => setZone("all")}>{tx("allZones", lang)}</button>
        {zones.map((z) => (
          <button key={z} className={"chip" + (String(z) === String(zone) ? " on" : "")} onClick={() => setZone(z)}>{tx("zone", lang)} {z}</button>
        ))}
      </div>
      {loading ? <div className="center">…</div> : shown.length === 0 ? (
        <div className="center"><div className="big">☀</div><div style={{ marginTop: 10 }}>{tx("noOrders", lang)}</div></div>
      ) : shown.map((o) => (
        <div className="ocard" key={o.id}>
          <div className="ohead">
            <span className="loc">{labelFor(o)}</span>
            <span className="pill zone">{tx("zone", lang)} {o.zone}</span>
            <span className={"pill " + o.status}>{tx(o.status === "new" ? "stNew" : o.status === "preparing" ? "stPrep" : "stServed", lang)}</span>
            <span className={"pill pay" + (o.payment_status === "paid" ? " paid" : "")}>{payLabel(o)}</span>
            <span className="tm">{new Date(o.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          {(o.items || []).map((l, i) => (
            <div className="oline" key={i}><span>{l.qty}× {l.name}{l.note && <small> — {l.note}</small>}</span><span>{money(Number(l.unitPrice) * l.qty)}</span></div>
          ))}
          {o.note && <div className="note">“{o.note}”{o.customer_name ? " — " + o.customer_name : ""}</div>}
          <div className="ofoot">
            <span className="t">{money(Number(o.total))}</span>
            {o.status === "new" && <button className="btn amber" onClick={() => advance(o, "preparing")}>{tx("start", lang)}</button>}
            {o.status === "preparing" && <button className="btn sea" onClick={() => advance(o, "served")}>{tx("serve", lang)}</button>}
            {o.status === "served" && <button className="btn ghost" onClick={() => advance(o, "done")}>✓</button>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ===========================================================================
   LINKS  (?view=links) — printable QR + URL for every spot, straight from VENUE
   =========================================================================== */
function Links({ lang, venueTypes }) {
  const brand = useBrand();
  const base = (typeof window !== "undefined" ? window.location.origin + window.location.pathname : "");
  const [copied, setCopied] = useState("");
  const qr = (url) => "https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=0&data=" + encodeURIComponent(url);
  async function copy(url) { try { await navigator.clipboard.writeText(url); setCopied(url); setTimeout(() => setCopied(""), 1200); } catch {} }

  return (
    <div className="wrap stwrap">
      <div className="hdr">
        <div className="brandrow">
          <div>{brand.hasLogo ? <img className="brandlogo" src={brand.logo} alt={brand.text} /> : <div className="brand">{brand.text}</div>}<div className="tag">{tx("linksTitle", lang)}</div></div>
        </div>
      </div>
      <div className="lkhead" style={{ color: "var(--muted)", fontSize: 13 }}>{tx("linksSub", lang)} · {base || "your-domain.com"}</div>
      {Object.entries(venueTypes).map(([key, t]) => (
        <div key={key}>
          <div className="lkgrp">{t.icon} {t.name[lang]} · {t.count}{t.min ? ` · min ${money(t.min)}` : ""}</div>
          {Array.from({ length: t.count }, (_, i) => {
            const code = t.code + (i + 1);
            const url = base + "?loc=" + code;
            return (
              <div className="lk" key={code}>
                <img src={qr(url)} alt={code} loading="lazy" />
                <div className="u"><b>{t.name[lang]} {i + 1}</b><span>{url}</span></div>
                <button className="btn ghost" onClick={() => copy(url)}>{copied === url ? tx("copied", lang) : tx("copy", lang)}</button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ===========================================================================
   LOGIN — phone → OTP (SMS / WhatsApp). Token stored client-side (bearer).
   =========================================================================== */
function LoginSheet({ lang, onClose, onLoggedIn }) {
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState("sms");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [hint, setHint] = useState("");

  async function send() {
    if (!phone.trim() || busy) return;
    setErr(""); setBusy(true);
    try {
      const r = await api.authStart(phone.trim(), channel);
      setStep("code");
      if (r.devCode) setHint(`Dev code: ${r.devCode}`);   // mock provider only
    } catch (e) { setErr(e.message || "failed"); } finally { setBusy(false); }
  }
  async function verify() {
    if (!code.trim() || busy) return;
    setErr(""); setBusy(true);
    try { onLoggedIn(await api.authVerify(phone.trim(), code.trim())); }
    catch (e) { setErr(e.message === "invalid_code" ? "Wrong code" : (e.message || "failed")); }
    finally { setBusy(false); }
  }

  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet loginsheet" onClick={(e) => e.stopPropagation()}>
        <div className="sbody">
          <div className="lh">{tx("loginTitle", lang)}</div>
          {step === "phone" ? (
            <>
              <div className="seg">
                <button className={"segb" + (channel === "sms" ? " on" : "")} onClick={() => setChannel("sms")}>{tx("viaSms", lang)}</button>
                <button className={"segb" + (channel === "whatsapp" ? " on" : "")} onClick={() => setChannel("whatsapp")}>{tx("viaWa", lang)}</button>
              </div>
              <label className="lf"><span>{tx("phoneLabel", lang)}</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xx xxx xx xx" inputMode="tel"
                  onKeyDown={(e) => { if (e.key === "Enter") send(); }} autoFocus /></label>
              {err && <div className="lerr">⚠ {err}</div>}
              <button className="cta" disabled={busy || !phone.trim()} onClick={send}>{busy ? tx("sending", lang) : tx("sendCode", lang)}</button>
            </>
          ) : (
            <>
              <label className="lf"><span>{tx("codeLabel", lang)}</span>
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="••••••" inputMode="numeric"
                  onKeyDown={(e) => { if (e.key === "Enter") verify(); }} autoFocus /></label>
              {hint && <div className="lhint">{hint}</div>}
              {err && <div className="lerr">⚠ {err}</div>}
              <button className="cta" disabled={busy || !code.trim()} onClick={verify}>{busy ? tx("sending", lang) : tx("verify", lang)}</button>
              <button className="llink" onClick={() => { setStep("phone"); setCode(""); setHint(""); setErr(""); }}>‹ {tx("resend", lang)}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AccountControl({ account, lang, onLoggedIn, onLogout }) {
  const [showLogin, setShowLogin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  if (!account) {
    return (
      <>
        <button className="acctbtn" onClick={() => setShowLogin(true)}><span className="dot" />{tx("login", lang)}</button>
        {showLogin && <LoginSheet lang={lang} onClose={() => setShowLogin(false)} onLoggedIn={(a) => { setShowLogin(false); onLoggedIn(a); }} />}
      </>
    );
  }
  return (
    <div className="acctwrap">
      <button className="acctbtn" onClick={() => setMenuOpen((o) => !o)}><span className="dot" />{account.name || account.phone}</button>
      {menuOpen && (
        <div className="acctmenu" onMouseLeave={() => setMenuOpen(false)}>
          <div className="row"><span>{tx("wallet", lang)}</span><b>{money(account.walletBalance || 0)}</b></div>
          <div className="row"><span>{tx("points", lang)}</span><b>{account.pointsBalance || 0}</b></div>
          <div className="row"><span>{account.tier}</span><b>#{account.visitCount || 0}</b></div>
          <button className="lo" onClick={() => { setMenuOpen(false); onLogout(); }}>{tx("logout", lang)}</button>
        </div>
      )}
    </div>
  );
}

/* ===========================================================================
   ROOT
   =========================================================================== */
export default function App() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const view = params.get("view");
  const [lang, setLang] = useState(["tr", "en", "ru"].includes(params.get("lng")) ? params.get("lng") : "en");

  // Fetch the live menu + spot config once, here, so every view (guest, staff,
  // links, spot picker) shares it. Silently keeps fallbacks if the API is down.
  const [rawMenu, setRawMenu] = useState(null);
  useEffect(() => {
    let on = true;
    api.menu().then((d) => { if (on) setRawMenu(d); }).catch(() => {});
    return () => { on = false; };
  }, []);
  const venueTypes = useMemo(() => buildVenueTypes(rawMenu) || FALLBACK_VENUE.types, [rawMenu]);

  // Keep the raw ?loc= code; resolve it against spot types (which may arrive
  // after the API loads) so an out-of-range spot re-validates once live counts land.
  const [locCode, setLocCode] = useState(() => params.get("loc"));
  const loc = useMemo(() => parseLocation(locCode, venueTypes), [locCode, venueTypes]);

  function choose(code) {
    if (!parseLocation(code, venueTypes)) return;
    try { const u = new URL(window.location.href); u.searchParams.set("loc", code); window.history.replaceState({}, "", u); } catch { /* ignore */ }
    setLocCode(code);
  }

  // Customer session: restore from a stored token on load. Guests must verify
  // their phone (OTP) BEFORE choosing a table/sunbed — so the guest flow is
  // gated on `account` below. If there's no stored token we already know the
  // answer; otherwise wait for /me to resolve before deciding.
  const [account, setAccount] = useState(null);
  const [authReady, setAuthReady] = useState(() => !tokenStore.get());
  useEffect(() => { api.me().then((a) => { if (a) setAccount(a); setAuthReady(true); }); }, []);
  const acct = { account, onLoggedIn: setAccount, onLogout: async () => { await api.logout(); setAccount(null); } };

  // Per-venue branding + ordering mode (from the menu API).
  const venueMeta = rawMenu?.venue || {};
  const branding = venueMeta.branding || {};
  const brand = { text: branding.brandText || venueMeta.name || "SunDaze", logo: branding.logo || logoUrl, hasLogo: !!branding.logo, tagline: branding.tagline || null };
  const orderMode = venueMeta.orderMode || "anonymous";
  const deliveryMode = orderMode === "account_delivery";
  const tableMode = orderMode === "account_table";
  const needsLogin = orderMode.startsWith("account");   // anonymous venues skip the login gate
  const loading = <div className="wrap lscreen"><img className="lslogo" src={brand.logo} alt={brand.text} style={{ marginTop: "32vh" }} /></div>;

  return (
    <div className="sd">
      <style>{STYLE}</style>
      {(branding.colors || branding.fonts || branding.fontImport) && <style>{themeCss(branding)}</style>}
      <BrandContext.Provider value={brand}>
        {view === "staff" ? <Staff lang={lang} venueTypes={venueTypes} />
          : view === "links" ? <Links lang={lang} venueTypes={venueTypes} />
          : !rawMenu ? loading
          : needsLogin && !authReady ? loading
          : needsLogin && !account ? <LoginScreen lang={lang} setLang={setLang} onLoggedIn={setAccount} />
          : (loc || deliveryMode) ? <Guest loc={loc} deliveryMode={deliveryMode} tableMode={tableMode} lang={lang} setLang={setLang} venueTypes={venueTypes} rawMenu={rawMenu} acct={acct} />
          : <SpotPicker lang={lang} setLang={setLang} onPick={choose} venueTypes={venueTypes} acct={acct} />}
      </BrandContext.Provider>
    </div>
  );
}

/* ===========================================================================
   LOGIN SCREEN — full-page phone → OTP, shown before the table/sunbed picker.
   Same auth API as LoginSheet; just a calmer, brand-forward presentation.
   =========================================================================== */
function LoginScreen({ lang, setLang, onLoggedIn }) {
  const brand = useBrand();
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState("sms");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [hint, setHint] = useState("");

  async function send() {
    if (!phone.trim() || busy) return;
    setErr(""); setBusy(true);
    try {
      const r = await api.authStart(phone.trim(), channel);
      setStep("code"); setCode("");
      if (r.devCode) setHint(`Dev code: ${r.devCode}`);   // mock provider only
    } catch (e) { setErr(e.message || "failed"); } finally { setBusy(false); }
  }
  async function verify(v) {
    const c = (v ?? code).trim();
    if (!c || busy) return;
    setErr(""); setBusy(true);
    try { onLoggedIn(await api.authVerify(phone.trim(), c)); }
    catch (e) { setErr(e.message === "invalid_code" ? "Wrong code" : (e.message || "failed")); }
    finally { setBusy(false); }
  }

  return (
    <div className="wrap lscreen">
      <div className="langs">
        {Object.keys(LANGS).map((l) => (
          <button key={l} className={"lang" + (l === lang ? " on" : "")} onClick={() => setLang(l)}>{LANGS[l]}</button>
        ))}
      </div>

      <img className="lslogo" src={brand.logo} alt={brand.text} />
      <div className="lswelcome">{tx("welcome", lang)}</div>
      <div className="lssub">{tx("loginSub", lang)}</div>

      <div className="lscard">
        {step === "phone" ? (
          <>
            <div className="seg">
              <button className={"segb" + (channel === "sms" ? " on" : "")} onClick={() => setChannel("sms")}>{tx("viaSms", lang)}</button>
              <button className={"segb" + (channel === "whatsapp" ? " on" : "")} onClick={() => setChannel("whatsapp")}>{tx("viaWa", lang)}</button>
            </div>
            <label className="lf"><span>{tx("phoneLabel", lang)}</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xx xxx xx xx" inputMode="tel"
                onKeyDown={(e) => { if (e.key === "Enter") send(); }} autoFocus /></label>
            {err && <div className="lerr">⚠ {err}</div>}
            <button className="cta" disabled={busy || !phone.trim()} onClick={send}>
              {busy ? (<><span className="spin" /> {tx("sending", lang)}</>) : tx("sendCode", lang)}
            </button>
          </>
        ) : (
          <>
            <p className="lssent">{tx("codeSentTo", lang)}<br /><b>{phone.trim()}</b></p>
            <label className="lf"><span>{tx("codeLabel", lang)}</span>
              <input className="otpin" value={code} maxLength={6} inputMode="numeric" autoComplete="one-time-code"
                placeholder="••••••"
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setCode(v);
                  if (v.length === 6) verify(v);   // auto-submit on the 6th digit
                }}
                onKeyDown={(e) => { if (e.key === "Enter") verify(); }} autoFocus /></label>
            {hint && <div className="lhint" style={{ textAlign: "center" }}>{hint}</div>}
            {err && <div className="lerr" style={{ textAlign: "center" }}>⚠ {err}</div>}
            <button className="cta" disabled={busy || !code.trim()} onClick={() => verify()}>
              {busy ? (<><span className="spin" /> {tx("sending", lang)}</>) : tx("verify", lang)}
            </button>
            <button className="llink" onClick={send} disabled={busy}>{tx("resend", lang)}</button>
            <button className="llink" style={{ marginTop: 4 }} onClick={() => { setStep("phone"); setCode(""); setHint(""); setErr(""); }}>‹ {tx("changeNum", lang)}</button>
          </>
        )}
      </div>

      <div className="lsfoot">The Celebration of Life Society</div>
    </div>
  );
}

/* ===========================================================================
   SPOT PICKER — shown when there's no ?loc=. Choose type → number → menu.
   =========================================================================== */
function SpotPicker({ lang, setLang, onPick, venueTypes, acct }) {
  const brand = useBrand();
  const [type, setType] = useState(null);
  const t = type ? venueTypes[type] : null;

  return (
    <div className="wrap">
      <div className="hdr">
        <div className="brandrow">
          <div>{brand.hasLogo ? <img className="brandlogo" src={brand.logo} alt={brand.text} /> : <div className="brand">{brand.text}</div>}<div className="tag">{tx("tagline", lang)}</div></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
            {acct && <AccountControl {...acct} lang={lang} />}
            <div className="langs">
              {Object.keys(LANGS).map((l) => (
                <button key={l} className={"lang" + (l === lang ? " on" : "")} onClick={() => setLang(l)}>{LANGS[l]}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {!type ? (
        <div className="pick">
          <div className="pickh">{tx("whereSit", lang)}</div>
          <div className="typegrid">
            {Object.entries(venueTypes).map(([key, v]) => (
              <button key={key} className="typecard" onClick={() => setType(key)}>
                <span className="tcic">{v.icon}</span>
                <span className="tcname">{v.name[lang]}</span>
                <span className="tcarrow">›</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="pick">
          <button className="chip" style={{ marginBottom: 14 }} onClick={() => setType(null)}>‹ {tx("back", lang)}</button>
          <div className="pickh">{t.icon} {t.name[lang]} — {tx("pickNumber", lang)}</div>
          <div className="numgrid">
            {Array.from({ length: t.count }, (_, i) => (
              <button key={i} className="numchip" onClick={() => onPick(t.code + (i + 1))}>{i + 1}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
