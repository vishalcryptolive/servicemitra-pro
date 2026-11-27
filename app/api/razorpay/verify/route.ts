import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function calculateExpiryDate(currentExpiry: string | null | undefined, daysToAdd: number): string {
  const now = new Date();
  const todayUtcMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  let startMs = todayUtcMs;

  if (currentExpiry) {
    const cleanDate = String(currentExpiry).slice(0, 10);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cleanDate);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      const existingMs = Date.UTC(year, month - 1, day);

      // यदि मौजूदा एक्सपायरी आज से आगे की है, तो उसी के आगे दिन जोड़ें; वरना आज से गिनें
      if (!Number.isNaN(existingMs) && existingMs > todayUtcMs) {
        startMs = existingMs;
      }
    }
  }

  const targetMs = startMs + daysToAdd * 24 * 60 * 60 * 1000;
  return new Date(targetMs).toISOString().split('T')[0];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planType,
      userId,
      userEmail,
    } = body;

    if (!razorpay_payment_id || !razorpay_signature || !planType || (!userId && !userEmail)) {
      return NextResponse.json(
        { error: 'Missing required payment or user details' },
        { status: 400 }
      );
    }

    if (planType !== 'monthly' && planType !== 'yearly') {
      return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!keySecret || !supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server payment or database configuration is missing' },
        { status: 500 }
      );
    }

    const payloadToSign = razorpay_order_id
      ? `${razorpay_order_id}|${razorpay_payment_id}`
      : `${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(payloadToSign)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const amountInr = planType === 'yearly' ? 1999 : 499;
    const periodDays = planType === 'yearly' ? 365 : 30;

    let resolvedUserId = userId || null;
    let resolvedEmail = userEmail || null;

    const orFilter = [
      userId ? `user_id.eq.${userId}` : '',
      userEmail ? `email.eq.${userEmail}` : '',
    ]
      .filter(Boolean)
      .join(',');

    const { data: profileRow } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .or(orFilter)
      .maybeSingle();

    if (profileRow) {
      resolvedUserId = profileRow.user_id || resolvedUserId;
      resolvedEmail = profileRow.email || resolvedEmail;
    }

    const formattedExpiry = calculateExpiryDate(profileRow?.subscription_expires_at, periodDays);

    const { error: paymentError } = await supabaseAdmin.from('payments').upsert(
      [
        {
          user_id: resolvedUserId,
          user_email: resolvedEmail,
          plan_type: planType,
          amount_inr: amountInr,
          currency: 'INR',
          razorpay_order_id: razorpay_order_id || null,
          razorpay_payment_id,
          status: 'paid',
          period_days: periodDays,
        },
      ],
      { onConflict: 'razorpay_payment_id' }
    );

    if (paymentError) {
      return NextResponse.json(
        { error: 'Failed to save payment record: ' + paymentError.message },
        { status: 500 }
      );
    }

    if (profileRow?.id) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          is_pro: true,
          subscription_expires_at: formattedExpiry,
        })
        .eq('id', profileRow.id);

      if (profileError) {
        return NextResponse.json(
          { error: 'Payment saved, but profile update failed: ' + profileError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      subscription_expires_at: formattedExpiry,
      period_days: periodDays,
      is_pro: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Unexpected verification error' },
      { status: 500 }
    );
  }
}
