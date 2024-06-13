import { LineDiscipline } from "./lineDiscipline";
import { Signal } from "./pty";
import { Termios } from "./termios";
import { NL, CR } from "./utils";

const utf8Decoder = new TextDecoder();

const utf8BytesToString = (buf: number[]) => utf8Decoder.decode(new Uint8Array(buf));

const checkWithSignals = (
  expectedLowerBuf: string | number[],
  expectedUpperBuf: string | number[],
  expectedSignalBuf: Signal[],
  block: (ldisc: LineDiscipline) => void
) => {
  const lowerBuf: number[] = [];
  const upperBuf: number[] = [];
  const signalBuf: Signal[] = [];

  const ldisc = new LineDiscipline();
  ldisc.onWriteToLower((buf) => lowerBuf.push(...buf));
  ldisc.onWriteToUpper((buf) => upperBuf.push(...buf));
  ldisc.onSignalToUpper((sig) => signalBuf.push(sig));

  block(ldisc);

  if (typeof expectedLowerBuf == "string") {
    const lowerStr = utf8BytesToString(lowerBuf);
    expect(JSON.stringify(lowerStr)).toBe(JSON.stringify(expectedLowerBuf));
  } else {
    expect(lowerBuf).toEqual(expectedLowerBuf);
  }

  if (typeof expectedUpperBuf == "string") {
    const upperStr = utf8BytesToString(upperBuf);
    expect(JSON.stringify(upperStr)).toBe(JSON.stringify(expectedUpperBuf));
  } else {
    expect(upperBuf).toEqual(expectedUpperBuf);
  }

  expect(signalBuf).toEqual(expectedSignalBuf);
};

const check = (
  expectedLowerBuf: string | number[],
  expectedUpperBuf: string | number[],
  block: (ldisc: LineDiscipline) => void
) => {
  checkWithSignals(expectedLowerBuf, expectedUpperBuf, [], block);
};

type TermiosDiff = {
  setIflag?: number;
  resetIflag?: number;
  setOflag?: number;
  resetOflag?: number;
  setFflag?: number;
  resetCflag?: number;
  setLflag?: number;
  resetLflag?: number;
};

const setattr = (ldisc: LineDiscipline, opt: TermiosDiff) => {
  const termios = ldisc.termios;
  let iflag = termios.iflag;
  let oflag = termios.oflag;
  let cflag = termios.cflag;
  let lflag = termios.lflag;
  if (opt.setIflag !== undefined) iflag |= opt.setIflag;
  if (opt.resetIflag !== undefined) iflag &= ~opt.resetIflag;
  if (opt.setOflag !== undefined) oflag |= opt.setOflag;
  if (opt.resetOflag !== undefined) oflag &= ~opt.resetOflag;
  if (opt.setFflag !== undefined) cflag |= opt.setFflag;
  if (opt.resetCflag !== undefined) cflag &= ~opt.resetCflag;
  if (opt.setLflag !== undefined) lflag |= opt.setLflag;
  if (opt.resetLflag !== undefined) lflag &= ~opt.resetLflag;
  ldisc.termios = new Termios(iflag, oflag, cflag, lflag, termios.cc);
};

const rawMode = (ldisc: LineDiscipline) => {
  setattr(ldisc, {
    resetIflag: 0x0400, // IGNBRK | BRKINT | PARMRK | ISTRIP | INLCR | IGNCR | ICRNL | IXON
    resetOflag: 0x0030, // CS8
    resetCflag: 0x0130, // CSIZE | PARENB
    resetLflag: 0x804b, // ECHO | ECHONL | ICANON | ISIG | IEXTEN
  });
};

const setEOL = (ldisc: LineDiscipline, eol: number) => {
  const termios = ldisc.termios;
  const iflag = termios.iflag;
  const oflag = termios.oflag;
  const cflag = termios.cflag;
  const lflag = termios.lflag;
  const cc = termios.cc.concat();
  cc[11 /* VEOL */] = eol;
  ldisc.termios = new Termios(iflag, oflag, cflag, lflag, cc);
};

test("input normal characters", () => {
  check("foo\r\n", "foo\n", (ldisc) => {
    ldisc.writeFromLower("foo\r");
  });

  // "bar" is buffered
  check("foo\r\nbar", "foo\n", (ldisc) => {
    ldisc.writeFromLower("foo\rbar");
  });
});

test("input control characters", () => {
  check("foo^Hbar\r\n", "foo\bbar\n", (ldisc) => {
    ldisc.writeFromLower("foo\bbar\r");
  });
});

