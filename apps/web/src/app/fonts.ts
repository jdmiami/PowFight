import { Fraunces, Instrument_Sans } from 'next/font/google';

/** Display + script face. Variable axes: opsz, wght, SOFT, WONK. */
export const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz', 'SOFT', 'WONK'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
});

/** UI face with tabular numerals. */
export const instrument = Instrument_Sans({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-instrument',
  display: 'swap',
});
