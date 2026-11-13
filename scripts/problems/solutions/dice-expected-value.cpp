#include <cstdio>
#include <numeric>
using namespace std;

int main() {
    long long n;
    if (scanf("%lld", &n) != 1) return 1;
    long long num = 7 * n, den = 2;
    long long g = gcd(num, den);
    num /= g;
    den /= g;
    if (den == 1) printf("%lld\n", num);
    else printf("%lld/%lld\n", num, den);
    return 0;
}
