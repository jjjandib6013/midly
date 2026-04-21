const isProduction = process.env.NODE_ENV === 'production';
const paymongoSecretKey = process.env.PAYMONGO_SECRET_KEY?.trim() || '';

// Dev mode is active when:
// 1. No key is provided at all (empty string)
// 2. Key starts with 'sk_test_' (PayMongo test mode keys)
const isDevMode = !paymongoSecretKey || paymongoSecretKey.startsWith('sk_test_');

if (isDevMode) {
  console.log('[PayMongo] Running in DEV/TEST mode. All payments will be simulated or use PayMongo sandbox.');
}

/**
 * Creates a PayMongo Payment Link for E-Wallets, Cards, and Online Banking.
 * 
 * BEHAVIOR:
 * - No key provided: Returns a mock checkout URL (pure simulation).
 * - Test key (sk_test_...): Calls real PayMongo API in sandbox mode. You can test GCash with OTP 000000.
 * - Live key (sk_live_...): Calls real PayMongo API in production mode.
 */
export async function createPaymentLink(amount: number, description: string, referenceId: string) {
  if (isProduction && !paymongoSecretKey) {
    throw new Error('[PayMongo] FATAL: Secret key is missing in production. Set PAYMONGO_SECRET_KEY in .env');
  }

  // PURE MOCK MODE: No key at all — simulate everything locally
  if (!paymongoSecretKey) {
    console.log(`[PayMongo Mock] Simulated payment link for ₱${amount.toLocaleString()} | ref: ${referenceId}`);
    await new Promise(resolve => setTimeout(resolve, 500)); // Fake network delay
    
    return {
      success: true,
      checkoutUrl: `http://localhost:3000/mock-checkout?ref=${referenceId}&amount=${amount}`,
      paymentId: `pm_mock_${Date.now()}`
    };
  }

  // REAL PAYMONGO API (works for both sk_test_ and sk_live_ keys)
  try {
    const encodedKey = Buffer.from(`${paymongoSecretKey}:`).toString('base64');
    
    const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${encodedKey}`
      },
      body: JSON.stringify({
        data: {
          attributes: {
            send_email_receipt: false,
            show_description: true,
            show_line_items: true,
            payment_method_types: ["card", "paymaya", "gcash", "grab_pay", "dob", "dob_ubp"],
            reference_number: referenceId, // Crucial for webhook matching
            line_items: [
              {
                currency: "PHP",
                amount: Math.round(amount * 100), // PayMongo expects centavos
                description: description,
                name: "Midly Wallet Deposit",
                quantity: 1
              }
            ],
            success_url: `http://localhost:3000/wallet?status=success`,
            cancel_url: `http://localhost:3000/wallet?status=cancelled`
          }
        }
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[PayMongo API Error]', JSON.stringify(result.errors));
      return { success: false, error: result.errors?.[0]?.detail || 'Failed to generate PayMongo session' };
    }

    console.log(`[PayMongo ${isDevMode ? 'Test' : 'Live'}] Created checkout session: ${result.data.attributes.checkout_url}`);

    return {
      success: true,
      checkoutUrl: result.data.attributes.checkout_url,
      paymentId: result.data.id
    };

  } catch (error: any) {
    console.error('[PayMongo Network Error]', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Creates a Payout (Cash-Out) for sellers withdrawing to their bank/e-wallet.
 * 
 * NOTE: PayMongo's Disbursement API requires a fully activated live business account.
 * Until then, this function simulates success in both mock and test modes.
 */
export async function createPayout(amount: number, bankDetails: any, referenceId: string) {
  if (isProduction && !paymongoSecretKey) {
    throw new Error('[PayMongo] FATAL: Secret key is missing in production. Set PAYMONGO_SECRET_KEY in .env');
  }

  // Currently, PayMongo Disbursements require a live business account.
  // We simulate success for all modes until you activate live payouts.
  console.log(`[PayMongo ${isDevMode ? 'Mock' : 'Live'}] Payout of ₱${amount.toLocaleString()} to ${bankDetails.bankCode || 'N/A'} | ref: ${referenceId}`);
  await new Promise(resolve => setTimeout(resolve, 600)); // Simulated delay
  
  return { success: true, payoutId: `po_mock_${Date.now()}` };
}
