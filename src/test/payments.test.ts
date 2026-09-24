import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { mapIotecStatus, normalizeUgandaPhone } from "../../supabase/functions/_shared/payments-core";
import { FALLBACK_PLANS, formatPlanPrice } from "@/lib/pricing";

describe("normalizeUgandaPhone", () => {
  it.each([
    ["0772123456", "256772123456", "MTN"],
    ["+256 772 123 456", "256772123456", "MTN"],
    ["256-701-234567", "256701234567", "Airtel"],
    ["752123456", "256752123456", "Airtel"],
    ["(0)78 1234567", "256781234567", "MTN"],
  ])("normalises %s", (input, msisdn, network) => {
    expect(normalizeUgandaPhone(input)).toEqual({ msisdn, network });
  });

  it.each(["", "0712345678", "07721234", "+254712345678", "07721234567", "abc0772123456"])("rejects %s", (input) => {
    expect(normalizeUgandaPhone(input)).toBeNull();
  });
});

describe("mapIotecStatus", () => {
  it("maps terminal statuses", () => {
    expect(mapIotecStatus("Success")).toBe("success");
    expect(mapIotecStatus("SUCCESSFUL")).toBe("success");
    expect(mapIotecStatus("Failed")).toBe("failed");
    expect(mapIotecStatus("Cancelled")).toBe("failed");
  });

  it("treats anything else as pending", () => {
    expect(mapIotecStatus("Pending")).toBe("pending");
    expect(mapIotecStatus("SentToVendor")).toBe("pending");
    expect(mapIotecStatus(undefined)).toBe("pending");
  });
});

describe("formatPlanPrice", () => {
  const [basic, , enterprise] = FALLBACK_PLANS;

  it("formats both currencies", () => {
    expect(formatPlanPrice(basic, "UGX")).toBe("UGX 750,000");
    expect(formatPlanPrice(basic, "USD")).toBe("$199");
  });

  it("shows custom pricing for enterprise", () => {
    expect(formatPlanPrice(enterprise, "UGX")).toBe("Custom");
    expect(formatPlanPrice(enterprise, "USD")).toBe("Custom");
  });
});
