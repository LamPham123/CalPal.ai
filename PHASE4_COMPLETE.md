# Phase 4: Group Scheduling & Free/Busy - Complete! ✅

## What's New

Phase 4 adds **intelligent group scheduling** - automatically find the best meeting times when multiple people are free!

---

## Features Implemented

### 1. ✅ **Smart Scheduling Algorithm**
- Checks everyone's calendars for busy times
- Inverts busy → free for each person
- Finds intersection (when EVERYONE is free)
- Splits into slots of requested duration
- Filters by preferences (work hours, weekends, etc.)
- Ranks by desirability (prefers weekdays, mid-day, earlier dates)
- Returns top 10 best options

### 2. ✅ **Find Time Page**
- Beautiful configuration panel
- Select multiple friends
- Set meeting duration (15 min - 3 hours)
- Choose date range (today, tomorrow, next week, custom)
- Time preferences (morning, afternoon, evening, business hours, anytime)
- Avoid weekends option
- One-click "Find Available Times"

### 3. ✅ **Available Time Slots Display**
- Shows ranked results with numbers (#1, #2, #3...)
- Full date and time display
- "Book This" button for each slot
- Creates event + invites all attendees instantly

### 4. ✅ **Preference-Based Filtering**
- **Morning**: 8 AM - 12 PM
- **Afternoon**: 12 PM - 5 PM
- **Evening**: 5 PM - 9 PM
- **Business Hours**: 9 AM - 5 PM
- **Anytime**: No time restrictions

---

## How the Algorithm Works

### Step 1: Get Busy Times
```
User A: Busy 9-10 AM, 2-3 PM
User B: Busy 10-11 AM, 1-2 PM
User C: Busy 9-10 AM, 3-4 PM
```

### Step 2: Invert to Free Times
```
User A: Free 10 AM-2 PM, 3-5 PM
User B: Free 9-10 AM, 11 AM-1 PM, 2-5 PM
User C: Free 10 AM-3 PM, 4-5 PM
```

### Step 3: Find Intersection (Everyone Free)
```
Common Free Times:
- 10 AM - 1 PM
- 4 PM - 5 PM
```

### Step 4: Split into Meeting Slots
```
For 1-hour meeting:
- 10:00 AM - 11:00 AM ✅
- 10:30 AM - 11:30 AM ✅
- 11:00 AM - 12:00 PM ✅
- 11:30 AM - 12:30 PM ✅
- 12:00 PM - 1:00 PM ✅
- 4:00 PM - 5:00 PM ✅
```

### Step 5: Filter & Rank
- Remove weekend slots (if preference set)
- Remove slots outside work hours
- Rank by desirability
- Return top 10

---

## User Flow Example

### Finding Time for 3 People

1. Go to dashboard → Click **"Find Time"** button
2. Fill in details:
   ```
   Event Title: Team Planning Session
   Duration: 1.5 hours
   Date Range: Next 7 days
   Time Preference: Business Hours
   Avoid Weekends: ✓
   ```
3. Select friends:
   - ☑ Alex
   - ☑ Mia
4. Click **"Find Available Times"**
5. See results:
   ```
   #1 Tuesday, Oct 29 at 10:00 AM - 11:30 AM
   #2 Wednesday, Oct 30 at 2:00 PM - 3:30 PM
   #3 Thursday, Oct 31 at 9:00 AM - 10:30 AM
   ```
6. Click **"Book This"** on option #1
7. ✅ Event created + Calendar invites sent to Alex & Mia!

---

## Technical Implementation

### Scheduling Algorithm (`lib/scheduling.ts`)

```typescript
findBestSlots(
  userIds,           // [yourId, friendId1, friendId2]
  calendars,         // [GoogleCalendarClient objects]
  windowStart,       // Date
  windowEnd,         // Date
  durationMin,       // 60
  preferences        // { workHoursStart, workHoursEnd, avoidWeekends }
) → TimeSlot[]      // Top 10 best times
```

**Functions:**
- `invertBusyToFree()` - Converts busy periods to free periods
- `intersectFreeTimes()` - Finds when EVERYONE is free
- `splitIntoSlots()` - Splits into meeting-sized chunks
- `filterByPreferences()` - Applies time/day filters
- `rankSlots()` - Sorts by desirability

### API Route

```
POST /api/schedule/find-time
Body: {
  friendUserIds: ["id1", "id2"],
  windowStart: "2025-10-28T00:00:00Z",
  windowEnd: "2025-11-04T23:59:59Z",
  durationMin: 60,
  preferences: {
    workHoursStart: "09:00",
    workHoursEnd: "17:00",
    avoidWeekends: true
  }
}

Response: {
  slots: [{start, end}, ...],
  participants: [{user details}],
  ...
}
```

### UI Component

```
app/find-time/page.tsx
├── Configuration Panel (left)
│   ├── Event title
│   ├── Duration selector
│   ├── Date range selector
│   ├── Time preference dropdown
│   ├── Avoid weekends checkbox
│   └── Friend checkboxes
└── Results Panel (right)
    └── Available time slots with "Book This" buttons
```

---

## What You Can Do Now

✅ Sign in with Google
✅ View calendar events
✅ Create/edit/delete events
✅ Add & manage friends
✅ **Find best meeting times automatically** (NEW!)
✅ **See when everyone is free** (NEW!)
✅ **Book with one click** (NEW!)

---

## Testing Checklist

### ✅ Test with Multiple Friends

**Requirement:** Need at least 2 friends added

1. Go to dashboard → Click **"Find Time"**
2. Enter event title: "Team Sync"
3. Select 2+ friends
4. Choose duration: 1 hour
5. Set date range: Next 7 days
6. Click "Find Available Times"
7. Should see ranked time slots
8. Click "Book This" on any slot
9. Verify:
   - Event created in your calendar
   - Attendees invited
   - Shows in dashboard

### ✅ Test Time Preferences

1. Set "Morning" preference
2. Verify slots are only 8 AM - 12 PM

1. Set "Evening" preference
2. Verify slots are only 5 PM - 9 PM

1. Check "Avoid weekends"
2. Verify no Saturday/Sunday slots

### ✅ Test Edge Cases

- No common free time → Shows "No available slots" message
- All day busy → Shows evening slots
- No friends selected → Shows error "Select at least one friend"
- No title entered → Shows error when booking

---

## Real-World Example

**Scenario:** You want to schedule a 90-minute planning session with 3 teammates next week.

**Before CalPal AI:**
- Email chain: "When are you free?"
- Back and forth for days
- Manual checking of calendars
- Compromise on suboptimal time

**With CalPal AI:**
1. Click "Find Time"
2. Select 3 friends
3. Duration: 1.5 hours
4. Date: Next week
5. Preference: Business hours
6. Click "Find Available Times"
7. **Results in 2 seconds** ⚡
8. Book best option with one click
9. Everyone auto-invited
10. **Done!** 🎉

---

## Next: Phase 5 (Optional)

**Proposals System**
- Save suggested times without booking
- Share proposals with group
- Vote on best time
- Auto-expire after 48 hours
- Track proposal status

**Or skip to Phase 6/7:**
- Trigger.dev background jobs
- Daily digest emails
- Reminders
- Polish & testing

**Then: AI Layer! 🤖**

---

## Quick Start

```bash
# Make sure both are running:

# Terminal 1
npx convex dev

# Terminal 2
npm run dev

# Visit: http://localhost:3000/dashboard
# Click "Find Time" button (purple)
```

---

**Phase 4 Complete!** Group scheduling now works automatically! 🚀

**To test fully:**
1. Add 1-2 friends (use another account or ask someone)
2. Have some events in calendars (busy times)
3. Click "Find Time" → select friends → find times
4. Marvel at the magic! ✨
