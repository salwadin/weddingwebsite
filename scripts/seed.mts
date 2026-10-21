// npm run seed — loads the Ayesha & Omar sample wedding into the Supabase project in .env.local.
import { createClient } from "@supabase/supabase-js";
import { loadDemoSeed } from "../lib/seed-load";
import { supabaseServiceKey, supabaseUrl } from "../lib/supabase/env";

const admin = createClient(supabaseUrl(), supabaseServiceKey(), { auth: { persistSession: false, autoRefreshToken: false } });
const started = Date.now();
await loadDemoSeed(admin, (m) => console.log(`  ${m}`));
console.log(`Seeded the demo wedding into ${supabaseUrl()} in ${((Date.now() - started) / 1000).toFixed(1)}s.`);
console.log("Sign in as ayesha@example.com / qubool-demo, or set QUBOOL_DEMO=on and open /#demo.");
