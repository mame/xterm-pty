// Checks that poll(2) and select(2) on the PTY wake up as soon as the PTY
// becomes readable, and that a signal handler interrupts them.
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
  tcsetattr(0, TCSANOW, &t);

  printf("Poll test start\n");

  for (int use_select = 0; use_select <= 1; use_select++) {
    const char *kind = use_select ? "select" : "poll";
    char c;
    long t0, elapsed;
    int ret;

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
  }

  printf("\033[2J\033[H%sPoll test end\n", results);
  return 0;
}
