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

// SEC-05: the storefront origin lives in env so a rebrand/domain move does not
// need a code change. Everything outside it opens in the system browser.
const CUSTOMER_URL =
  process.env.EXPO_PUBLIC_CUSTOMER_URL ?? "https://kassenta.com/customer/";

const ALLOWED_ORIGIN = new URL(CUSTOMER_URL).origin;

/** In-app navigation is confined to the storefront origin. */
function isInAppUrl(url: string): boolean {
  try {
    return new URL(url).origin === ALLOWED_ORIGIN;
  } catch {
    return false;
  }
}

export default function CustomerWebView() {
  const webRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);

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
        originWhitelist={[ALLOWED_ORIGIN]}
        onShouldStartLoadWithRequest={(req) => {
          if (isInAppUrl(req.url)) return true;
          // tel:/mailto:/maps and any third-party link leave the app instead of
          // rendering inside it under the brand's chrome.
          void Linking.openURL(req.url).catch(() => {});
          return false;
        }}
        allowsBackForwardNavigationGestures
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
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
