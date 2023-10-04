#include <stdio.h>
#include <string.h>
#include <termios.h>
#include <emscripten/version.h>

int main() {
    char name[256], passwd[256];
    struct termios t;

    puts("\e[31mH\e[32me\e[33ml\e[34ml\e[35mo\e[36m!\e[0m");
    puts("");
    printf("EMSCRIPTEN_VERSION: %d.%d.%d\n", __EMSCRIPTEN_major__, __EMSCRIPTEN_minor__, __EMSCRIPTEN_tiny__);
    puts("");
    puts("This is a sample program of xterm-pty.");
    puts("You can exit this program by Ctrl+D.");
    puts("");

    for (;;) {
        printf("[Echo ON] Input your name: ");
        fflush(stdout);
        if (!fgets(name, 256, stdin)) break;
        name[strlen(name) - 1] = '\0';

	tcgetattr(0, &t);
	t.c_lflag &= ~ECHO;
	tcsetattr(0, TCSANOW, &t);

        printf("[Echo OFF] Input your password: ");
        fflush(stdout);
        if (!fgets(passwd, 256, stdin)) break;

	tcgetattr(0, &t);
	t.c_lflag |= ECHO;
	tcsetattr(0, TCSANOW, &t);

        puts("");
        printf("Hello, %s! The length of your password is %ld.\n", name, strlen(passwd) - 1);
        puts("");
    }

    puts("");
    puts("Good bye!");

    return 0;
}
