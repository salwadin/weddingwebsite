import type { BoardItem } from "./types";

export const BOARD_W = 1400;
export const BOARD_H = 900;

export const TEMPLATES: { value: string; label: string; kind: "moodboard" | "floorplan"; description: string }[] = [
  { value: "blank_mood", label: "Blank moodboard", kind: "moodboard", description: "Collect photos, colors and notes." },
  { value: "palette_mood", label: "Palette starter", kind: "moodboard", description: "A title, four color swatches and a note to start from." },
  { value: "blank_plan", label: "Blank floor plan", kind: "floorplan", description: "An empty room to lay out yourself." },
  { value: "banquet", label: "Banquet hall", kind: "floorplan", description: "Stage, 24 round tables, buffet and prayer room." },
  { value: "separated", label: "Separate sections", kind: "floorplan", description: "Men's and women's sections with a partition, a shared stage, and a prayer area." },
  { value: "lounge", label: "Henna-night lounge", kind: "floorplan", description: "Low seating, a henna corner, a stage swing, and a dance floor." },
];

let n = 0;
const id = () => `bi_${Date.now().toString(36)}${(n++).toString(36)}`;
const it = (type: BoardItem["type"], x: number, y: number, w: number, h: number, extra: Partial<BoardItem> = {}): BoardItem => ({ id: id(), type, x, y, w, h, ...extra });

export function templateItems(t: string): BoardItem[] {
  switch (t) {
    case "palette_mood":
      return [
        it("text", 40, 30, 600, 60, { text: "Our colors" }),
        it("swatch", 40, 120, 130, 130, { color: "#F4EEE3", text: "Ivory" }),
        it("swatch", 190, 120, 130, 130, { color: "#B08D57", text: "Gold" }),
        it("swatch", 340, 120, 130, 130, { color: "#8A9A82", text: "Sage" }),
        it("swatch", 490, 120, 130, 130, { color: "#C48B86", text: "Dusty rose" }),
        it("note", 40, 300, 320, 160, { text: "Paste photo links with “Image”, and drag things around to arrange them.", color: "#FFF4C2" }),
      ];
    case "banquet": {
      const items = [
        it("stage", 520, 30, 360, 110, { text: "Stage", color: "#E8D9BC" }),
        it("zone", 40, 30, 220, 150, { text: "Prayer room", color: "#E3E8DE" }),
        it("zone", 1140, 30, 220, 150, { text: "Buffet", color: "#F3E1DD" }),
        it("zone", 600, 820, 200, 60, { text: "Entrance", color: "#EEE7DA" }),
      ];
      let k = 1;
      for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) items.push(it("table_round", 160 + c * 190, 240 + r * 140, 90, 90, { text: `T${k++}`, seats: 10 }));
      return items;
    }
    case "separated": {
      const items = [
        it("stage", 560, 30, 280, 100, { text: "Stage / imam", color: "#E8D9BC" }),
        it("zone", 40, 160, 640, 620, { text: "Women's section", color: "#F3E1DD" }),
        it("zone", 720, 160, 640, 620, { text: "Men's section", color: "#E3E8DE" }),
        it("zone", 690, 160, 20, 620, { text: "", color: "#B08D57" }),
        it("zone", 40, 30, 200, 100, { text: "Sisters' prayer", color: "#EEE7DA" }),
        it("zone", 1160, 30, 200, 100, { text: "Brothers' prayer", color: "#EEE7DA" }),
      ];
      let k = 1;
      for (const x0 of [80, 760]) for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) items.push(it("table_round", x0 + c * 200, 220 + r * 140, 90, 90, { text: `T${k++}`, seats: 8 }));
      return items;
    }
    case "lounge":
      return [
        it("stage", 520, 30, 360, 120, { text: "Swing & stage", color: "#F2D16B" }),
        it("zone", 470, 330, 460, 300, { text: "Dance floor", color: "#FFF4C2" }),
        it("zone", 40, 30, 300, 220, { text: "Henna corner", color: "#E3F0DB" }),
        it("zone", 1060, 30, 300, 220, { text: "Chai & sweets", color: "#F3E1DD" }),
        it("table_rect", 60, 330, 340, 70, { text: "Floor seating", seats: 16 }),
        it("table_rect", 60, 460, 340, 70, { text: "Floor seating", seats: 16 }),
        it("table_rect", 1000, 330, 340, 70, { text: "Floor seating", seats: 16 }),
        it("table_rect", 1000, 460, 340, 70, { text: "Floor seating", seats: 16 }),
        it("zone", 600, 820, 200, 60, { text: "Entrance", color: "#EEE7DA" }),
      ];
    default:
      return [];
  }
}
