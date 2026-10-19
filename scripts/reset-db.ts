// Deletes the local JSON store; the sample wedding is regenerated on the next request.
import fs from "node:fs";
import path from "node:path";
const file = path.join(process.cwd(), "data", "db.json");
if (fs.existsSync(file)) fs.rmSync(file);
console.log("Demo data reset. Restart `npm run dev` (or reload) to regenerate the sample wedding.");
