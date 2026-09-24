import { Platform } from "react-native";

/**
 * Native Google sign-in — the account picker Play Services draws on top of the
 * app, with no browser and nothing to come back from.
 *
 * The Android OAuth clients (package name + SHA-1) deliberately do not appear
 * here. Google matches those server-side from the signature of the running app,
 * and the `id_token` it returns always carries the *web* client as its `aud`.
 * That is the value the backend validates, so this is the only ID the code
 * needs — and the same one the browser build uses.
 *
 * Two Android clients are registered per app: one for the upload key and one
 * for the Play app-signing key. Without the second, sign-in works on a locally
 * installed APK and fails on the build Play distributes.
 */
export const GOOGLE_WEB_CLIENT_ID =
  "852311970344-8q8a01gm3jip4k9vooljk8ttjpd30802.apps.googleusercontent.com";

export const supportsNativeGoogle = Platform.OS === "android" || Platform.OS === "ios";

export class GoogleSignInCancelled extends Error {
  constructor() {
    super("cancelled");
    this.name = "GoogleSignInCancelled";
  }
}

let configured = false;

/**
 * Loaded through require() rather than a top-level import so the web bundle
 * never pulls in the native module.
 */
function nativeModule() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("@react-native-google-signin/google-signin");
}

/** Resolves to a Google ID token, or throws GoogleSignInCancelled. */
export async function signInWithGoogleNative(): Promise<string> {
  const { GoogleSignin, statusCodes } = nativeModule();

  if (!configured) {
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, offlineAccess: false });
    configured = true;
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Sign the previous account out first, otherwise a second attempt returns
    // the cached account without ever showing the picker.
    await GoogleSignin.signOut().catch(() => {});

    const result = await GoogleSignin.signIn();
    // v13+ wraps the payload: { type: "success" | "cancelled", data }.
    if (result?.type === "cancelled") throw new GoogleSignInCancelled();
    const idToken = result?.data?.idToken ?? result?.idToken;
    if (!idToken) throw new Error("Google returned no ID token");
    return idToken as string;
  } catch (e: any) {
    if (e instanceof GoogleSignInCancelled) throw e;
    if (e?.code && e.code === statusCodes?.SIGN_IN_CANCELLED) throw new GoogleSignInCancelled();
    if (e?.code && e.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error("Google Play Services is not available on this device");
    }
    // DEVELOPER_ERROR is almost always a signing-certificate mismatch: the SHA-1
    // of the running build is not on any Android OAuth client in the project.
    if (String(e?.code) === "10" || /DEVELOPER_ERROR/i.test(String(e?.message))) {
      throw new Error("This build's signing certificate is not registered with Google");
    }
    throw e;
  }
}

/**
 * Web build: Google's pop-up (Google Identity Services token client). It
 * returns an access token; the server checks with Google that it was issued
 * to GOOGLE_WEB_CLIENT_ID and reads the e-mail from Google's userinfo.
 * Resolves to the access token, or throws GoogleSignInCancelled.
 */
let gisScript: Promise<any> | null = null;
function loadGis(): Promise<any> {
  const w: any = globalThis as any;
  if (w.google?.accounts?.oauth2) return Promise.resolve(w.google);
  if (!gisScript) {
    gisScript = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.onload = () => (w.google?.accounts?.oauth2 ? resolve(w.google) : reject(new Error("Google sign-in could not load")));
      s.onerror = () => { gisScript = null; reject(new Error("Google sign-in could not load")); };
      document.head.appendChild(s);
    });
  }
  return Promise.race([
    gisScript,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Google sign-in could not load")), 10000)),
  ]);
}

export async function signInWithGoogleWeb(): Promise<string> {
  const google = await loadGis();
  return new Promise<string>((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_WEB_CLIENT_ID,
      scope: "openid email profile",
      callback: (resp: any) => {
        if (resp?.access_token) resolve(resp.access_token);
        else reject(new GoogleSignInCancelled());
      },
      error_callback: (err: any) => {
        if (err?.type === "popup_closed") reject(new GoogleSignInCancelled());
        else reject(new Error(err?.type === "popup_failed_to_open" ? "popup_blocked" : "Google sign-in failed"));
      },
    });
    client.requestAccessToken({ prompt: "select_account" });
  });
}

/** Google sign-in is offered on Android/iOS (native picker) and on the web (pop-up). */
export const supportsGoogle = supportsNativeGoogle || Platform.OS === "web";
