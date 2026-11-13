#include <cmath>
#include <cstdio>
using namespace std;

int main() {
    long long principal, years;
    double rate;
    if (scanf("%lld %lf %lld", &principal, &rate, &years) != 3) return 1;
    double comp = (double)principal;
    double factor = 1 + rate / 100;
    for (long long i = 0; i < years; i++) comp *= factor;
    double simple = principal * rate * years / 100;
    printf("%.2f\n", fabs(comp - simple));
    return 0;
}
