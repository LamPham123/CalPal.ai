import React from "react";
import { cn } from "@/lib/utils";
import {
  Check,
  X,
  Loader2,
  Calendar,
  Users,
  Clock,
  Edit,
  Trash,
  Search,
  AlertCircle,
} from "lucide-react";

interface ToolCall {
  type: string;
  state?: string;
  name: string;
  toolName?: string;
  args?: any;
  input?: any;
  result?: any;
  output?: any;
  errorText?: string;
}

interface ToolCardProps {
  tools: ToolCall[];
  className?: string;
}

// Get icon for tool based on name
const getToolIcon = (toolName: string) => {
  if (toolName.includes("listFriends")) return <Users className="h-3 w-3" />;
  if (toolName.includes("listEvents")) return <Search className="h-3 w-3" />;
  if (toolName.includes("createEvent")) return <Calendar className="h-3 w-3" />;
  if (toolName.includes("updateEvent")) return <Edit className="h-3 w-3" />;
  if (toolName.includes("deleteEvent")) return <Trash className="h-3 w-3" />;
  if (toolName.includes("suggestSlots") || toolName.includes("freeBusy"))
    return <Clock className="h-3 w-3" />;
  return <Calendar className="h-3 w-3" />;
};

// Get status icon
const getStatusIcon = (tool: ToolCall) => {
  // Check state first (AI SDK format)
  if (tool.state === "output-available") {
    return <Check className="h-3 w-3 text-green-500" />;
  }
  if (tool.state === "output-error") {
    return <X className="h-3 w-3 text-red-500" />;
  }
  if (
    tool.state === "input-streaming" ||
    tool.state === "input-available"
  ) {
    return <Loader2 className="h-3 w-3 animate-spin text-amber-500" />;
  }

  // Fallback to type checking
  if (tool.type === "tool-call") {
    return <Loader2 className="h-3 w-3 animate-spin text-amber-500" />;
  }
  if (tool.type === "tool-result") {
    return <Check className="h-3 w-3 text-green-500" />;
  }
  return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
};

// Format tool name for display
const formatToolName = (toolName: string | undefined) => {
  if (!toolName) return "Tool";

  // Convert camelCase to Title Case
  return toolName
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

// Get result summary from output
const getResultSummary = (tool: ToolCall): string => {
  if (tool.errorText) {
    return tool.errorText;
  }

  const output = tool.result || tool.output;

  if (tool.type === "tool-call") {
    return "Running...";
  }

  if (tool.type === "tool-result" && output) {
    try {
      const result = typeof output === "string" ? JSON.parse(output) : output;

      // Handle different response formats
      if (result.success === false) {
        return result.error || "Operation failed";
      }

      // Calendar-specific summaries
      if (result.event) {
        const event = result.event;
        return `Event "${event.title}" ${tool.name?.includes("create") ? "created" : "updated"} successfully`;
      }

      if (result.events && Array.isArray(result.events)) {
        return `Found ${result.events.length} events`;
      }

      if (result.friends && Array.isArray(result.friends)) {
        return `Found ${result.friends.length} friends`;
      }

      if (result.slots && Array.isArray(result.slots)) {
        return `Found ${result.slots.length} available time slots`;
      }

      if (result.busyPeriods) {
        const totalBusy = Object.values(result.busyPeriods).reduce(
          (acc: number, periods: any) => acc + (periods?.length || 0),
          0
        );
        return `Retrieved availability (${totalBusy} busy periods)`;
      }

      if (result.message) {
        return result.message;
      }

      if (result.success) {
        return "Success";
      }

      return "Complete";
    } catch {
      return "Complete";
    }
  }

  return "";
};

export function ToolCard({ tools, className }: ToolCardProps) {
  // Check if complete based on state property or type
  const allComplete = tools.every(
    (t) =>
      t.state === "output-available" ||
      t.state === "output-error" ||
      t.type === "tool-result"
  );
  const hasErrors = tools.some(
    (t) => !!t.errorText || t.state === "output-error"
  );

  return (
    <div
      className={cn(
        "my-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 p-3 text-sm",
        hasErrors && "border-red-500/30 bg-red-50/50 dark:bg-red-950/20",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
        {allComplete ? (
          <>
            {hasErrors ? (
              <>
                <AlertCircle className="h-3 w-3 text-red-500" />
                <span className="text-red-600 dark:text-red-400">
                  Completed with errors
                </span>
              </>
            ) : (
              <>
                <Check className="h-3 w-3 text-green-500" />
                <span>
                  AI completed {tools.length} operation
                  {tools.length !== 1 ? "s" : ""}
                </span>
              </>
            )}
          </>
        ) : (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>AI is working...</span>
          </>
        )}
      </div>

      {/* Tool list */}
      <div className="space-y-1">
        {tools.map((tool, index) => {
          const toolName = tool.toolName || tool.name || "unknown";
          const displayName = formatToolName(toolName);
          const summary = getResultSummary(tool);

          return (
            <div
              key={index}
              className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300"
            >
              <span className="flex items-center gap-1">
                {getStatusIcon(tool)}
              </span>
              <span className="flex items-center gap-1 flex-1">
                {getToolIcon(toolName)}
                <span className="font-medium">{displayName}</span>
                {summary && (
                  <span className="text-gray-600 dark:text-gray-400">
                    · {summary}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
