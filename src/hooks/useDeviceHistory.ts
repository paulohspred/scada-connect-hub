import { useState, useEffect, useRef } from "react";
import type { Device } from "./useData";

export interface DeviceHistoryData {
  time: number;
  txRate: number; // bytes generated since last tick
  rxRate: number; // bytes generated since last tick
}

export function useDeviceHistory(devices: Device[]) {
  const [history, setHistory] = useState<Record<string, DeviceHistoryData[]>>({});
  const lastStateRef = useRef<Record<string, { tx: number; rx: number; timestamp: number }>>({});

  useEffect(() => {
    // Only update history periodically to get nice deltas.
    const interval = setInterval(() => {
      setHistory((prev) => {
        const next = { ...prev };
        const now = Date.now();
        let changed = false;

        devices.forEach((device) => {
          if (!device.id || device.status !== "online") return;

          const currentTx = device.bytes_tx || 0;
          const currentRx = device.bytes_rx || 0;

          const last = lastStateRef.current[device.id];
          let txRate = 0;
          let rxRate = 0;

          if (last) {
            // Delta in bytes
            const txDelta = Math.max(0, currentTx - last.tx);
            const rxDelta = Math.max(0, currentRx - last.rx);
            // We can just chart the raw delta per ~3 seconds interval
            txRate = txDelta;
            rxRate = rxDelta;
          }

          lastStateRef.current[device.id] = { tx: currentTx, rx: currentRx, timestamp: now };

          if (!next[device.id]) {
            // Pre-fill with empty data to avoid chart layout shifts
            next[device.id] = Array(15).fill({ time: now, txRate: 0, rxRate: 0 });
          }

          // Push the new point and keep the last 15
          const newArr = [
            ...next[device.id],
            { time: now, txRate, rxRate }
          ].slice(-15);
          
          next[device.id] = newArr;
          changed = true;
        });

        return changed ? next : prev;
      });
    }, 3000); // 3 seconds interval to match simulator

    return () => clearInterval(interval);
  }, [devices]);

  return history;
}
