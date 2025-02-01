// This module provides a Termios class for termios struct data.
//
// https://man7.org/linux/man-pages/man3/termios.3.html

/* eslint-disable @typescript-eslint/no-duplicate-enum-values */
export const enum Flags {
  // c_iflag
  ISTRIP = 0x0020,
  INLCR = 0x0040,
  IGNCR = 0x0080,
  ICRNL = 0x0100,
  IUCLC = 0x0200,
  IXON = 0x0400,
  IXANY = 0x0800,
  IMAXBEL = 0x2000,
  IUTF8 = 0x4000,

  // c_oflag
  OPOST = 0x0001,
  OLCUC = 0x0002,
  ONLCR = 0x0004,
  OCRNL = 0x0008,
  ONOCR = 0x0010,
  ONLRET = 0x0020,
  TABDLY = 0x1800,
  XTABS = 0x1800,

  // c_lflag
  ISIG = 0x0001,
  ICANON = 0x0002,
  ECHO = 0x0008,
  ECHOE = 0x0010,
  ECHOK = 0x0020,
  ECHONL = 0x0040,
  NOFLSH = 0x0080,
  ECHOCTL = 0x0200,
  ECHOPRT = 0x0400,
  ECHOKE = 0x0800,
  IEXTEN = 0x8000,

  // c_cc
  VINTR = 0,
  VQUIT = 1,
  VERASE = 2,
  VKILL = 3,
  VEOF = 4,
  VTIME = 5,
  VMIN = 6,
  VSWTCH = 7,
  VSTART = 8,
  VSTOP = 9,
  VSUSP = 10,
  VEOL = 11,
  VREPRINT = 12,
  VDISCARD = 13,
  VWERASE = 14,
  VLNEXT = 15,
  VEOL2 = 16
}
/* eslint-enable @typescript-eslint/no-duplicate-enum-values */

export interface TermiosConfig {
  readonly iflag: number;
  readonly oflag: number;
  readonly cflag: number;
  readonly lflag: number;
  readonly cc: ReadonlyArray<number>;
}

export class Termios implements TermiosConfig {
  constructor(
    readonly iflag: number,
    readonly oflag: number,
    readonly cflag: number,
    readonly lflag: number,
    readonly cc: ReadonlyArray<number>
  ) {}

  readonly ISTRIP_P = (this.iflag & Flags.ISTRIP) != 0;
  readonly INLCR_P = (this.iflag & Flags.INLCR) != 0;
  readonly IGNCR_P = (this.iflag & Flags.IGNCR) != 0;
  readonly ICRNL_P = (this.iflag & Flags.ICRNL) != 0;
  readonly IUCLC_P = (this.iflag & Flags.IUCLC) != 0;
  readonly IXON_P = (this.iflag & Flags.IXON) != 0;
  readonly IXANY_P = (this.iflag & Flags.IXANY) != 0;
  readonly IUTF8_P = (this.iflag & Flags.IUTF8) != 0;
  readonly OPOST_P = (this.oflag & Flags.OPOST) != 0;
  readonly OLCUC_P = (this.oflag & Flags.OLCUC) != 0;
  readonly ONLCR_P = (this.oflag & Flags.ONLCR) != 0;
  readonly OCRNL_P = (this.oflag & Flags.OCRNL) != 0;
  readonly ONOCR_P = (this.oflag & Flags.ONOCR) != 0;
  readonly ONLRET_P = (this.oflag & Flags.ONLRET) != 0;
  readonly TABDLY_XTABS_P = (this.oflag & Flags.TABDLY) == Flags.XTABS;
  readonly ISIG_P = (this.lflag & Flags.ISIG) != 0;
  readonly ICANON_P = (this.lflag & Flags.ICANON) != 0;
  readonly ECHO_P = (this.lflag & Flags.ECHO) != 0;
  readonly ECHOE_P = (this.lflag & Flags.ECHOE) != 0;
  readonly ECHOK_P = (this.lflag & Flags.ECHOK) != 0;
  readonly ECHONL_P = (this.lflag & Flags.ECHONL) != 0;
  readonly NOFLSH_P = (this.lflag & Flags.NOFLSH) != 0;
  readonly ECHOCTL_P = (this.lflag & Flags.ECHOCTL) != 0;
  readonly ECHOPRT_P = (this.lflag & Flags.ECHOPRT) != 0;
  readonly ECHOKE_P = (this.lflag & Flags.ECHOKE) != 0;
  readonly IEXTEN_P = (this.lflag & Flags.IEXTEN) != 0;

  readonly INTR_V = this.cc[Flags.VINTR];
  readonly QUIT_V = this.cc[Flags.VQUIT];
  readonly ERASE_V = this.cc[Flags.VERASE];
  readonly KILL_V = this.cc[Flags.VKILL];
  readonly EOF_V = this.cc[Flags.VEOF];
  readonly TIME_V = this.cc[Flags.VTIME]; // not supported
  readonly MIN_V = this.cc[Flags.VMIN]; // not supported
  readonly SWTCH_V = this.cc[Flags.VSWTCH]; // not supported
  readonly START_V = this.cc[Flags.VSTART];
  readonly STOP_V = this.cc[Flags.VSTOP];
  readonly SUSP_V = this.cc[Flags.VSUSP];
  readonly EOL_V = this.cc[Flags.VEOL];
  readonly REPRINT_V = this.cc[Flags.VREPRINT];
  readonly DISCARD_V = this.cc[Flags.VDISCARD]; // not supported
  readonly WERASE_V = this.cc[Flags.VWERASE];
  readonly LNEXT_V = this.cc[Flags.VLNEXT];
  readonly EOL2_V = this.cc[Flags.VEOL2];

  static fromConfig(config: TermiosConfig) {
    return new Termios(
      config.iflag,
      config.oflag,
      config.cflag,
      config.lflag,
      config.cc
    );
  }

  clone() {
    return Termios.fromConfig(this);
  }
}

export const defaultTermios = new Termios(
  Flags.ICRNL | Flags.IXON | Flags.IMAXBEL | Flags.IUTF8,
  Flags.OPOST | Flags.ONLCR,
  0x00bf, // c_cflag is not supported
  Flags.ISIG |
    Flags.ICANON |
    Flags.ECHO |
    Flags.ECHOE |
    Flags.ECHOK |
    Flags.ECHOCTL |
    Flags.ECHOKE |
    Flags.IEXTEN,
  [
    0x03, 0x1c, 0x7f, 0x15, 0x04, 0x00, 0x01, 0x00, 0x11, 0x13, 0x1a, 0x00,
    0x12, 0x0f, 0x17, 0x16, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
  ]
);
