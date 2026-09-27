// Line icons drawn in-house (24×24, 2px stroke) so the set matches the app's visual language.
import Svg, { Path } from 'react-native-svg';
import { color as C } from '@/theme/tokens';

const P: Record<string, string[]> = {
  body: ['M12 6.5a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z', 'M4.5 9.5 12 11l7.5-1.5', 'M12 11v5', 'M8.5 22 12 16l3.5 6'],
  home: ['M3 11 12 3l9 8', 'M5 10v10h5v-6h4v6h5V10'],
  chart: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M22 20H2'],
  user: ['M20 21a8 8 0 0 0-16 0', 'M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z'],
  users: ['M17 21a6 6 0 0 0-12 0', 'M11 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z', 'M22 21a5 5 0 0 0-5-5', 'M16 3.5a4 4 0 0 1 0 7.5'],
  dumbbell: ['M6.5 6.5v11', 'M17.5 6.5v11', 'M3.5 9v6', 'M20.5 9v6', 'M6.5 12h11'],
  clipboard: ['M9 4h6v3H9z', 'M15 5h3v16H6V5h3', 'M9 12h6', 'M9 16h4'],
  wallet: ['M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12', 'M16 13.5h.01'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  close: ['M6 6l12 12', 'M18 6 6 18'],
  check: ['M4.5 12.5l5 5 10-11'],
  right: ['M9 5l7 7-7 7'],
  left: ['M15 5l-7 7 7 7'],
  down: ['M5 9l7 7 7-7'],
  up: ['M5 15l7-7 7 7'],
  flame: ['M12 22c4 0 7-2.8 7-7 0-3.5-2.3-5.8-4-8-.4 2-1.3 3.2-2.6 3.8C12.6 7.5 11 4.6 8.5 2.5 8.7 6 5 8.5 5 14.5 5 19 8 22 12 22z'],
  timer: ['M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M12 9v4l2.5 2', 'M9 2h6'],
  list: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3.5 6h.01', 'M3.5 12h.01', 'M3.5 18h.01'],
  swap: ['M4 8h14l-4-4', 'M20 16H6l4 4'],
  skip: ['M5 5l10 7-10 7z', 'M19 5v14'],
  chat: ['M21 12a8.5 8.5 0 0 1-12.6 7.5L3 21l1.6-5A8.5 8.5 0 1 1 21 12z'],
  copy: ['M9 9h11v11H9z', 'M5 15H4V4h11v1'],
  camera: ['M4 8h3l2-3h6l2 3h3v11H4z', 'M12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z'],
  trophy: ['M8 4h8v5a4 4 0 0 1-8 0z', 'M8 6H4v1a4 4 0 0 0 4 4', 'M16 6h4v1a4 4 0 0 1-4 4', 'M12 13v4', 'M8 21h8', 'M9.5 17h5v4h-5z'],
  settings: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3.1 14H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1A1.7 1.7 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 20.9 10H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'],
  logout: ['M15 4h4v16h-4', 'M10 8l-4 4 4 4', 'M6 12h10'],
  search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M20 20l-4-4'],
  flip: ['M3 12a9 9 0 0 1 15.5-6.2L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-15.5 6.2L3 16', 'M3 21v-5h5'],
  undo: ['M9 14 4 9l5-5', 'M4 9h10a6 6 0 0 1 0 12h-3'],
  edit: ['M4 20h4L19 9l-4-4L4 16z', 'M13.5 6.5l4 4'],
  trash: ['M4 7h16', 'M10 11v6', 'M14 11v6', 'M6 7l1 13h10l1-13', 'M9 7V4h6v3'],
  share: ['M12 3v12', 'M7 8l5-5 5 5', 'M5 14v6h14v-6'],
  bolt: ['M13 2 4 14h7l-1 8 9-12h-7z'],
  calendar: ['M4 6h16v15H4z', 'M4 10h16', 'M8 3v4', 'M16 3v4'],
  globe: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M3 12h18', 'M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z'],
  scale: ['M5 4h14l1.5 16h-17z', 'M12 13l2-4', 'M9 9.5a4 4 0 0 1 6 0'],
  note: ['M5 3h10l4 4v14H5z', 'M9 12h6', 'M9 16h6'],
  sparkle: ['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z', 'M19 17l.7 1.8 1.8.7-1.8.7L19 22l-.7-1.8-1.8-.7 1.8-.7z'],
  heart: ['M12 20s-7-4.4-9-9.2C1.8 7.3 4 4 7.3 4c2 0 3.4 1.1 4.7 2.7C13.3 5.1 14.7 4 16.7 4 20 4 22.2 7.3 21 10.8 19 15.6 12 20 12 20z'],
  pause: ['M8 5v14', 'M16 5v14'],
  play: ['M7 4l13 8-13 8z'],
  link: ['M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1', 'M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1'],
  inbox: ['M3 13l3-8h12l3 8v6H3z', 'M3 13h5l1 3h6l1-3h5'],
  moon: ['M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z'],
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 24, color = C.ink, stroke = 2, fill }: { name: IconName; size?: number; color?: string; stroke?: number; fill?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {P[name].map((d, i) => (
        <Path key={i} d={d} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill={i === 0 && fill ? fill : 'none'} />
      ))}
    </Svg>
  );
}

