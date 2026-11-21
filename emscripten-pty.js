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

// Newer Emscripten provides an async __syscall_poll (select is also
// implemented with it), which can wait for stream_ops.poll to notify it.
// Emscripten 5.x passes a notify callback to stream_ops.poll (3rd argument).
// Older Emscripten has only a synchronous poll/select that we still need to
// wrap with PTY_wrapPoll.
// Newer Emscripten (5.0+) uses __async: 'auto' instead of __async: true,
// so accept any truthy value here.
const hasAsyncPoll = !!Lib['__syscall_poll__async'];

// Emscripten 6.0+ replaced the notifyCallback of stream_ops.poll with a
// per-node readiness wait-queue (FSNode.addListener / notifyListeners): a
// waiting poll/select registers itself on the node and re-checks the
// readiness when the node is notified.
const hasPollWaitQueue = !!Lib['$doPollAsync'];

if (!hasAsyncPoll) {
    renameFuncKeys('__syscall__newselect', '$xterm_pty_old_newselect');
    renameFuncKeys('__syscall_poll', '$xterm_pty_old_poll');
}

if (hasAsyncPoll) {
    // Wrap __syscall_poll to make a signal handler interrupt it with EINTR.
    // The wrapper takes over the metadata, and the original becomes a plain internal function.
    renameFuncKeys('__syscall_poll', '$xterm_pty_old_poll');
    // Renaming marks it as a user library symbol, which makes Emscripten warn
    // that it depends on internal symbols ($doPollSync etc.). It is still
    // Emscripten's own function, so unmark it.
    delete Lib['$xterm_pty_old_poll__user'];
    for (const key of ['__proxy', '__async', '__sig', '__i53abi']) {
        if (Lib['$xterm_pty_old_poll' + key] !== undefined) {
            Lib['__syscall_poll' + key] = Lib['$xterm_pty_old_poll' + key];
            delete Lib['$xterm_pty_old_poll' + key];
        }
    }
}

// Remove FS_stdin_getChar, its config and buffer altogether - we're going to implement higher-level bulk reading.
deleteFuncKeys('$FS_stdin_getChar');
deleteFuncKeys('$FS_stdin_getChar_buffer');
// Emscripten 7 no longer defines this metadata field (libtty.js dropped its
// dependency list), so update it only when it exists.
if (Lib.$TTY__deps) {
    Lib.$TTY__deps = Lib.$TTY__deps.filter(d => d !== '$FS_stdin_getChar');
}

