# Blackout — Product Specification

> One match. One week. One conversation.

---

## 1. Overview & Concept

**Blackout** is a dating web app built on intentionality and scarcity. Each user receives exactly one auto-assigned match per week. That match is the only person they can chat with. When the week ends, the chat disappears entirely and a new match arrives.

- **Core mechanic**: One match per week, auto-assigned every Sunday evening
- **Chat lifecycle**: Ephemeral — all messages are permanently deleted at cycle reset
- **Match rules**: Users cannot skip or reject matches; they can only report inappropriate ones to admin
- **Two portals**: A user-facing app and an admin dashboard

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js + shadcn/ui (Radix, Lyra style, Stone base, Emerald theme, Lucide icons, DM Sans) |
| Backend | Next.js API routes (Node.js) |
| Database | PostgreSQL via Prisma ORM |
| Real-time | WebSockets (Socket.io) for chat |
| Auth | Phone number + OTP (Twilio Verify) |
| Hosting | TBD (Vercel, Railway, etc.) |

**shadcn init command:**
```bash
pnpm dlx shadcn@latest create --preset "https://ui.shadcn.com/init?base=radix&style=lyra&baseColor=stone&theme=emerald&iconLibrary=lucide&font=dm-sans&menuAccent=bold&menuColor=default&radius=default&template=next&rtl=false" --template next
```

---

## 3. Authentication

### Flow
1. User enters phone number
2. OTP sent via Twilio Verify
3. User enters OTP code to verify
4. **New users** → redirected to onboarding (profile creation + initial questionnaire)
5. **Returning users** → redirected to main app (current match view)

### Session Management
- JWT-based session tokens
- Refresh token rotation
- Sessions expire after 30 days of inactivity

---

## 4. User Profile

### Required Fields
| Field | Type | Details |
|-------|------|---------|
| Name | text | First name (display name) |
| Age | number | Derived from date of birth; must be 18+ |
| Photos | file[] | Up to 6 photos; at least 1 required |
| Bio | text | Short bio, max 500 characters |
| Location | geo | City/region (used for matching proximity) |
| Interests | tags[] | Selectable interest tags (e.g., hiking, cooking, music) |
| Gender | select | User's gender identity |
| Preference | select | Gender preference for matches |

### Visibility
- Profile is visible to the user's current match
- Profile is visible to admin at all times
- Past matches can see a read-only summary (name, photo, age, bio)

---

## 5. Weekly Questionnaire System

### Design
- Each week, users are presented with a **fresh set of 10 questions**
- Questions are drawn from an admin-managed **question bank**
- Questions can overlap week-to-week but are never a fixed, identical set
- Users must answer all 10 questions to be eligible for that week's match

### Question Types
| Type | Example |
|------|---------|
| Multiple choice | "What's your ideal Saturday night?" → options A/B/C/D |
| Scale (1–5) | "How adventurous are you?" → 1 (not at all) to 5 (extremely) |
| Short text | "Describe your perfect day in one sentence." |

### Weekly Rotation Logic
- System auto-selects 10 questions from the active question bank each week
- Selection ensures variety: avoids repeating more than 3 questions from the previous week
- Admin can manually curate or override the auto-selected set before Sunday

### Scoring
- Answers are used by the matching algorithm to compute compatibility scores
- Multiple choice and scale answers are scored numerically
- Short text answers are stored for profile enrichment (not scored algorithmically)

---

## 6. Matching Algorithm (Hybrid)

### Compatibility Scoring
1. **Questionnaire similarity**: Compare answer vectors between users using weighted scoring
   - Scale questions: absolute difference (lower = more compatible)
   - Multiple choice: shared answer = compatibility bonus
2. **Preference constraints**: Filter by gender preference, age range tolerance, location proximity
3. **History penalty**: Users who have been previously matched are deprioritized
4. **Freshness bonus**: Newly joined users get a slight priority boost

### Match Assignment Cycle
| Time | Event |
|------|-------|
| Sunday 6:00 PM | Weekly questionnaire deadline; algorithm begins running |
| Sunday 8:00 PM | Matches finalized; admin override window opens |
| Sunday 11:59 PM | Old chats permanently deleted; match cycle locks |
| Monday 12:00 AM | New matches go live; users notified |

### Admin Override
- Admin can view the algorithm's proposed matches before they go live
- Admin can manually reassign any match pair
- Override window: Sunday 8:00 PM – 11:59 PM