test("input NL", () => {
  check("foo\r\n", "foo\n", (ldisc) => {
    ldisc.writeFromLower("foo\n");
  });
});

test("input NL under INLCR", () => {
  check("foo^Mbar\r\n", "foo\rbar\n", (ldisc) => {
    setattr(ldisc, { setIflag: 0x0040 /* INLCR */ });
    ldisc.writeFromLower("foo\nbar\r");
  });
});

test("input NL under no ONLCR", () => {
  check("foo\nbar", "foo\n", (ldisc) => {
    setattr(ldisc, { resetOflag: 0x0004 /* ONLCR */ });
    ldisc.writeFromLower("foo\nbar");
  });
});

test("input NL under no ICANON", () => {
  check("foo\r\nbar", "foo\nbar", (ldisc) => {
    setattr(ldisc, { resetLflag: 0x0002 /* ICANON */ });
    ldisc.writeFromLower("foo\nbar");
  });
});

test("input NL under ONLRET and no ONLCR", () => {
  check("foo\nbar\t\b\b\b\b\b", "foo\n", (ldisc) => {
    setattr(ldisc, { setOflag: 0x0020 /* ONLRET */ });
    setattr(ldisc, { resetOflag: 0x0004 /* ONLCR */ });
    ldisc.writeFromLower("foo\nbar\t\x7f");
  });
});

test("input CR", () => {
  check("foo\r\n", "foo\n", (ldisc) => {
    ldisc.writeFromLower("foo\r");
  });
});

test("input CR under IGNCR", () => {
  check("foobar\r\n", "foobar\n", (ldisc) => {
    setattr(ldisc, { setIflag: 0x0080 /* IGNCR */ });
    ldisc.writeFromLower("foo\rbar\n");
  });
});

test("input UTF-8 character", () => {
  check("α\r\n", "α\n", (ldisc) => {
    ldisc.writeFromLower("α\r");
  });

  check("あ\r\n", "あ\n", (ldisc) => {
    ldisc.writeFromLower("あ\r");
  });

  // surrogate pair
  check("𠮷\r\n", "𠮷\n", (ldisc) => {
    ldisc.writeFromLower("𠮷\r");
  });
});

test("input broken UTF-8 characters", () => {
  check([0x80, CR, NL], [0x80, NL], (ldisc) => {
    ldisc.writeFromLower([0x80, CR]);
  });
});

test("input 8-bit characters under ISTRIP", () => {
  check("ABC\r\n", "ABC\n", (ldisc) => {
    setattr(ldisc, { setIflag: 0x0020 /* ISTRIP */ });
    ldisc.writeFromLower([0x80 | 0x41, 0x80 | 0x42, 0x80 | 0x43, CR]);
  });
});

test("input TAB", () => {
  check("foo\tbar\r\n", "foo\tbar\n", (ldisc) => {
    ldisc.writeFromLower("foo\tbar\r");
  });
});

test("input TAB under TABDLY == XTABS", () => {
  check("foo     bar\r\n", "foo\tbar\n", (ldisc) => {
    setattr(ldisc, { setOflag: 0x1800 /* XTABS */ });
    ldisc.writeFromLower("foo\tbar\r");
  });
});

test("input characters under IUCLC", () => {
  check("foobar\r\n", "foobar\n", (ldisc) => {
    setattr(ldisc, { setIflag: 0x0200 /* IUCLC */ });
    ldisc.writeFromLower("FooBar\r");
  });
});

test("input characters under IUCLC and OLCUC", () => {
  check("FOOBAR\r\n", "foobar\n", (ldisc) => {
    setattr(ldisc, { setIflag: 0x0200 /* IUCLC */ });
    setattr(ldisc, { setOflag: 0x0002 /* OLCUC */ });
    ldisc.writeFromLower("FooBar\r");
  });
});

test("input VERASE", () => {
  check("foo\b \bbar\b \b\r\n", "foba\n", (ldisc) => {
    ldisc.writeFromLower("foo\x7fbar\x7f\r");
  });
});

test("input VERASE after TAB", () => {
  check("foo\tbar\b \b\b \b\b \b\b\b\b\b\b\b \bqux\r\n", "foqux\n", (ldisc) => {
    ldisc.writeFromLower("foo\tbar\x7f\x7f\x7f\x7f\x7fqux\r");
  });
  check("foo\t\b\b\b\b\bbar\r\n", "foobar\n", (ldisc) => {
    ldisc.writeFromLower("foo\t\x7fbar\r");
  });
  check("foo\t\b\b\b\b\bx\r\n", "x\n", (ldisc) => {
    ldisc.writeFromUpper("foo");
    ldisc.writeFromLower("\t\x7fx\r");
  });
});

