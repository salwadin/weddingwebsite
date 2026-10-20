// Supabase connection settings, shared by the app, the seed script and the tests.
// `supabase status -o env` prints the local values; see README → "Run it locally".

function need(name: string, value: string | undefined) {
  if (!value) throw new Error(`${name} is not set. Copy .env.example to .env.local and fill it in from \`supabase status\`.`);
  return value;
}

export const supabaseUrl = () => need("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
export const supabaseAnonKey = () => need("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const supabaseServiceKey = () => need("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);

/** The /demo/* identity switcher and other demo-only shortcuts. Off unless QUBOOL_DEMO=on. */
export const demoEnabled = () => process.env.QUBOOL_DEMO === "on";
