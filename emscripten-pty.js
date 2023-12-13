const Lib = LibraryManager.library;

Lib.$ENV['TERM'] = 'xterm-256color';

function findFuncKeys(name) {
    return Object.keys(Lib).filter(k => k === name || k.startsWith(`${name}__`));
}

function deleteFuncKeys(name) {
    for (let k of findFuncKeys(name)) {
        delete Lib[k];
    }
}

function renameFuncKeys(name, newName) {
    for (let k of findFuncKeys(name)) {
        Lib[newName + k.slice(name.length)] = Lib[k];
        delete Lib[k];
    }
}

function ifPThread(name, implPThread, implMainThread) {
    // assume all deps are private (`$foo`) in this helper
    const getDepName = impl => '$' + impl.match(/^\w+/)[0];

    return {
        [`${name}__deps`]: [
#if PTHREADS
            getDepName(implPThread),
#endif
#if !PROXY_TO_PTHREAD
            getDepName(implMainThread),
#endif
        ],

        [name]:
#if PROXY_TO_PTHREAD
            implPThread,
#elif PTHREADS
            `ENVIRONMENT_IS_PTHREAD ? ${implPThread} : ${implMainThread}`,
#else
            implMainThread,
#endif
    };
}

// Rename fd_read and its config to internal $xterm_pty_old_fd_read - we're going to wrap it.
renameFuncKeys('fd_read', '$xterm_pty_old_fd_read');

// Same for __syscall__newselect and __syscall_poll.
renameFuncKeys('__syscall__newselect', '$xterm_pty_old_newselect');
renameFuncKeys('__syscall_poll', '$xterm_pty_old_poll');

// Remove FS_stdin_getChar, its config and buffer altogether - we're going to implement higher-level bulk reading.
deleteFuncKeys('$FS_stdin_getChar');
deleteFuncKeys('$FS_stdin_getChar_buffer');
Lib.$TTY__deps = Lib.$TTY__deps.filter(d => d !== '$FS_stdin_getChar');

Object.assign(Lib, {
    $PTY_signalNameToCode: {
        "SIGINT": 2,
        "SIGQUIT": 3,
        "SIGTSTP": 20,
        "SIGWINCH": 28,
    },

    $PTY: `Module['pty']`,
    $PTY__deps: ['raise', '$PTY_signalNameToCode'],
    $PTY__postset: () => addAtInit(`
        PTY.onSignal((signalName) => {
            let signalCode = PTY_signalNameToCode[signalName];
#if ASSERTIONS
            assert(signalCode, \`Unsupported signal: \${signalCode}. Please report this error to xterm-pty.\`);
#endif
            _raise(signalCode);
        });
    `),

    $PTY_pollTimeout: 0,

    $PTY_askToWaitAgain__deps: ['$PTY_pollTimeout', '$FS'],
    $PTY_askToWaitAgain: (timeout) => {
        PTY_pollTimeout = timeout;
        throw new FS.ErrnoError({{{ 1000 + cDefs.EAGAIN }}});
    },

    $PTY_waitForReadableWithCallback__deps: ['$PTY', '$PTY_pollTimeout'],
    $PTY_waitForReadableWithCallback: (callback) => {
        if (PTY_pollTimeout === 0) {
            return callback(PTY.readable);
        }
        let handlerReadable, handlerSignal, timeoutId;
        new Promise((resolve) => {
            handlerReadable = PTY.onReadable(() => resolve(0 /* ready */));

            // We need to stop select(2) when a signal is caught.
            //
            // TODO: In fact, it should be stopped "when a signal handler is called," not "a the signal is received."
            // If the signal handler is set as SIG_IGN, select(2) should not be stopped.
            handlerSignal = PTY.onSignal(() => resolve(1 /* interrupted */));

            if (PTY_pollTimeout >= 0) {
                // if negative timeout, don't stop early (in poll-like functions it means infinite wait),
                // otherwise wait specified number of ms.
                timeoutId = setTimeout(resolve, PTY_pollTimeout, 2 /* timeout */);
            }
        })
        .then(type => {
            handlerReadable.dispose();
            handlerSignal.dispose();
            // note: it's fine to call even with undefined timeoutId
            clearTimeout(timeoutId);
            callback(type);
        });
    },

#if PTHREADS
    $PTY_handleSleepWithAtomic: (startAsync) => {
        let result;
        startAsync(r => result = r);
        return result;
    },

    $PTY_waitForReadableWithAtomicImpl__deps: ['$PTY_waitForReadableWithCallback'],
    $PTY_waitForReadableWithAtomicImpl: (atomicIndex) => {
        PTY_waitForReadableWithCallback(type => {
            Atomics.store(HEAP32, atomicIndex, type);
            Atomics.notify(HEAP32, atomicIndex);
        });
    },
    $PTY_waitForReadableWithAtomicImpl__proxy: 'async',

    $PTY_atomicIndex: 0,

    $PTY_waitForReadableWithAtomic__deps: ['$PTY_waitForReadableWithAtomicImpl', '$PTY_atomicIndex'],
    $PTY_waitForReadableWithAtomic: (callback) => {
        if (!PTY_atomicIndex) {
            PTY_atomicIndex = _malloc(4) >> 2;
        }
        HEAP32[PTY_atomicIndex] = -1;
        PTY_waitForReadableWithAtomicImpl(PTY_atomicIndex);
        Atomics.wait(HEAP32, PTY_atomicIndex, -1);
        callback(HEAP32[PTY_atomicIndex]);
    },
#endif

#if !PROXY_TO_PTHREAD && !ASYNCIFY
#error "Either PROXY_TO_PTHREAD or ASYNCIFY must be enabled for PTY integration"
#endif

    ...ifPThread('$PTY_handleSleep', 'PTY_handleSleepWithAtomic', 'Asyncify.handleSleep'),
    ...ifPThread('$PTY_waitForReadable', 'PTY_waitForReadableWithAtomic', 'PTY_waitForReadableWithCallback'),

    fd_read__deps: ['$PTY_handleSleep', '$PTY_waitForReadable', '$xterm_pty_old_fd_read'],
    // Note: intentionally using handleSleep instead of handleAsync as it can avoid pausing Wasm
    // when fd_read is invoked on non-TTY FDs, while Promises always pause.
    fd_read: (fd, iov, iovcnt, pnum) => PTY_handleSleep((wakeUp) => {
        let result = xterm_pty_old_fd_read(fd, iov, iovcnt, pnum);
        // Did this call return our variant of EAGAIN?
        // If so, that means it called into the PTY and the buffer was empty.
        if (result === {{{ 1000 + cDefs.EAGAIN }}}) {
            // Wait for the PTY to become readable and try again.
            PTY_waitForReadable(() => wakeUp(xterm_pty_old_fd_read(fd, iov, iovcnt, pnum)));
        } else {
            wakeUp(result);
        }
    }),
#if !PROXY_TO_PTHREAD
    fd_read__async: true,
#endif

    $PTY_wrapPoll__deps: ['$PTY_waitForReadable', '$PTY_handleSleep'],
    $PTY_wrapPoll: (impl) => PTY_handleSleep((wakeUp) => {
        let result = impl();
        // Did this call return our variant of EAGAIN?
        // If so, that means it called into the PTY and the buffer was empty.
        if (result === -{{{ 1000 + cDefs.EAGAIN }}}) {
            // Wait for the PTY to become readable and try again.
            PTY_waitForReadable(type => {
                switch (type) {
                    case 0: /* ready */
                        wakeUp(impl());
                        break;
                    case 1: /* interrupted */
                        wakeUp(-{{{ cDefs.EINTR }}});
                        break;
                    case 2: /* timeout */
                        wakeUp(0);
                        break;
                }
            });
        } else {
            wakeUp(result);
        }
    }),

    __syscall__newselect__deps: ['$xterm_pty_old_newselect', '$PTY_wrapPoll'],
    __syscall__newselect: (nfds, readfds, writefds, exceptfds, timeout) => (
        PTY_wrapPoll(() => xterm_pty_old_newselect(nfds, readfds, writefds, exceptfds, timeout))
    ),
#if !PROXY_TO_PTHREAD
    __syscall__newselect__async: true,
#endif

    __syscall_poll__deps: ['$xterm_pty_old_poll', '$PTY_wrapPoll'],
    __syscall_poll: (fds, nfds, timeout) => PTY_wrapPoll(() => xterm_pty_old_poll(fds, nfds, timeout)),
#if !PROXY_TO_PTHREAD
    __syscall_poll__async: true,
#endif
});

