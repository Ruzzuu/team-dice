# Product Requirements Document (PRD)
# FairPlay Rotation Scheduler

## 1. Product Overview

FairPlay Rotation Scheduler is a web-based scheduling application for groups that rent a limited number of courts/fields and want every participant to receive the fairest possible amount of playing time.

The system must calculate:
- how much usable session time is available,
- how many players can play simultaneously,
- how many rounds can fit in the rental period,
- who should play and rest in each round,
- how teams should be formed,
- and how to minimize differences in playing time between participants.

The system must support real-world changes such as players arriving late, leaving early, skipping a round, or joining after a session has started.

The primary goal is not random team generation. The primary goal is **maximum achievable fairness**.

---

## 2. Problem Statement

Example:
- 10 players
- 2 courts
- 4 players per court
- 8 players can play simultaneously
- 2 players must rest each round
- Court rental: 19:00–21:00
- Round duration: 15 minutes

The system must automatically create a rotation where total playing time is as equal as mathematically possible.

If exact equality cannot be achieved, the system must minimize the difference between the player with the most playing time and the player with the least playing time.

---

## 3. Product Goals

### Primary Goals

1. Maximize fairness of total playing time.
2. Automatically calculate playable time from session start/end times.
3. Automatically create rotations based on available courts and players.
4. Avoid unnecessary consecutive rests.
5. Support dynamic changes during an active session.
6. Maintain completed round history when recalculating future rounds.
7. Save session history for future analysis.

### Secondary Goals

1. Balance team skill.
2. Reduce repeated teammates.
3. Reduce repeated opponents.
4. Track player statistics.
5. Support long-term fairness across multiple sessions.
6. Allow manual schedule adjustments.

---

## 4. Non-Goals for MVP

The first version does not need:
- payment processing,
- court booking integrations,
- tournament brackets,
- public social networking,
- advanced ranking/ELO,
- push notifications,
- mobile native apps.

These may be added later.

---

## 5. Core Concepts

### Session
A single sports activity with:
- date,
- start time,
- end time,
- number of courts,
- players per court,
- round duration,
- optional warm-up,
- optional cleanup/buffer time.

### Round
A fixed block of time during which players occupy courts.

Example:
- Round 1: 19:00–19:15
- Round 2: 19:15–19:30

### Player Slot
One player occupying one playing position during one round.

Example:
2 courts × 4 players × 8 rounds = 64 player-round slots.

### Fairness
Primary fairness metric:

max(total_playing_minutes) - min(total_playing_minutes)

The system should minimize this value.

---

## 6. User Roles

### Organizer
Can:
- create sessions,
- add/remove players,
- configure courts,
- set playing times,
- generate schedules,
- edit rotations,
- start/finish rounds,
- recalculate future rounds,
- view statistics.

### Player
MVP may not require individual player accounts.

Future versions may allow players to:
- join sessions,
- see their schedule,
- view statistics,
- mark temporary unavailability.

---

## 7. Functional Requirements

### FR-01: Create Session

Organizer can create a session with:
- session name,
- date,
- start time,
- end time,
- number of courts,
- players per court,
- round duration,
- warm-up duration,
- cleanup/buffer duration.

System calculates:

usable_minutes =
end_time - start_time - warmup - cleanup/buffer

number_of_rounds =
floor(usable_minutes / round_duration)

---

### FR-02: Add Players

Organizer can add players with:

Required:
- id,
- name.

Optional:
- skill rating,
- available_from,
- available_until,
- notes.

Default availability is the entire session.

---

### FR-03: Capacity Calculation

System calculates:

active_players_per_round =
court_count × players_per_court

If player count <= active capacity:
- everyone can play each round.

If player count > active capacity:
- rotation/rest scheduling is required.

---

### FR-04: Fair Rotation Generation

The scheduler must assign players to rounds while prioritizing:

