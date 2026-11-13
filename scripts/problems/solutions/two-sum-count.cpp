#include <cstdio>
#include <unordered_map>
using namespace std;

struct Hash {
    size_t operator()(long long x) const {
        unsigned long long z = (unsigned long long)x + 0x9e3779b97f4a7c15ULL;
        z = (z ^ (z >> 30)) * 0xbf58476d1ce4e5b9ULL;
        z = (z ^ (z >> 27)) * 0x94d049bb133111ebULL;
        return (size_t)(z ^ (z >> 31));
    }
};

int main() {
    int n;
    long long target;
    if (scanf("%d %lld", &n, &target) != 2) return 1;
    unordered_map<long long, long long, Hash> seen;
    long long pairs = 0;
    for (int i = 0; i < n; i++) {
        long long x;
        if (scanf("%lld", &x) != 1) return 1;
        auto it = seen.find(target - x);
        if (it != seen.end()) pairs += it->second;
        seen[x]++;
    }
    printf("%lld\n", pairs);
    return 0;
}
