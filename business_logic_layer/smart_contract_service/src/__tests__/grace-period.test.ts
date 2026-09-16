import { describe, it, expect } from "@jest/globals";
import { formatGraceCountdown, isMilestone1GraceLocked } from "../utils/grace-period";

describe("formatGraceCountdown", () => {
  it("returns empty string when 0 or negative ms remaining (unlocked)", () => {
    expect(formatGraceCountdown(0)).toBe("");
    expect(formatGraceCountdown(-1000)).toBe("");
    expect(formatGraceCountdown(-60000)).toBe("");
  });

  it("formats hours and minutes when remaining time is >= 1 hour", () => {
    // 2 hours 15 minutes
    const ms = (2 * 60 + 15) * 60 * 1000;
    expect(formatGraceCountdown(ms)).toBe("2h 15m");
  });

  it("formats minutes when remaining time is between 1 minute and 59 minutes", () => {
    // 5 minutes
    expect(formatGraceCountdown(5 * 60 * 1000)).toBe("5m");
    // 1 minute 30 seconds
    expect(formatGraceCountdown(90 * 1000)).toBe("1m");
  });

  it("formats seconds during the final minute (down to 1s)", () => {
    // 59 seconds
    expect(formatGraceCountdown(59 * 1000)).toBe("59s");
    // 45 seconds
    expect(formatGraceCountdown(45 * 1000)).toBe("45s");
    // 10 seconds
    expect(formatGraceCountdown(10 * 1000)).toBe("10s");
    // 1 second
    expect(formatGraceCountdown(1000)).toBe("1s");
    // 500ms rounds up to 1s until 0
    expect(formatGraceCountdown(500)).toBe("1s");
  });
});

describe("isMilestone1GraceLocked", () => {
  const graceEndsAt = new Date("2026-09-15T15:32:00.000Z").getTime();

  it("returns true when currentTime is before graceEndsAt for M1", () => {
    const before = graceEndsAt - 10000; // 10s before
    expect(isMilestone1GraceLocked("M1", graceEndsAt, before)).toBe(true);
  });

  it("returns false when currentTime has reached or passed graceEndsAt for M1 (after 0s)", () => {
    expect(isMilestone1GraceLocked("M1", graceEndsAt, graceEndsAt)).toBe(false);
    expect(isMilestone1GraceLocked("M1", graceEndsAt, graceEndsAt + 1000)).toBe(false);
  });

  it("returns false for non-M1 milestones (e.g. M2)", () => {
    const before = graceEndsAt - 10000;
    expect(isMilestone1GraceLocked("M2", graceEndsAt, before)).toBe(false);
  });

  it("returns false when graceEndsAt is null or undefined", () => {
    expect(isMilestone1GraceLocked("M1", null, Date.now())).toBe(false);
    expect(isMilestone1GraceLocked("M1", undefined, Date.now())).toBe(false);
  });
});
