import { Platform } from "react-native";

export function getWebStaticFallbackChain(uri: string): string[] {
  if (!uri) return [];

  const normalized = uri.trim();
  if (!normalized) return [];

  const candidates = [normalized];

  const objectPath = getObjectPath(normalized);
  if (Platform.OS === "web" && objectPath) {
    const objectFile = objectPath.replace(/^\/objects\//, "");
    candidates.push(`/uploads/${objectFile}`);
    candidates.push(`/app/uploads/${objectFile}`);

    const basename = objectFile.split("/").pop();
    if (basename && basename !== objectFile) {
      candidates.push(`/uploads/${basename}`);
      candidates.push(`/app/uploads/${basename}`);
    }
  }

  if (Platform.OS === "web" && normalized.startsWith("/")) {
    if (normalized.startsWith("/app/")) {
      candidates.push(normalized.slice(4) || "/");
    } else {
      candidates.push(`/app${normalized}`);
    }
  }

  return candidates.filter((candidate, index) => candidate && candidates.indexOf(candidate) === index);
}

function getObjectPath(uri: string): string | null {
  if (uri.startsWith("/objects/")) return uri;

  try {
    const parsed = new URL(uri);
    if (parsed.pathname.startsWith("/objects/")) {
      return parsed.pathname;
    }
  } catch {
    return null;
  }

  return null;
}
