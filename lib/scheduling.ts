import { GoogleCalendarClient } from "./google-calendar";
import type { calendar_v3 } from "googleapis";

export interface TimeSlot {
  start: string; // ISO string
  end: string; // ISO string
}

export interface SchedulingPreferences {
  workHoursStart?: string; // "09:00"
  workHoursEnd?: string; // "17:00"
  avoidWeekends?: boolean;
  bufferMin?: number; // minutes before/after
}

/**
 * Convert busy periods to free periods
 */
function invertBusyToFree(
  busyPeriods: TimeSlot[],
  windowStart: Date,
  windowEnd: Date
): TimeSlot[] {
  const freePeriods: TimeSlot[] = [];
  let currentStart = windowStart;

  // Sort busy periods by start time
  const sorted = [...busyPeriods].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  for (const busy of sorted) {
    const busyStart = new Date(busy.start);
    const busyEnd = new Date(busy.end);

    // If there's a gap before this busy period, it's free
    if (currentStart < busyStart) {
      freePeriods.push({
        start: currentStart.toISOString(),
        end: busyStart.toISOString(),
      });
    }

    // Move current start to after this busy period
    if (busyEnd > currentStart) {
      currentStart = busyEnd;
    }
  }

  // Add final free period if there's time left
  if (currentStart < windowEnd) {
    freePeriods.push({
      start: currentStart.toISOString(),
      end: windowEnd.toISOString(),
    });
  }

  return freePeriods;
}

/**
 * Find intersection of all free time periods
 */
function intersectFreeTimes(allFreeTimes: TimeSlot[][]): TimeSlot[] {
  if (allFreeTimes.length === 0) return [];
  if (allFreeTimes.length === 1) return allFreeTimes[0];

  let intersection = allFreeTimes[0];

  for (let i = 1; i < allFreeTimes.length; i++) {
    const newIntersection: TimeSlot[] = [];

    for (const slot1 of intersection) {
      for (const slot2 of allFreeTimes[i]) {
        const start1 = new Date(slot1.start);
        const end1 = new Date(slot1.end);
        const start2 = new Date(slot2.start);
        const end2 = new Date(slot2.end);

        // Find overlapping period
        const overlapStart = start1 > start2 ? start1 : start2;
        const overlapEnd = end1 < end2 ? end1 : end2;

        if (overlapStart < overlapEnd) {
          newIntersection.push({
            start: overlapStart.toISOString(),
            end: overlapEnd.toISOString(),
          });
        }
      }
    }

    intersection = newIntersection;
  }

  return intersection;
}

/**
 * Split free periods into slots of specific duration
 */
function splitIntoSlots(
  freePeriods: TimeSlot[],
  durationMin: number
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const durationMs = durationMin * 60 * 1000;
  const incrementMs = 30 * 60 * 1000; // 30 minutes between slot starts

  for (const period of freePeriods) {
    let currentStart = new Date(period.start);
    const periodEnd = new Date(period.end);

    // Round start time to nearest 30 minutes
    const minutes = currentStart.getMinutes();
    if (minutes % 30 !== 0) {
      const roundedMinutes = Math.ceil(minutes / 30) * 30;
      currentStart.setMinutes(roundedMinutes, 0, 0);
    }

    while (currentStart.getTime() + durationMs <= periodEnd.getTime()) {
      const slotEnd = new Date(currentStart.getTime() + durationMs);

      slots.push({
        start: currentStart.toISOString(),
        end: slotEnd.toISOString(),
      });

      // Move to next slot (increment by 30 minutes)
      currentStart = new Date(currentStart.getTime() + incrementMs);
    }
  }

  console.log(`Generated ${slots.length} slots from ${freePeriods.length} free periods`);
  return slots;
}

/**
 * Filter slots by preferences
 */
function filterByPreferences(
  slots: TimeSlot[],
  preferences: SchedulingPreferences
): TimeSlot[] {
  return slots.filter((slot) => {
    const start = new Date(slot.start);
    const end = new Date(slot.end);

    // Check weekends
    if (preferences.avoidWeekends) {
      const day = start.getDay();
      if (day === 0 || day === 6) return false;
    }

    // Check work hours
    if (preferences.workHoursStart && preferences.workHoursEnd) {
      const startHour = start.getHours();
      const startMin = start.getMinutes();
      const endHour = end.getHours();
      const endMin = end.getMinutes();

      const [workStartHour, workStartMin] = preferences.workHoursStart
        .split(":")
        .map(Number);
      const [workEndHour, workEndMin] = preferences.workHoursEnd
        .split(":")
        .map(Number);

      const startTime = startHour * 60 + startMin;
      let endTime = endHour * 60 + endMin;
      const workStart = workStartHour * 60 + workStartMin;
      const workEnd = workEndHour * 60 + workEndMin;

      // Handle midnight crossover (if end time is past midnight, it's invalid)
      if (endTime < startTime) {
        // End time is on next day (past midnight) - reject these slots
        return false;
      }

      // Slot must be entirely within work hours
      if (startTime < workStart || endTime > workEnd) return false;
    }

    return true;
  });
}

/**
 * Rank slots by desirability - spread across days
 */
