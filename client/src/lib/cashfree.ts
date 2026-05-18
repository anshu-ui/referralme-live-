// Cashfree Checkout (JS v3) loader + helpers
// We keep keys on the server. Client only uses `paymentSessionId`.

declare global {
  interface Window {
    Cashfree?: any;
  }
}

export type CashfreeMode = "sandbox" | "production";

export type CashfreeCheckoutResult = {
  // This shape is based on Cashfree JS v3; we only rely on the common fields.
  error?: { message?: string };
  paymentDetails?: {
    orderId?: string;
    paymentId?: string;
    order_id?: string;
    payment_id?: string;
  };
  redirect?: boolean;
};

export function loadCashfreeScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Cashfree) return resolve(true);
    const existing = document.querySelector('script[data-cashfree="v3"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.dataset.cashfree = "v3";
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function openCashfreeCheckout(args: {
  mode: CashfreeMode;
  paymentSessionId: string;
}): Promise<CashfreeCheckoutResult> {
  const ok = await loadCashfreeScript();
  if (!ok || !window.Cashfree) {
    return { error: { message: "Cashfree SDK failed to load. Check your internet connection." } };
  }

  const cashfree = window.Cashfree({ mode: args.mode });

  // Cashfree checkout returns a promise resolving with result/error details.
  const result = (await cashfree.checkout({
    paymentSessionId: args.paymentSessionId,
    redirectTarget: "_modal",
  })) as CashfreeCheckoutResult;

  return result || {};
}

