import { parse, addDays, addWeeks, addMonths, setHours, setMinutes } from "date-fns";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Parse natural language date/time references
 * Examples: "next Friday", "tomorrow at 3pm", "in 2 weeks"
 */
export function parseWhen(
  text: string,
  timezone: string = "America/New_York"
): { start: Date; end?: Date } | null {
  const now = new Date();
  const lowerText = text.toLowerCase().trim();

  // Handle "today"
  if (lowerText.includes("today")) {
    return { start: now };
  }

  // Handle "tomorrow"
  if (lowerText.includes("tomorrow")) {
    return { start: addDays(now, 1) };
  }

  // Handle "next week"
  if (lowerText.includes("next week")) {
    return { start: addWeeks(now, 1) };
  }

  // Handle "next month"
  if (lowerText.includes("next month")) {
    return { start: addMonths(now, 1) };
  }

  // Handle specific days: "next Friday", "this Monday"
  const dayMatch = lowerText.match(
    /(next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i
  );
  if (dayMatch) {
    const dayName = dayMatch[2];
    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    const targetDay = dayMap[dayName.toLowerCase()];
    const currentDay = now.getDay();
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd <= 0 || dayMatch[1] === "next") {
      daysToAdd += 7;
    }
    return { start: addDays(now, daysToAdd) };
  }

  // Handle time specifications: "at 3pm", "at 15:00"
  const timeMatch = lowerText.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const meridiem = timeMatch[3]?.toLowerCase();

    if (meridiem === "pm" && hours < 12) hours += 12;
    if (meridiem === "am" && hours === 12) hours = 0;

    const dateWithTime = setMinutes(setHours(now, hours), minutes);
    return { start: dateWithTime };
  }

  // Handle "in X days/weeks/months"
  const inMatch = lowerText.match(/in\s+(\d+)\s+(day|week|month)s?/i);
  if (inMatch) {
    const amount = parseInt(inMatch[1]);
    const unit = inMatch[2].toLowerCase();
    if (unit === "day") return { start: addDays(now, amount) };
    if (unit === "week") return { start: addWeeks(now, amount) };
    if (unit === "month") return { start: addMonths(now, amount) };
  }

  // Fallback: return null if we can't parse
  return null;
}

/**
 * Resolve people names to email addresses using friends and contacts
 */
export async function resolvePeople(
  text: string,
  userId: Id<"users">
): Promise<string[]> {
  const emails: string[] = [];

  // Get user's friends
  const friends = await convex.query(api.friends.listFriends, { userId });

  // Try to match names in the text
  const lowerText = text.toLowerCase();

  for (const friend of friends) {
    if (!friend.user) continue;

    const displayName = friend.user.displayName.toLowerCase();
    const firstName = displayName.split(" ")[0];

    // Check if friend's name appears in the text
    if (lowerText.includes(displayName) || lowerText.includes(firstName)) {
      emails.push(friend.user.email);
    }
  }

  return emails;
}

/**
 * Resolve friend names to user IDs
 */
export async function resolveFriendIds(
  text: string,
  userId: Id<"users">
): Promise<string[]> {
  const userIds: string[] = [];

  // Get user's friends
  const friends = await convex.query(api.friends.listFriends, { userId });

  // Try to match names in the text
  const lowerText = text.toLowerCase();

  for (const friend of friends) {
    if (!friend.user) continue;

    const displayName = friend.user.displayName.toLowerCase();
    const firstName = displayName.split(" ")[0];

    // Check if friend's name appears in the text
    if (lowerText.includes(displayName) || lowerText.includes(firstName)) {
      userIds.push(friend.user._id);
    }
  }

  return userIds;
}

/**
 * Extract location from text
 * Simple regex-based extraction
 */
export function extractLocation(text: string): string | null {
  // Look for patterns like "at [location]" or "in [location]"
  const atMatch = text.match(/\bat\s+([A-Z][a-zA-Z\s,]+?)(?:\s+(?:on|at|with|for)|$)/);
  if (atMatch) return atMatch[1].trim();

  const inMatch = text.match(/\bin\s+([A-Z][a-zA-Z\s,]+?)(?:\s+(?:on|at|with|for)|$)/);
  if (inMatch) return inMatch[1].trim();

  // Look for Zoom/Google Meet mentions
  if (text.toLowerCase().includes("zoom")) return "Zoom";
  if (text.toLowerCase().includes("google meet")) return "Google Meet";
  if (text.toLowerCase().includes("teams")) return "Microsoft Teams";

  return null;
}

/**
 * Normalize duration text to minutes
 * Examples: "30 minutes", "1 hour", "2.5 hours"
 */
export function normalizeDuration(text: string): number {
  const lowerText = text.toLowerCase();

  // Look for explicit duration mentions
  const hourMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr)s?/);
  if (hourMatch) {
    return Math.round(parseFloat(hourMatch[1]) * 60);
  }

  const minMatch = lowerText.match(/(\d+)\s*(?:minute|min)s?/);
  if (minMatch) {
    return parseInt(minMatch[1]);
  }

  // Default: 60 minutes
  return 60;
}

/**
 * Extract event title from user message
 * Looks for quoted text or common patterns
 */
export function extractTitle(text: string): string | null {
  // Look for quoted text
  const quoteMatch = text.match(/"([^"]+)"/);
  if (quoteMatch) return quoteMatch[1];

  const singleQuoteMatch = text.match(/'([^']+)'/);
  if (singleQuoteMatch) return singleQuoteMatch[1];

  // Look for patterns like "schedule X" or "create X"
  const scheduleMatch = text.match(
    /(?:schedule|create|add|book)\s+(?:a\s+)?(.+?)(?:\s+(?:at|on|for|with)|$)/i
  );
  if (scheduleMatch) {
    const title = scheduleMatch[1].trim();
    // Clean up common trailing words
    return title
      .replace(/\s+(meeting|event|appointment|call)$/i, " $1")
      .trim();
  }

  return null;
}

/**
 * Generate a concise thread title from the first user message
 */
export function generateThreadTitle(message: string): string {
  // Take first 50 characters
  let title = message.slice(0, 50).trim();

  // If we cut off mid-word, go back to last space
  if (message.length > 50) {
    const lastSpace = title.lastIndexOf(" ");
    if (lastSpace > 20) {
      title = title.slice(0, lastSpace) + "...";
    } else {
      title += "...";
    }
  }

  return title;
}
