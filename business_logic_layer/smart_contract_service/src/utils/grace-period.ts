/**
 * Grace period utility functions for milestone notarization.
 */

/**
 * Formats remaining milliseconds into a human-readable countdown.
 * - If remaining <= 0: returns '' (unlocked)
 * - If >= 1 hour: "Xh Ym"
 * - If >= 1 minute: "Xm"
 * - If < 1 minute (final minute down to 1s): "Xs" (e.g. 59s, 45s, 1s)
 */
export const formatGraceCountdown = (msRemaining: number): string => {
  if (msRemaining <= 0) return "";
  const totalSeconds = Math.max(1, Math.ceil(msRemaining / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
};

/**
 * Checks if a record is still locked within its Milestone 1 grace window.
 * Strictly unlocks after 0 seconds have elapsed (now >= graceEndsAtMs).
 */
export const isMilestone1GraceLocked = (
  milestone?: string | null,
  graceEndsAt?: string | number | Date | null,
  currentTime: number = Date.now()
): boolean => {
  if (milestone !== "M1") return false;
  if (!graceEndsAt) return false;
  const endsAtMs = new Date(graceEndsAt).getTime();
  if (isNaN(endsAtMs)) return false;
  return currentTime < endsAtMs;
};
