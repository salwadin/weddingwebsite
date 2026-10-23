// Photography used across Qubool's own pages (Unsplash, free license).
// A deliberately varied mix of cultures, faiths, couples and celebration styles.
const u = (id: string, w = 1200) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80`;

export const SITE_PHOTOS = {
  chineseCouple: u("1596744743105-b1e229d13036"),
  westAfricanCouple: u("1661332306744-70f9ed1a7f40"),
  malayCouple: u("1692899189376-c9f179f9dc49"),
  beachCouple: u("1606495186270-395860907235"),
  gardenCeremony: u("1758810411905-04fb6f9396e1"),
  floralAisle: u("1791810182741-0647d2338534"),
  floralCouple: u("1718997534125-052b2ff48cd0"),
  gardenCouple: u("1780291366449-8e11bc4ed679"),
  receptionTable: u("1536392706976-e486e2ba97af"),
  toast: u("1527529482837-4698179dc6ce"),
  southAsianCeremony: u("1754782915842-aa4fca6c203a"),
} as const;

/** The cover photo a brand-new wedding website starts with (suits any tradition). */
