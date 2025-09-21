import { httpRouter } from "convex/server";
import { httpAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { WebhookEvent } from "@clerk/backend";
import { Webhook } from "svix";

// Internal mutation to upsert from raw Clerk data
export const upsertFromClerk = internalMutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    const clerkId: string = data.id;
    const email = (data.email_addresses?.find((e: any) => e.id === data.primary_email_address_id)?.email_address) ?? undefined;
    const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || undefined;
    const imageUrl = data.image_url ?? undefined;

    // tokenIdentifier may not be present in webhook payload; synthesize issuer+subject if you standardize issuer
    const tokenIdentifier = `clerk|${clerkId}`;

    const now = Date.now();
    const existing = await ctx.db.query("users").withIndex("by_clerkId", q => q.eq("clerkId", clerkId)).first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email,
        name,
        imageUrl,
        lastSeenAt: now,
        status: "active",
      });
      return existing._id;
    } else {
      return await ctx.db.insert("users", {
        clerkId,
        tokenIdentifier,
        email,
        name,
        imageUrl,
        roles: ["respondent"],
        teamIds: [],
        status: "active",
        createdAt: now,
        lastSeenAt: now,
      });
    }
  },
});

// HTTP router
const http = httpRouter();

http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const event = await validateRequest(req);
    if (!event) return new Response("Invalid signature", { status: 400 });

    switch (event.type) {
      case "user.created":
      case "user.updated": {
  await ctx.runMutation(internal.http.upsertFromClerk, { data: event.data });
        break;
      }
      case "user.deleted": {
        const clerkId = (event.data as any).id as string;
        const existing = await ctx.db.query("users").withIndex("by_clerkId", q => q.eq("clerkId", clerkId)).first();
        if (existing) await ctx.db.patch(existing._id, { status: "disabled" });
        break;
      }
      default:
        // ignore other events
        break;
    }
    return new Response(null, { status: 200 });
  }),
});

async function validateRequest(req: Request): Promise<WebhookEvent | null> {
  const payload = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id")!,
    "svix-timestamp": req.headers.get("svix-timestamp")!,
    "svix-signature": req.headers.get("svix-signature")!,
  };
  try {
    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
    return wh.verify(payload, headers) as unknown as WebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed", err);
    return null;
  }
}

export default http;
