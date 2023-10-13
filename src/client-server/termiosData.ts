import { Termios } from "../termios";

// Request types from a emscripten'ed process
export type TtyRequest =
  | { ttyRequestType: "read"; length: number }
  | { ttyRequestType: "write"; buf: number[] }
  | { ttyRequestType: "input" }
  | { ttyRequestType: "output"; char: number }
  | { ttyRequestType: "poll"; timeout: number }
  | { ttyRequestType: "tcgets" }
  | { ttyRequestType: "tcsets"; data: number[] }
  | { ttyRequestType: "tiocgwinsz" };

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
