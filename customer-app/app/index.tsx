import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, WebViewNavigation } from "react-native-webview";
import { signInWithGoogleNative, GoogleSignInCancelled } from "@/lib/google-signin";

// SEC-05: the storefront origin lives in env so a rebrand/domain move does not
// need a code change. Everything outside it opens in the system browser.
const CUSTOMER_URL =
  process.env.EXPO_PUBLIC_CUSTOMER_URL ?? "https://kassenta.com/customer/";

const ALLOWED_ORIGIN = new URL(CUSTOMER_URL).origin;

/**
 * Hosts a payment has to be able to reach *inside* the WebView.
 *
 * Confining navigation to the storefront origin is right for ordinary links,
 * but it silently breaks every redirect-based payment method: 3-D Secure hands
 * off to hooks.stripe.com, and TWINT bounces through Stripe and back. Pushing
 * those to the system browser means the customer pays in Chrome and the app
 * never learns the outcome, so the order sits unpaid.
 *
 * Matched on host suffix, so api/js/hooks/m subdomains are all covered.
 */
const PAYMENT_HOSTS = [
  "stripe.com",
  "stripe.network",
  "twint.ch",
];

function hostMatches(host: string, suffix: string): boolean {
  return host === suffix || host.endsWith("." + suffix);
}

/** In-app navigation: the storefront, plus the payment hop and its return. */
function isInAppUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.origin === ALLOWED_ORIGIN) return true;
    if (u.protocol !== "https:") return false;
    return PAYMENT_HOSTS.some((h) => hostMatches(u.hostname, h));
  } catch {
    return false;
  }
}

/**
 * A wallet handing off to its native app (twint://, intent://). These must go
 * to the OS - the whole point is to leave for the TWINT app and come back.
 */
function isAppScheme(url: string): boolean {
  return /^(?!https?:)[a-z][a-z0-9+.-]*:/i.test(url);
}

/**
 * Marks the page as running inside the app, before any of its own scripts run.
 * The storefront checks this and routes its Google button through the bridge
 * below instead of Google's browser SDK — which cannot work in a WebView, since
 * the popup gets pushed out to the system browser with no way back.
 */
const NATIVE_FLAG = "window.__KASSENTA_NATIVE__ = true; true;";

export default function CustomerWebView() {
  const webRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);

  /** Hands an ID token — or a failure — back to the page that asked for it. */
  const replyToPage = (payload: Record<string, unknown>) => {
    const json = JSON.stringify(payload).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    webRef.current?.injectJavaScript(
      `window.__kassentaGoogleResult && window.__kassentaGoogleResult(JSON.parse('${json}')); true;`
    );
  };

  const onMessage = async (event: { nativeEvent: { data: string } }) => {
    let msg: { type?: string };
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return; // not ours
    }
    if (msg.type !== "google-signin") return;

    try {
      const idToken = await signInWithGoogleNative();
      replyToPage({ ok: true, idToken });
    } catch (e: any) {
      replyToPage({
        ok: false,
        cancelled: e instanceof GoogleSignInCancelled,
        error: e?.message || "Google sign-in failed",
      });
    }
  };

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack && webRef.current) {
        webRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack]);

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom", "left", "right"]}>
      <WebView
        ref={webRef}
        source={{ uri: CUSTOMER_URL }}
        style={styles.web}
        originWhitelist={[ALLOWED_ORIGIN, ...PAYMENT_HOSTS.map((h) => `https://*.${h}`)]}
        onShouldStartLoadWithRequest={(req) => {
          if (isInAppUrl(req.url)) return true;
          // twint:// and friends must reach the wallet app itself.
          // tel:/mailto:/maps and any third-party link leave the app instead of
          // rendering inside it under the brand's chrome.
          if (isAppScheme(req.url) || /^https?:/i.test(req.url)) {
            void Linking.openURL(req.url).catch(() => {});
          }
          return false;
        }}
        allowsBackForwardNavigationGestures
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        injectedJavaScriptBeforeContentLoaded={NATIVE_FLAG}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        cacheEnabled
        geolocationEnabled
        setSupportMultipleWindows={false}
        pullToRefreshEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#FF5722" />
          </View>
        )}
        onNavigationStateChange={(nav: WebViewNavigation) =>
          setCanGoBack(nav.canGoBack)
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#070A12" },
  web: { flex: 1, backgroundColor: "#070A12" },
  loader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#070A12",
  },
});
