
import '@xterm/xterm/css/xterm.css';
import { Terminal } from '@xterm/xterm';
import { openpty } from 'xterm-pty';
import initEmscripten from './hello.mjs';

const xterm = new Terminal();
xterm.open(document.getElementById('terminal'));

// Create master/slave objects
const { master, slave } = openpty();

// Connect the master object to xterm.js
xterm.loadAddon(master);

// Start Emscripten with the slave object as a PTY
initEmscripten({ pty: slave });