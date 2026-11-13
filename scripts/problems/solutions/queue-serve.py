import sys
from collections import deque


def main():
    tok = sys.stdin.read().split()
    n, q = int(tok[0]), int(tok[1])
    queue = deque((tok[2 + 2 * i], int(tok[3 + 2 * i])) for i in range(n))
    now = 0
    out = []
    while queue:
        name, remaining = queue.popleft()
        run = min(q, remaining)
        now += run
        remaining -= run
        if remaining:
            queue.append((name, remaining))
        else:
            out.append(f"{name} {now}")
    print('\n'.join(out))


main()
