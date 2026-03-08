# Quick Fix Instructions

## Issue
User is on "Form Tables" (mock data) instead of "Live Data" (real API data).

## Solution

### For You (User):
1. **Open the mobile menu** (tap ☰ icon in top right)
2. **Scroll down** and tap **"Live Data"** (has a 📡 Radio icon)
3. **Select a league** from the dropdown
4. **View real statistics!**

### What You're Currently Seeing:
- Section: "Form Tables" ❌
- Data: Template teams (Atletico Madrid, Sevilla, etc.)
- These are hardcoded examples, not real data

### What You Should See:
- Section: "Live Form Tables" ✅  
- Subtitle: "Real-time team statistics from API-Football"
- League selector dropdown
- Real teams from selected league

---

## Table Header Explanations

### Corners Table:
- **P** = Played (number of games)
- **Avg** = Average corners per game
- **O8.5** = Over 8.5 corners (9+ corners in the match)
- **O9.5** = Over 9.5 corners (10+ corners in the match)
- **O10.5** = Over 10.5 corners (11+ corners in the match)
- **U8.5** = Under 8.5 corners (0-8 corners in the match)
- **U9.5** = Under 9.5 corners (0-9 corners in the match)
- **U10.5** = Under 10.5 corners (0-10 corners in the match)

### Goals Table:
- **O1.5** = Over 1.5 goals (2+ goals)
- **O2.5** = Over 2.5 goals (3+ goals)
- **O3.5** = Over 3.5 goals (4+ goals)

### Cards Table:
- **O2.5** = Over 2.5 cards (3+ cards)
- **O3.5** = Over 3.5 cards (4+ cards)
- **O4.5** = Over 4.5 cards (5+ cards)

### Color Coding:
- 🟢 **Green (75%+)**: Very high probability - Strong bet
- 🟡 **Gold (60-74%)**: High probability - Good bet
- 🟠 **Orange (45-59%)**: Medium probability - Moderate bet
- 🔴 **Red (<45%)**: Low probability - Risky bet

---

## Example Reading:

If you see:
```
Team: Manchester City
P: 19
O9.5: 75% (green)
Avg: 10.2
```

This means:
- Manchester City played **19 games**
- In **75% of games** (14 out of 19), there were **more than 9.5 corners** (10+ corners)
- Average corners per game: **10.2**
- **Strong indicator** for betting on Over 9.5 corners

---

## Why "9.5" and not "10"?

In betting, we use .5 numbers to avoid pushes (ties):
- **Over 9.5** means 10 or more (clear win/loss)
- If we used "Over 10", exactly 10 corners would be a push (bet refunded)
- **Under 9.5** means 9 or fewer

---

## Navigation Path:

**Current (Wrong):**
```
Menu → Form Tables ❌
```

**Correct:**
```
Menu → Live Data ✅ → Select League → View Stats
```

---

## Still Confused?

The app has TWO sections:
1. **"Form Tables"** = Mock/template data for testing
2. **"Live Data"** = Real API data from API-Football

You want #2!
