/**
 * PHOTOS FOR THE SAMPLE DISHES, saved in public/images/menu/.
 * From Wikimedia Commons (and one from Flickr, found via Openverse), all
 * under free licences (CC0, CC BY, CC BY-SA),
 * which allow reuse WITH credit: the author and licence of each one are
 * listed here and shown on the Menu page ("Photo credits").
 * Dishes added in the app have no photo; their card shows initials instead.
 *
 * Generated from the download record; see public/images/menu/CREDITS.md.
 */
export type MenuPhoto = {
  src: string;
  author: string;
  licence: string;
  /** The photo's page on Wikimedia Commons (title, author, licence text). */
  source: string;
};

export const MENU_PHOTOS: Record<string, MenuPhoto> = {
  "item-paneer-tikka": {
    src: "/images/menu/paneer-tikka.jpg",
    author: "Sonja Pauen -Stanhopea",
    licence: "CC BY 2.0 de",
    source:
      "https://commons.wikimedia.org/wiki/File:Panir_Tikka_Indian_cheese_grilled.jpg",
  },
  "item-chicken-tikka": {
    src: "/images/menu/chicken-tikka.jpg",
    author: "Satdeep Gill",
    licence: "CC BY-SA 4.0",
    source:
      "https://commons.wikimedia.org/wiki/File:Chicken_tikka_in_Araku_Valley,_Andhra_Pradesh_01.jpg",
  },
  "item-hara-bhara": {
    src: "/images/menu/hara-bhara.jpg",
    author: "Milanography",
    licence: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Hara_bhara_kabab.JPG",
  },
  "item-crispy-corn": {
    src: "/images/menu/crispy-corn.jpg",
    author: "Dikshita Bairagi",
    licence: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Crispy_chilli_baby_corn.....jpg",
  },
  "item-fish-amritsari": {
    src: "/images/menu/fish-amritsari.jpg",
    author: "Biswarup Ganguly",
    licence: "CC BY 3.0",
    source:
      "https://commons.wikimedia.org/wiki/File:Bhetki_Amritsari_-_Kolkata_2015-07-18_9814.JPG",
  },
  "item-butter-chicken": {
    src: "/images/menu/butter-chicken.jpg",
    author: "stu_spivack",
    licence: "CC BY-SA 2.0",
    source: "https://commons.wikimedia.org/wiki/File:Chicken_makhani.jpg",
  },
  "item-dal-makhani": {
    src: "/images/menu/dal-makhani.jpg",
    author: "Miansari66",
    licence: "CC0",
    source: "https://commons.wikimedia.org/wiki/File:Dal_Makhani..JPG",
  },
  "item-paneer-butter-masala": {
    src: "/images/menu/paneer-butter-masala.jpg",
    author: "Gannu03",
    licence: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Paneer_butter_masala_3.jpg",
  },
  "item-rogan-josh": {
    src: "/images/menu/rogan-josh.jpg",
    author: "stu_spivack",
    licence: "CC BY-SA 2.0",
    source: "https://commons.wikimedia.org/wiki/File:Mutton_rogan_josh.jpg",
  },
  "item-kadai-veg": {
    src: "/images/menu/kadai-veg.jpg",
    author: "Dolon Prova",
    licence: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Mixed_vegetable_curry_2.jpg",
  },
  "item-butter-naan": {
    src: "/images/menu/butter-naan.jpg",
    author: "Ravi Dwivedi",
    licence: "CC BY-SA 4.0",
    source:
      "https://commons.wikimedia.org/wiki/File:Butter_Naan_Flatbread_from_North_India.jpg",
  },
  "item-garlic-naan": {
    src: "/images/menu/garlic-naan.jpg",
    author: "Joy",
    licence: "CC BY 2.0",
    source: "https://commons.wikimedia.org/wiki/File:Garlic_naan_1.jpg",
  },
  "item-tandoori-roti": {
    src: "/images/menu/tandoori-roti.jpg",
    author: "Ravi Dwivedi",
    licence: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Tandoori-roti.jpg",
  },
  "item-laccha-paratha": {
    src: "/images/menu/laccha-paratha.jpg",
    author: "Sonia Goyal",
    licence: "CC BY-SA 2.0",
    source: "https://commons.wikimedia.org/wiki/File:Lachha-paratha.jpg",
  },
  "item-veg-biryani": {
    src: "/images/menu/veg-biryani.jpg",
    author: "Phadke09",
    licence: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Vegetable_Biryani_IMG_001.jpg",
  },
  "item-chicken-biryani": {
    src: "/images/menu/chicken-biryani.jpg",
    author: "Shivani shipra",
    licence: "CC BY-SA 4.0",
    source:
      "https://commons.wikimedia.org/wiki/File:Chicken_biryani_02-06-2015_(India).jpg",
  },
  "item-jeera-rice": {
    src: "/images/menu/jeera-rice.jpg",
    author: "Marajozkee",
    licence: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Jeera_rice.jpg",
  },
  "item-sweet-lassi": {
    src: "/images/menu/sweet-lassi.jpg",
    author: "Ravi Dwivedi",
    licence: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Lassi_with_malai_and_barfi.jpg",
  },
  "item-masala-chaas": {
    src: "/images/menu/masala-chaas.jpg",
    author: "Amarnujju",
    licence: "CC BY 3.0",
    source: "https://commons.wikimedia.org/wiki/File:Masala_Buttermilk.JPG",
  },
  "item-lime-soda": {
    src: "/images/menu/lime-soda.jpg",
    author: "Vyacheslav Argenberg",
    licence: "CC BY 4.0",
    source:
      "https://commons.wikimedia.org/wiki/File:Koh_Mak,_Thailand,_Lime_juice_with_ice,_Lemonade,_Limeade.jpg",
  },
  "item-cold-coffee": {
    src: "/images/menu/cold-coffee.jpg",
    author: "Tony Webster",
    licence: "CC BY 2.0",
    source:
      "https://commons.wikimedia.org/wiki/File:Iced_Coffee_in_Glass_-_Sunshine_Coffee_-_Laramie_Cafe_(53838344552).jpg",
  },
  "item-gulab-jamun": {
    src: "/images/menu/gulab-jamun.jpg",
    author: "Suyash.dwivedi",
    licence: "CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Two_Gulab_Jamun_in_a_plate_01.jpg",
  },
  "item-rasmalai": {
    src: "/images/menu/rasmalai.jpg",
    author: "Secretlondon",
    licence: "CC BY-SA 3.0",
    source: "https://commons.wikimedia.org/wiki/File:Rasmalai_Secretlondon_09.jpg",
  },
  "item-brownie": {
    src: "/images/menu/brownie.jpg",
    author: "Ruth and Dave",
    licence: "CC BY 2.0",
    source: "https://www.flickr.com/photos/95142644@N00/43710445200",
  },
};