test("input VERASE after UTF-8 character", () => {
  check("ABαCα\b \b\b \b\r\n", "ABα\n", (ldisc) => {
    ldisc.writeFromLower("ABαCα\x7f\x7f\r");
  });
});

test("input VERASE after broken UTF-8 characters", () => {
  check([0x80, CR, NL], [0x80, NL], (ldisc) => {
    ldisc.writeFromLower([0x80, 0x7f, CR]);
  });
});

test("input VERASE after EOF and TAB", () => {
  check("ABCDEF\t\b\b\b \b\r\n", "ABCDE\n", (ldisc) => {
    ldisc.writeFromLower("ABC\x04DEF\t\x7f\x7f\r");
  });
});

test("input VERASE after EOF, UTF-8 character, and TAB", () => {
  check("ABCδεF\t\b\b\b \b\b \b\b \b\r\n", "ABC\n", (ldisc) => {
    ldisc.writeFromLower("ABC\x04δεF\t\x7f\x7f\x7f\x7f\r");
  });
});

test("input VERASE after EOF and two TABs", () => {
  check("ABCDEF\tGHI\t\b\b\b\b\b\b \b\r\n", "ABCDEF\tGH\n", (ldisc) => {
    ldisc.writeFromLower("ABC\x04DEF\tGHI\t\x7f\x7f\r");
  });
});

test("input VERASE after EOF and a control character", () => {
  check("ABCD^H\t\b\b\b \b\b \b\r\n", "ABCD\n", (ldisc) => {
    ldisc.writeFromLower("ABC\x04D\b\t\x7f\x7f\r");
  });
});

test("input VERASE after control character", () => {
  check("foo^H\b \b\b \bbar\r\n", "foobar\n", (ldisc) => {
    ldisc.writeFromLower("foo\b\x7fbar\r");
  });
});

test("input VERASE under ECHOPRT", () => {
  check("foo\\o/bar\r\n", "fobar\n", (ldisc) => {
    setattr(ldisc, { setLflag: 0x0400 /* ECHOPRT */ });
    ldisc.writeFromLower("foo\x7fbar\r");
  });

  check("ABC\\C\r\n/DEF\r\n", "AB\nDEF\n", (ldisc) => {
    setattr(ldisc, { setLflag: 0x0400 /* ECHOPRT */ });
    ldisc.writeFromLower("ABC\x7f\r\x7fDEF\r");
  });

  check("ABαCβ\\βC/Z\r\n", "ABαZ\n", (ldisc) => {
    setattr(ldisc, { setLflag: 0x0400 /* ECHOPRT */ });
    ldisc.writeFromLower("ABαCβ\x7f\x7fZ\r");
  });

  check("α\\α/    A", "", (ldisc) => {
    setattr(ldisc, { setLflag: 0x0400 /* ECHOPRT */ });
    setattr(ldisc, { setOflag: 0x1800 /* XTABS */ });
    ldisc.writeFromLower("α\x7f\tA");
  });
});

test("input VERASE under no ECHOE", () => {
  check("foo^?bar\r\n", "fobar\n", (ldisc) => {
    setattr(ldisc, { resetLflag: 0x0010 /* ECHOE */ });
    ldisc.writeFromLower("foo\x7fbar\r");
  });
});

test("input VWERASE", () => {
  check(
    "foo bar\b \b\b \b\b \bbaz qux\b \b\b \b\b \bcorge\r\n",
    "foo baz corge\n",
    (ldisc) => {
      ldisc.writeFromLower("foo bar\x17baz qux\x17corge\r");
    }
  );

  check("foo  \b \b\b \b\b \b\b \b\b \b", "", (ldisc) => {
    ldisc.writeFromLower("foo  \x17");
  });

  check("   \b \b\b \b\b \b", "", (ldisc) => {
    ldisc.writeFromLower("   \x17");
  });

  check("@foo\b \b\b \b\b \b", "", (ldisc) => {
    ldisc.writeFromLower("@foo\x17");
  });
});

test("input VKILL", () => {
  check("foo\b \b\b \b\b \bbar\r\n", "bar\n", (ldisc) => {
    ldisc.writeFromLower("foo\x15bar\r");
  });
});

