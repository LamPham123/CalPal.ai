import { google, calendar_v3 } from "googleapis";
import { getOAuth2Client, refreshAccessToken } from "./google-auth";
import { decrypt, encrypt } from "./encryption";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export class GoogleCalendarClient {
  private userId: Id<"users">;
  private accessToken: string;
  private refreshToken: string;
  private expiresAt: number;
  private userTimezone: string;

  private constructor(
    userId: Id<"users">,
    accessToken: string,
    refreshToken: string,
    expiresAt: number,
    userTimezone: string
  ) {
    this.userId = userId;
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expiresAt = expiresAt;
    this.userTimezone = userTimezone;
  }

  static async forUser(userId: Id<"users">): Promise<GoogleCalendarClient> {
    const tokens = await convex.query(api.auth.getTokens, { userId });

    if (!tokens) {
      throw new Error("No tokens found for user");
    }

    // Get user info to retrieve timezone
    const user = await convex.query(api.users.getCurrentUser, { userId });
    const userTimezone = user?.timezone || "America/Los_Angeles";

    // Decrypt tokens
    const accessToken = decrypt(tokens.accessToken);
    const refreshToken = decrypt(tokens.refreshToken);

    return new GoogleCalendarClient(
      userId,
      accessToken,
      refreshToken,
      tokens.expiresAt,
      userTimezone
    );
  }

  private async ensureValidToken(): Promise<string> {
    // If token is still valid for at least 5 minutes, use it
    if (this.expiresAt > Date.now() + 5 * 60 * 1000) {
      return this.accessToken;
    }

    // Refresh the token
    console.log("Refreshing access token...");
    const newTokens = await refreshAccessToken(this.refreshToken);

    if (!newTokens.access_token) {
      throw new Error("Failed to refresh access token");
    }

    // Update local state
    this.accessToken = newTokens.access_token;
    this.expiresAt = newTokens.expiry_date || Date.now() + 3600 * 1000;

    // Update in Convex
    await convex.mutation(api.auth.updateAccessToken, {
      userId: this.userId,
      accessToken: encrypt(this.accessToken),
      expiresAt: this.expiresAt,
    });

    return this.accessToken;
  }

  private async getCalendarClient(): Promise<calendar_v3.Calendar> {
    const accessToken = await this.ensureValidToken();
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    return google.calendar({ version: "v3", auth: oauth2Client });
  }

  async listEvents(
    timeMin: string,
    timeMax: string,
    calendarId: string = "primary"
  ): Promise<calendar_v3.Schema$Event[]> {
    const calendar = await this.getCalendarClient();

    const response = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
    });

    return response.data.items || [];
  }

  async createEvent(event: {
    title: string;
    start: string; // ISO string
    end: string; // ISO string
    attendees?: string[];
    location?: string;
    description?: string;
    calendarId?: string;
  }): Promise<calendar_v3.Schema$Event> {
    console.log("📅 GoogleCalendarClient.createEvent - Starting", {
      userId: this.userId,
      title: event.title,
      start: event.start,
      end: event.end,
      calendarId: event.calendarId || "primary",
    });

    const calendar = await this.getCalendarClient();
    console.log("✅ GoogleCalendarClient.createEvent - Got calendar client");

    const requestBody = {
      summary: event.title,
      start: {
        dateTime: event.start,
        timeZone: this.userTimezone,
      },
      end: {
        dateTime: event.end,
        timeZone: this.userTimezone,
      },
      attendees: event.attendees?.map((email) => ({ email })),
      location: event.location,
      description: event.description,
    };

    console.log("📤 GoogleCalendarClient.createEvent - Request body", requestBody);

    try {
      const response = await calendar.events.insert({
        calendarId: event.calendarId || "primary",
        requestBody,
      });

      console.log("✅ GoogleCalendarClient.createEvent - Success", {
        eventId: response.data.id,
        htmlLink: response.data.htmlLink,
      });

      return response.data;
    } catch (error) {
      console.error("❌ GoogleCalendarClient.createEvent - Error", {
        error: error instanceof Error ? error.message : String(error),
        userId: this.userId,
      });
      throw error;
    }
  }

  async updateEvent(
    eventId: string,
    updates: {
      title?: string;
      start?: string;
      end?: string;
      attendees?: string[];
      location?: string;
      description?: string;
    },
    calendarId: string = "primary"
  ): Promise<calendar_v3.Schema$Event> {
    const calendar = await this.getCalendarClient();

    const response = await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: {
        summary: updates.title,
        start: updates.start
          ? {
              dateTime: updates.start,
              timeZone: this.userTimezone,
            }
          : undefined,
        end: updates.end
          ? {
              dateTime: updates.end,
              timeZone: this.userTimezone,
            }
          : undefined,
        attendees: updates.attendees?.map((email) => ({ email })),
        location: updates.location,
        description: updates.description,
      },
    });

    return response.data;
  }

  async deleteEvent(
    eventId: string,
    calendarId: string = "primary"
  ): Promise<void> {
    const calendar = await this.getCalendarClient();

    await calendar.events.delete({
      calendarId,
      eventId,
    });
  }

  async getFreeBusy(
    calendarIds: string[],
    timeMin: string,
    timeMax: string
  ): Promise<calendar_v3.Schema$FreeBusyResponse> {
    const calendar = await this.getCalendarClient();

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        items: calendarIds.map((id) => ({ id })),
      },
    });

    return response.data;
  }

  async getCalendarList(): Promise<calendar_v3.Schema$CalendarListEntry[]> {
    const calendar = await this.getCalendarClient();

    const response = await calendar.calendarList.list();

    return response.data.items || [];
  }
}
