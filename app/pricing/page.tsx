'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Razorpay की स्क्रिप्ट लोड करना
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email) {
        setUserEmail(user.email);
      } else {
        router.push('/login');
      }
    }
    checkUser();
  }, [router]);

  // Razorpay पेमेंट गेटवे ओपन करने का फंक्शन
  const handleRazorpayPayment = (planName: string, amount: number, daysToAdd: number) => {
    if (!userEmail) {
      alert('Kripya pehle login karein!');
      router.push('/login');
      return;
    }

    setLoading(true);

    const options = {
      key: 'YOUR_RAZORPAY_KEY_ID', // यहाँ पर अपनी Razorpay Live/Test Key ID डालें
      amount: amount * 100, // पैसे पैसों (paise) में होते हैं इसलिए 100 से गुणा करते हैं
      currency: 'INR',
      name: 'ServiceMitra Pro',
      description: `${planName} Subscription`,
      handler: async function (response: any) {
        // पेमेंट सफल होने के बाद डेटाबेस में एक्सपायरी डेट बढ़ाना
        const today = new Date();
        const newExpiry = new Date(today);
        newExpiry.setDate(today.getDate() + daysToAdd);
        const formattedExpiry = newExpiry.toISOString().split('T')[0];

        const { error } = await supabase
          .from('profiles')
          .update({ subscription_expires_at: formattedExpiry })
          .eq('email', userEmail);

        if (error) {
          alert('Subscription Update Error: ' + error.message);
        } else {
          alert(`🎉 Payment Successful! Payment ID: ${response.razorpay_payment_id}`);
          router.push('/');
        }
        setLoading(false);
      },
      prefill: {
        email: userEmail,
      },
      theme: {
        color: '#06b6d4',
      },
    };

    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
      setLoading(false);
    } else {
      alert('Razorpay SDK load hone mein samasya aayi. Kripya page refresh karein.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 flex flex-col items-center justify-center">
      <div className="max-w-4xl w-full space-y-8 text-center">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white">Upgrade Your ServiceMitra Pro Plan</h1>
          <p className="text-slate-400 text-sm mt-2">Scale your service business with automated reminders, invoicing & CRM.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left mt-8">
          {/* Monthly Starter Plan */}
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1 rounded-full text-xs font-bold">STARTER PRO</span>
              <h2 className="text-2xl font-extrabold text-white">Monthly Plan</h2>
              <p className="text-3xl font-black text-cyan-400">₹499 <span className="text-xs text-slate-400 font-normal">/ month</span></p>
              <ul className="space-y-3 text-sm text-slate-300">
                <li>✅ Unlimited Customer Bookings</li>
                <li>✅ Instant WhatsApp & Review Reminders</li>
                <li>✅ Professional Bill / Invoice Printing</li>
                <li>✅ Total Revenue & Earnings Calculator</li>
                <li>✅ 30 Days Full Access</li>
              </ul>
            </div>
            <button 
              onClick={() => handleRazorpayPayment('Monthly Pro', 499, 30)}
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold py-3 rounded-xl transition shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Pay ₹499 with Razorpay'}
            </button>
          </div>

          {/* Yearly Pro Plan */}
          <div className="bg-slate-900 border border-cyan-500/50 p-8 rounded-2xl shadow-xl flex flex-col justify-between space-y-6 relative">
            <div className="absolute -top-3 right-6 bg-cyan-500 text-slate-950 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
              Best Value
            </div>
            <div className="space-y-4">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold">ULTIMATE SAVINGS</span>
              <h2 className="text-2xl font-extrabold text-white">Yearly Pro Plan</h2>
              <p className="text-3xl font-black text-emerald-400">₹3,999 <span className="text-xs text-slate-400 font-normal">/ year</span></p>
              <ul className="space-y-3 text-sm text-slate-300">
                <li>✅ All Monthly Pro Features</li>
                <li>✅ Save over ₹1,900 annually</li>
                <li>✅ Priority Customer Support</li>
                <li>✅ Custom Shop Profile Sync</li>
                <li>✅ 365 Days Uninterrupted Access</li>
              </ul>
            </div>
            <button 
              onClick={() => handleRazorpayPayment('Yearly Pro', 3999, 365)}
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3 rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Pay ₹3,999 with Razorpay'}
            </button>
          </div>
        </div>

        <div className="pt-4">
          <button onClick={() => router.push('/')} className="text-xs text-slate-400 hover:text-cyan-400 underline">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </main>
  );
}