import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      {/* Default until the page reports its theme (index.tsx renders the live one). */}
      <StatusBar style="dark" backgroundColor="#F2F6F5" />
      <Stack screenOptions={{ headerShown: false, animation: "none" }}>
        <Stack.Screen name="index" />
      </Stack>
    </>
  );
}
