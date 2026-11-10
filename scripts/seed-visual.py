#!/usr/bin/env python3
"""Seed visual@test.dev with realistic 3-weeks-in learner data so all pages render rich states."""
import json, sqlite3, sys
from datetime import datetime, timedelta, timezone

DB = "/home/z/my-project/db/custom.db"
EMAIL = "visual@test.dev"

now = datetime.now(timezone.utc)
def iso(dt): return dt.isoformat().replace("+00:00", "Z")
def days_ago(d, hours=0): return now - timedelta(days=d, hours=hours)

import uuid
def nid(): return "c" + uuid.uuid4().hex[:24]  # cuid-shaped id

con = sqlite3.connect(DB)
cur = con.cursor()
cur.execute("SELECT id FROM User WHERE email=?", (EMAIL,))
row = cur.fetchone()
if not row:
    print("user not found"); sys.exit(1)
uid = row[0]

# wipe old seed data
for t in ["XpEvent","Session","DiagnosticResult","LessonProgress","AssessmentAttempt",
          "ProblemAttempt","CardState","DrillSession","ProjectProgress","Note","Bookmark",
          "StudyPlan","LearningSession","Application","UserSkill"]:
    col = {"Session":"userId","XpEvent":"userId"}.get(t,"userId")
    cur.execute(f"DELETE FROM {t} WHERE {col}=?", (uid,))

# ---- user gamification state
cur.execute("""UPDATE User SET xp=?, streakCount=?, longestStreak=?, lastStudyDate=?, dailyGoalXp=? WHERE id=?""",
            (1480, 7, 9, iso(days_ago(0,3)), 60, uid))

# ---- lesson progress: all 6 phase-0 mastered/passed + first 5 arith lessons
p0 = ["orient-what-is-quant-finance","orient-quant-developer-role","orient-role-comparison",
      "orient-institution-landscape","orient-office-structure","orient-team-and-production"]
p1 = ["arith-numbers-and-operations","arith-fractions-decimals","arith-percentages",
      "arith-powers-roots-logs","arith-estimation-mental-math"]
lesson_rows = []
for i, lid in enumerate(p0):
    mastered = i < 4
    lesson_rows.append((uid, lid, "mastered" if mastered else "passed",
                        92.5 if mastered else 78.0, 2 if mastered else 1, 1, 1,
                        900+i*120, iso(days_ago(21-i)), iso(days_ago(21-i))))
for i, lid in enumerate(p1):
    st = "passed" if i < 3 else ("in_progress" if i == 3 else "not_started")
    lesson_rows.append((uid, lid, st, 85.0 if i<3 else (42.0 if i==3 else 0.0),
                        2 if i<3 else (1 if i==3 else 0), 1 if i<3 else 0, 1 if i<3 else 0,
                        720+i*90, iso(days_ago(14-i)), iso(days_ago(14-i))))
for r in lesson_rows:
    cur.execute("""INSERT INTO LessonProgress (id,userId,lessonId,status,kcBestPct,kcAttempts,exerciseDone,retrievalDone,secondsSpent,updatedAt,createdAt)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?)""", (nid(), *r))

# ---- XP ledger (varied sources over 3 weeks, ~1480 total)
xp = [
    (18,"lesson_pass","Orientation module lessons", 20),(18,"lesson_pass","Orientation module lessons", 20),
    (17,"lesson_pass","Orientation module lessons", 20),(17,"lesson_pass","Orientation module lessons", 20),
    (16,"diagnostic","Placement diagnostic", 0),  # placeholder replaced below
    (16,"lesson_master","Mastered orientation lessons", 15),(16,"lesson_master","Mastered orientation lessons", 15),
    (15,"drill","Multiplication drill L2", 30),(14,"lesson_pass","Arithmetic lessons", 20),
    (14,"exercise","Arithmetic exercises", 35),(13,"drill","Percentages drill L1", 30),
    (12,"lesson_pass","Arithmetic lessons", 20),(12,"revision","Review session", 25),
    (11,"problem","anagram-groups solved", 40),(10,"lesson_master","Mastered arithmetic", 15),
    (10,"drill","Mixed drill L3", 30),(9,"assessment","Financial math assessment", 50),
    (8,"lesson_pass","Fractions & decimals", 20),(7,"streak_bonus","7-day streak", 35),
    (6,"drill","Squares drill L2", 30),(5,"exercise","Percentage exercises", 35),
    (4,"revision","Review session", 25),(3,"lesson_pass","Powers, roots & logs", 20),
    (2,"problem","fizz-buzz solved", 40),(1,"drill","Estimation drill L2", 30),
    (0,"lesson_pass","Estimation & mental math", 20),(0,"streak_bonus","Daily streak", 10),
]
total = 0
for d, src, detail, amt in xp:
    if d == 16 and src == "diagnostic": amt = 0
    total += amt
    cur.execute("INSERT INTO XpEvent (id,userId,amount,source,detail,createdAt) VALUES (?,?,?,?,?,?)",
                (nid(), uid, amt, src, detail, iso(days_ago(d, 2))))
