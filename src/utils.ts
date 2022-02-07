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

export const utf8BytesToString = (buf: number[]): [string, number[]] => {
  let str = "";
  let i = 0;
  while (i < buf.length) {
    const b = buf[i];
    let cp;
    if (b < 0x80) {
      cp = b;
    } else if ((b & 0xe0) == 0xc0) {
      if (buf.length <= i + 1) break;
      cp = (b & 0x1f) << 6;
      cp |= buf[++i] & 0x3f;
    } else if ((b & 0xf0) == 0xe0) {
      if (buf.length <= i + 2) break;
      cp = (b & 0x0f) << 12;
      cp |= (buf[++i] & 0x3f) << 6;
      cp |= buf[++i] & 0x3f;
    } else if ((b & 0xf8) == 0xf0) {
      if (buf.length <= i + 3) break;
      cp = (b & 0x03) << 18;
      cp |= (buf[++i] & 0x3f) << 12;
      cp |= (buf[++i] & 0x3f) << 6;
      cp |= buf[++i] & 0x3f;
    } else {
      cp = 0xfffe;
    }
    i++;
    str += String.fromCodePoint(cp);
  }
  return [str, buf.slice(i)];
};

export const stringToUtf8Bytes = (str: string) => {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; ) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const cp = str.codePointAt(i)!;
    if (cp < 0x80) bytes.push(cp);
    else if (cp < 0x800) {
      bytes.push(0xc0 | (cp >> 6));
      bytes.push(0x80 | (cp & 0x3f));
    } else if (cp < 0x10000) {
      bytes.push(0xe0 | (cp >> 12));
      bytes.push(0x80 | ((cp >> 6) & 0x3f));
      bytes.push(0x80 | (cp & 0x3f));
    } else {
      bytes.push(0xf0 | (cp >> 18));
      bytes.push(0x80 | ((cp >> 12) & 0x3f));
      bytes.push(0x80 | ((cp >> 6) & 0x3f));
      bytes.push(0x80 | (cp & 0x3f));
    }
    i += cp >= 0x10000 ? 2 : 1;
  }
  return bytes;
};
