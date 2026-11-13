import sys


def main():
    lines = sys.stdin.read().split('\n')
    c, t = map(int, lines[0].split())
    slots = [0] * c
    head = tail = 0
    out = []
    for line in lines[1:1 + t]:
        parts = line.split()
        if parts[0] == 'PUSH':
            if (tail + 1) % c == head:
                out.append('FULL')
            else:
                slots[tail] = int(parts[1])
                tail = (tail + 1) % c
                out.append('OK')
        else:
            if head == tail:
                out.append('EMPTY')
            else:
                out.append(str(slots[head]))
                head = (head + 1) % c
    out.append(f"HEAD {head} TAIL {tail} SIZE {(tail - head + c) % c}")
    print('\n'.join(out))


main()
