import sys


def main():
    p, r, t = sys.stdin.read().split()
    principal = int(p)
    rate = float(r)
    years = int(t)
    comp = float(principal)
    factor = 1 + rate / 100
    for _ in range(years):
        comp *= factor
    simple = principal * rate * years / 100
    print(f"{abs(comp - simple):.2f}")


main()
