import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { mapIotecStatus } from "./payments-core.ts";

const AUTH_URL = Deno.env.get("IOTEC_AUTH_URL") ?? "https://id.iotec.io/connect/token";
const API_BASE = (Deno.env.get("IOTEC_API_BASE") ?? "https://pay.iotec.io/api").replace(/\/$/, "");

let cachedToken: { value: string; expiresAt: number } | null = null;

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("IOTEC_CLIENT_ID"),
      client_secret: requireEnv("IOTEC_CLIENT_SECRET"),
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) throw new Error(`ioTec authentication failed (${res.status}).`);
  const body = await res.json();
  cachedToken = { value: body.access_token, expiresAt: Date.now() + Number(body.expires_in ?? 300) * 1000 };
  return cachedToken.value;
}

async function iotecFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: Record<string, unknown> | null = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { ok: res.ok, status: res.status, body };
}

export interface IotecTransaction {
  id?: string;
  status?: string;
  statusMessage?: string;
  [key: string]: unknown;
}

export async function iotecCollect(params: {
  externalId: string;
  payer: string;
  amount: number;
  payerNote: string;
  payeeNote: string;
}) {
  return iotecFetch("/collections/collect", {
    method: "POST",
    body: JSON.stringify({
      category: "MobileMoney",
      currency: "UGX",
      walletId: requireEnv("IOTEC_WALLET_ID"),
      externalId: params.externalId,
      payer: params.payer,
      amount: params.amount,
      payerNote: params.payerNote,
      payeeNote: params.payeeNote,
    }),
  });
}

export async function iotecCollectionByExternalId(externalId: string) {
  return iotecFetch(`/collections/external-id/${encodeURIComponent(externalId)}`);
}

export interface PaymentRow {
  id: string;
  status: "pending" | "success" | "failed";
  status_message: string | null;
  activated_at: string | null;
  created_at: string;
}

const PENDING_TIMEOUT_MS = 24 * 60 * 60 * 1000;

/**
 * Refreshes a payment from ioTec and activates the subscription on success.
 * Safe to call repeatedly: activation is idempotent in the database.
 */
export async function syncPayment(admin: SupabaseClient, payment: PaymentRow): Promise<PaymentRow> {
  let next = payment;

  if (payment.status === "pending") {
    const { ok, status, body } = await iotecCollectionByExternalId(payment.id);
    const tx = (body ?? {}) as IotecTransaction;
    let mapped = ok ? mapIotecStatus(tx.status) : "pending";
    let message = ok ? tx.statusMessage ?? null : payment.status_message;

    if (mapped === "pending" && Date.now() - new Date(payment.created_at).getTime() > PENDING_TIMEOUT_MS) {
      mapped = "failed";
      message = "Payment was not approved in time.";
    }
    if (!ok && status !== 404) console.error("ioTec status lookup failed", status, body);

    if (mapped !== "pending" || message !== payment.status_message) {
      const { data, error } = await admin
        .from("payments")
        .update({
          status: mapped,
          status_message: message,
          provider_reference: tx.id ?? undefined,
          raw_response: ok ? tx : undefined,
          updated_at: new Date().toISOString(),
          completed_at: mapped === "pending" ? null : new Date().toISOString(),
        })
        .eq("id", payment.id)
        .eq("status", "pending")
        .select("id, status, status_message, activated_at, created_at")
        .maybeSingle();
      if (error) throw error;
      if (data) {
        next = data as PaymentRow;
      } else {
        const { data: current } = await admin
          .from("payments")
          .select("id, status, status_message, activated_at, created_at")
          .eq("id", payment.id)
          .single();
        if (current) next = current as PaymentRow;
      }
    }
  }

  if (next.status === "success" && !next.activated_at) {
    const { error } = await admin.rpc("activate_subscription", { p_payment_id: next.id });
    if (error) throw error;
    next = { ...next, activated_at: new Date().toISOString() };
  }

  return next;
}
