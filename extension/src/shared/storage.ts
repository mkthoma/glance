import { DEFAULT_SETTINGS, EMPTY_STATS, STORAGE_KEYS } from "./constants";
import type { StorageShape, UsageStats, UserSettings } from "./types";

export async function getSettings(): Promise<UserSettings> {
  const result = (await chrome.storage.local.get(
    STORAGE_KEYS.settings
  )) as StorageShape;

  return {
    ...DEFAULT_SETTINGS,
    ...(result.glanceSettings ?? {})
  };
}

export async function saveSettings(
  settings: Partial<UserSettings>
): Promise<UserSettings> {
  const nextSettings = {
    ...(await getSettings()),
    ...settings
  };

  await chrome.storage.local.set({
    [STORAGE_KEYS.settings]: nextSettings
  });

  return nextSettings;
}

export async function getUsageStats(): Promise<UsageStats> {
  const result = (await chrome.storage.local.get(STORAGE_KEYS.stats)) as StorageShape;

  return {
    ...EMPTY_STATS,
    ...(result.glanceStats ?? {})
  };
}

export async function updateUsageStats(
  updater: (stats: UsageStats) => UsageStats
): Promise<UsageStats> {
  const nextStats = updater(await getUsageStats());

  await chrome.storage.local.set({
    [STORAGE_KEYS.stats]: nextStats
  });

  return nextStats;
}
