// pages/api/auth/send-otp.js
// Generates a 6-digit OTP, stores it in otpStore, sends via Gmail API.
// Pages Router equivalent of cafeDeliveryFrontend send-otp/route.js

import { otpStore }  from '@/lib/otpStore';
import { sendEmail } from '@/lib/gmailMailer';

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    // Rate-limit: block if OTP was sent < 60 seconds ago
    const existing = otpStore.get(email);
    if (existing && existing.expiresAt - Date.now() > OTP_TTL_MS - 60_000) {
      return res.status(429).json({ message: 'OTP already sent. Please wait before requesting again.' });
    }

    const otp = generateOtp();
    otpStore.set(email, { otp, expiresAt: Date.now() + OTP_TTL_MS });

    await sendEmail({
      to: email,
      subject: 'Your Cafe QR Delivery Verification Code',
      htmlBody: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;border:1px solid #e5e7eb;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-block;background:#EA580C;color:white;font-weight:bold;font-size:18px;padding:12px 20px;border-radius:12px;">Cafe QR Delivery</div>
          </div>
          <h2 style="font-size:20px;color:#1c1917;margin-bottom:8px;">Your verification code</h2>
          <p style="color:#78716c;font-size:14px;margin-bottom:24px;">Enter this code to continue. It expires in 10 minutes.</p>
          <div style="background:#fff7ed;border:2px dashed #ea580c;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
            <span style="font-size:36px;font-weight:900;letter-spacing:10px;color:#ea580c;">${otp}</span>
          </div>
          <p style="color:#a8a29e;font-size:12px;text-align:center;">If you didn’t request this, please ignore this email.</p>
        </div>`,
      textBody: `Your Cafe QR Delivery verification code is: ${otp}. It expires in 10 minutes.`,
    });

    return res.status(200).json({ message: 'OTP sent' });
  } catch (err) {
    console.error('[send-otp]', err);
    return res.status(500).json({ error: 'Failed to send OTP' });
  }
}
