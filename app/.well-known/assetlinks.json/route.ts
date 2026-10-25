// App links for the Android app (mobile/android, AndroidManifest.xml): tells Android that
// links to this site may open in the app app.qubool. ANDROID_CERT_SHA256 is the app signing
// key's SHA-256 fingerprint from Play Console → Test and release → App integrity
// (comma-separate several, e.g. Play's key and your upload key).
export const dynamic = "force-dynamic";

export function GET() {
  const prints = (process.env.ANDROID_CERT_SHA256 ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return Response.json(prints.length ? [{
    relation: ["delegate_permission/common.handle_all_urls", "delegate_permission/common.get_login_creds"],
    target: { namespace: "android_app", package_name: "app.qubool", sha256_cert_fingerprints: prints },
  }] : []);
}
