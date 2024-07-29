// This module provides a Termios class for termios struct data.
//
// https://man7.org/linux/man-pages/man3/termios.3.html

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

export interface TermiosConfig {
  readonly iflag: number;
  readonly oflag: number;
  readonly cflag: number;
  readonly lflag: number;
  readonly cc: ReadonlyArray<number>;
}

export class Termios implements TermiosConfig {
  readonly ISTRIP_P: boolean;
  readonly INLCR_P: boolean;
  readonly IGNCR_P: boolean;
  readonly ICRNL_P: boolean;
  readonly IUCLC_P: boolean;
  readonly IXON_P: boolean;
  readonly IXANY_P: boolean;
  readonly IUTF8_P: boolean;
  readonly OPOST_P: boolean;
  readonly OLCUC_P: boolean;
  readonly ONLCR_P: boolean;
  readonly OCRNL_P: boolean;
  readonly ONOCR_P: boolean;
  readonly ONLRET_P: boolean;
  readonly TABDLY_XTABS_P: boolean;
  readonly ISIG_P: boolean;
  readonly ICANON_P: boolean;
  readonly ECHO_P: boolean;
  readonly ECHOE_P: boolean;
  readonly ECHOK_P: boolean;
  readonly ECHONL_P: boolean;
  readonly NOFLSH_P: boolean;
  readonly ECHOCTL_P: boolean;
  readonly ECHOPRT_P: boolean;
  readonly ECHOKE_P: boolean;
  readonly IEXTEN_P: boolean;

  readonly INTR_V: number;
  readonly QUIT_V: number;
  readonly ERASE_V: number;
  readonly KILL_V: number;
  readonly EOF_V: number;
  readonly TIME_V: number;
  readonly MIN_V: number;
  readonly SWTCH_V: number;
  readonly START_V: number;
  readonly STOP_V: number;
  readonly SUSP_V: number;
  readonly EOL_V: number;
  readonly REPRINT_V: number;
  readonly DISCARD_V: number;
  readonly WERASE_V: number;
  readonly LNEXT_V: number;
  readonly EOL2_V: number;

  constructor(
    readonly iflag: number,
    readonly oflag: number,
    readonly cflag: number,
    readonly lflag: number,
    readonly cc: ReadonlyArray<number>
  ) {
    this.ISTRIP_P = (this.iflag & Flags.ISTRIP) != 0;
    this.INLCR_P = (this.iflag & Flags.INLCR) != 0;
    this.IGNCR_P = (this.iflag & Flags.IGNCR) != 0;
    this.ICRNL_P = (this.iflag & Flags.ICRNL) != 0;
    this.IUCLC_P = (this.iflag & Flags.IUCLC) != 0;
    this.IXON_P = (this.iflag & Flags.IXON) != 0;
    this.IXANY_P = (this.iflag & Flags.IXANY) != 0;
    this.IUTF8_P = (this.iflag & Flags.IUTF8) != 0;
    this.OPOST_P = (this.oflag & Flags.OPOST) != 0;
    this.OLCUC_P = (this.oflag & Flags.OLCUC) != 0;
    this.ONLCR_P = (this.oflag & Flags.ONLCR) != 0;
    this.OCRNL_P = (this.oflag & Flags.OCRNL) != 0;
    this.ONOCR_P = (this.oflag & Flags.ONOCR) != 0;
    this.ONLRET_P = (this.oflag & Flags.ONLRET) != 0;
    this.TABDLY_XTABS_P = (this.oflag & Flags.TABDLY) == Flags.XTABS;
    this.ISIG_P = (this.lflag & Flags.ISIG) != 0;
    this.ICANON_P = (this.lflag & Flags.ICANON) != 0;
    this.ECHO_P = (this.lflag & Flags.ECHO) != 0;
    this.ECHOE_P = (this.lflag & Flags.ECHOE) != 0;
    this.ECHOK_P = (this.lflag & Flags.ECHOK) != 0;
    this.ECHONL_P = (this.lflag & Flags.ECHONL) != 0;
    this.NOFLSH_P = (this.lflag & Flags.NOFLSH) != 0;
    this.ECHOCTL_P = (this.lflag & Flags.ECHOCTL) != 0;
    this.ECHOPRT_P = (this.lflag & Flags.ECHOPRT) != 0;
    this.ECHOKE_P = (this.lflag & Flags.ECHOKE) != 0;
    this.IEXTEN_P = (this.lflag & Flags.IEXTEN) != 0;

    this.INTR_V = this.cc[Flags.VINTR];
    this.QUIT_V = this.cc[Flags.VQUIT];
    this.ERASE_V = this.cc[Flags.VERASE];
    this.KILL_V = this.cc[Flags.VKILL];
    this.EOF_V = this.cc[Flags.VEOF];
    this.TIME_V = this.cc[Flags.VTIME];
    this.MIN_V = this.cc[Flags.VMIN];
    this.SWTCH_V = this.cc[Flags.VSWTCH];
    this.START_V = this.cc[Flags.VSTART];
    this.STOP_V = this.cc[Flags.VSTOP];
    this.SUSP_V = this.cc[Flags.VSUSP];
    this.EOL_V = this.cc[Flags.VEOL];
    this.REPRINT_V = this.cc[Flags.VREPRINT];
    this.DISCARD_V = this.cc[Flags.VDISCARD];
    this.WERASE_V = this.cc[Flags.VWERASE];
    this.LNEXT_V = this.cc[Flags.VLNEXT];
    this.EOL2_V = this.cc[Flags.VEOL2];
  }

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
