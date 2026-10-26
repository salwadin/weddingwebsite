// Universal links for the iOS app (mobile/ios, App.entitlements): tells iOS that links to
// this site may open in the app with bundle id app.qubool. APPLE_TEAM_ID is the 10-character
// Team ID from developer.apple.com → Account → Membership details.
export const dynamic = "force-dynamic";

export function GET() {
  const team = process.env.APPLE_TEAM_ID;
  const details = team ? [{
    appIDs: [`${team}.app.qubool`],
    components: [{ "/": "/api/*", exclude: true }, { "/": "/.well-known/*", exclude: true }, { "/": "*" }],
  }] : [];
  return Response.json({ applinks: { details }, webcredentials: { apps: details.flatMap((d) => d.appIDs) } });
}
