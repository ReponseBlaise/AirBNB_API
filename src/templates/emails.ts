const brand = '#FF5A5F';

const layout = (content: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f7f7;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <tr><td style="background:${brand};padding:24px 32px">
          <h1 style="margin:0;color:#fff;font-size:24px">Airbnb</h1>
        </td></tr>
        <tr><td style="padding:32px">${content}</td></tr>
        <tr><td style="background:#f7f7f7;padding:16px 32px;text-align:center;color:#888;font-size:12px">
          © ${new Date().getFullYear()} Airbnb, Inc. All rights reserved.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const button = (href: string, text: string) =>
  `<a href="${href}" style="display:inline-block;background:${brand};color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:bold;font-size:15px">${text}</a>`;

export function welcomeEmail(name: string, role: string): string {
  const roleContent =
    role === 'HOST'
      ? `<p style="color:#555">You're registered as a <strong>Host</strong>. Start earning by creating your first listing today!</p>
         ${button('#', 'Create Your First Listing')}`
      : `<p style="color:#555">You're registered as a <strong>Guest</strong>. Explore thousands of unique places to stay around the world.</p>
         ${button('#', 'Explore Listings')}`;

  return layout(`
    <h2 style="color:${brand};margin-top:0">Welcome, ${name}! 🎉</h2>
    <p style="color:#555">We're thrilled to have you on Airbnb. Your account has been created successfully.</p>
    ${roleContent}
    <p style="color:#888;font-size:13px;margin-top:24px">If you didn't create this account, please ignore this email.</p>
  `);
}

export function bookingConfirmationEmail(
  guestName: string,
  listingTitle: string,
  location: string,
  checkIn: string,
  checkOut: string,
  totalPrice: number
): string {
  return layout(`
    <h2 style="color:${brand};margin-top:0">Booking Confirmed! ✅</h2>
    <p style="color:#555">Hi <strong>${guestName}</strong>, your booking is confirmed. Here are your details:</p>
    <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin:16px 0">
      <tr style="background:#f7f7f7"><td style="color:#888;width:40%">Listing</td><td style="color:#333;font-weight:bold">${listingTitle}</td></tr>
      <tr><td style="color:#888">Location</td><td style="color:#333">${location}</td></tr>
      <tr style="background:#f7f7f7"><td style="color:#888">Check-in</td><td style="color:#333">${checkIn}</td></tr>
      <tr><td style="color:#888">Check-out</td><td style="color:#333">${checkOut}</td></tr>
      <tr style="background:#f7f7f7"><td style="color:#888">Total Price</td><td style="color:${brand};font-weight:bold;font-size:18px">$${totalPrice.toFixed(2)}</td></tr>
    </table>
    <p style="color:#888;font-size:13px">Cancellation policy: Bookings can be cancelled up to 24 hours before check-in for a full refund.</p>
  `);
}

export function bookingCancellationEmail(
  guestName: string,
  listingTitle: string,
  checkIn: string,
  checkOut: string
): string {
  return layout(`
    <h2 style="color:${brand};margin-top:0">Booking Cancelled</h2>
    <p style="color:#555">Hi <strong>${guestName}</strong>, your booking has been cancelled.</p>
    <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin:16px 0">
      <tr style="background:#f7f7f7"><td style="color:#888;width:40%">Listing</td><td style="color:#333;font-weight:bold">${listingTitle}</td></tr>
      <tr><td style="color:#888">Check-in</td><td style="color:#333">${checkIn}</td></tr>
      <tr style="background:#f7f7f7"><td style="color:#888">Check-out</td><td style="color:#333">${checkOut}</td></tr>
    </table>
    <p style="color:#555">Looking for another place to stay?</p>
    ${button('#', 'Explore Listings')}
  `);
}

export function passwordResetEmail(name: string, resetLink: string): string {
  return layout(`
    <h2 style="color:${brand};margin-top:0">Reset Your Password</h2>
    <p style="color:#555">Hi <strong>${name}</strong>, we received a request to reset your password.</p>
    <p style="color:#555">Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
    <p style="margin:24px 0">${button(resetLink, 'Reset Password')}</p>
    <p style="color:#888;font-size:13px">If you did not request this, ignore this email — your password will remain unchanged.</p>
  `);
}