function rankSlots(slots: TimeSlot[], preferences: SchedulingPreferences): TimeSlot[] {
  // Group slots by date
  const slotsByDate: { [date: string]: TimeSlot[] } = {};

  slots.forEach(slot => {
    const date = new Date(slot.start).toISOString().split('T')[0];
    if (!slotsByDate[date]) {
      slotsByDate[date] = [];
    }
    slotsByDate[date].push(slot);
  });

  // Sort slots within each day
  Object.keys(slotsByDate).forEach(date => {
    slotsByDate[date].sort((a, b) => {
      const aStart = new Date(a.start);
      const bStart = new Date(b.start);

      // If work hours are specified, prefer times closer to midpoint of work hours
      // Otherwise, just sort chronologically (no preference)
      if (preferences.workHoursStart && preferences.workHoursEnd) {
        const [workStartHour] = preferences.workHoursStart.split(":").map(Number);
        const [workEndHour] = preferences.workHoursEnd.split(":").map(Number);
        const midpoint = (workStartHour + workEndHour) / 2;

        const aHour = aStart.getHours();
        const bHour = bStart.getHours();
        const aScore = Math.abs(aHour - midpoint);
        const bScore = Math.abs(bHour - midpoint);
        return aScore - bScore;
      } else {
        // No time preference - just sort chronologically
        return aStart.getTime() - bStart.getTime();
      }
    });
  });

  // Get sorted dates
  const sortedDates = Object.keys(slotsByDate).sort((a, b) => {
    const dateA = new Date(a);
    const dateB = new Date(b);

    // Prefer weekdays over weekends
    const dayA = dateA.getDay();
    const dayB = dateB.getDay();
    const aIsWeekend = dayA === 0 || dayA === 6;
    const bIsWeekend = dayB === 0 || dayB === 6;

    if (aIsWeekend && !bIsWeekend) return 1;
    if (!aIsWeekend && bIsWeekend) return -1;

    // Then prefer earlier dates
    return dateA.getTime() - dateB.getTime();
  });

  // Interleave slots from different days to show variety
  const result: TimeSlot[] = [];
  let maxSlotsPerDay = Math.max(...Object.values(slotsByDate).map(s => s.length));

  for (let i = 0; i < maxSlotsPerDay; i++) {
    for (const date of sortedDates) {
      if (slotsByDate[date][i]) {
        result.push(slotsByDate[date][i]);
      }
    }
  }

  return result;
}

/**
 * Main function: Find best meeting times for multiple people
 */
export async function findBestSlots(
  userIds: string[],
  calendars: GoogleCalendarClient[],
  windowStart: Date,
  windowEnd: Date,
  durationMin: number,
  preferences: SchedulingPreferences = {}
): Promise<TimeSlot[]> {
  console.log("=== Finding Best Slots ===");
  console.log("Window:", windowStart.toISOString(), "to", windowEnd.toISOString());
  console.log("Duration:", durationMin, "minutes");
  console.log("Participants:", userIds.length);

  // Get busy times for all participants
  const allBusyTimes: TimeSlot[][] = [];

  for (let i = 0; i < calendars.length; i++) {
    const calendar = calendars[i];

    // Get all calendars for this user
    const userCalendars = await calendar.getCalendarList();

    const calendarIds = userCalendars
      .filter((cal) => {
        if (!cal.id) return false;

        // Include calendars where they are the OWNER
        // Exclude calendars where accessRole is "reader" or "freeBusyReader" (shared WITH them)
        const isPrimary = cal.primary === true;
        const isOwner = cal.accessRole === "owner";

        // If they're the owner, it's THEIR calendar (including School, Work, Personal sub-calendars)
        return isPrimary || isOwner;
      })
      .map((cal) => cal.id!);

    console.log(`User ${i + 1} has ${calendarIds.length} calendars:`, calendarIds);

    // Query free/busy for ALL calendars
    const freeBusyResponse = await calendar.getFreeBusy(
      calendarIds,
      windowStart.toISOString(),
      windowEnd.toISOString()
    );

    const busyTimes: TimeSlot[] = [];
    const calendarsData = freeBusyResponse.calendars || {};

    for (const calendarId in calendarsData) {
      const calendarData = calendarsData[calendarId];
      if (calendarData.busy) {
        console.log(`  Calendar ${calendarId}: ${calendarData.busy.length} busy periods`);
        calendarData.busy.forEach((period) => {
          console.log(`    - ${period.start} to ${period.end}`);
        });
        busyTimes.push(
          ...calendarData.busy.map((period) => ({
            start: period.start || "",
            end: period.end || "",
          }))
        );
      }
    }

    console.log(`User ${i + 1} total busy periods across all calendars:`, busyTimes.length);
    allBusyTimes.push(busyTimes);
  }

  // Convert busy times to free times for each person
  const allFreeTimes = allBusyTimes.map((busyTimes, idx) => {
    const freeTimes = invertBusyToFree(busyTimes, windowStart, windowEnd);
    console.log(`User ${idx + 1} free periods:`, freeTimes.length);
    return freeTimes;
  });

  // Find intersection (times when EVERYONE is free)
  const commonFreeTimes = intersectFreeTimes(allFreeTimes);
  console.log("Common free periods:", commonFreeTimes.length);

  // Split into slots of requested duration
  const slots = splitIntoSlots(commonFreeTimes, durationMin);
  console.log("Total slots generated:", slots.length);

  // Filter by preferences
  const filtered = filterByPreferences(slots, preferences);
  console.log("After preference filter:", filtered.length);

  // Rank by desirability
  const ranked = rankSlots(filtered, preferences);

  // Return top 200 slots to show more availability per day
  const result = ranked.slice(0, 200);
  console.log("Returning top slots:", result.length);

  return result;
}
