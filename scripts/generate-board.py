#!/usr/bin/env python3
"""
generate-board.py — the Gaffer's morning board builder.

Every morning this pulls the fixtures, form and odds for the next three days
from FootyStats, works out the value on each market (goals / corners / BTTS /
cards), and writes src/data/formTablesData.json — the file the homepage value
board and the settlement engine both read.

It MERGES rather than overwrites: recent past days are kept (so the settlement
job can still find yesterday's locked picks) and only today→+2 are refreshed.
Once a day has passed it is frozen exactly as it was locked that morning.

The API key is read from the FOOTYSTATS_KEY environment variable — never hardcode
it. Run:  FOOTYSTATS_KEY=... python3 scripts/generate-board.py
"""
import json, os, urllib.request, datetime, time
from zoneinfo import ZoneInfo
from collections import Counter

KEY = os.environ.get("FOOTYSTATS_KEY")
if not KEY:
    raise SystemExit("FOOTYSTATS_KEY is not set — refusing to run without a key.")
BASE = "https://api.football-data-api.com"
OUT = "src/data/formTablesData.json"
KEEP_PAST_DAYS = 8   # keep this many past days in the file for settlement / history

def get(path, tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(BASE + path, timeout=40) as r:
                return json.load(r)
        except Exception as e:
            if i == tries - 1: raise
            time.sleep(1.5)

# ── field maps (verbatim from _shared/footystats.ts) ────────────────────────
OVER_PCT_FIELD = {
    "Over 0.5 Goals":"seasonOver05Percentage_overall","Over 1.5 Goals":"seasonOver15Percentage_overall",
    "Over 2.5 Goals":"seasonOver25Percentage_overall","Over 3.5 Goals":"seasonOver35Percentage_overall",
    "Over 4.5 Goals":"seasonOver45Percentage_overall","Over 5.5 Goals":"seasonOver55Percentage_overall",
    "BTTS":"seasonBTTSPercentage_overall",
    "Over 8.5 Corners":"over85CornersPercentage_overall","Over 9.5 Corners":"over95CornersPercentage_overall",
    "Over 10.5 Corners":"over105CornersPercentage_overall","Over 11.5 Corners":"over115CornersPercentage_overall",
    "Over 12.5 Corners":"over125CornersPercentage_overall",
    "Over 2.5 Cards":"over25CardsPercentage_overall","Over 3.5 Cards":"over35CardsPercentage_overall",
    "Over 4.5 Cards":"over45CardsPercentage_overall","Over 5.5 Cards":"over55CardsPercentage_overall",
    "Over 6.5 Cards":"over65CardsPercentage_overall",
}
ODDS_FIELD = {
    "Over 0.5 Goals":"odds_ft_over05","Over 1.5 Goals":"odds_ft_over15","Over 2.5 Goals":"odds_ft_over25",
    "Over 3.5 Goals":"odds_ft_over35","Over 4.5 Goals":"odds_ft_over45","Over 5.5 Goals":"odds_ft_over55",
    "Under 0.5 Goals":"odds_ft_under05","Under 1.5 Goals":"odds_ft_under15","Under 2.5 Goals":"odds_ft_under25",
    "Under 3.5 Goals":"odds_ft_under35","Under 4.5 Goals":"odds_ft_under45",
    "BTTS":"odds_btts_yes","BTTS No":"odds_btts_no",
    "Over 8.5 Corners":"odds_corners_over_85","Over 9.5 Corners":"odds_corners_over_95",
    "Over 10.5 Corners":"odds_corners_over_105","Over 11.5 Corners":"odds_corners_over_115","Over 12.5 Corners":"odds_corners_over_125",
    "Under 8.5 Corners":"odds_corners_under_85","Under 9.5 Corners":"odds_corners_under_95",
    "Under 10.5 Corners":"odds_corners_under_105","Under 11.5 Corners":"odds_corners_under_115",
    "Over 3.5 Cards":"odds_cards_over_35","Over 4.5 Cards":"odds_cards_over_45","Over 5.5 Cards":"odds_cards_over_55","Over 6.5 Cards":"odds_cards_over_65",
    "Under 2.5 Cards":"odds_cards_under_25","Under 3.5 Cards":"odds_cards_under_35","Under 4.5 Cards":"odds_cards_under_45",
}
GOAL_MARKS=["2.5","3.5","4.5"]; CORNER_MARKS=["8.5","9.5","10.5","11.5"]; CARD_MARKS=["3.5","4.5","5.5"]
GOAL_UNDER=["0.5","1.5","2.5","3.5"]; CORNER_UNDER=["8.5","9.5","10.5","11.5"]; CARD_UNDER=["2.5","3.5","4.5"]
GOAL_PCT=["0.5","1.5","2.5","3.5","4.5"]; CORNER_PCT=["8.5","9.5","10.5","11.5"]; CARD_PCT=["2.5","3.5","4.5","5.5"]
STRONG_EDGE=20; VALUE_EDGE=10; MIN_ODDS=1.5
IMG="https://cdn.footystats.org/img/"

def num(v):
    try: n=float(v)
    except: return 0.0
    return n if n==n else 0.0
def r1(x):
    r=round(x,1); return int(r) if r==int(r) else r
def badge(p):
    if not isinstance(p,str) or not p: return None
    return p if p.startswith("http") else IMG+p.lstrip("/")
def combined(a,b): return r1((a+b)/2)
def short(n): return n[:3].upper()

def map_form(s):
    overPct={}
    for label,field in OVER_PCT_FIELD.items():
        if s.get(field) is not None: overPct[label]=num(s[field])
    # MATCH-total cards in this team's games (own + opponent) — matches the
    # Over-x.5 Cards market, which counts both sides. cardsTotalAVG_overall is
    # the team's own cards only, so it's just the last-resort fallback.
    own=num(s.get("cardsAVG_overall")); agn=num(s.get("cardsAgainstAVG_overall"))
    avgCards=(own+agn) if (own or agn) else num(s.get("cardsTotalAVG_overall"))
    return {"overPct":overPct,
            "avgGoals":num(s.get("seasonScoredAVG_overall"))+num(s.get("seasonConcededAVG_overall")),
            "avgCorners":num(s.get("cornersTotalAVG_overall")),
            "avgCards":avgCards}

def norm_odds(m):
    out={}
    for label,field in ODDS_FIELD.items():
        try: v=float(m.get(field))
        except: continue
        if v>1: out[label]=v
    return out

def value_cell(prob,odds):
    if not odds or odds<=1: return None
    implied=r1(100/odds); edge=r1(prob-implied)
    flag="strong" if edge>=STRONG_EDGE else ("value" if edge>=VALUE_EDGE and odds>=MIN_ODDS else None)
    return {"prob":prob,"odds":odds,"implied":implied,"edge":edge,"flag":flag}

LON=ZoneInfo("Europe/London")
def uk_time(unix):
    if not unix: return "TBC"
    return datetime.datetime.fromtimestamp(unix, LON).strftime("%H:%M")
def dstr(unix): return datetime.datetime.utcfromtimestamp(unix).date().isoformat()

# ── active leagues over next 3 days + season->name map ──────────────────────
ll=get(f"/league-list?key={KEY}&chosen_leagues_only=true")["data"]
smap={}
for lg in ll:
    nm=(lg.get("name") or lg.get("league_name") or "").strip()
    co=(lg.get("country") or "").strip()
    for s in lg.get("season",[]):
        if s.get("id") is not None and nm: smap[int(s["id"])]={"name":nm,"country":co}

today=datetime.datetime.utcnow().date()
window=[(today+datetime.timedelta(days=n)).isoformat() for n in range(3)]
active=set()
for d in window:
    for m in get(f"/todays-matches?key={KEY}&date={d}").get("data",[]):
        cid=m.get("competition_id") or m.get("season_id")
        if cid: active.add(int(cid))
print("active leagues:", sorted(active))

def split_league(lid):
    info=smap.get(lid)
    if not info or not info["name"]: return ("", f"League {lid}")
    name=info["name"]; co=info["country"]
    if co and name.startswith(co):
        league=name[len(co):].strip()
        return (co, league or name)
    i=name.find(" ")
    return ("", name) if i==-1 else (name[:i], name[i+1:])

# ── per league: one league-matches (upcoming+history) + one league-teams (form)
form_by_id={}; form_by_name={}; all_upcoming=[]; all_detailed=[]
for lid in sorted(active):
    try: lm=get(f"/league-matches?key={KEY}&season_id={lid}")["data"]
    except Exception as e: print("  lm fail",lid,e); lm=[]
    for m in lm:
        st=m.get("status")
        if st!="complete":
            all_upcoming.append({"fixtureId":m.get("id"),"leagueId":lid,
                "kickoff":m.get("date_unix"),"homeId":m.get("homeID") or m.get("home_id"),
                "awayId":m.get("awayID") or m.get("away_id"),"homeName":m.get("home_name"),
                "awayName":m.get("away_name"),"homeLogo":badge(m.get("home_image")),
                "awayLogo":badge(m.get("away_image")),"odds":norm_odds(m)})
        else:
            hg=int(num(m.get("homeGoalCount"))); ag=int(num(m.get("awayGoalCount")))
            corners=m.get("totalCornerCount")
            corners=int(num(corners)) if corners is not None else int(num(m.get("team_a_corners"))+num(m.get("team_b_corners")))
            cards=int(num(m.get("team_a_cards_num"))+num(m.get("team_b_cards_num")))
            all_detailed.append({"dateUnix":m.get("date_unix"),"homeId":m.get("homeID") or m.get("home_id"),
                "awayId":m.get("awayID") or m.get("away_id"),"homeName":m.get("home_name"),
                "awayName":m.get("away_name"),"hg":hg,"ag":ag,"corners":corners,"cards":cards})
    try: lt=get(f"/league-teams?key={KEY}&season_id={lid}&include=stats")["data"]
    except Exception as e: print("  lt fail",lid,e); lt=[]
    for t in lt:
        stats=t.get("stats") if isinstance(t.get("stats"),dict) else t
        f=map_form(stats); nm=t.get("cleanName") or t.get("name")
        if t.get("id") is not None: form_by_id[int(t["id"])]=f
        if nm: form_by_name[nm]=f

def form_for(tid,name):
    if tid is not None and int(tid) in form_by_id: return form_by_id[int(tid)]
    return form_by_name.get(name)

# ── history (form strips + h2h) ─────────────────────────────────────────────
games_by_id={}; games_by_name={}; h2h={}
def pk(a,b): return "|".join(sorted([str(a),str(b)]))
for m in sorted(all_detailed,key=lambda x:-(x["dateUnix"] or 0)):
    du=m["dateUnix"]
    if not du: continue
    date=dstr(du); btts=m["hg"]>0 and m["ag"]>0
    hr="W" if m["hg"]>m["ag"] else ("L" if m["hg"]<m["ag"] else "D")
    ar="W" if m["ag"]>m["hg"] else ("L" if m["ag"]<m["hg"] else "D")
    hg_={"date":date,"opp":m["awayName"],"ha":"H","gf":m["hg"],"ga":m["ag"],"res":hr,"corners":m["corners"],"cards":m["cards"],"btts":btts}
    ag_={"date":date,"opp":m["homeName"],"ha":"A","gf":m["ag"],"ga":m["hg"],"res":ar,"corners":m["corners"],"cards":m["cards"],"btts":btts}
    for d,k in ((games_by_id,m["homeId"]),(games_by_name,m["homeName"])): d.setdefault(k,[]).append(hg_)
    for d,k in ((games_by_id,m["awayId"]),(games_by_name,m["awayName"])): d.setdefault(k,[]).append(ag_)
    meet={"date":date,"home":m["homeName"],"away":m["awayName"],"hg":m["hg"],"ag":m["ag"],"corners":m["corners"],"cards":m["cards"]}
    for k in set([pk(m["homeId"],m["awayId"]),pk(m["homeName"],m["awayName"])]): h2h.setdefault(k,[]).append(meet)
def games_for(tid,name):
    return (games_by_id.get(int(tid)) if tid is not None else None) or games_by_name.get(name) or []
def h2h_for(aid,an,bid,bn):
    return h2h.get(pk(aid,bid)) or h2h.get(pk(an,bn)) or []

# ── build rows for the 3-day window ─────────────────────────────────────────
def over_map(h,a,marks,suf):
    return {mk: combined(h["overPct"].get(f"Over {mk} {suf}",0), a["overPct"].get(f"Over {mk} {suf}",0)) for mk in marks}
def odds_map(od,marks,suf): return {mk: od.get(f"Over {mk} {suf}") for mk in marks}
def under_map(od,marks,suf): return {mk: od.get(f"Under {mk} {suf}") for mk in marks}

# Match-total cards per game from a team's recent real results (the season
# stats endpoint only carries the team's OWN cards for these leagues, which
# undercounts the Over-x.5 Cards market that counts both sides).
def recent_match_cards(tid, name):
    vals=[g["cards"] for g in games_for(tid, name)[:8] if g.get("cards") is not None]
    return r1(sum(vals)/len(vals)) if vals else 0.0

fixtures=[]
for f in sorted(all_upcoming,key=lambda x:(x["kickoff"] or 0)):
    d=dstr(f["kickoff"]) if f["kickoff"] else None
    if d not in window: continue
    h=form_for(f["homeId"],f["homeName"]); a=form_for(f["awayId"],f["awayName"])
    if not h or not a: continue
    region,league=split_league(f["leagueId"])
    od=f["odds"]
    goals_over=over_map(h,a,GOAL_PCT,"Goals"); corners_over=over_map(h,a,CORNER_PCT,"Corners"); cards_over=over_map(h,a,CARD_PCT,"Cards")
    goals_odds=odds_map(od,GOAL_MARKS,"Goals"); corners_odds=odds_map(od,CORNER_MARKS,"Corners"); cards_odds=odds_map(od,CARD_MARKS,"Cards")
    btts_pct=combined(h["overPct"].get("BTTS",0),a["overPct"].get("BTTS",0))
    row={"id":str(f["fixtureId"]),"league":league,"region":region,"date":d,"time":uk_time(f["kickoff"]),
        "home":{"name":f["homeName"],"short":short(f["homeName"]),"logo":f["homeLogo"]},
        "away":{"name":f["awayName"],"short":short(f["awayName"]),"logo":f["awayLogo"]},
        "result":{"hg":0,"ag":0,"corners":0,"cards":0,"btts":False},
        "goals_avg":combined(h["avgGoals"],a["avgGoals"]),"corners_avg":combined(h["avgCorners"],a["avgCorners"]),
        "cards_avg":(lambda hc,ac: combined(hc,ac) if (hc or ac) else combined(h["avgCards"],a["avgCards"]))(recent_match_cards(f["homeId"],f["homeName"]),recent_match_cards(f["awayId"],f["awayName"])),"btts_pct":btts_pct,
        "goals_over":goals_over,"corners_over":corners_over,"cards_over":cards_over,
        "goals_odds":goals_odds,"corners_odds":corners_odds,"cards_odds":cards_odds,"btts_odds":od.get("BTTS"),
        "goals_under_odds":under_map(od,GOAL_UNDER,"Goals"),"corners_under_odds":under_map(od,CORNER_UNDER,"Corners"),
        "cards_under_odds":under_map(od,CARD_UNDER,"Cards"),"btts_no_odds":od.get("BTTS No"),
        "value":{"goals":{mk:value_cell(goals_over[mk],goals_odds[mk]) for mk in GOAL_MARKS},
                 "corners":{mk:value_cell(corners_over[mk],corners_odds[mk]) for mk in CORNER_MARKS},
                 "btts":value_cell(btts_pct,od.get("BTTS"))},
        "home_form":games_for(f["homeId"],f["homeName"])[:8],"away_form":games_for(f["awayId"],f["awayName"])[:8],
        "h2h":h2h_for(f["homeId"],f["homeName"],f["awayId"],f["awayName"])[:6]}
    fixtures.append(row)

# ── merge: keep recent PAST days (frozen as locked), refresh today→+2 ────────
existing=[]
try:
    with open(OUT) as fp: existing=json.load(fp).get("fixtures",[])
except Exception: pass
cutoff=(today - datetime.timedelta(days=KEEP_PAST_DAYS)).isoformat()
first_window=window[0]
merged={}
for x in existing:
    dt=x.get("date")
    # Keep past days AND today frozen — today's slate is the locked board and
    # must survive a re-run after kickoffs (the API stops returning games that
    # have started, so a naive refresh would drop them). Fresh rows below still
    # override matching ids (e.g. a not-yet-started evening game).
    if dt and cutoff <= dt <= first_window:
        merged[x["id"]]=x
for x in fixtures:                            # fresh pull, wins any clash
    merged[x["id"]]=x
allfx=sorted(merged.values(), key=lambda r:(r["date"], r.get("time") or ""))

leagues={}
for x in allfx:
    leagues[f"{x['region']}|{x['league']}"]={"name":x["league"],"region":x["region"]}

payload={"leagues":list(leagues.values()),"fixtures":allfx}
with open(OUT,"w") as fp: json.dump(payload,fp,ensure_ascii=False,indent=2)
print("WROTE fixtures:",len(allfx),"leagues:",len(payload["leagues"]))
print("by date:",dict(sorted(Counter(x["date"] for x in allfx).items())))
print("today's board:",sum(1 for x in allfx if x["date"]==first_window),"games")
