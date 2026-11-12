# Qubool for iPhone and Android

The apps are thin native shells (Capacitor 8) around the live site. The web view loads
https://www.qubool.app. When you deploy the website, the apps update too, with no store
review. You only need a new store build when something in `mobile/` or
`capacitor.config.ts` changes.

What the apps add on top of the website:

- **Icon and splash screen**: the interlocking rings. They're drawn by
  `mobile/scripts/make-assets.mts`; run `npm run mobile:assets` to redraw them.
- **Invitation and email links open in the app** (universal links / app links) when the
  app is installed: `/i/<token>`, sign-up confirmation, password reset, wedding websites.
  `qubool://i/<token>` opens the same pages without universal links (handy for testing).
- **Share sheet**: in the app, "Copy" buttons for invitation and website links become
  "Share" and open the phone's share sheet (Messages, WhatsApp, Mail…).
- **Photo picker and camera** for every photo upload.
- **Push notifications**: couples hear the moment a household RSVPs, and vendors when a
  couple sends an inquiry. Tapping one opens that household or the inquiries. The app
  offers them with its own card on the dashboard first ("Turn on notifications"), so the
  system prompt only appears when someone wants it. Set up in step 5 below.
- **Offline screen** when there's no connection.
- **No purchases inside the apps.** Apple and Google only allow digital purchases through
  their own in-app payments. The apps hide plan and listing upgrades, and the site
  refuses them from the apps (`lib/native.ts`). People still upgrade on the website, and
  whatever they've bought works in the app.

## Store submission checklist

These are the steps only you can do. Each one is listed in order.

### 1. Developer accounts (one time)

1. **Apple**: go to https://developer.apple.com/programs/enroll and enroll with your Apple
   ID. It costs $99 a year. Enrolling as an organisation needs a D-U-N-S number, and
   approval can take a few days.
2. **Google**: go to https://play.google.com/console/signup and pay the one-time $25.
   New personal accounts must run a **closed test with at least 12 testers for 14 days**
   before the app can go public, so start that early.

### 2. Tell the website about the apps (makes links open in the app)

1. Apple Team ID: developer.apple.com → **Account** → **Membership details** → copy
   **Team ID** (10 characters).
2. Android fingerprint: in Play Console (after step 4 below) → your app → **Test and
   release** → **App integrity** → **App signing** → copy the **SHA-256 certificate
   fingerprint** of the *App signing key*.
3. Vercel → qubool project → **Settings** → **Environment Variables** → add:
   - `APPLE_TEAM_ID` = the Team ID
   - `ANDROID_CERT_SHA256` = the fingerprint
4. Redeploy. Check that https://www.qubool.app/.well-known/apple-app-site-association
   shows your Team ID.

### 3. iPhone app → App Store

1. Open Terminal in this folder and run `npm run mobile:sync`, then `npm run mobile:ios`.
   Xcode opens.
2. In Xcode, click **App** in the left sidebar → **Signing & Capabilities** → **Team** →
   choose your team. Leave the Bundle Identifier as `app.qubool`.
3. In the same tab, check that **Associated Domains** lists `applinks:www.qubool.app`.
4. Go to https://appstoreconnect.apple.com → **Apps** → **+** → **New App**:
   platform iOS, name "Qubool", language English, bundle id `app.qubool`, SKU `qubool`.
5. Back in Xcode, set the device at the top to **Any iOS Device**, then **Product** →
   **Archive** → **Distribute App** → **App Store Connect** → **Upload**.
