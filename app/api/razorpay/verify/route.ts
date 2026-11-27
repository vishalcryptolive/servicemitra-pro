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
      const existingMs = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      if (!Number.isNaN(existingMs) && existingMs > todayUtcMs) {
        startMs = existingMs;
      }
    }
  }

  return new Date(startMs + daysToAdd * 86400000).toISOString().split('T')[0];
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: missing session token' }, { status: 401 });
    }

    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planType,
    } = body;

    if (!razorpay_payment_id || !razorpay_signature || !planType) {
      return NextResponse.json(
        { error: 'Missing required payment details' },
        { status: 400 }
      );
    }

    if (planType !== 'monthly' && planType !== 'yearly') {
      return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 });
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!keyId || !keySecret || !supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server payment or database configuration is missing' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user: authUser },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized: invalid user session' }, { status: 401 });
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

    const amountInr = planType === 'yearly' ? 1999 : 499;
    const expectedPaise = amountInr * 100;
    const periodDays = planType === 'yearly' ? 365 : 30;

    const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const rzpRes = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`,
      {
        headers: {
          Authorization: `Basic ${basicAuth}`,
        },
      }
    );

    if (!rzpRes.ok) {
      return NextResponse.json(
        { error: 'Unable to verify payment with Razorpay' },
        { status: 502 }
      );
    }

    const rzpPayment = await rzpRes.json();

    if (rzpPayment.status !== 'captured' && rzpPayment.status !== 'authorized') {
      return NextResponse.json(
        { error: `Payment not completed (status: ${rzpPayment.status || 'unknown'})` },
        { status: 400 }
      );
    }

    if (Number(rzpPayment.amount) !== expectedPaise || rzpPayment.currency !== 'INR') {
      return NextResponse.json(
        { error: 'Payment amount or currency mismatch' },
        { status: 400 }
      );
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', authUser.id)
      .maybeSingle();

    const targetOwnerId = callerProfile?.owner_id || authUser.id;

    let { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', targetOwnerId)
      .maybeSingle();

    if (!targetProfile && callerProfile) {
      targetProfile = callerProfile;
    }

    const resolvedUserId = targetProfile?.user_id || authUser.id;
    const resolvedEmail = targetProfile?.email || authUser.email || null;
    const formattedExpiry = calculateExpiryDate(targetProfile?.subscription_expires_at, periodDays);

    const { error: paymentError } = await supabaseAdmin.from('payments').upsert(
      [
        {
          user_id: resolvedUserId,
          user_email: resolvedEmail,
          plan_type: planType,
          amount_inr: amountInr,
          currency: 'INR',
          razorpay_order_id: razorpay_order_id || rzpPayment.order_id || null,
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

    if (targetProfile?.id) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          is_pro: true,
          subscription_expires_at: formattedExpiry,
        })
        .eq('id', targetProfile.id);

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
