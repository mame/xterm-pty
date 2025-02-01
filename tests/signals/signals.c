#define _GNU_SOURCE
#include <stdio.h>
#include <sys/ioctl.h>
#include <signal.h>
#include <unistd.h>
#include <errno.h>

int received_signum = -1;
void handler(int signum) {
	received_signum = signum;
}

void show_terminal_size() {
	struct winsize ws;
	ioctl(0, TIOCGWINSZ, &ws);
	printf("terminal size: %d rows, %d columns\n", ws.ws_row, ws.ws_col);
}

int main(void) {
	struct sigaction sa;
	sa.sa_handler = handler;
	sa.sa_flags = 0;
	sigemptyset(&sa.sa_mask);
	sigaction(SIGINT, &sa, NULL);
	sigaction(SIGWINCH, &sa, NULL);
	show_terminal_size();
	while (1) {
		char buf[1024];
		received_signum = -1;
		ssize_t n = read(0, buf, sizeof(buf));
		if (n == -1 && errno == EINTR) {
			switch (received_signum) {
				case SIGINT:
					puts("received SIGINT");
					break;
				case SIGWINCH: {
					puts("received SIGWINCH");
					show_terminal_size();
					break;
				}
				default:
					printf("received signum: %d\n", received_signum);
			}
		}
	}
	return 0;
}