# top up to match user.xp exactly
diff = 1480 - total
if diff > 0:
    cur.execute("INSERT INTO XpEvent (id,userId,amount,source,detail,createdAt) VALUES (?,?,?,?,?,?)",
                (nid(), uid, diff, "backfill", "Earlier activity", iso(days_ago(22))))

# ---- diagnostic + assessment attempts
cur.execute("INSERT INTO DiagnosticResult (id,userId,assessmentId,areaScores,totalPct,createdAt) VALUES (?,?,?,?,?,?)",
            (nid(), uid, "apt-quantitative", json.dumps({
                "Arithmetic": {"correct": 7, "total": 9, "pct": 78},
                "Algebra": {"correct": 5, "total": 8, "pct": 62},
                "Probability": {"correct": 4, "total": 7, "pct": 57},
                "Logic": {"correct": 6, "total": 6, "pct": 100}}), 71.0, iso(days_ago(16))))
cur.execute("INSERT INTO AssessmentAttempt (id,userId,assessmentId,kind,scorePct,detail,startedAt,submittedAt) VALUES (?,?,?,?,?,?,?,?)",
            (nid(), uid, "apt-quantitative", "diagnostic", 71.0, "{}", iso(days_ago(16)), iso(days_ago(16, hours=-1))))
cur.execute("INSERT INTO AssessmentAttempt (id,userId,assessmentId,kind,scorePct,detail,startedAt,submittedAt) VALUES (?,?,?,?,?,?,?,?)",
            (nid(), uid, "assess-financial-math", "assessment", 74.0, "{}", iso(days_ago(9)), iso(days_ago(9, hours=-1))))
cur.execute("INSERT INTO AssessmentAttempt (id,userId,assessmentId,kind,scorePct,detail,startedAt,submittedAt) VALUES (?,?,?,?,?,?,?,?)",
            (nid(), uid, "assess-probability", "assessment", 58.0, "{}", iso(days_ago(4)), iso(days_ago(4, hours=-1))))

# ---- problem attempts
probs = [("anagram-groups","python","passed",9,9,120,11),("fizz-buzz-sum","python","passed",5,5,45,2),
         ("two-sum","python","passed",8,8,88,6),("moving-average","python","failed",4,7,210,4),
         ("max-drawdown","python","passed",6,6,150,7)]
for slug, lang, st, pt, tt, ms, d in probs:
    cur.execute("INSERT INTO ProblemAttempt (id,userId,problemSlug,language,status,passedTests,totalTests,runtimeMs,createdAt) VALUES (?,?,?,?,?,?,?,?,?)",
                (nid(), uid, slug, lang, st, pt, tt, ms, iso(days_ago(d))))