1. Minimum total playing-time difference.
2. Minimum consecutive-rest occurrences.
3. Fair rest distribution.
4. Player availability.
5. Team balance.
6. Teammate diversity.
7. Opponent diversity.

Hard constraints must always be satisfied before optimization preferences.

---

## 8. Hard Constraints

A schedule is invalid if any hard constraint is violated.

### HC-01
A player cannot appear more than once in the same round.

### HC-02
Each court must contain the configured number of players unless insufficient eligible players exist.

### HC-03
A player cannot be assigned outside their availability window.

### HC-04
Completed rounds cannot be changed during dynamic rescheduling.

### HC-05
A player marked unavailable or "skip next round" cannot be scheduled during that period.

### HC-06
A player who has left the session cannot appear in future rounds.

---

## 9. Soft Constraints / Optimization Priorities

### SC-01 Playing Time Fairness — Highest Priority

Minimize:

max_playing_minutes - min_playing_minutes

Among eligible participants.

---

### SC-02 Consecutive Rest Penalty

Avoid assigning the same person to rest in consecutive rounds whenever a valid alternative exists.

---

### SC-03 Team Skill Balance

Minimize the absolute difference between opposing team skill totals.

This must never override playing-time fairness.

---

### SC-04 Teammate Diversity

Penalize repeatedly assigning the same player pair as teammates.

---

### SC-05 Opponent Diversity

Penalize repeated opponent pairings.

---

### SC-06 Consecutive Play Balance

Optionally avoid one player playing many consecutive rounds while others frequently alternate.

This is lower priority than total playing-time fairness.

---

## 10. Fairness Calculation

For fixed-duration rounds:

player_playing_minutes =
number_of_rounds_played × round_duration

Target average:

total_player_slots / number_of_eligible_players

Example:

10 players
2 courts
4 players/court
8 rounds

Total slots:
2 × 4 × 8 = 64

Average:
64 / 10 = 6.4 rounds/player

Therefore exact equality is impossible.

Optimal distribution:
- 4 players play 7 rounds
- 6 players play 6 rounds

Maximum difference:
1 round.

The UI should explain when exact equality is mathematically impossible.

---

## 11. Availability-Aware Fairness

Players may arrive late or leave early.

Track:
- available_from,
- available_until,
- eligible_minutes.

Optional advanced metric:

participation_ratio =
playing_minutes / eligible_minutes

This should be used carefully.

For MVP:
- prioritize equal playing opportunities among currently eligible players,
- never penalize someone for time when they were unavailable.

---

## 12. Dynamic Rescheduling

During an active session the organizer can:

- add a player,
- remove a player,
- mark a player as left,
- skip a player's next round,
- temporarily disable a player,
- extend session end time,
- shorten session end time.

When recalculating:
1. completed rounds remain unchanged,
2. statistics from completed rounds remain counted,
3. remaining time is recalculated,
4. only future rounds are regenerated,
5. existing fairness history influences future assignments.

---

## 13. Manual Overrides

Organizer can:
- swap players,
- swap teams,
- move players between courts,
- force a player to rest,
- force a player to play if capacity permits.

After manual changes, the system should calculate a fairness impact.

Example:

Before:
Max playing-time difference = 15 min

After:
Max playing-time difference = 30 min

---

## 14. Session Lifecycle

Possible session statuses:

- DRAFT
- READY
- ACTIVE
- PAUSED
- COMPLETED
- CANCELLED

Round statuses:

- UPCOMING
- ACTIVE
- COMPLETED
- CANCELLED

---

## 15. Main Screens

### 15.1 Dashboard

Show:
- upcoming sessions,
- recent sessions,
- group/player statistics.

### 15.2 Create Session

Inputs:
- session name,
- date,
- start/end,
- court count,
- players per court,
- round duration,
- participants.

### 15.3 Schedule Preview

Show all generated rounds before session starts.

Allow:
- regenerate,
- manual swap,
- inspect fairness score.

### 15.4 Live Session

