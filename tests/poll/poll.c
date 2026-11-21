// Checks that poll(2) and select(2) on the PTY honor their timeout, return
// as soon as the PTY becomes readable or writable, and are interrupted by a
// signal handler.
#include <errno.h>
#include <poll.h>
#include <signal.h>
#include <stdio.h>
#include <string.h>
#include <sys/select.h>
#include <termios.h>
#include <time.h>
#include <unistd.h>

static long now_ms(void) {
  struct timespec ts;
  clock_gettime(CLOCK_MONOTONIC, &ts);
  return ts.tv_sec * 1000L + ts.tv_nsec / 1000000L;
}

static int wait_for(int use_select, int fd, int for_write, int timeout_ms) {
  if (use_select) {
    fd_set fds;
    FD_ZERO(&fds);
    FD_SET(fd, &fds);
    struct timeval tv = { .tv_sec = timeout_ms / 1000, .tv_usec = timeout_ms % 1000 * 1000 };
    return select(fd + 1, for_write ? NULL : &fds, for_write ? &fds : NULL, NULL, &tv);
  } else {
    struct pollfd pfd = { .fd = fd, .events = for_write ? POLLOUT : POLLIN };
    return poll(&pfd, 1, timeout_ms);
  }
}

static void set_icanon(int on) {
  struct termios t;
  tcgetattr(0, &t);
  if (on) {
    t.c_lflag |= ICANON;
  } else {
    t.c_lflag &= ~ICANON;
  }
  tcsetattr(0, TCSANOW, &t);
}

static char results[1024];

static void report(const char *kind, const char *name, int ok, int ret, long elapsed) {
  size_t len = strlen(results);
  snprintf(results + len, sizeof(results) - len, "%s-%s: %s (ret=%d, %ldms)\n",
           kind, name, ok ? "ok" : "NG", ret, elapsed);
}

static volatile sig_atomic_t sigint_received;

static void sigint_handler(int sig) {
  sigint_received = 1;
}

int main(void) {
  // Without SA_RESTART, so that a signal interrupts poll/select with EINTR.
  struct sigaction sa;
  memset(&sa, 0, sizeof(sa));
  sa.sa_handler = sigint_handler;
  sigaction(SIGINT, &sa, NULL);

  struct termios t;
  tcgetattr(0, &t);
  t.c_lflag &= ~(ICANON | ECHO);
  t.c_iflag |= IXON;
  tcsetattr(0, TCSANOW, &t);

  printf("Poll test start\n");

  for (int use_select = 0; use_select <= 1; use_select++) {
    const char *kind = use_select ? "select" : "poll";
    char c;
    long t0, elapsed;
    int ret;

    // Without input, the wait should end at the timeout.
    t0 = now_ms();
    ret = wait_for(use_select, 0, 0, 300);
    elapsed = now_ms() - t0;
    report(kind, "timeout", ret == 0 && elapsed >= 250 && elapsed < 3000, ret, elapsed);

    // The PTY is writable, so waiting only for that should not block.
    t0 = now_ms();
    ret = wait_for(use_select, 1, 1, 10000);
    elapsed = now_ms() - t0;
    report(kind, "writable", ret == 1 && elapsed < 5000, ret, elapsed);

    // The wait should end as soon as a key arrives, not at the timeout.
    printf("%s-readable: press a key\n", kind);
    fflush(stdout);
    t0 = now_ms();
    ret = wait_for(use_select, 0, 0, 10000);
    elapsed = now_ms() - t0;
    read(0, &c, 1);
    report(kind, "readable", ret == 1 && elapsed < 5000, ret, elapsed);

    // A signal handler should interrupt the wait with EINTR.
    printf("%s-interrupted: press C-c\n", kind);
    fflush(stdout);
    sigint_received = 0;
    t0 = now_ms();
    ret = wait_for(use_select, 0, 0, 10000);
    int err = errno;
    elapsed = now_ms() - t0;
    report(kind, "interrupted", ret == -1 && err == EINTR && sigint_received && elapsed < 5000, ret, elapsed);

    // Stop the output with C-s, fill the PTY's output buffer, and wait for it
    // to become writable. The wait should end as soon as C-q resumes output.
    // (In the canonical mode, C-q does not make the PTY readable, so only the
    // writability can wake up the wait.)
    set_icanon(1);
    printf("%s-resumed: press C-s, Enter, and then C-q\n", kind);
    fflush(stdout);
    do {
      if (read(0, &c, 1) != 1) break;
    } while (c != '\n');
    char buf[8192];
    memset(buf, ' ', sizeof(buf));
    write(1, buf, sizeof(buf));
    t0 = now_ms();
    ret = wait_for(use_select, 1, 1, 10000);
    elapsed = now_ms() - t0;
    report(kind, "resumed", ret == 1 && elapsed < 5000, ret, elapsed);
    set_icanon(0);
  }

  printf("\033[2J\033[H%sPoll test end\n", results);
  return 0;
}
