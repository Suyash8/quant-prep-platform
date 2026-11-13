#include <cstdio>
#include <vector>
using namespace std;

int main() {
    int c, t;
    if (scanf("%d %d", &c, &t) != 2) return 1;
    vector<long long> slots(c, 0);
    int head = 0, tail = 0;
    while (t--) {
        char op[8];
        if (scanf("%7s", op) != 1) return 1;
        if (op[1] == 'U') {  // PUSH
            long long x;
            if (scanf("%lld", &x) != 1) return 1;
            if ((tail + 1) % c == head) {
                puts("FULL");
            } else {
                slots[tail] = x;
                tail = (tail + 1) % c;
                puts("OK");
            }
        } else {  // POP
            if (head == tail) {
                puts("EMPTY");
            } else {
                printf("%lld\n", slots[head]);
                head = (head + 1) % c;
            }
        }
    }
    printf("HEAD %d TAIL %d SIZE %d\n", head, tail, (tail - head + c) % c);
    return 0;
}
