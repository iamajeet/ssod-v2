import type { Route } from "./+types/proxy";
import { authenticate } from "../shopify.server";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SESSION_TTL_SECONDS = 60 * 60 * 8;
const PASSWORD = process.env.ORDER_DESK_PASSWORD || "";
const SECRET = process.env.SESSION_SECRET || "";

function signSession(shop: string) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${shop}.${exp}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return Buffer.from(JSON.stringify({ shop, exp, sig })).toString("base64url");
}

function verifySession(token: string | undefined, shop: string) {
  if (!token || !SECRET) return false;
  try {
    const data = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
    if (data.shop !== shop || Number(data.exp) < Math.floor(Date.now() / 1000)) return false;
    const payload = `${data.shop}.${data.exp}`;
    const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
    const actual = Buffer.from(String(data.sig), "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");
    return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
  } catch {
    return false;
  }
}

async function getBody(request: Request) {
  const type = request.headers.get("content-type") || "";
  if (type.includes("application/json")) return await request.json();
  const text = await request.text();
  return Object.fromEntries(new URLSearchParams(text));
}

export async function loader({ request }: Route.LoaderArgs) {
  const { liquid } = await authenticate.public.appProxy(request);

  const html = fs.readFileSync(
    path.join(process.cwd(), "public", "order-desk.html"),
    "utf8"
  );

  return liquid(html, {
    layout: false,
  });
}

export async function action({ request }: Route.ActionArgs) {
  const ctx = await authenticate.public.appProxy(request);
  if (!ctx?.admin || !ctx?.session) {
    return Response.json({ error: "Shopify app is not installed or the proxy is not authenticated" }, { status: 401 });
  }

  const shop = ctx.session.shop;
  const body = await getBody(request);
  const op = String(body.op || "");

  if (op === "login") {
    if (!PASSWORD || !SECRET) {
      return Response.json({ error: "Order Desk security variables are not configured" }, { status: 500 });
    }
    if (String(body.password || "") !== PASSWORD) {
      return Response.json({ error: "Invalid password" }, { status: 401 });
    }
    return Response.json({ ok: true, token: signSession(shop) });
  }

  if (!verifySession(String(body.token || ""), shop)) {
    return Response.json({ error: "Session expired. Please log in again." }, { status: 401 });
  }

  if (op === "createDraft") {
    const input = body.input;
    if (!input || !Array.isArray(input.lineItems) || input.lineItems.length === 0) {
      return Response.json({ error: "At least one line item is required" }, { status: 400 });
    }

    const mutation = `#graphql
      mutation DraftOrderCreate($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder {
            id
            name
            status
            invoiceUrl
            totalPriceSet { shopMoney { amount currencyCode } }
            subtotalPriceSet { shopMoney { amount currencyCode } }
            tags
          }
          userErrors { field message }
        }
      }`;

    const result = await ctx.admin.graphql(mutation, { variables: { input } });
    const json = await result.json();
    const payload = json?.data?.draftOrderCreate;

    if (!payload) {
      return Response.json({ error: "Shopify returned no draft-order result", details: json }, { status: 502 });
    }
    if (payload.userErrors?.length) {
      return Response.json({ error: "Shopify rejected the draft order", userErrors: payload.userErrors }, { status: 400 });
    }

    return Response.json({ ok: true, draftOrder: payload.draftOrder });
  }

  return Response.json({ error: "Unknown operation" }, { status: 400 });
}

export default function ProxyRoute() {
  return null;
}