### Edge Cases
- **Odd number of users**: One user goes unmatched; admin notified to resolve
- **No compatible matches**: Algorithm relaxes constraints progressively; admin notified if no match found
- **Banned/suspended users**: Excluded from the matching pool entirely

---

## 7. User App — Pages & Features

### 7a. Current Match Profile (`/match`)
- **Hero section**: Match's primary photo, name, age, location
- **Photo gallery**: Swipeable carousel of match's photos
- **Bio & interests**: Match's bio text and interest tags
- **Icebreaker prompt**: A system-generated conversation starter displayed prominently
- **Actions**:
  - "Start chatting" button → navigates to chat
  - "Report" button → opens report modal (reason + optional details)
- **Empty state**: "No match this week" message if unmatched

### 7b. Chat (`/chat`)
- **Real-time messaging**: Text-only, powered by WebSockets
- **Icebreaker prompts**: Suggested conversation starters appear as tappable chips above the input
- **Message features**:
  - Typing indicators (animated dots)
  - Read receipts (double checkmarks)
  - Timestamps on each message
  - Auto-scroll to latest message
- **Ephemeral notice**: Persistent banner — "This chat will disappear on Sunday at midnight"
- **No media**: Text input only (no image upload, no voice messages)
- **Report**: Ability to report specific messages (long-press → report)

### 7c. Past Matches (`/history`)
- **Match list**: Chronological list of previous matches (most recent first)
- **Each card shows**: Match's photo, name, age, short bio, week date
- **View-only**: No chat history preserved (chats are deleted at cycle end)
- **Empty state**: "No past matches yet" for new users

### 7d. Profile & Settings (`/profile`)
- **Edit profile**: Update photos, bio, interests, location
- **View questionnaire**: See current week's answers
- **Preferences**: Update age range, distance, gender preference
- **Notifications**: Toggle push/SMS notifications
- **Account**: Delete account (with confirmation)

### 7e. Onboarding (`/onboarding`)
- **Step 1**: Enter name, date of birth, gender, preference
- **Step 2**: Upload photos (minimum 1, up to 6)
- **Step 3**: Write bio, select interests
- **Step 4**: Answer 10 questionnaire questions
- **Step 5**: Review profile → submit → enter app

### Navigation
- Bottom tab bar: **Match** | **Chat** | **History** | **Profile**
- Match tab shows a badge/dot when a new match is available

---

## 8. Admin Dashboard — Pages & Features

### 8a. Analytics Dashboard (`/admin`)
- **Key metrics cards**: Total users, active users this week, new signups (7d/30d)
- **Charts**:
  - Signups over time (line chart)
  - Active users over time (line chart)
  - Match completion rate per week (bar chart)
  - Average messages per match (bar chart)
  - Retention: returning users week-over-week (line chart)
- **Quick stats**: Total matches made, total reports filed, active bans

### 8b. User Management (`/admin/users`)
- **Searchable table**: Search by name, phone, location
- **Filters**: Status (active, suspended, banned), join date, location
- **User detail view**:
  - Full profile (all photos, bio, interests)
  - All questionnaire answers (current + historical)
  - Match history (with whom, which week)
  - Report history (filed by or against this user)
- **Actions**: Warn, suspend (with duration), ban (permanent), reinstate
- **Bulk actions**: Select multiple users for batch operations

### 8c. Complaint & Moderation Center (`/admin/reports`)
- **Report queue**: Sortable by date, severity, status
- **Status tracking**: Open → In Review → Resolved / Dismissed
- **Report detail view**:
  - Reporter's profile summary
  - Reported user's profile summary
  - Report reason and details
  - **Flagged chat content**: View the actual messages from the reported match's chat
  - Full chat transcript for the match (if still within the weekly cycle)
- **Actions per report**:
  - Dismiss (with reason)
  - Warn the reported user
  - Suspend the reported user
  - Ban the reported user
- **Escalation**: Flag reports as high-priority for urgent review

### 8d. Match Management (`/admin/matches`)
- **Current week view**: Table of all auto-generated match pairs
- **Override controls**: Reassign matches before the Sunday lock
- **Match history**: Browse matches by week, search by user
- **Unmatched users**: List of users without a match for the current cycle + manual assignment