Display:
- current time,
- remaining session time,
- current round,
- each court,
- teams,
- resting players,
- next round,
- control buttons.

Actions:
- Start Session
- Start Round
- Finish Round
- Next Round
- Pause
- Skip Player
- Player Left
- Add Player
- Recalculate
- Extend Rental
- End Session

### 15.5 Session Summary

Show:
- total session duration,
- total usable minutes,
- number of rounds,
- playing minutes per player,
- rest minutes per player,
- matches played,
- maximum fairness difference,
- teammate statistics,
- opponent statistics.

---

## 16. Suggested Data Model

### User

- id
- name
- email
- password_hash
- created_at
- updated_at

### Group

- id
- owner_user_id
- name
- sport_type
- created_at
- updated_at

### Player

- id
- group_id
- name
- skill_rating
- active
- created_at
- updated_at

### Session

- id
- group_id
- name
- date
- start_time
- end_time
- warmup_minutes
- cleanup_minutes
- round_duration_minutes
- court_count
- players_per_court
- status
- created_at
- updated_at

### SessionPlayer

- id
- session_id
- player_id
- available_from
- available_until
- status
- joined_at
- left_at

Possible status values:
- AVAILABLE
- TEMPORARILY_UNAVAILABLE
- LEFT
- REMOVED

### Round

- id
- session_id
- round_number
- start_time
- end_time
- status

### CourtAssignment

- id
- round_id
- court_number

### TeamAssignment

- id
- court_assignment_id
- team_number
- player_id

### PlayerRoundState

Optional explicit record:
- session_id
- round_id
- player_id
- state

state:
- PLAY
- REST
- UNAVAILABLE

---

## 17. Historical Statistics

Track per player:

- sessions_played,
- total_playing_minutes,
- total_rest_minutes,
- rounds_played,
- average_playing_minutes_per_session,
- teammate frequencies,
- opponent frequencies.

Future version may use historical fairness when scheduling future sessions.

Example:
A player receiving slightly less playing time in one session may receive priority in a later session.

This must be configurable because some groups may only care about fairness within a single session.

---

## 18. Scheduler Architecture

Create a scheduler module independent of the UI.

Suggested interface:

generateSchedule(session, players, completedRounds, options)

Input:
- session settings,
- eligible players,
- already completed rounds,
- optimization settings.

Output:
- rounds,
- court assignments,
- resting players,
- fairness metrics,
- warnings,
- explanation.

The scheduling algorithm must be deterministic when given a fixed random seed.

---

## 19. MVP Scheduling Strategy

Start with a greedy algorithm.

For each upcoming round:

1. determine eligible players,
2. calculate each player's current playing minutes,
3. prioritize players with less playing time,
4. penalize consecutive rests,
5. select active players,
6. construct balanced teams,
7. minimize teammate repetition,
8. minimize opponent repetition,
9. update temporary scheduling statistics.

Use controlled randomness only as a tie-breaker.

Do not use pure random shuffle as the scheduling strategy.

---

## 20. Advanced Scheduling Strategy

After MVP is stable, optionally implement Integer Linear Programming / Constraint Programming.

Possible tools:
- Google OR-Tools CP-SAT,
- PuLP,
- another appropriate solver.

Potential binary variable:

X[p,r] = 1 if player p plays in round r.

Possible future variables:
- court assignments,
- team assignments,
- teammate pair indicators.

Optimization should be lexicographic or strongly weighted so lower-value objectives never destroy the primary playing-time fairness objective.

---

## 21. Technology Recommendation

Recommended architecture:

Frontend:
- Next.js
- TypeScript
- Tailwind CSS

Backend:
- FastAPI (Python)

Database:
- PostgreSQL

ORM:
- SQLAlchemy or SQLModel

Scheduler:
- Python module

Later optimization:
- OR-Tools CP-SAT or PuLP

Development:
- Docker Compose for local PostgreSQL and services.

