import { v4 as uuidv4 } from 'uuid'

type InitiateResult = {
  transactionId: string
  checkoutUrl?: string
  status: 'PENDING' | 'FAILED'
}

// NOTE: This is a stubbed service for MTN Mobile Money (Rwanda).
// Replace HTTP calls and headers with real MTN API integration and credentials.

export async function initiateMtnPayment(bookingId: string, amount: number, callbackUrl: string): Promise<InitiateResult> {
  // Example stub — in real integration we'd call MTN API with credentials from env
  // Returning a generated transaction id and a fake checkout URL for testing
  const transactionId = uuidv4()

  // OPTIONAL: demonstrate an HTTP call structure (commented)
  // const resp = await axios.post('https://sandbox.mtn.com/collection/v1_0/requesttopay', { /* ... */ }, { headers: { 'Ocp-Apim-Subscription-Key': process.env.MTN_SUBSCRIPTION_KEY } })

  return {
    transactionId,
    checkoutUrl: `https://sandbox.example.com/mtn/checkout/${transactionId}`,
    status: 'PENDING',
  }
}

export async function verifyMtnTransaction(transactionId: string): Promise<{ status: 'CAPTURED' | 'FAILED' | 'PENDING' }> {
  // Stubbed verification; a real impl would query MTN's API
  return { status: 'CAPTURED' }
}
