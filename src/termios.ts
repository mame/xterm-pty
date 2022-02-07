// This module provides a Termios class for termios struct data.
//
// https://man7.org/linux/man-pages/man3/termios.3.html

// c_iflag
export const ISTRIP = 0x0020;
export const INLCR = 0x0040;
export const IGNCR = 0x0080;
export const ICRNL = 0x0100;
export const IUCLC = 0x0200;
export const IXON = 0x0400;
export const IXANY = 0x0800;
export const IMAXBEL = 0x2000;
export const IUTF8 = 0x4000;

// c_oflag
export const OPOST = 0x0001;
export const OLCUC = 0x0002;
export const ONLCR = 0x0004;
export const OCRNL = 0x0008;
export const ONOCR = 0x0010;
export const ONLRET = 0x0020;
export const TABDLY = 0x1800;
export const XTABS = 0x1800;

// c_lflag
export const ISIG = 0x0001;
export const ICANON = 0x0002;
export const ECHO = 0x0008;
export const ECHOE = 0x0010;
export const ECHOK = 0x0020;
export const ECHONL = 0x0040;
export const NOFLSH = 0x0080;
export const ECHOCTL = 0x0200;
export const ECHOPRT = 0x0400;
export const ECHOKE = 0x0800;
export const IEXTEN = 0x8000;

// c_cc
export const VINTR = 0;
export const VQUIT = 1;
export const VERASE = 2;
export const VKILL = 3;
export const VEOF = 4;
export const VTIME = 5;
export const VMIN = 6;
export const VSWTCH = 7;
export const VSTART = 8;
export const VSTOP = 9;
export const VSUSP = 10;
export const VEOL = 11;
export const VREPRINT = 12;
export const VDISCARD = 13;
export const VWERASE = 14;
export const VLNEXT = 15;
export const VEOL2 = 16;

export class Termios {
  constructor(
    readonly iflag: number,
    readonly oflag: number,
    readonly cflag: number,
    readonly lflag: number,
    readonly cc: number[]
  ) {}

  readonly ISTRIP_P = (this.iflag & ISTRIP) != 0;
  readonly INLCR_P = (this.iflag & INLCR) != 0;
  readonly IGNCR_P = (this.iflag & IGNCR) != 0;
  readonly ICRNL_P = (this.iflag & ICRNL) != 0;
  readonly IUCLC_P = (this.iflag & IUCLC) != 0;
  readonly IXON_P = (this.iflag & IXON) != 0;
  readonly IXANY_P = (this.iflag & IXANY) != 0;
  readonly IUTF8_P = (this.iflag & IUTF8) != 0;
  readonly OPOST_P = (this.oflag & OPOST) != 0;
  readonly OLCUC_P = (this.oflag & OLCUC) != 0;
  readonly ONLCR_P = (this.oflag & ONLCR) != 0;
  readonly OCRNL_P = (this.oflag & OCRNL) != 0;
  readonly ONOCR_P = (this.oflag & ONOCR) != 0;
  readonly ONLRET_P = (this.oflag & ONLRET) != 0;
  readonly TABDLY_XTABS_P = (this.oflag & TABDLY) == XTABS;
  readonly ISIG_P = (this.lflag & ISIG) != 0;
  readonly ICANON_P = (this.lflag & ICANON) != 0;
  readonly ECHO_P = (this.lflag & ECHO) != 0;
  readonly ECHOE_P = (this.lflag & ECHOE) != 0;
  readonly ECHOK_P = (this.lflag & ECHOK) != 0;
  readonly ECHONL_P = (this.lflag & ECHONL) != 0;
  readonly NOFLSH_P = (this.lflag & NOFLSH) != 0;
  readonly ECHOCTL_P = (this.lflag & ECHOCTL) != 0;
  readonly ECHOPRT_P = (this.lflag & ECHOPRT) != 0;
  readonly ECHOKE_P = (this.lflag & ECHOKE) != 0;
  readonly IEXTEN_P = (this.lflag & IEXTEN) != 0;

  readonly INTR_V = this.cc[VINTR];
  readonly QUIT_V = this.cc[VQUIT];
  readonly ERASE_V = this.cc[VERASE];
  readonly KILL_V = this.cc[VKILL];
  readonly EOF_V = this.cc[VEOF];
  readonly TIME_V = this.cc[VTIME]; // not supported
  readonly MIN_V = this.cc[VMIN]; // not supported
  readonly SWTCH_V = this.cc[VSWTCH]; // not supported
  readonly START_V = this.cc[VSTART];
  readonly STOP_V = this.cc[VSTOP];
  readonly SUSP_V = this.cc[VSUSP];
  readonly EOL_V = this.cc[VEOL];
  readonly REPRINT_V = this.cc[VREPRINT];
  readonly DISCARD_V = this.cc[VDISCARD]; // not supported
  readonly WERASE_V = this.cc[VWERASE];
  readonly LNEXT_V = this.cc[VLNEXT];
  readonly EOL2_V = this.cc[VEOL2];

  clone() {
    return new Termios(
      this.iflag,
      this.oflag,
      this.cflag,
      this.lflag,
      this.cc.concat()
    );
  }
}

export const defaultTermios = new Termios(
  ICRNL | IXON | IMAXBEL | IUTF8,
  OPOST | ONLCR,
  0x00bf, // c_cflag is not supported
  ISIG | ICANON | ECHO | ECHOE | ECHOK | ECHOCTL | ECHOKE | IEXTEN,
  [
    0x03, 0x1c, 0x7f, 0x15, 0x04, 0x00, 0x01, 0x00, 0x11, 0x13, 0x1a, 0x00,
    0x12, 0x0f, 0x17, 0x16, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]
);

export const termiosToData = (termios: Termios) => {
  const data = [termios.iflag, termios.oflag, termios.cflag, termios.lflag];
  let word = 0;
  let offset = 8;
  for (let i = 0; i < termios.cc.length; i++) {
    word |= termios.cc[i] << offset;
    offset += 8;
    if (offset == 32) {
      data.push(word);
      word = 0;
      offset = 0;
    }
  }
  data.push(word);
  return data;
};

export const dataToTermios = (data: number[]): Termios => {
  const cc: number[] = [];
  let ptr = 4;
  let word = data[ptr++];
  let offset = 8;
  for (let i = 0; i < 32; i++) {
    cc.push((word >> offset) & 0xff);
    offset += 8;
    if (offset >= 32) {
      word = data[ptr++];
      offset = 0;
    }
  }
  return new Termios(data[0], data[1], data[2], data[3], cc);
};