Alternative:
Use full-stack Next.js for MVP if simplicity is more important than keeping the optimization engine in Python.

---

## 22. API Concepts

Examples:

POST /sessions
GET /sessions/{id}
PATCH /sessions/{id}

POST /sessions/{id}/players
PATCH /sessions/{id}/players/{player_id}

POST /sessions/{id}/generate-schedule
POST /sessions/{id}/recalculate

POST /sessions/{id}/start
POST /sessions/{id}/pause
POST /sessions/{id}/complete

POST /rounds/{id}/start
POST /rounds/{id}/complete

GET /sessions/{id}/statistics

---

## 23. Scheduler Output Example

```json
{
  "session_id": "session-001",
  "fairness": {
    "exact_equality_possible": false,
    "minimum_round_difference": 1,
    "max_playing_time_difference_minutes": 15
  },
  "rounds": [
    {
      "round_number": 1,
      "start": "19:00",
      "end": "19:15",
      "courts": [
        {
          "court": 1,
          "team_a": ["A", "B"],
          "team_b": ["C", "D"]
        },
        {
          "court": 2,
          "team_a": ["E", "F"],
          "team_b": ["G", "H"]
        }
      ],
      "resting": ["I", "J"]
    }
  ]
}
```

---

## 24. Edge Cases

System must gracefully handle:

1. Player count lower than court capacity.
2. Player count exactly equal to court capacity.
3. Player count much larger than court capacity.
4. Session shorter than one round.
5. Non-divisible remaining session time.
6. Player leaves during a round.
7. Player leaves before a future round.
8. New player joins mid-session.
9. Session end time changes.
10. Court count changes mid-session.
11. Odd or unusual players-per-court values.
12. No valid schedule under configured constraints.
13. Duplicate player names.
14. Session starts late.
15. Organizer manually overrides the schedule.

---

## 25. Non-Functional Requirements

### Reliability
Completed round data must never be lost during rescheduling.

### Performance
For normal groups of 4–40 players, schedule generation should feel immediate.

### Explainability
Scheduler should return reasons/warnings when perfect fairness is impossible.

### Maintainability
Scheduling logic must be separated from UI components.

### Testability
Core scheduler must have automated unit tests.

### Data Integrity
Use database transactions for state-changing session operations.

---

## 26. Testing Requirements

Must include tests for:

- fairness with 10 players / 2 courts / 4 players / 8 rounds,
- 8 players with 8 available slots,
- fewer players than capacity,
- late arrival,
- early departure,
- skipped round,
- dynamic player removal,
- adding player mid-session,
- session extension,
- preserving completed rounds,
- repeated teammate minimization,
- skill balancing,
- deterministic schedule generation using seed.

Important invariant:

For any two comparable eligible players, final playing-time difference should be no larger than mathematically necessary unless another hard constraint makes this impossible.

---

## 27. MVP Acceptance Criteria

The MVP is considered complete when an organizer can:

1. create a session,
2. set start/end time,
3. configure courts and player capacity,
4. enter participant names,
5. choose round duration,
6. generate a fair schedule,
7. see who plays/rests each round,
8. start and complete rounds,
9. remove/skip a player,
10. recalculate future rounds without changing completed rounds,
11. see per-player playing-time statistics,
12. complete the session and reopen its history later.

---

## 28. Future Features

Possible future additions:

- authentication,
- group management,
- reusable player groups,
- player self-join via QR,
- score tracking,
- ranking/ELO,
- tournament mode,
- long-term fairness,
- payment splitting,
- court cost calculation,
- attendance confirmation,
- notifications,
- export CSV/PDF,
- PWA/mobile application,
- multi-sport presets.

---

## 29. Product Principle

Whenever implementation choices conflict, use this priority:

1. Correctness.
2. Playing-time fairness.
3. Preserve historical/completed data.
4. Real-world usability.
5. Explainability.
6. Team quality/diversity.
7. Visual polish.

Never sacrifice core fairness for random-looking variety.
