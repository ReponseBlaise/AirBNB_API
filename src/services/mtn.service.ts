import { v4 as uuidv4 } from 'uuid'

type InitiateResult = {
  transactionId: string
  checkoutUrl?: string
  status: 'PENDING' | 'FAILED'
}

type MtnTransactionStatus = 'CAPTURED' | 'FAILED' | 'PENDING'

type VerifyResult = {
  status: MtnTransactionStatus
  message?: string
}

/**
 * NOTE: This is a stubbed service for MTN Mobile Money (Rwanda).
 * For production use, replace with real MTN API integration and credentials.
 * 
 * Real implementation would:
 * 1. Call MTN's /collection/v1_0/requesttopay endpoint
 * 2. Use API Key from Ocp-Apim-Subscription-Key header
 * 3. Include proper request/response validation
 * 4. Implement webhook handling for async payment confirmation
 * 5. Store transaction metadata for reconciliation
 */

/**
 * Initiate a payment request to MTN Mobile Money.
 * In production, this creates a payment request that the user confirms on their phone.
 * 
 * @param bookingId - ID of the booking to pay for
 * @param amount - Amount in RWF (Rwandan Francs)
 * @param callbackUrl - URL where MTN will POST payment confirmation
 * @returns Transaction ID and checkout URL
 */
export async function initiateMtnPayment(
  bookingId: string,
  amount: number,
  callbackUrl: string
): Promise<InitiateResult> {
  if (!bookingId) throw new Error('bookingId is required')
  if (!amount || amount <= 0) throw new Error('Amount must be greater than 0')
  if (!callbackUrl) throw new Error('callbackUrl is required')

  const transactionId = uuidv4()
  
  // PRODUCTION IMPLEMENTATION PATTERN:
  // const mtnApiKey = process.env.MTN_API_KEY
  // const mtnApiUrl = process.env.MTN_API_URL || 'https://sandbox.mtn.com'
  // 
  // const resp = await axios.post(
  //   `${mtnApiUrl}/collection/v1_0/requesttopay`,
  //   {
  //     externalId: bookingId,
  //     amount: String(amount),
  //     currency: 'RWF',
  //     payer: { partyIdType: 'MSISDN', partyId: userPhone },
  //     payerMessage: `Payment for booking ${bookingId}`,
  //     payeeNote: 'Airbnb Booking Payment',
  //   },
  //   {
  //     headers: {
  //       'Ocp-Apim-Subscription-Key': mtnApiKey,
  //       'X-Reference-Id': transactionId,
  //       'Content-Type': 'application/json',
  //     },
  //   }
  // )
  //
  // return {
  //   transactionId: resp.data?.transactionId || transactionId,
  //   checkoutUrl: `${mtnApiUrl}/payment/${transactionId}`,
  //   status: 'PENDING',
  // }

  return {
    transactionId,
    checkoutUrl: `https://sandbox.mtn.example.com/payment/${transactionId}`,
    status: 'PENDING',
  }
}

/**
 * Verify the status of a MTN payment transaction.
 * In production, this queries MTN's API for the transaction status.
 * 
 * @param transactionId - MTN transaction ID to verify
 * @returns Current transaction status
 */
export async function verifyMtnTransaction(transactionId: string): Promise<VerifyResult> {
  if (!transactionId) throw new Error('transactionId is required')

  // PRODUCTION IMPLEMENTATION PATTERN:
  // const mtnApiKey = process.env.MTN_API_KEY
  // const mtnApiUrl = process.env.MTN_API_URL || 'https://sandbox.mtn.com'
  //
  // try {
  //   const resp = await axios.get(
  //     `${mtnApiUrl}/collection/v1_0/requesttopay/${transactionId}`,
  //     {
  //       headers: {
  //         'Ocp-Apim-Subscription-Key': mtnApiKey,
  //       },
  //     }
  //   )
  //
  //   if (resp.data?.status === 'SUCCESSFUL') {
  //     return { status: 'CAPTURED', message: 'Payment successful' }
  //   } else if (resp.data?.status === 'FAILED') {
  //     return { status: 'FAILED', message: resp.data?.reason || 'Payment failed' }
  //   } else {
  //     return { status: 'PENDING', message: 'Payment still pending' }
  //   }
  // } catch (error) {
  //   return { status: 'FAILED', message: 'Failed to verify transaction' }
  // }

  // Stub implementation: randomly succeed or fail for testing
  const isSuccessful = Math.random() > 0.2 // 80% success rate for testing
  return {
    status: isSuccessful ? 'CAPTURED' : 'FAILED',
    message: isSuccessful ? 'Payment captured successfully' : 'Payment failed',
  }
}
