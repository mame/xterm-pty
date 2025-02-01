#include <stdio.h>
#include <string.h>

int main() {
  puts("Echo start");
  while (1) {
	char buf[1024];
	if (!fgets(buf, sizeof(buf), stdin)) break;
	fwrite(buf, 1, strlen(buf), stdout);
  }
  puts("Echo end");
  return 0;
}