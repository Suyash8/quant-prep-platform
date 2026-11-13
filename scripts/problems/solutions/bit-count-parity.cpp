#include <cstdint>
#include <cstdio>
using namespace std;

int main() {
    int t;
    if (scanf("%d", &t) != 1) return 1;
    while (t--) {
        unsigned long long x, y;
        if (scanf("%llu %llu", &x, &y) != 2) return 1;
        puts(__builtin_popcountll(x & y) % 2 ? "ODD" : "EVEN");
    }
    return 0;
}
