#!/usr/bin/env python3
"""QA helper: mark every lesson as mastered for a test user so any lesson
can be spot-checked in the browser. Usage: python3 scripts/unlock-all.py [email]"""
import json, os, sqlite3, datetime, uuid, sys

email = sys.argv[1] if len(sys.argv) > 1 else 'e2e@test.dev'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LDIR = os.path.join(ROOT, 'content', 'lessons')

conn = sqlite3.connect(os.path.join(ROOT, 'db', 'custom.db'))
cur = conn.cursor()
cur.execute("SELECT id FROM User WHERE email=?", (email,))
row = cur.fetchone()
if not row:
    print(f'no such user: {email}')
    sys.exit(1)
uid = row[0]

cur.execute("SELECT lessonId FROM LessonProgress WHERE userId=?", (uid,))
done = {r[0] for r in cur.fetchall()}

ids = []
for mod in os.listdir(LDIR):
    for f in os.listdir(os.path.join(LDIR, mod)):
        if f.endswith('.json'):
            ids.append(f[:-5])

now = datetime.datetime.now(datetime.timezone.utc).isoformat()
new = [i for i in ids if i not in done]
for lid in new:
    cur.execute(
        "INSERT INTO LessonProgress (id, userId, lessonId, status, kcBestPct, kcAttempts, exerciseDone, retrievalDone, secondsSpent, updatedAt, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        (str(uuid.uuid4()), uid, lid, 'mastered', 100, 1, 1, 1, 600, now, now))
conn.commit()
print(f'{email}: {len(new)} lessons marked mastered ({len(done)} already done)')