6. In App Store Connect, fill in:
   - **Screenshots**: iPhone 6.9" (1320 × 2868) and iPad 13" (2064 × 2752). Take them in
     the Simulator with ⌘S: the dashboard, a guest invitation, an RSVP and the website.
   - **Description, keywords, support URL** (https://www.qubool.app), and **privacy
     policy URL** (https://www.qubool.app/privacy).
   - **App Privacy** labels. The data Qubool collects, linked to the user and not used
     for tracking:
     - Contact info: name, email address, phone number
     - User content: photos, other content
     - Identifiers: user ID
     - Purchases: purchase history, from website purchases
   - **Sign-in information for the reviewer**: a demo couple account with sample data,
     plus one guest invitation link in the review notes.
   - **Age rating**: 4+.
7. Click **Add for Review**, then **Submit**.

### 4. Android app → Google Play

1. Run `npm run mobile:sync`, then `npm run mobile:android`. Android Studio opens. If you
   don't have it, install it from https://developer.android.com/studio first.
2. **Build** → **Generate Signed App Bundle / APK** → **Android App Bundle** → **Create
   new…** keystore. Save the keystore file and its passwords in your password manager.
   You can never change this upload key without contacting Google.
3. Choose **release**, then click **Create**. The file lands in
   `mobile/android/app/release/app-release.aab`.
4. Play Console → **Create app**: name "Qubool", app, free. Then go through the
   **Dashboard → Set up your app** list:
   - Privacy policy: https://www.qubool.app/privacy
   - App access: "Some functionality is restricted", and give the same demo login.
   - Ads: none.
   - Data safety: the same data as Apple's list in step 3.6. It's encrypted in transit,
     and users can ask for deletion.
   - Content rating questionnaire, target audience 18+, and category Lifestyle or Events.
5. **Test and release** → **Closed testing** → create a track → upload the `.aab` → add
   your testers' emails → roll out. After the 14 days, apply for production.
6. Do step 2.2 (the SHA-256 fingerprint) once Play has your first upload.

### 5. Push notifications

Do this before the first store builds: the Android file in step B goes *into* the app.
Until the keys are in Vercel, nothing is sent and nothing breaks.

**A. iPhone (Apple Push Notification service)**

1. Go to https://developer.apple.com/account → **Certificates, IDs & Profiles** →
   **Keys** → the blue **+**.
2. **Key Name**: `Qubool push`. Tick **Apple Push Notifications service (APNs)**, click
   **Configure** next to it, choose **Sandbox & Production**, then **Save**.
3. **Continue** → **Register** → **Download**. You can only download it once, so put the
   `AuthKey_XXXXXXXXXX.p8` file in your password manager right away.
4. Note the **Key ID** shown on that page (10 characters, also in the file name).
5. In Xcode (`npm run mobile:ios`): **App** → **Signing & Capabilities**. Check that
   **Push Notifications** is listed. If it isn't, click **+ Capability** → **Push
   Notifications**. With automatic signing, Xcode switches push on for `app.qubool`.

**B. Android (Firebase Cloud Messaging)**

1. Go to https://console.firebase.google.com → **Create a project** → name it `Qubool` →
   **Continue** → turn **Google Analytics** off → **Create project**.
2. On the project page click the **Android** icon (**Add app**). **Android package name**:
   `app.qubool`, nickname `Qubool` → **Register app**.
3. **Download google-services.json** and save it as
   `mobile/android/app/google-services.json` (next to `build.gradle`). Click **Next**
   through the remaining steps; the app already has the SDK. Commit the file: it isn't a
   secret, and every Android build needs it. Builds without it work but skip notifications.
4. Back in Firebase: the gear icon → **Project settings** → **Cloud Messaging** tab. Check
   that **Firebase Cloud Messaging API (V1)** says **Enabled**.
5. **Service accounts** tab → **Generate new private key** → **Generate key**. A `.json`
   file downloads. It *is* a secret: keep it in your password manager.

**C. Tell the website**

1. Vercel → qubool project → **Settings** → **Environment Variables** → add:
   - `APNS_KEY` = the whole text of the `.p8` file (open it in TextEdit; include the
     `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines)
   - `APNS_KEY_ID` = the Key ID from A.4
   - `FCM_SERVICE_ACCOUNT` = the whole text of the service-account `.json` from B.5

   The team id comes from `APPLE_TEAM_ID` (step 2).
2. Redeploy, then delete the downloaded key files from your Downloads folder.

**D. Try it**

1. Run the app on your own phone from Xcode or Android Studio (a phone plugged in, chosen
   at the top of the window, then ▶). Sign in as a couple.
2. On the dashboard tap **Turn on notifications** → **Allow**.
3. In a browser, open one of your households' invitation links and send an RSVP. The
   phone shows "<household> RSVP'd" within a few seconds; tapping it opens that household.

### 6. Before the first submission, also check

- **Account deletion (Apple rule 5.1.1(v))**: apps that let people sign up must let them
  delete their account *inside the app*. Qubool has it: couples under **Settings**,
  vendors at the bottom of their vendor page, and `/account/delete`. Mention it in the
  review notes. Deleting an account also forgets its phones for notifications.
- **Review notes**: mention that couples get a notification when a guest RSVPs, and
  vendors when they receive an inquiry (rule 4.2, "minimum functionality").

## Developer notes

- Native projects: `mobile/ios` (Swift Package Manager, no CocoaPods) and `mobile/android`.
  App id / bundle id `app.qubool`.
- Test against a local dev server: run `CAP_SERVER_URL=http://localhost:3000 npx cap sync`,
  build from Xcode or Android Studio, then run `npx cap sync` again **without** the
  variable before any store build. The Android emulator reaches this Mac at
  `http://10.0.2.2:3000`.
- The site detects the apps by the `QuboolApp` user-agent suffix (`lib/native.ts`), and
  `components/native-bridge.tsx` runs the native side (deep links, splash, share).
- Universal-link files: `app/.well-known/apple-app-site-association/route.ts` and
  `app/.well-known/assetlinks.json/route.ts`.
- Push: `components/push-prompt.tsx` asks, `components/native-bridge.tsx` registers and
  opens tapped notifications, tokens live in `device_tokens`, and `lib/push` sends (APNs
  over HTTP/2 with the .p8 key, FCM HTTP v1). Builds run from Xcode get sandbox tokens and
  App Store / TestFlight builds production ones; the server tries production first, then
  the sandbox. Signing out forgets the phone. The demo wedding never sends notifications.
- Try a notification in the Simulator without any keys:
  `xcrun simctl push booted app.qubool mobile/push-test.apns`. Tapping it opens the page
  in its `url`.
- Android builds without `google-services.json` leave the push plugin out
  (`MainActivity.java`), because it would crash the app without Firebase.
- Bump the version for each store upload: Xcode → App → General → Version / Build, and
  `versionCode` / `versionName` in `mobile/android/app/build.gradle`.
