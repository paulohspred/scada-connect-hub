// Mock data for the RC Gateway dashboard

export interface Device {
  id: string;
  name: string;
  identifier: string;
  status: 'online' | 'offline' | 'pending' | 'approved';
  scadaPort: number | null;
  lastIp: string;
  lastSeen: string;
  lat: number;
  lng: number;
  model: string;
  brand: string;
  type: 'RTU' | 'CLP' | 'Modem';
  signal: number;
  bytesTx: number;
  bytesRx: number;
  observation?: string;
}

export interface TrafficPoint {
  time: string;
  tx: number;
  rx: number;
}

export const mockDevices: Device[] = [
  {
    id: '1', name: 'Gerador A', identifier: '860123456789012', status: 'online',
    scadaPort: 9001, lastIp: '10.0.0.12', lastSeen: '2026-03-17T07:30:00',
    lat: -23.5505, lng: -46.6333, model: 'RTU-X500', brand: 'Schneider',
    type: 'RTU', signal: -68, bytesTx: 1258000, bytesRx: 934000,
  },
  {
    id: '2', name: 'Gerador B', identifier: '860123456789013', status: 'online',
    scadaPort: 9002, lastIp: '10.0.0.13', lastSeen: '2026-03-17T07:29:00',
    lat: -23.5610, lng: -46.6250, model: 'RTU-X500', brand: 'Schneider',
    type: 'RTU', signal: -72, bytesTx: 890000, bytesRx: 670000,
  },
  {
    id: '3', name: 'Bomba Hidráulica 1', identifier: '860123456789014', status: 'online',
    scadaPort: 9003, lastIp: '10.0.0.14', lastSeen: '2026-03-17T07:28:00',
    lat: -23.5400, lng: -46.6400, model: 'CLP-200', brand: 'Siemens',
    type: 'CLP', signal: -55, bytesTx: 2340000, bytesRx: 1120000,
  },
  {
    id: '4', name: 'Subestação Norte', identifier: '860123456789015', status: 'offline',
    scadaPort: 9004, lastIp: '10.0.0.15', lastSeen: '2026-03-17T06:15:00',
    lat: -23.5300, lng: -46.6500, model: 'RTU-X700', brand: 'ABB',
    type: 'RTU', signal: -89, bytesTx: 450000, bytesRx: 320000,
  },
  {
    id: '5', name: 'Compressor Central', identifier: '860123456789016', status: 'online',
    scadaPort: 9005, lastIp: '10.0.0.16', lastSeen: '2026-03-17T07:31:00',
    lat: -23.5550, lng: -46.6280, model: 'Modem-4G', brand: 'Teltonika',
    type: 'Modem', signal: -61, bytesTx: 3450000, bytesRx: 2100000,
  },
  {
    id: '6', name: 'Torre Resfriamento', identifier: '860123456789017', status: 'online',
    scadaPort: 9006, lastIp: '10.0.0.17', lastSeen: '2026-03-17T07:30:30',
    lat: -23.5480, lng: -46.6350, model: 'CLP-200', brand: 'Siemens',
    type: 'CLP', signal: -74, bytesTx: 1670000, bytesRx: 890000,
  },
  {
    id: '7', name: '', identifier: '860123456789018', status: 'pending',
    scadaPort: null, lastIp: '10.0.0.18', lastSeen: '2026-03-17T07:25:00',
    lat: 0, lng: 0, model: '', brand: '',
    type: 'Modem', signal: -78, bytesTx: 1200, bytesRx: 800,
  },
  {
    id: '8', name: '', identifier: '860123456789019', status: 'pending',
    scadaPort: null, lastIp: '10.0.0.19', lastSeen: '2026-03-17T07:32:00',
    lat: 0, lng: 0, model: '', brand: '',
    type: 'Modem', signal: -65, bytesTx: 500, bytesRx: 300,
  },
];

export const mockTrafficData: TrafficPoint[] = Array.from({ length: 30 }, (_, i) => ({
  time: `${String(Math.floor(i / 2) + 7).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`,
  tx: Math.floor(Math.random() * 500 + 200),
  rx: Math.floor(Math.random() * 400 + 150),
}));

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}