### 8e. Question Bank Management (`/admin/questions`)
- **Question list**: All questions in the bank with type, status (active/archived), usage count
- **CRUD operations**: Create, edit, archive, delete questions
- **Weekly set preview**: View the auto-generated question set for the upcoming week
- **Manual curation**: Override auto-selection; hand-pick questions for a specific week
- **Answer analytics**: Aggregate answer distributions per question (charts)

---

## 9. Notifications

| Event | Channel | Recipient |
|-------|---------|-----------|
| OTP code | SMS | User |
| New match available | Push + In-app | User |
| New message received | Push | User |
| Match cycle ending soon (Saturday) | Push + In-app | User |
| Weekly questionnaire reminder | Push | User (if unanswered) |
| Report filed against you | In-app | User |
| Admin warning/suspension | SMS + In-app | User |
| New report filed | In-app | Admin |
| Unmatched users alert | In-app | Admin |

---

## 10. Data Model

### User
```
id              UUID (PK)
phone           String (unique, encrypted)
name            String
date_of_birth   Date
gender          Enum (male, female, non_binary, other)
preference      Enum (male, female, everyone)
bio             String (max 500)
location        String (city/region)
latitude        Float
longitude       Float
photos          String[] (URLs, max 6)
interests       String[]
status          Enum (active, suspended, banned, onboarding)
role            Enum (user, admin)
created_at      DateTime
updated_at      DateTime
```

### QuestionBank
```
id              UUID (PK)
question_text   String
question_type   Enum (multiple_choice, scale, short_text)
options         JSON (array of options, for multiple_choice)
active          Boolean
usage_count     Int
created_at      DateTime
updated_at      DateTime
```

### WeeklyQuestionSet
```
id              UUID (PK)
week_start      DateTime (Monday 00:00)
week_end        DateTime (Sunday 23:59)
question_ids    UUID[] (FK → QuestionBank)
is_finalized    Boolean
created_at      DateTime
```

### QuestionAnswer
```
id              UUID (PK)
user_id         UUID (FK → User)
question_id     UUID (FK → QuestionBank)
weekly_set_id   UUID (FK → WeeklyQuestionSet)
answer          JSON (value depends on question_type)
created_at      DateTime
```

### Match
```
id              UUID (PK)
user_a_id       UUID (FK → User)
user_b_id       UUID (FK → User)
week_start      DateTime
week_end        DateTime
status          Enum (active, completed, reported, admin_override)
compatibility   Float (algorithm score)
assigned_by     Enum (algorithm, admin)
created_at      DateTime
```

### Message
```
id              UUID (PK)
match_id        UUID (FK → Match)
sender_id       UUID (FK → User)
content         String
is_read         Boolean
is_flagged      Boolean
created_at      DateTime
```

### Report
```
id              UUID (PK)
reporter_id     UUID (FK → User)
reported_id     UUID (FK → User)
match_id        UUID (FK → Match)
reason          String
details         String (optional)
flagged_messages UUID[] (FK → Message)
status          Enum (open, in_review, resolved, dismissed)
priority        Enum (normal, high)
admin_notes     String
resolved_by     UUID (FK → User, admin)
created_at      DateTime
updated_at      DateTime
```

### AdminAction
```
id              UUID (PK)
admin_id        UUID (FK → User)
target_user_id  UUID (FK → User)
action_type     Enum (warn, suspend, ban, reinstate, dismiss_report)
reason          String
metadata        JSON (e.g., suspension duration)
created_at      DateTime
```

---

## 11. Security & Privacy

### Data Protection
- All chat messages permanently deleted at weekly cycle reset (ephemeral by design)
- Phone numbers encrypted at rest (AES-256)
- Photos stored in cloud storage with signed URLs (time-limited access)
- All API endpoints require authentication

### Rate Limiting
- OTP requests: max 5 per phone number per hour
- Message sending: max 100 messages per hour per user
- Report filing: max 3 reports per user per week

### Admin Security
- Admin accounts require separate authentication
- All admin actions are audit-logged (who, what, when)
- Admin cannot delete audit logs

### Infrastructure
- HTTPS everywhere
- Secure WebSocket connections (WSS)
- Database backups (daily)
- Environment secrets managed via environment variables (never committed)

---

## 12. Future Considerations (Out of Scope for MVP)

- Image and voice message support in chat
- Video calling between matched users
- Premium tier (extra skips, profile boosts)
- AI-powered icebreaker generation
- Mobile native apps (iOS/Android)
- Broadcast/announcement system from admin to users
- Email notifications alongside SMS
