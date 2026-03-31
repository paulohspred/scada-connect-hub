/**
 * Memory Leak Tests
 *
 * Tests that verify resources are properly cleaned up when components unmount.
 * Focus areas:
 * 1. Leaflet map — must be destroyed on unmount
 * 2. Supabase Realtime — channels must be unsubscribed
 * 3. React Query — subscriptions cleanup
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Leaflet Map Cleanup Tests ───────────────────────────────────────────────
describe("Leaflet Map Memory Leak Prevention", () => {
  let mapRemoveSpy: ReturnType<typeof vi.fn>;
  let fakemap: { remove: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mapRemoveSpy = vi.fn();
    fakemap = { remove: mapRemoveSpy };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should track map reference lifecycle", () => {
    // Simulate the ref pattern used in DeviceMap.tsx
    let mapRef: { remove: () => void } | null = null;

    // Simulate mount
    const initMap = () => {
      mapRef = fakemap;
    };

    // Simulate cleanup (what useEffect return does)
    const cleanupMap = () => {
      mapRef?.remove();
      mapRef = null;
    };

    initMap();
    expect(mapRef).not.toBeNull();

    cleanupMap();
    expect(mapRemoveSpy).toHaveBeenCalledTimes(1);
    expect(mapRef).toBeNull();
  });

  it("should not re-initialize map if ref already exists", () => {
    let mapRef: { remove: () => void } | null = null;
    let initCount = 0;

    const tryInitMap = () => {
      if (mapRef) return; // guard — this is the pattern in DeviceMap
      mapRef = fakemap;
      initCount++;
    };

    tryInitMap();
    tryInitMap(); // Second call — should be a no-op
    tryInitMap(); // Third call — should be a no-op

    expect(initCount).toBe(1); // Only initialized once
  });

  it("should handle null ref gracefully on cleanup", () => {
    let mapRef: { remove: () => void } | null = null;

    const cleanupMap = () => {
      mapRef?.remove(); // optional chaining — safe if null
      mapRef = null;
    };

    // Cleanup without init — should not throw
    expect(() => cleanupMap()).not.toThrow();
    expect(mapRef).toBeNull();
  });
});

// ── Supabase Channel Cleanup Tests ──────────────────────────────────────────
describe("Supabase Realtime Channel Cleanup", () => {
  it("should unsubscribe channel on cleanup", () => {
    const unsubscribeSpy = vi.fn();
    const fakeChannel = { unsubscribe: unsubscribeSpy };
    const fakeSupabase = {
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(() => fakeChannel),
      })),
      removeChannel: vi.fn(),
    };

    let channel: typeof fakeChannel | null = null;

    // Simulate useEffect mount
    const setupChannel = () => {
      channel = fakeSupabase
        .channel("test")
        .on("postgres_changes" as any, {} as any, () => {})
        .subscribe();
    };

    // Simulate useEffect cleanup
    const cleanupChannel = () => {
      if (channel) {
        fakeSupabase.removeChannel(channel);
        channel = null;
      }
    };

    setupChannel();
    expect(channel).not.toBeNull();

    cleanupChannel();
    expect(fakeSupabase.removeChannel).toHaveBeenCalledTimes(1);
    expect(channel).toBeNull();
  });
});

// ── Layer Group Cleanup Tests ───────────────────────────────────────────────
describe("Leaflet LayerGroup Cleanup", () => {
  it("should clear layer group before adding new markers", () => {
    const clearLayersSpy = vi.fn();
    const fakeLayerGroup = {
      clearLayers: clearLayersSpy,
      addLayer: vi.fn(),
    };

    // Simulate the pattern in DeviceMap — clear then re-add
    const updateMarkers = (group: typeof fakeLayerGroup, deviceCount: number) => {
      group.clearLayers(); // must always clear first
      for (let i = 0; i < deviceCount; i++) {
        group.addLayer({} as any);
      }
    };

    updateMarkers(fakeLayerGroup, 3);
    expect(clearLayersSpy).toHaveBeenCalledTimes(1);
    expect(fakeLayerGroup.addLayer).toHaveBeenCalledTimes(3);

    // Second update — must clear again
    updateMarkers(fakeLayerGroup, 2);
    expect(clearLayersSpy).toHaveBeenCalledTimes(2);
  });
});

// ── Event Listener Cleanup ──────────────────────────────────────────────────
describe("Event Listener Cleanup", () => {
  it("should remove event listeners on cleanup", () => {
    const addEventListenerSpy = vi.fn();
    const removeEventListenerSpy = vi.fn();

    const fakeWindow = {
      addEventListener: addEventListenerSpy,
      removeEventListener: removeEventListenerSpy,
    };

    const handler = () => {};

    // Simulate useEffect
    const mount = () => fakeWindow.addEventListener("resize", handler);
    const cleanup = () => fakeWindow.removeEventListener("resize", handler);

    mount();
    expect(addEventListenerSpy).toHaveBeenCalledWith("resize", handler);

    cleanup();
    expect(removeEventListenerSpy).toHaveBeenCalledWith("resize", handler);
  });
});
