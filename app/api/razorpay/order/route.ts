import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const amount = Number(body?.amount);
    const currency = String(body?.currency || 'INR');

    if (!Number.isFinite(amount) || amount < 100) {
      return NextResponse.json(
        { error: 'Valid amount (minimum 100 paise) is required.' },
        { status: 400 }
      );
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: 'Razorpay key ID or secret is missing on server.' },
        { status: 500 }
      );
    }

    const authHeader =
      'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount),
        currency,
        receipt: `rcpt_${Date.now()}`,
        notes: {
          planType: String(body?.planType || ''),
          userId: String(body?.userId || ''),
          userEmail: String(body?.userEmail || ''),
        },
      }),
    });

    const data = await rzpRes.json();

    if (!rzpRes.ok || !data?.id) {
      return NextResponse.json(
        { error: data?.error?.description || 'Failed to create Razorpay order.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      orderId: data.id,
      amount: data.amount,
      currency: data.currency,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Unexpected error creating order.' },
      { status: 500 }
    );
  }
}
