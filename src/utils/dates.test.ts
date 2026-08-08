import { describe, expect, it } from "vitest";
import {
  addDays,
  formatDuration,
  getDayIndex,
  getIsoWeekKey,
  getLocalDateKey,
  getWeekStart,
  greetingForHour,
  parseDateKey,
} from "./dates";

describe("getLocalDateKey", () => {
  it("uses the local date, not UTC", () => {
    // 00:30 local on Aug 8 must stay Aug 8 regardless of UTC offset.
    const date = new Date(2026, 7, 8, 0, 30);
    expect(getLocalDateKey(date)).toBe("2026-08-08");
  });

  it("pads month and day", () => {
    expect(getLocalDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("parseDateKey / addDays", () => {
  it("round-trips", () => {
    expect(getLocalDateKey(parseDateKey("2026-08-08"))).toBe("2026-08-08");
  });

  it("adds days across month borders", () => {
    expect(addDays("2026-08-30", 3)).toBe("2026-09-02");
    expect(addDays("2026-08-01", -1)).toBe("2026-07-31");
  });
});

describe("getWeekStart / getDayIndex", () => {
  it("finds Monday for a Saturday", () => {
    // 2026-08-08 is a Saturday.
    expect(getWeekStart("2026-08-08")).toBe("2026-08-03");
  });

  it("keeps Monday as its own week start", () => {
    expect(getWeekStart("2026-08-03")).toBe("2026-08-03");
  });

  it("maps Sunday to the preceding Monday", () => {
    expect(getWeekStart("2026-08-09")).toBe("2026-08-03");
  });

  it("day index: Monday 0 … Sunday 6", () => {
    expect(getDayIndex(new Date(2026, 7, 3))).toBe(0); // Mo
    expect(getDayIndex(new Date(2026, 7, 8))).toBe(5); // Sa
    expect(getDayIndex(new Date(2026, 7, 9))).toBe(6); // So
  });
});

describe("getIsoWeekKey", () => {
  it("same week → same key, next week → different", () => {
    expect(getIsoWeekKey("2026-08-03")).toBe(getIsoWeekKey("2026-08-09"));
    expect(getIsoWeekKey("2026-08-09")).not.toBe(getIsoWeekKey("2026-08-10"));
  });
});

describe("formatDuration", () => {
  it("formats minutes and hours", () => {
    expect(formatDuration(88)).toBe("01:28");
    expect(formatDuration(3723)).toBe("1:02:03");
    expect(formatDuration(0)).toBe("00:00");
  });
});

describe("greetingForHour", () => {
  it("greets by time of day", () => {
    expect(greetingForHour(7)).toBe("Guten Morgen");
    expect(greetingForHour(13)).toBe("Guten Tag");
    expect(greetingForHour(20)).toBe("Guten Abend");
    expect(greetingForHour(2)).toBe("Guten Abend");
  });
});
