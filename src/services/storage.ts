import { configSchema, type Config } from "../shared/model";
import { defaultConfig } from "../data/production";
export function read<T>(key: string, fallback: T): T {
  try {
    return (
      JSON.parse(localStorage.getItem("hulog:" + key) || "null") ?? fallback
    );
  } catch {
    return fallback;
  }
}
export function save(key: string, value: unknown) {
  try {
    localStorage.setItem("hulog:" + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function loadConfig(): Config {
  const result = configSchema.safeParse(read("config", defaultConfig));
  return result.success ? result.data : structuredClone(defaultConfig);
}
export function downloadJSON(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
