// Runtime-agnostic helpers shared by the edge functions (Deno) and the web app.

export type MobileNetwork = "MTN" | "Airtel";
export type PaymentStatus = "pending" | "success" | "failed";

const NETWORK_PREFIXES: Record<MobileNetwork, string[]> = {
  MTN: ["76", "77", "78", "79"],
  Airtel: ["70", "74", "75", "20"],
};

/** Normalises a Ugandan mobile number to the 2567XXXXXXXX form ioTec expects. */
export function normalizeUgandaPhone(input: string): { msisdn: string; network: MobileNetwork } | null {
  let digits = input.replace(/[\s\-().]/g, "").replace(/^\+/, "");
  if (!/^\d+$/.test(digits)) return null;
  if (digits.startsWith("256")) digits = digits.slice(3);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length !== 9) return null;

  const prefix = digits.slice(0, 2);
  const network = (Object.keys(NETWORK_PREFIXES) as MobileNetwork[]).find((n) =>
    NETWORK_PREFIXES[n].includes(prefix),
  );
  if (!network) return null;
  return { msisdn: `256${digits}`, network };
}

/** Maps an ioTec transaction status to our payment status. */
export function mapIotecStatus(status: string | null | undefined): PaymentStatus {
  const s = (status ?? "").trim().toLowerCase();
  if (s === "success" || s === "successful" || s === "succeeded" || s === "completed") return "success";
  if (["failed", "failure", "rejected", "cancelled", "canceled", "expired", "declined", "error"].includes(s)) {
    return "failed";
  }
  return "pending";
}
