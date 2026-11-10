'use client';

import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState('AC Repair & Service');
  const [price, setPrice] = useState('');
  const [nextServiceDate, setNextServiceDate] = useState('');
  const [providerName, setProviderName] = useState('Cool Air Services');
  const [subscriptionExpiry, setSubscriptionExpiry] = useState('2026-12-10');
  const [isExpired, setIsExpired] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function getUserAndData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email) {
        setUserEmail(user.email);
        
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', user.email)
          .single();

        if (profileData) {
          if (profileData.provider_name) setProviderName(profileData.provider_name);
          if (profileData.subscription_expires_at) {
            const expiryDate = profileData.subscription_expires_at;
            setSubscriptionExpiry(expiryDate);
            const today = new Date().toISOString().split('T')[0];
            if (today > expiryDate) {
              setIsExpired(true);
            }
          }
        }
      } else {
        router.push('/login');
      }
    }
    getUserAndData();
    fetchBookings();
  }, [router]);

  const fetchBookings = async () => {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setBookings(data);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // ऑटोमैटिक प्लान रिन्यू करने का फंक्शन (30 दिन बढ़ाने के लिए)
  const handleRenewPlan = async () => {
    const today = new Date();
    const newExpiry = new Date(today);
    newExpiry.setDate(today.getDate() + 30); // आज से 30 दिन आगे
    const formattedExpiry = newExpiry.toISOString().split('T')[0];

    const { error } = await supabase
      .from('profiles')
      .update({ subscription_expires_at: formattedExpiry })
      .eq('email', userEmail);

    if (error) {
      alert('Renewal Error: ' + error.message);
    } else {
      alert('Plan successfully renewed for 30 days!');
      setSubscriptionExpiry(formattedExpiry);
      setIsExpired(false);
    }
  };

  const handlePhoneChange = (inputPhone: string) => {
    setPhone(inputPhone);
    if (inputPhone.length === 10) {
      const existingCustomer = bookings.find(item => item.phone === inputPhone);
      if (existingCustomer) {
        setName(existingCustomer.name);
      }
    }
  };

  const customerPastVisits = phone.length === 10 
    ? bookings.filter(item => item.phone === phone).length 
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired) {
      alert('Aapka subscription plan expire ho chuka hai. Kripya pehle renew karein!');
      return;
    }
    setLoading(true);

    const { error: bookingError } = await supabase
      .from('bookings')
      .insert([{ 
        name, 
        phone, 
        service, 
        price: Number(price) || 0,
        status: 'Pending',
        next_service_date: nextServiceDate || null 
      }]);

    if (userEmail) {
      await supabase
        .from('profiles')
        .update({ provider_name: providerName })
        .eq('email', userEmail);
    }

    if (bookingError) {
      alert('Samasya aayi hai: ' + bookingError.message);
    } else {
      alert('Booking aur Shop Name safaltapoorvak save ho gaye hain!');
      setName('');
      setPhone('');
      setPrice('');
      setNextServiceDate('');
      fetchBookings();
    }
    setLoading(false);
  };

  const toggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'Pending' ? 'Completed' : 'Pending';
    await supabase.from('bookings').update({ status: newStatus }).eq('id', id);
    fetchBookings();
  };

  const handlePrintInvoice = (item: any) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Service Invoice - ${item.name}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
              .invoice-box { max-width: 600px; margin: auto; padding: 30px; border: 1px solid #eee; }
              .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            </style>
          </head>
          <body>
            <div class="invoice-box">
              <div class="header">
                <h2>${providerName}</h2>
                <p>Service Invoice</p>
              </div>
              <p><strong>Customer:</strong> ${item.name}</p>
              <p><strong>Phone:</strong> ${item.phone}</p>
              <p><strong>Service:</strong> ${item.service}</p>
              <p><strong>Amount:</strong> ₹${item.price || 0}</p>
              <p><strong>Status:</strong> ${item.status || 'Pending'}</p>
            </div>
            <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const totalRevenue = bookings
    .filter(item => item.status === 'Completed')
    .reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  const filteredBookings = bookings.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.phone.includes(searchQuery) ||
    item.service.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      {isExpired && (
        <div className="bg-red-600 text-white text-center py-3 px-4 rounded-xl mb-6 font-bold text-sm shadow-lg animate-pulse flex justify-between items-center px-6">
          <span>⚠️ Your Subscription Plan has Expired ({subscriptionExpiry}). Please renew to unlock full features!</span>
          <button onClick={handleRenewPlan} className="bg-white text-red-600 px-4 py-1.5 rounded-lg text-xs font-black shadow hover:bg-slate-100 transition">
            Renew Now (₹299)
          </button>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center text-slate-950 justify-center font-black text-xl">
              {providerName ? providerName.charAt(0).toUpperCase() : 'V'}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white">{providerName}</h1>
              <p className="text-slate-400 text-xs md:text-sm">Logged in: <span className="text-cyan-400">{userEmail}</span></p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs md:text-sm">
              <p className="text-emerald-400 font-bold">💰 Total Revenue</p>
              <p className="text-white font-extrabold text-base">₹{totalRevenue}</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs md:text-sm flex items-center gap-3">
              <div>
                <p className={isExpired ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                  {isExpired ? "❌ Plan Expired" : "💎 Active Plan: Pro"}
                </p>
                <p className="text-slate-400 text-[10px]">Expires: {subscriptionExpiry}</p>
              </div>
              <button onClick={handleRenewPlan} className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-1 rounded-lg text-[11px] font-bold hover:bg-cyan-500/20 transition">
                Renew
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl text-sm font-medium">
              Bookings: <span className="text-cyan-400 font-bold">{bookings.length}</span>
            </div>

            <button onClick={handleLogout} className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-500/20 transition">
              Logout
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl lg:col-span-1">
            <h2 className="text-lg font-semibold text-cyan-400 mb-4">New Booking</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Phone Number (Auto-Checks History)</label>
                <input type="tel" required maxLength={10} value={phone} onChange={(e) => handlePhoneChange(e.target.value)} placeholder="Enter 10-digit mobile" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500" />
                {customerPastVisits > 0 && (
                  <p className="text-emerald-400 text-[11px] mt-1 font-medium">✨ Returning Customer! Past Services: {customerPastVisits}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Customer Name</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter full name" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500" />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Service Type</label>
                <select value={service} onChange={(e) => setService(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500">
                  <option value="AC Repair & Service">AC Repair & Service</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="Electrical Work">Electrical Work</option>
                  <option value="Carpentry">Carpentry</option>
                  <option value="Home Cleaning">Home Cleaning</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Service Price (₹)</label>
                <input type="number" required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Enter amount in ₹" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Next Service Date</label>
                <input type="date" value={nextServiceDate} onChange={(e) => setNextServiceDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Shop Name (Auto-Syncs)</label>
                <input type="text" value={providerName} onChange={(e) => setProviderName(e.target.value)} placeholder="Enter shop name" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500" />
              </div>

              <button type="submit" disabled={loading || isExpired} className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold py-3 rounded-xl transition shadow-lg shadow-cyan-500/20 disabled:opacity-50">
                {loading ? 'Saving...' : 'Confirm & Save Booking'}
              </button>
            </form>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl lg:col-span-2 space-y-6">
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="🔍 Search by customer name, phone or service..." className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500" />
            
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {filteredBookings.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Koi matching booking nahi mili.</p>
              ) : (
                filteredBookings.map((item, index) => (
                  <div key={item.id || index} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="font-bold text-white text-base">{item.name}</h3>
                      <p className="text-slate-400 text-xs">📞 {item.phone} | 💵 ₹{item.price || 0} {item.next_service_date && `| 📅 Next: ${item.next_service_date}`}</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1 rounded-full text-xs font-semibold">
                        {item.service}
                      </span>

                      <button onClick={() => toggleStatus(item.id, item.status)} className={`px-3 py-1 rounded-full text-xs font-bold transition ${item.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                        {item.status || 'Pending'}
                      </button>

                      <button onClick={() => handlePrintInvoice(item)} className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-3 py-1 rounded-full text-xs font-bold">
                        📄 Bill
                      </button>

                      <a 
                        href={`https://wa.me/91${item.phone}?text=Hello%20${encodeURIComponent(item.name)},%20thank%20you%20for%20choosing%20${encodeURIComponent(providerName)}!%20Your%20bill%20for%20${encodeURIComponent(item.service)}%20is%20₹${item.price || 0}.%20Please%20rate%20our%20service%20out%20of%205%20stars!⭐️`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                      >
                        💬 WhatsApp & Review
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}