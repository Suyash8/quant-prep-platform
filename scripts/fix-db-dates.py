#!/usr/bin/env python3
"""Convert all TEXT ISO datetime values in the SQLite DB to the integer
epoch-millis format Prisma's SQLite connector uses, so WHERE clauses
(lte/gte) and ORDER BY work consistently with app-written rows."""
import sqlite3
from datetime import datetime, timezone

DB = "/home/z/my-project/db/custom.db"

TABLES = {
    "User": ["lastStudyDate"],
    "XpEvent": ["createdAt"],
    "DiagnosticResult": ["createdAt"],
    "LessonProgress": ["updatedAt", "createdAt"],
    "AssessmentAttempt": ["startedAt", "submittedAt"],
    "ProblemAttempt": ["createdAt"],
    "CardState": ["dueAt", "lastReviewedAt"],
    "DrillSession": ["createdAt"],
    "ProjectProgress": ["updatedAt"],
    "Note": ["updatedAt"],
    "Bookmark": ["createdAt"],
    "StudyPlan": ["createdAt", "updatedAt"],
    "LearningSession": ["createdAt"],
    "Application": ["updatedAt"],
    "UserSkill": ["updatedAt"],
}

def parse_ms(v: str):
    v = v.strip()
    if v.endswith("Z"):
        v = v[:-1] + "+00:00"
    dt = datetime.fromisoformat(v)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return int(dt.timestamp() * 1000)

con = sqlite3.connect(DB)
cur = con.cursor()
total = 0
for table, cols in TABLES.items():
    for col in cols:
        cur.execute(f"SELECT rowid, {col} FROM {table} WHERE typeof({col})='text' AND {col} IS NOT NULL AND {col} != ''")
        rows = cur.fetchall()
        n = 0
        for rowid, val in rows:
            try:
                ms = parse_ms(val)
            except ValueError:
                continue
            cur.execute(f"UPDATE {table} SET {col}=? WHERE rowid=?", (ms, rowid))
            n += 1
        if n:
            print(f"{table}.{col}: converted {n}")
        total += n
con.commit()
print(f"TOTAL converted: {total}")

# verify due cards now
cur.execute("SELECT id FROM User WHERE email='visual@test.dev'")
uid = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM CardState WHERE userId=? AND dueAt <= CAST(strftime('%s','now') AS INTEGER)*1000", (uid,))
print("cards due (raw check):", cur.fetchone()[0])
