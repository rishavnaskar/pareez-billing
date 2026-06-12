/* eslint-disable @typescript-eslint/no-require-imports */
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const SERVICES = [
  // ── Men's ──────────────────────────────────────────────────────────────────
  { name: "Formal Hair Cut (With Hair Wash & Conditioner)", category: "Hair Cut", section: "Men's", price: 200 },
  { name: "Clean Shaving", category: "Shaving, Trim & Style", section: "Men's", price: 100 },
  { name: "Beard Trimming & Style", category: "Shaving, Trim & Style", section: "Men's", price: 150 },
  { name: "Hair Smoothening", category: "Hair Style", section: "Men's", price: 2500 },
  { name: "Keratin Treatment", category: "Hair Style", section: "Men's", price: 2500 },
  { name: "Botox Treatment", category: "Hair Style", section: "Men's", price: 2500 },
  { name: "Hair Color Without Ammonia", category: "Hair Color", section: "Men's", price: 1000 },
  { name: "Hair Color With Ammonia", category: "Hair Color", section: "Men's", price: 800 },
  { name: "Highlight With Cap", category: "Hair Color", section: "Men's", price: 800 },
  { name: "Beard Color", category: "Hair Color", section: "Men's", price: 300 },
  { name: "Hair Oil Massage", category: "Hair Spa & Treatments", section: "Men's", price: 400 },
  { name: "Lo'Real Hair Spa", category: "Hair Spa & Treatments", section: "Men's", price: 600 },
  { name: "Moroccan Hair Spa", category: "Hair Spa & Treatments", section: "Men's", price: 1200 },
  { name: "Keratin Hair Spa", category: "Hair Spa & Treatments", section: "Men's", price: 1000 },
  { name: "Dandruff Treatment", category: "Hair Spa & Treatments", section: "Men's", price: 700 },

  // ── Women's ────────────────────────────────────────────────────────────────
  { name: "Hair Makeover (With Wash, Conditioner & Blowdry)", category: "Hair Cut, Style & Treatments", section: "Women's", price: 400 },
  { name: "Advanced Hair Makeover (With Wash, Conditioner & Blowdry)", category: "Hair Cut, Style & Treatments", section: "Women's", price: 500 },
  { name: "Hair Wash With Blowdry", category: "Hair Cut, Style & Treatments", section: "Women's", price: 300 },
  { name: "Keratin Wash With Blowdry", category: "Hair Cut, Style & Treatments", section: "Women's", price: 500 },
  { name: "Ironing", category: "Hair Cut, Style & Treatments", section: "Women's", price: 800 },
  { name: "Hair Straightening/Smoothening", category: "Hair Cut, Style & Treatments", section: "Women's", price: 4000 },
  { name: "Keratin Treatment", category: "Hair Cut, Style & Treatments", section: "Women's", price: 4000 },
  { name: "Botox Treatment", category: "Hair Cut, Style & Treatments", section: "Women's", price: 6000 },
  { name: "Nanoplastia Treatment", category: "Hair Cut, Style & Treatments", section: "Women's", price: 7000 },
  { name: "Global Hair Color", category: "Hair Color", section: "Women's", price: 2000 },
  { name: "Balayage/Ombre Hair Color", category: "Hair Color", section: "Women's", price: 6000 },
  { name: "Hair Root Touch-Up", category: "Hair Color", section: "Women's", price: 1200 },
  { name: "Non-Ammonia Hair Color", category: "Hair Color", section: "Women's", price: 1500 },
  { name: "Highlight Per Streak", category: "Hair Color", section: "Women's", price: 250 },
  { name: "Hair Oil Massage", category: "Hair Spa & Treatments", section: "Women's", price: 500 },
  { name: "Lo'Real Hair Spa", category: "Hair Spa & Treatments", section: "Women's", price: 800 },
  { name: "Moroccan Hair Spa", category: "Hair Spa & Treatments", section: "Women's", price: 1800 },
  { name: "Keratin Hair Spa", category: "Hair Spa & Treatments", section: "Women's", price: 1500 },
  { name: "Anti-Dandruff Treatment", category: "Hair Spa & Treatments", section: "Women's", price: 1000 },
  { name: "Olaplex Treatment", category: "Hair Spa & Treatments", section: "Women's", price: 2500 },
  { name: "Party Make-Up Foundation Base (Face Hair)", category: "Make-Up", section: "Women's", price: 1800 },
  { name: "Premium Party Make-Up (Face - Hair - Saree)", category: "Make-Up", section: "Women's", price: 2500 },
  { name: "Royal Party Make-Up", category: "Make-Up", section: "Women's", price: 3500 },
  { name: "Bridal Make-Up Basic", category: "Make-Up", section: "Women's", price: 8000 },
  { name: "Bridal Make-Up Royal", category: "Make-Up", section: "Women's", price: 12000 },
  { name: "Groom Make-Up", category: "Make-Up", section: "Women's", price: 1500 },
  { name: "Hair Styling", category: "Make-Up", section: "Women's", price: 800 },
  { name: "Face Make-Up", category: "Make-Up", section: "Women's", price: 1200 },
  { name: "Saree Draping", category: "Make-Up", section: "Women's", price: 300 },
  { name: "Basic Pre-Bridal Package", category: "Pre-Bridal Package", section: "Women's", price: 4500 },
  { name: "Premium Pre-Bridal Package", category: "Pre-Bridal Package", section: "Women's", price: 8000 },
  { name: "Pre-Groom Package", category: "Pre-Groom Package", section: "Women's", price: 4999 },
  { name: "Full Hand With Underarms (Normal Wax)", category: "Normal Waxing", section: "Women's", price: 400 },
  { name: "Full Legs (Normal Wax)", category: "Normal Waxing", section: "Women's", price: 700 },
  { name: "Half Legs (Normal Wax)", category: "Normal Waxing", section: "Women's", price: 450 },
  { name: "Under-Arms (Normal Wax)", category: "Normal Waxing", section: "Women's", price: 100 },
  { name: "Full Body Waxing (Normal Wax)", category: "Normal Waxing", section: "Women's", price: 1800 },
  { name: "Full Face Waxing (Normal Wax)", category: "Normal Waxing", section: "Women's", price: 350 },
  { name: "Full Back (Normal Wax)", category: "Normal Waxing", section: "Women's", price: 600 },
  { name: "Half Back (Normal Wax)", category: "Normal Waxing", section: "Women's", price: 400 },
  { name: "Full Hand (Roll-On Wax)", category: "Roll-On Wax", section: "Women's", price: 700 },
  { name: "Half Hand (Roll-On Wax)", category: "Roll-On Wax", section: "Women's", price: 500 },
  { name: "Full Legs (Roll-On Wax)", category: "Roll-On Wax", section: "Women's", price: 1100 },
  { name: "Half Legs (Roll-On Wax)", category: "Roll-On Wax", section: "Women's", price: 700 },
  { name: "Full Hands With Underarms (Lipo Wax)", category: "Lipo Wax", section: "Women's", price: 650 },
  { name: "Full Legs (Lipo Wax)", category: "Lipo Wax", section: "Women's", price: 1000 },
  { name: "Half Legs (Lipo Wax)", category: "Lipo Wax", section: "Women's", price: 700 },
  { name: "Underarms (Lipo Wax)", category: "Lipo Wax", section: "Women's", price: 200 },
  { name: "Face Waxing (Lipo Wax)", category: "Lipo Wax", section: "Women's", price: 700 },
  { name: "Full Back (Lipo Wax)", category: "Lipo Wax", section: "Women's", price: 800 },
  { name: "Half Back (Lipo Wax)", category: "Lipo Wax", section: "Women's", price: 600 },
  { name: "Full Body Waxing (Lipo Wax)", category: "Lipo Wax", section: "Women's", price: 2500 },
  { name: "Brazillian B-Wax", category: "Lipo Wax", section: "Women's", price: 1000 },
  { name: "Eyebrows (Threading)", category: "Threading", section: "Women's", price: 40 },
  { name: "Upper Lip (Threading)", category: "Threading", section: "Women's", price: 30 },
  { name: "Forehead (Threading)", category: "Threading", section: "Women's", price: 30 },
  { name: "Chin (Threading)", category: "Threading", section: "Women's", price: 30 },
  { name: "Full Face Threading With Eyebrows", category: "Threading", section: "Women's", price: 250 },

  // ── Unisex ─────────────────────────────────────────────────────────────────
  { name: "Basic De-Tan", category: "De-Tan", section: "Unisex", price: 500 },
  { name: "Raaga De-Tan", category: "De-Tan", section: "Unisex", price: 600 },
  { name: "O3+ De-Tan", category: "De-Tan", section: "Unisex", price: 700 },
  { name: "Face Massage", category: "De-Tan", section: "Unisex", price: 500 },
  { name: "Nose Exfoliating", category: "De-Tan", section: "Unisex", price: 300 },
  { name: "Lotus Clean-Up", category: "Clean-Up", section: "Unisex", price: 700 },
  { name: "O3 Clean-Up", category: "Clean-Up", section: "Unisex", price: 1000 },
  { name: "Korean Facial", category: "Korean Facial", section: "Unisex", price: 1500 },
  { name: "O3+ Korean Glass Facial", category: "Korean Facial", section: "Unisex", price: 3500 },
  { name: "Kanpeki Facial", category: "Facial Treatments", section: "Unisex", price: 800 },
  { name: "Lotus Professional Facial", category: "Facial Treatments", section: "Unisex", price: 1000 },
  { name: "Lotus Instafair Facial", category: "Facial Treatments", section: "Unisex", price: 1800 },
  { name: "Lotus Goldsheen Facial", category: "Facial Treatments", section: "Unisex", price: 2400 },
  { name: "Lotus Acne Treatment", category: "Facial Treatments", section: "Unisex", price: 1600 },
  { name: "O3+ Brightening Facial", category: "Facial Treatments", section: "Unisex", price: 1800 },
  { name: "Lotus Retinol", category: "Advanced Facials", section: "Unisex", price: 3000 },
  { name: "Fruitsu", category: "Advanced Facials", section: "Unisex", price: 3500 },
  { name: "O3+ Agelock", category: "Advanced Facials", section: "Unisex", price: 4000 },
  { name: "Hydra Facial", category: "Hydra Facial", section: "Unisex", price: 3000 },
  { name: "Hydra Facial With O3+", category: "Hydra Facial", section: "Unisex", price: 4000 },
  { name: "Hydra Facial With Agelock", category: "Hydra Facial", section: "Unisex", price: 5000 },
  { name: "Basic Pedicure", category: "Pedicure", section: "Unisex", price: 600 },
  { name: "Luxury Pedicure", category: "Pedicure", section: "Unisex", price: 700 },
  { name: "Crystal Pedicure", category: "Pedicure", section: "Unisex", price: 800 },
  { name: "De-Tan Pedicure", category: "Pedicure", section: "Unisex", price: 1000 },
  { name: "Bombini Pedicure", category: "Pedicure", section: "Unisex", price: 1200 },
  { name: "Foot Massage", category: "Pedicure", section: "Unisex", price: 500 },
  { name: "Foot De-Tan", category: "Pedicure", section: "Unisex", price: 250 },
  { name: "Alga Pedicure", category: "Pedicure", section: "Unisex", price: 1500 },
  { name: "Basic Manicure", category: "Manicure", section: "Unisex", price: 500 },
  { name: "Luxury Manicure", category: "Manicure", section: "Unisex", price: 600 },
  { name: "Crystal Manicure", category: "Manicure", section: "Unisex", price: 900 },
  { name: "Bombini Manicure", category: "Manicure", section: "Unisex", price: 1000 },
  { name: "Nail File/Nail Polish", category: "Manicure", section: "Unisex", price: 100 },
  { name: "Body Massage With Aroma Oil (45 min)", category: "Bodycare", section: "Unisex", price: 1200 },
  { name: "Body Massage With Herbal Cream (45 min)", category: "Bodycare", section: "Unisex", price: 1500 },
  { name: "Full Body Polishing", category: "Bodycare", section: "Unisex", price: 6000 },
  { name: "Full Hand Polishing", category: "Bodycare", section: "Unisex", price: 1500 },
  { name: "Full Back Polishing With De-Tan", category: "Bodycare", section: "Unisex", price: 1200 },
];

async function seed() {
  const col = db.collection('products');
  const now = admin.firestore.FieldValue.serverTimestamp();
  const batch = db.batch();

  for (const s of SERVICES) {
    const ref = col.doc();
    batch.set(ref, { ...s, active: true, createdAt: now, updatedAt: now });
  }

  await batch.commit();
  console.log(`Seeded ${SERVICES.length} services to Firestore.`);
}

seed().catch((err) => { console.error(err); process.exit(1); });