// Override default TTY ops to use our PTY.
// Doing this at compile-time reduces amount of generated unused JS.
Lib.$TTY__deps.push('$PTY', '$PTY_askToWaitAgain');

let outputTtyOps = {
    put_char: () => {
#if ASSERTIONS
        abort('Individual put_char should never be called - please raise a bug against xterm-pty');
#endif
    },

    fsync: () => {},
};

Object.assign(Lib.$TTY.default_tty_ops, {
    ioctl_tcgets: () => {
        const termios = PTY.ioctl('TCGETS');
        const data = {
            c_iflag: termios.iflag,
            c_oflag: termios.oflag,
            c_cflag: termios.cflag,
            c_lflag: termios.lflag,
            c_cc: termios.cc,
        }
        return data;
    },

    ioctl_tcsets: (_tty, _optional_actions, data) => {
        PTY.ioctl('TCSETS', {
            iflag: data.c_iflag,
            oflag: data.c_oflag,
            cflag: data.c_cflag,
            lflag: data.c_lflag,
            cc: data.c_cc,
        });
        return 0;
    },

    ioctl_tiocgwinsz: () => PTY.ioctl('TIOCGWINSZ').reverse(),

    get_char: () => {
#if ASSERTIONS
        abort('Individual get_char should never be called - please raise a bug against xterm-pty');
#endif
    },

    ...outputTtyOps,
});

Lib.$TTY.default_tty1_ops = outputTtyOps;

Object.assign(Lib.$TTY.stream_ops, {
    read: (stream, buffer, offset, length) => {
        let readBytes = PTY.read(length);
        if (length && !readBytes.length) {
            PTY_askToWaitAgain(-1);
        }
        buffer.set(readBytes, offset);
        return readBytes.length;
    },

    write: (stream, buffer, offset, length) => {
        // Note: default `buffer` is for some reason `HEAP8` (signed), while we want unsigned `HEAPU8`.
        if (buffer === HEAP8) {
            buffer = HEAPU8;
        } else if (!(buffer instanceof Uint8Array)) {
            throw new Error(`Unexpected buffer type: ${buffer.constructor.name}`);
        }
        PTY.write(Array.from(buffer.subarray(offset, offset + length)));
        return length;
    },

    poll: (stream, timeout) => {
        if (!PTY.readable && timeout) {
            PTY_askToWaitAgain(timeout);
        }
        return (PTY.readable ? {{{ cDefs.POLLIN }}} : 0) | (PTY.writable ? {{{ cDefs.POLLOUT }}} : 0);
    },
});