# ---- spaced repetition cards (some due today, some scheduled ahead)
cards = [
    ("orient-what-is-quant-finance:0","lesson","What does a quantitative developer do?","Builds and maintains the systems that price, trade and risk financial products.","concept",2.5,3,0,0,3),
    ("orient-quant-developer-role:1","lesson","Front office vs middle office?","Front office = revenue-generating (trading); middle office = risk & control; back office = settlement.","concept",2.3,2,1,0,5),
    ("orient-institution-landscape:2","lesson","Name three classic quant employer categories","Banks, hedge funds, prop-trading firms / market makers.","concept",2.6,4,0,0,8),
    ("arith-numbers-and-operations:0","lesson","Operator precedence in C++ arithmetic","*/% before +-, left-to-right within a level.","concept",2.1,1,1,2,0),
    ("arith-fractions-decimals:1","lesson","Converting 0.375 to a fraction","3/8 — decimal places give the denominator (10^3).","concept",2.4,2,0,0,2),
    ("arith-percentages:0","lesson","Percentage change vs percentage-point change","Relative change of a ratio vs absolute difference of percentages.","concept",2.0,1,0,1,0),
    ("arith-powers-roots-logs:2","lesson","log rules: log(a*b) = ?","log(a) + log(b) — products become sums.","concept",2.5,2,0,0,4),
    ("arith-estimation-mental-math:0","lesson","Estimation: 49*52 ≈ ?","≈ 2500 — round to 50*50 then adjust.","concept",1.8,0,1,3,0),
    ("quiz:arith-percentages:q2","quiz_miss","If a price rises 20% then falls 20%, net change?","-4% — multiplicative, not additive.","concept",2.2,1,0,0,1),
    ("quiz:orient-role-comparison:q1","quiz_miss","Which role is closest to software engineering?","Quant developer — systems, latency, tooling.","concept",2.3,2,0,0,6),
]
for key, src, front, back, ctype, ease, iv, reps, lapses, due_days in cards:
    cur.execute("""INSERT INTO CardState (id,userId,cardKey,source,front,back,cardType,ease,intervalDays,repetitions,lapses,dueAt,lastGrade,lastReviewedAt)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (nid(), uid, key, src, front, back, ctype, ease, iv, reps, lapses,
                 iso(days_ago(0) + timedelta(days=due_days)) if due_days>0 else iso(days_ago(0,1)),
                 3 if reps else 0, iso(days_ago(min(reps+1,6)))))

# ---- drill sessions
drills = [("multiplication",2,18,20,1450,120,5),("percentages",1,16,20,2100,120,4),
          ("mixed",3,22,25,1650,150,3),("squares",2,14,15,1300,90,2),
          ("addition",1,19,20,1800,120,6),("fractions",2,12,15,2400,120,1)]
for mode, lvl, c, t, avg, dur, d in drills:
    cur.execute("INSERT INTO DrillSession (id,userId,mode,level,correct,total,avgMs,durationS,createdAt) VALUES (?,?,?,?,?,?,?,?,?)",
                (nid(), uid, mode, lvl, c, t, avg, dur, iso(days_ago(d))))

# ---- projects
cur.execute("INSERT INTO ProjectProgress (id,userId,projectSlug,status,milestonesDone,notes,updatedAt) VALUES (?,?,?,?,?,?,?)",
            (nid(), uid, "math-foundations-toolkit", "in_progress", 3,
             "CLI skeleton + fraction class done. Decimal precision tests next — watch the 1e-9 edge case.",
             iso(days_ago(2))))
cur.execute("INSERT INTO ProjectProgress (id,userId,projectSlug,status,milestonesDone,notes,updatedAt) VALUES (?,?,?,?,?,?,?)",
            (nid(), uid, "log-processor", "completed", 5, "Shipped. Regex parser ended up 4x faster after switching to a single pass.",
             iso(days_ago(11))))
cur.execute("INSERT INTO ProjectProgress (id,userId,projectSlug,status,milestonesDone,notes,updatedAt) VALUES (?,?,?,?,?,?,?)",
            (nid(), uid, "market-data-analysis", "in_progress", 1, "Just started — loading the CSV schema.", iso(days_ago(5))))

# ---- notes + bookmarks
cur.execute("INSERT INTO Note (id,userId,lessonId,body,updatedAt) VALUES (?,?,?,?,?)",
            (nid(), uid, "arith-powers-roots-logs",
             "Keep forgetting log(a/b) = log a - log b. Drill this. Also: ln is natural log (base e), lg is base 2 in some texts, base 10 in others — check context.",
             iso(days_ago(3))))
cur.execute("INSERT INTO Bookmark (id,userId,targetType,targetId,createdAt) VALUES (?,?,?,?,?)",
            (nid(), uid, "lesson", "arith-percentages", iso(days_ago(6))))
cur.execute("INSERT INTO Bookmark (id,userId,targetType,targetId,createdAt) VALUES (?,?,?,?,?)",
            (nid(), uid, "problem", "moving-average", iso(days_ago(4))))

# ---- study plan
plan_tasks = []
day_offsets = [0,0,1,2,3,4,5,6,7]
task_defs = [("lesson","arith-estimation-mental-math","Finish Estimation & Mental Math",45),
             ("drill","multiplication","10-minute multiplication drill",10),
             ("lesson","arith-number-properties","Number Properties lesson",40),
             ("revision","due-cards","Review 12 due cards",15),
             ("lesson","prealg-variables-expressions","Start Pre-Algebra: Variables & Expressions",45),
             ("drill","mixed","Mixed drill L3",15),
             ("lesson","prealg-solving-linear","Solving Linear Equations",45),
             ("exercise","arith","Arithmetic exercise set",20),
             ("assessment","assess-financial-math","Retake Financial Math assessment",30)]
for d, (kind, ref, title, mins) in zip(day_offsets, task_defs):
    plan_tasks.append({"day": (days_ago(0)+timedelta(days=d)).strftime("%Y-%m-%d"),
                       "kind": kind, "ref": ref, "title": title, "minutes": mins,
                       "done": d < 0})
cur.execute("INSERT INTO StudyPlan (id,userId,config,tasks,createdAt,updatedAt) VALUES (?,?,?,?,?,?)",
            (nid(), uid, json.dumps({"hoursPerWeek": 6, "days": ["Mon","Tue","Wed","Thu","Fri","Sat"],
                              "track": "quant-analyst", "targetDate": (now+timedelta(days=90)).strftime("%Y-%m-%d"),
                              "mode": "structured"}),
             json.dumps(plan_tasks), iso(days_ago(9)), iso(days_ago(1))))

# ---- learning sessions (analytics charts need 2+ weeks of data)
import random
random.seed(42)
kinds = {"lesson": (0.4, 2400), "practice": (0.2, 1500), "revision": (0.2, 900), "drills": (0.15, 600), "assessment": (0.05, 1800)}
for d in range(20, -1, -1):
    # skip some days for realism but keep the 7-day streak
    if d > 0 and random.random() < 0.25 and d > 7: continue
    if d > 7 and d <= 20 and d in (9, 12, 15, 19): pass
    n = random.choice([1,2,2,3])
    for _ in range(n):
        r = random.random(); acc = 0; kind = "lesson"
        for k, (p, _) in kinds.items():
            acc += p
            if r <= acc: kind = k; break
        secs = int(kinds[kind][1] * random.uniform(0.5, 1.4))
        day = (now - timedelta(days=d)).strftime("%Y-%m-%d")
        cur.execute("INSERT INTO LearningSession (id,userId,kind,seconds,day,createdAt) VALUES (?,?,?,?,?,?)",
                    (nid(), uid, kind, secs, day, iso(days_ago(d, random.randint(1,20)))))

# ---- applications
apps = [("Jane Street","Quantitative Developer - Internship","interview","Final round scheduled: probability + systems. Review order book basics.", 6),
        ("Citadel Securities","Software Engineer, Trading Systems","applied","Applied via referral. OA should arrive within 2 weeks.", 12),
        ("IMC Trading","Graduate Quant Developer","oa","OA done — mental math section felt strong.", 3),
        ("Bloomberg","Financial Software Engineer","planned","Plan to apply after finishing the C++ modules.", 1)]
for co, role, st, note, d in apps:
    cur.execute("INSERT INTO Application (id,userId,company,role,status,note,updatedAt) VALUES (?,?,?,?,?,?,?)",
                (nid(), uid, co, role, st, note, iso(days_ago(d))))

# ---- skills
skills = [("arithmetic",0.82),("mental-math",0.74),("fractions",0.68),("percentages",0.61),
          ("powers-roots-logs",0.45),("estimation",0.38),("algebra",0.22),("probability",0.18),
          ("python",0.55),("cpp",0.12)]
for sk, lvl in skills:
    cur.execute("INSERT INTO UserSkill (id,userId,skill,level,updatedAt) VALUES (?,?,?,?,?)",
                (nid(), uid, sk, lvl, iso(days_ago(1))))

con.commit()
counts = {}
for t in ["LessonProgress","XpEvent","AssessmentAttempt","ProblemAttempt","CardState","DrillSession",
          "ProjectProgress","Note","Bookmark","StudyPlan","LearningSession","Application","UserSkill","DiagnosticResult"]:
    cur.execute(f"SELECT COUNT(*) FROM {t} WHERE userId=?", (uid,))
    counts[t] = cur.fetchone()[0]
print(json.dumps(counts))
print("SEEDED OK")