Object.assign(Lib, {
    $PTY_signalNameToCode: {
        "SIGINT": 2,
        "SIGQUIT": 3,
        "SIGTSTP": 20,
        "SIGWINCH": 28,
    },

    $PTY: `Module['pty']`,
    $PTY_sighandlerCalled: false,
    $PTY__deps: ['malloc', 'sigaction', 'raise', '$PTY_signalNameToCode', '$PTY_sighandlerCalled'],
    $PTY__postset: () => addAtInit(`
        var sigactionIndex = _malloc(256 /* sizeof(struct sigaction) */);
        PTY.onSignal((signalName) => {
            let signalCode = PTY_signalNameToCode[signalName];
#if ASSERTIONS
            assert(signalCode, \`Unsupported signal: \${signalName}. Please report this error to xterm-pty.\`);
#endif

            // check if a signal handler will be called
            HEAP32[sigactionIndex >> 2] = -1;
            const ret = _sigaction(signalCode, 0, sigactionIndex);
            const sighandler = HEAP32[sigactionIndex >> 2];
            // SIG_DFL is 0 and SIG_IGN is -2 in Emscripten, so
            // a positive value should be a function
            if (sighandler > 0) {
                PTY_sighandlerCalled = true;
            }

            _raise(signalCode);
        });
    `),

    $PTY_askToWaitAgain__deps: ['$FS'],
    $PTY_askToWaitAgain: () => {
        throw new FS.ErrnoError({{{ 1000 + cDefs.EAGAIN }}});
    },

    // Waits until the PTY becomes readable (or writable, if `wantWritable`),
    // a signal handler is called, or `timeout` ms elapse (negative: forever).
    $PTY_waitWithCallback__deps: ['$PTY', '$PTY_sighandlerCalled'],
    $PTY_waitWithCallback: (callback, timeout, wantWritable) => {
        if (timeout === 0) {
            return callback(PTY.readable ? 0 /* ready */ : 2 /* timeout */);
        }
        let handlerReadable, handlerWritable, handlerSignal, timeoutId;
        new Promise((resolve) => {
            handlerReadable = PTY.onReadable(() => resolve(0 /* ready */));
            if (wantWritable) {
                handlerWritable = PTY.onWritable(() => resolve(0 /* ready */));
            }

            handlerSignal = PTY.onSignal((signalName) => {
                const interrupt = PTY_sighandlerCalled;
                PTY_sighandlerCalled = false;
                if (interrupt) {
                    // when a signal handler is called, some IO-blocking syscalls like
                    // select(2) and read(2) should be interrupted by EINTR.
                    return resolve(1 /* interrupted */);
                }
            });

            if (timeout >= 0) {
                // if negative timeout, don't stop early (in poll-like functions it means infinite wait),
                // otherwise wait specified number of ms.
                timeoutId = setTimeout(resolve, timeout, 2 /* timeout */);
            }
        })
        .then(type => {
            handlerReadable.dispose();
            handlerWritable?.dispose();
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

    $PTY_waitWithAtomicImpl__deps: ['$PTY_waitWithCallback'],
    $PTY_waitWithAtomicImpl: (atomicIndex, timeout, wantWritable) => {
        PTY_waitWithCallback(type => {
            Atomics.store(HEAP32, atomicIndex, type);
            Atomics.notify(HEAP32, atomicIndex);
        }, timeout, wantWritable);
    },
    $PTY_waitWithAtomicImpl__proxy: 'async',

    $PTY_atomicIndex: 0,

    $PTY_waitWithAtomic__deps: ['$PTY_waitWithAtomicImpl', '$PTY_atomicIndex', 'malloc'],
    $PTY_waitWithAtomic: (callback, timeout, wantWritable) => {
        if (!PTY_atomicIndex) {
            PTY_atomicIndex = _malloc(4) >> 2;
        }
        HEAP32[PTY_atomicIndex] = -1;
        PTY_waitWithAtomicImpl(PTY_atomicIndex, timeout, wantWritable ? 1 : 0);
        Atomics.wait(HEAP32, PTY_atomicIndex, -1);
        callback(HEAP32[PTY_atomicIndex]);
    },
#endif

#if !PROXY_TO_PTHREAD && !ASYNCIFY
#error "Either PROXY_TO_PTHREAD or ASYNCIFY must be enabled for PTY integration"
#endif

    ...ifPThread('$PTY_handleSleep', 'PTY_handleSleepWithAtomic', 'Asyncify.handleSleep'),
    ...ifPThread('$PTY_wait', 'PTY_waitWithAtomic', 'PTY_waitWithCallback'),

    fd_read__deps: ['$PTY_handleSleep', '$PTY_wait', '$xterm_pty_old_fd_read'],
    // Note: intentionally using handleSleep instead of handleAsync as it can avoid pausing Wasm
    // when fd_read is invoked on non-TTY FDs, while Promises always pause.
    fd_read: (fd, iov, iovcnt, pnum) => PTY_handleSleep((wakeUp) => {
        let result = xterm_pty_old_fd_read(fd, iov, iovcnt, pnum);
        // Did this call return our variant of EAGAIN?
        // If so, that means it called into the PTY and the buffer was empty.
        if (result === {{{ 1000 + cDefs.EAGAIN }}}) {
            // Wait for the PTY to become readable and try again.
            PTY_wait((type) => {
                switch (type) {
                    case 0: /* ready */
                        const inner = xterm_pty_old_fd_read(fd, iov, iovcnt, pnum);
                        if (inner == {{{ 1000 + cDefs.EAGAIN }}}) {
                          // Despite the fact that we are in the readable state,
                          // TTY.read returned our variant of EAGAIN again.
                          // This means that a readable state was due to EOF.
                          // Therefore, we return 0 to indicate that
                          // it has successfully read 0 bytes (i.e., EOF).
                          HEAP32[(pnum)>>2] = 0;
                          wakeUp(0);
                        } else {
                          wakeUp(inner);
                        }
                        break;
                    case 1: /* interrupted */
                        wakeUp({{{ cDefs.EINTR }}});
                        break;
                    case 2: /* timeout */
                        wakeUp(0);
                        break;
                }
            }, -1 /* no timeout */, false);
        } else {
            wakeUp(result);
        }
    }),
#if !PROXY_TO_PTHREAD
    fd_read__async: true,
#endif

});

if (!hasAsyncPoll) {
    // Older Emscripten has only a synchronous poll/select, which neither waits
    // nor (for poll) even passes its timeout to stream_ops.poll. So we wrap
    // them: probe the readiness, and if nothing is ready but the PTY is among
    // the polled FDs, wait for the PTY to change (or the timeout) and re-probe.
    Object.assign(Lib, {
        $PTY_polled: false,

        // These run on the main thread, where the FS and the PTY live.
        // They return our variant of EAGAIN if nothing is ready and the PTY was polled.
        $PTY_probePoll__deps: ['$xterm_pty_old_poll', '$PTY_polled'],
        $PTY_probePoll__proxy: 'sync',
        $PTY_probePoll: (fds, nfds, timeout) => {
            PTY_polled = false;
            const result = xterm_pty_old_poll(fds, nfds, timeout);
            return result === 0 && PTY_polled ? -{{{ 1000 + cDefs.EAGAIN }}} : result;
        },

        $PTY_probeSelect__deps: ['$xterm_pty_old_newselect', '$PTY_polled'],
        $PTY_probeSelect__proxy: 'sync',
        $PTY_probeSelect: (nfds, readfds, writefds, exceptfds, timeout) => {
            PTY_polled = false;
            const result = xterm_pty_old_newselect(nfds, readfds, writefds, exceptfds, timeout);
            return result === 0 && PTY_polled ? -{{{ 1000 + cDefs.EAGAIN }}} : result;
        },

        $PTY_wrapPoll__deps: ['$PTY_wait', '$PTY_handleSleep'],
        $PTY_wrapPoll: (probe, timeout) => PTY_handleSleep((wakeUp) => {
            const start = Date.now();
            const attempt = () => {
                const result = probe();
                if (result !== -{{{ 1000 + cDefs.EAGAIN }}}) {
                    return wakeUp(result);
                }
                const remaining = timeout < 0 ? -1 : Math.max(0, timeout - (Date.now() - start));
                if (remaining === 0) {
                    return wakeUp(0);
                }
                // Wait for the PTY to become readable or writable and try again.
                PTY_wait(type => {
                    switch (type) {
                        case 0: /* ready */
                            attempt();
                            break;
                        case 1: /* interrupted */
                            wakeUp(-{{{ cDefs.EINTR }}});
                            break;
                        case 2: /* timeout */
                            wakeUp(0);
                            break;
                    }
                }, remaining, true);
            };
            attempt();
        }),

        __syscall__newselect__deps: ['$PTY_probeSelect', '$PTY_wrapPoll'],
        __syscall__newselect: (nfds, readfds, writefds, exceptfds, timeout) => {
            // musl passes the timeval as an array of two longs.
            const ms = timeout
                ? {{{ makeGetValue('timeout', 0, 'i32') }}} * 1000 + {{{ makeGetValue('timeout', POINTER_SIZE, 'i32') }}} / 1000
                : -1;
            // The original select overwrites the fd sets (only their first 64
            // bits are used) even if nothing is ready, so restore them before
            // each probe.
            const sets = [readfds, writefds, exceptfds].filter(p => p);
            const saved = sets.map(p => [{{{ makeGetValue('p', 0, 'i32') }}}, {{{ makeGetValue('p', 4, 'i32') }}}]);
            return PTY_wrapPoll(() => {
                sets.forEach((p, i) => {
                    {{{ makeSetValue('p', 0, 'saved[i][0]', 'i32') }}};
                    {{{ makeSetValue('p', 4, 'saved[i][1]', 'i32') }}};
                });
                return PTY_probeSelect(nfds, readfds, writefds, exceptfds, timeout);
            }, ms);
        },
#if !PROXY_TO_PTHREAD
        __syscall__newselect__async: true,
#endif

        __syscall_poll__deps: ['$PTY_probePoll', '$PTY_wrapPoll'],
        __syscall_poll: (fds, nfds, timeout) => PTY_wrapPoll(() => PTY_probePoll(fds, nfds, timeout), timeout),
#if !PROXY_TO_PTHREAD
        __syscall_poll__async: true,
#endif
    });
}

if (hasAsyncPoll) {
    Object.assign(Lib, {
        // The FS nodes of the PTY that poll/select may wait on.
        $PTY_pollNodes: 'new Set()',

        // Make sure that the wait-queue of the node is notified whenever the
        // PTY becomes readable or writable; otherwise a poll/select with a
        // timeout sleeps until the timeout expires even if input arrives.
        // The handlers are registered once per node and kept: when nobody is
        // waiting, notifyListeners is a no-op.
        $PTY_watchNodeForPoll__deps: ['$PTY', '$PTY_pollNodes', '$PTY_pollWaiting', '$PTY_pollInterrupting', '$PTY_sighandlerCalled'],
        $PTY_watchNodeForPoll: (node) => {
            if (PTY_pollNodes.has(node)) return;
            if (!PTY_pollNodes.size) {
                // When a signal handler is called while poll/select is
                // waiting, end the wait by making the PTY report POLLERR
                // during the notification. The wrapper of __syscall_poll
                // turns it into EINTR.
                PTY.onSignal(() => {
                    if (!PTY_pollWaiting || !PTY_sighandlerCalled) return;
                    PTY_sighandlerCalled = false;
                    PTY_pollInterrupting = true;
                    for (const n of PTY_pollNodes) n.notifyListeners({{{ cDefs.POLLERR }}});
                    PTY_pollInterrupting = false;
                });
            }
            PTY_pollNodes.add(node);
            PTY.onReadable(() => node.notifyListeners({{{ cDefs.POLLIN }}}));
            PTY.onWritable(() => node.notifyListeners({{{ cDefs.POLLOUT }}}));
        },

        // The number of poll/select calls that are waiting.
        $PTY_pollWaiting: 0,

        // True while poll/select calls are being interrupted by a signal.
        $PTY_pollInterrupting: false,

        __syscall_poll__deps: ['$xterm_pty_old_poll', '$PTY_beforePoll', '$PTY_pollNodes', '$PTY_pollWaiting', '$FS'],
        __syscall_poll: (fds, nfds, timeout) => {
            // The original takes `sync` as an extra argument since
            // Emscripten 7.0: whether it must complete synchronously.
#if ASYNCIFY
            var sync = false;
#elif PTHREADS
            var sync = !PThread.currentProxiedOperationCallerThread;
#else
            var sync = true;
#endif
            PTY_beforePoll(fds, nfds);
            var result = xterm_pty_old_poll(fds, nfds, timeout, sync);
            if (!(result instanceof Promise)) return result;
            PTY_pollWaiting++;
            return result.then((count) => {
                PTY_pollWaiting--;
                // The PTY reports POLLERR only when interrupted by a signal.
                for (var i = 0; i < nfds; i++) {
                    var pollfd = fds + {{{ C_STRUCTS.pollfd.__size__ }}} * i;
                    var revents = {{{ makeGetValue('pollfd', C_STRUCTS.pollfd.revents, 'i16') }}};
                    var stream = FS.getStream({{{ makeGetValue('pollfd', C_STRUCTS.pollfd.fd, 'i32') }}});
                    if ((revents & {{{ cDefs.POLLERR }}}) && stream && PTY_pollNodes.has(stream.node)) {
                        return -{{{ cDefs.EINTR }}};
                    }
                }
                return count;
            });
        },

        // Emscripten 5.x: the notify callback passed to stream_ops.poll must
        // be called with an event that the pollfd requests, but
        // stream_ops.poll cannot see the pollfd. So the events requested for
        // the PTY are queued here before the original __syscall_poll calls
        // stream_ops.poll for each pollfd in order.
        $PTY_pollEvents: '[]',

        $PTY_beforePoll__deps: ['$PTY_pollEvents', '$FS'],
        $PTY_beforePoll: hasPollWaitQueue ? () => {} : (fds, nfds) => {
            PTY_pollEvents.length = 0;
            for (var i = 0; i < nfds; i++) {
                var pollfd = fds + {{{ C_STRUCTS.pollfd.__size__ }}} * i;
                var stream = FS.getStream({{{ makeGetValue('pollfd', C_STRUCTS.pollfd.fd, 'i32') }}});
                if (stream?.tty) {
                    PTY_pollEvents.push({{{ makeGetValue('pollfd', C_STRUCTS.pollfd.events, 'i16') }}});
                }
            }
        },
    });
}

// Override default TTY ops to use our PTY.
// Doing this at compile-time reduces amount of generated unused JS.
if (Lib.$TTY__deps) {
    Lib.$TTY__deps.push('$PTY', '$PTY_askToWaitAgain');
    if (hasPollWaitQueue) {
        Lib.$TTY__deps.push('$PTY_watchNodeForPoll', '$PTY_pollInterrupting');
    } else if (hasAsyncPoll) {
        Lib.$TTY__deps.push('$PTY_pollNodes', '$PTY_pollEvents', '$PTY_sighandlerCalled');
    }
    if (!hasAsyncPoll) {
        Lib.$TTY__deps.push('$PTY_polled');
    }
}

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
            PTY_askToWaitAgain();
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

    poll: hasPollWaitQueue
        ? (stream) => {
            // Emscripten 6.0+: a waiting poll/select waits on the node's
            // wait-queue, so we just have to notify it (see above).
            PTY_watchNodeForPoll(stream.node);
            if (PTY_pollInterrupting) return {{{ cDefs.POLLERR }}};
            return (PTY.readable ? {{{ cDefs.POLLIN }}} : 0) | (PTY.writable ? {{{ cDefs.POLLOUT }}} : 0);
        }
        : hasAsyncPoll
        ? (stream, timeout, notifyCallback) => {
            // Emscripten 5.x: the caller passes a notifyCallback when it
            // wants to wait. Call it when the PTY becomes ready for the
            // requested events, or with POLLERR when a signal handler is
            // called (the wrapper of __syscall_poll turns it into EINTR).
            var events = PTY_pollEvents.shift() ?? ({{{ cDefs.POLLIN }}} | {{{ cDefs.POLLOUT }}});
            PTY_pollNodes.add(stream.node);
            var flags = (PTY.readable ? {{{ cDefs.POLLIN }}} : 0) | (PTY.writable ? {{{ cDefs.POLLOUT }}} : 0);
            if (notifyCallback && !(flags & events)) {
                var handlers = [];
                if (events & {{{ cDefs.POLLIN }}}) {
                    handlers.push(PTY.onReadable(() => notifyCallback({{{ cDefs.POLLIN }}})));
                }
                if (events & {{{ cDefs.POLLOUT }}}) {
                    handlers.push(PTY.onWritable(() => notifyCallback({{{ cDefs.POLLOUT }}})));
                }
                handlers.push(PTY.onSignal(() => {
                    if (!PTY_sighandlerCalled) return;
                    PTY_sighandlerCalled = false;
                    notifyCallback({{{ cDefs.POLLERR }}});
                }));
                notifyCallback.registerCleanupFunc(() => handlers.forEach((h) => h.dispose()));
            }
            return flags;
        }
        : (stream, timeout) => {
            // Older Emscripten: let PTY_wrapPoll know that it should wait for
            // the PTY if nothing is ready.
            PTY_polled = true;
            return (PTY.readable ? {{{ cDefs.POLLIN }}} : 0) | (PTY.writable ? {{{ cDefs.POLLOUT }}} : 0);
        },
});
