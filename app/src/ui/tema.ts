import { Platform } from 'react-native';

/** Mesmos tokens do web (src/index.css). */
export const cores = {
  ink: '#140d0a',
  surface: '#1e130d',
  surface2: '#2b1a11',
  borderSubtle: '#3a2619',
  borderStrong: '#54351f',
  primary: '#d28a4c',
  primaryInk: '#1b0f07',
  secondary: '#b39463',
  foreground: '#f5f1eb',
  muted: '#a89079',
  danger: '#e26d5c',
  success: '#7fa87a',
};

export const fonteMono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: '"JetBrains Mono", ui-monospace, Menlo, monospace',
});

export const raio = 3;
export const espaco = (n: number) => n * 4;
