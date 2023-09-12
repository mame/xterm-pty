export const BS = 8;
export const TAB = 9;
export const NL = 10;
export const CR = 13;
export const SP = 32;

export const isalnum = (c: number) =>
  (0x30 <= c && c <= 0x39) ||
  (0x41 <= c && c <= 0x5a) ||
  c == 0x5f ||
  (0x61 <= c && c <= 0x7a);
export const iscntrl = (c: number) =>
  (0x00 <= c && c <= 0x1f && c != 0x09) || c == 0x7f;
export const isUtf8ContinuationByte = (c: number) => (c & 0xc0) == 0x80;
export const tolower = (c: number) => (0x41 <= c && c <= 0x5a ? c + 0x20 : c);
export const toupper = (c: number) => (0x61 <= c && c <= 0x7a ? c - 0x20 : c);

const utf8Encoder = new TextEncoder();

export const stringToUtf8Bytes = (str: string) =>
  Array.from(utf8Encoder.encode(str));