test("input VKILL under no ECHO", () => {
  check("", "bar\n", (ldisc) => {
    setattr(ldisc, { resetLflag: 0x0008 /* ECHO */ });
    ldisc.writeFromLower("foo\x15bar\r");
  });
});

test("input VKILL under no ECHOKE", () => {
  check("foo^U\r\nbar\r\n", "bar\n", (ldisc) => {
    setattr(ldisc, { resetLflag: 0x0800 /* ECHOKE */ });
    ldisc.writeFromLower("foo\x15bar\r");
  });
});

test("input VKILL under no ECHOK and no ECHOKE", () => {
  check("foo^Ubar\r\n", "bar\n", (ldisc) => {
    setattr(ldisc, { resetLflag: 0x0800 /* ECHOKE */ | 0x0020 /* ECHOK */ });
    ldisc.writeFromLower("foo\x15bar\r");
  });
});

test("input VEOF", () => {
  check("foobar", "foo", (ldisc) => {
    ldisc.writeFromLower("foo\x04bar");
  });

  check("foobar\b \b\b \b\b \bqux\r\n", "fooqux\n", (ldisc) => {
    ldisc.writeFromLower("foo\x04bar\x15qux\r");
  });
});

test("input VEOL", () => {
  check("foo^Abar", "foo\x01", (ldisc) => {
    setEOL(ldisc, 0x01);
    ldisc.writeFromLower("foo\x01bar");
  });
});

test("input VLNEXT", () => {
  check("foo^\b^?bar\r\n", "foo\x7fbar\n", (ldisc) => {
    ldisc.writeFromLower("foo\x16\x7fbar\r");
  });
});

test("input VREPRINT", () => {
  check("foo\b \bbar^R\r\nfobar\b \bqux\r\n", "fobaqux\n", (ldisc) => {
    ldisc.writeFromLower("foo\x7fbar\x12\x7fqux\r");
  });
});

test("input VINTR", () => {
  checkWithSignals("foo^Cbar\r\n", "bar\n", ["SIGINT"], (ldisc) => {
    ldisc.writeFromLower("foo\x03bar\n");
  });
});

test("input VQUIT", () => {
  checkWithSignals("foo^\\bar\r\n", "bar\n", ["SIGQUIT"], (ldisc) => {
    ldisc.writeFromLower("foo\x1cbar\n");
  });
});

test("input VSUSP", () => {
  checkWithSignals("foo^Zbar\r\n", "bar\n", ["SIGTSTP"], (ldisc) => {
    ldisc.writeFromLower("foo\x1abar\n");
  });
});

test("input VSTOP and VSTART", () => {
  check("foo", "", (ldisc) => {
    ldisc.writeFromLower("foo\x13bar");
    expect(ldisc.flow).toBe(false);
    expect(() => ldisc.writeFromUpper("foo")).toThrow();
  });

  check("foobarbaz", "", (ldisc) => {
    ldisc.writeFromLower("foo\x13bar");
    expect(ldisc.flow).toBe(false);
    ldisc.writeFromLower("\x11baz");
    expect(ldisc.flow).toBe(true);
  });
});

test("input normal character under IXANY", () => {
  check("foobar", "", (ldisc) => {
    setattr(ldisc, { setIflag: 0x0800 /* IXANY */ });
    ldisc.writeFromLower("foo\x13bar");
    expect(ldisc.flow).toBe(true);
  });
});

test("input VERASE under IXANY", () => {
  check("foo\b \b", "", (ldisc) => {
    setattr(ldisc, { setIflag: 0x0800 /* IXANY */ });
    ldisc.writeFromLower("foo\x13\x7f");
    expect(ldisc.flow).toBe(true);
  });
});

test("input VWERASE under IXANY", () => {
  check("foo bar\b \b\b \b\b \b", "", (ldisc) => {
    setattr(ldisc, { setIflag: 0x0800 /* IXANY */ });
    ldisc.writeFromLower("foo bar\x13\x17");
    expect(ldisc.flow).toBe(true);
  });
});

test("input VKILL under IXANY", () => {
  check("foo bar\b \b\b \b\b \b\b \b\b \b\b \b\b \b", "", (ldisc) => {
    setattr(ldisc, { setIflag: 0x0800 /* IXANY */ });
    ldisc.writeFromLower("foo bar\x13\x15");
    expect(ldisc.flow).toBe(true);
  });
});

