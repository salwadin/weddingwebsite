// Shared labels for the vendor marketplace (safe to import from client components).
export const CATEGORIES = ["Venue", "Catering", "Photography", "Videography", "Bridal wear", "Menswear", "Makeup", "Henna", "Decor", "Florist", "Officiant", "Entertainment", "Desserts", "Invitations", "Planner", "Jewelry", "Transportation", "Other"];

export const VENDOR_TAGS: Record<string, string> = {
  halal_certified: "Halal certified",
  female_team: "Female team available",
  modest_friendly: "Modest-friendly",
  modest_fashion: "Modest fashion",
  alcohol_free: "Alcohol-free venue",
  prayer_room: "Prayer room",
  gender_partitions: "Separate sections",
  multi_day: "Multi-day weddings",
  multilingual: "Multilingual",
  custom_made: "Made to order",
  group_orders: "Group / family orders",
  hijab_styling: "Hijab styling",
  virtual_consults: "Virtual consultations",
  large_events: "500+ guests",
  floor_plans: "Floor plans included",
  premarital: "Premarital sessions",
  organic: "Organic products",
};

export const TRADITION_LABELS: Record<string, string> = {
  south_asian: "South Asian", arab: "Arab", persian: "Persian", turkish: "Turkish",
  west_african: "West African", somali: "Somali", east_african: "East African",
};

export const TIER_RANK = { spotlight: 0, featured: 1, basic: 2 } as const;
export const price = (n: number) => "$".repeat(n);
