import { z } from "zod";
import { ConvexTool } from "./index.js";
import { components } from "../../generatedLogStreamApi.js";
declare const inputSchema: z.ZodObject<{
    deploymentSelector: z.ZodString;
    cursor: z.ZodOptional<z.ZodNumber>;
    entriesLimit: z.ZodOptional<z.ZodNumber>;
    tokensLimit: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    deploymentSelector: string;
    cursor?: number | undefined;
    entriesLimit?: number | undefined;
    tokensLimit?: number | undefined;
}, {
    deploymentSelector: string;
    cursor?: number | undefined;
    entriesLimit?: number | undefined;
    tokensLimit?: number | undefined;
}>;
declare const outputSchema: z.ZodObject<{
    entries: z.ZodArray<z.ZodAny, "many">;
    newCursor: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    entries: any[];
    newCursor: number;
}, {
    entries: any[];
    newCursor: number;
}>;
type LogEntry = components["schemas"]["LogStreamEvent"];
export declare const LogsTool: ConvexTool<typeof inputSchema, typeof outputSchema>;
export declare function limitLogs({ entries, tokensLimit, entriesLimit, }: {
    entries: LogEntry[];
    tokensLimit: number;
    entriesLimit: number;
}): LogEntry[];
export declare function formatEntriesTerse(entries: LogEntry[]): string[];
export {};
//# sourceMappingURL=logs.d.ts.map