/**
 * Tests for useData hooks utility functions.
 * Run these with: vitest (after installing via npm install -D vitest)
 *
 * Note: Full hook tests require setting up a test environment with
 * @testing-library/react and msw for mocking Supabase requests.
 * This file covers the pure utility functions that have no side effects.
 */

import { describe, it, expect } from "vitest";
import { formatBytes } from "../hooks/useData";

describe("formatBytes", () => {
  it("should format bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1023)).toBe("1023 B");
  });

  it("should format kilobytes", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1048575)).toBe("1024.0 KB");
  });

  it("should format megabytes", () => {
    expect(formatBytes(1048576)).toBe("1.0 MB");
    expect(formatBytes(5242880)).toBe("5.0 MB");
  });

  it("should format gigabytes", () => {
    expect(formatBytes(1073741824)).toBe("1.00 GB");
    expect(formatBytes(2147483648)).toBe("2.00 GB");
  });
});