test("input VEOF under IXANY", () => {
  check("foo", "foo", (ldisc) => {
    setattr(ldisc, { setIflag: 0x0800 /* IXANY */ });
    ldisc.writeFromLower("foo\x13\x04");
    expect(ldisc.flow).toBe(true);
  });
});

test("input VLNEXT under IXANY", () => {
  check("foo^\b", "", (ldisc) => {
    setattr(ldisc, { setIflag: 0x0800 /* IXANY */ });
    ldisc.writeFromLower("foo\x13\x16");
    expect(ldisc.flow).toBe(true);
  });
});

test("input VREPRINT under IXANY", () => {
  check("foo^R\r\nfoo", "", (ldisc) => {
    setattr(ldisc, { setIflag: 0x0800 /* IXANY */ });
    ldisc.writeFromLower("foo\x13\x12");
    expect(ldisc.flow).toBe(true);
  });
});

test("output normal characters", () => {
  check("foo\r\n", "", (ldisc) => {
    ldisc.writeFromUpper("foo\n");
  });
});

test("output control characters", () => {
  check("foo\bbar\r\n", "", (ldisc) => {
    ldisc.writeFromUpper("foo\bbar\n");
  });
});

test("output UTF-8 characters", () => {
  check("α\r\n", "", (ldisc) => {
    ldisc.writeFromUpper("α\n");
  });

  check("あ\r\n", "", (ldisc) => {
    ldisc.writeFromUpper("あ\n");
  });

  // surrogate pair
  check("𠮷\r\n", "", (ldisc) => {
    ldisc.writeFromUpper("𠮷\n");
  });
});

test("output broken UTF-8 characters", () => {
  check("\x80\r\n", "", (ldisc) => {
    ldisc.writeFromUpper("\x80\n");
  });
});

test("output NL", () => {
  check("foo\r\nbar\r\n", "", (ldisc) => {
    ldisc.writeFromUpper("foo\nbar\n");
  });
});

test("output NL under no OPOST", () => {
  check("foo\nbar\n", "", (ldisc) => {
    setattr(ldisc, { resetOflag: 0x0001 /* OPOST */ });
    ldisc.writeFromUpper("foo\nbar\n");
  });
});

test("output CR", () => {
  check("foo\rbar\r\n", "", (ldisc) => {
    ldisc.writeFromUpper("foo\rbar\n");
  });
});

test("output CR under OCRNL", () => {
  check("foo\r\n\n\n\nbar\n\n\nbaz\r\n", "", (ldisc) => {
    setattr(ldisc, { setOflag: 0x0008 /* OCRNL */ });
    ldisc.writeFromUpper("foo\n\r\r\rbar\r\r\rbaz\n");
  });
});

test("output CR under OCRNL and ONOCR", () => {
  check("foo\r\nbar\n\n\nbaz\r\n", "", (ldisc) => {
    setattr(ldisc, { setOflag: 0x0008 /* OCRNL */ | 0x0010 /* ONOCR */ });
    ldisc.writeFromUpper("foo\n\r\r\rbar\r\r\rbaz\n");
  });
});

test("output CR under OCRNL, ONOCR and ONLRET", () => {
  check("foo\nbar\t\b\b\b\b\b", "", (ldisc) => {
    setattr(ldisc, {
      setOflag: 0x0008 /* OCRNL */ | 0x0010 /* ONOCR */ | 0x0020 /* ONLRET */,
    });
    setattr(ldisc, { resetIflag: 0x0100 /* ICRNL */ });
    ldisc.writeFromUpper("foo\r");
    ldisc.writeFromLower("bar\t\x7f");
  });
});

test("output TAB", () => {
  check("foo\tbar\r\n", "", (ldisc) => {
    ldisc.writeFromUpper("foo\tbar\n");
  });
});

test("output characters under OLCUC", () => {
  check("FOOBAR\r\n", "", (ldisc) => {
    setattr(ldisc, { setOflag: 0x0002 /* OLCUC */ });
    ldisc.writeFromUpper("FooBar\n");
  });
});

test("test raw mode", () => {
  check("", "ABCDE", (ldisc) => {
    rawMode(ldisc);
    ldisc.writeFromLower("ABCDE");
  });

  check("", "ABCDE\n", (ldisc) => {
    rawMode(ldisc);
    ldisc.writeFromLower("ABCDE\r");
  });

  check("", "ABCDE\x7f", (ldisc) => {
    rawMode(ldisc);
    ldisc.writeFromLower("ABCDE\x7f");
  });
});
