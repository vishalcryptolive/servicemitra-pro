import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const amount = Number(body?.amount);
    const currency = String(body?.currency || 'INR');

    if (!amount || amount < 100) {
      return NextResponse.json(
        { error: 'Valid amount (minimum 100 paise) is required.' },
        { status: 400 }
      );
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: 'Razorpay credentials missing on server.' },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt: `rcpt_${Date.now()}`,
      notes: {
        planType: String(body?.planType || ''),
        userId: String(body?.userId || ''),
        userEmail: String(body?.userEmail || ''),
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to create Razorpay order.' },
      { status: 500 }
    );
  }
}
