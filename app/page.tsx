'use client';

import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { useRouter } from 'next/navigation';

declare const window: any;

type PolicyTab = 'refund' | 'privacy' | 'terms';
type UserRole = 'owner' | 'manager' | 'receptionist' | 'technician' | 'super_admin';
type StaffAssignableRole = 'manager' | 'receptionist' | 'technician';
type StatusFilter = 'all' | 'Pending' | 'Completed' | 'DueSoon';

export default function Home() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [service, setService] = useState('AC Repair & Service');
  const [price, setPrice] = useState('');
  const [nextServiceDate, setNextServiceDate] = useState('');
  const [providerName, setProviderName] = useState('My Service Shop');
  const [userRole, setUserRole] = useState<UserRole>('owner');
  const [workspaceOwnerId, setWorkspaceOwnerId] = useState('');
  const [staffProfiles, setStaffProfiles] = useState<any[]>([]);
  const [staffEmailInput, setStaffEmailInput] = useState('');
  const [staffRoleInput, setStaffRoleInput] = useState<StaffAssignableRole>('technician');
  const [assigningStaff, setAssigningStaff] = useState(false);
  const [roleSavingId, setRoleSavingId] = useState<string | number | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [subscriptionExpiry, setSubscriptionExpiry] = useState('2026-12-10');
  const [isExpired, setIsExpired] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [activePolicy, setActivePolicy] = useState<PolicyTab>('refund');
  const router = useRouter();

  const supportEmail = 'thevishalrai.official@gmail.com';
  const businessLocation = 'New Delhi, India';

  const canViewRevenue = userRole === 'owner' || userRole === 'manager' || userRole === 'super_admin';
  const canManageRoles = userRole === 'owner' || userRole === 'super_admin';
  const canCreateBooking = userRole !== 'technician';
  const canBillingAndShare = userRole !== 'technician';

  const getDueBadge = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const targetDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    targetDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((targetDate.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: `Overdue (${Math.abs(diffDays)}d)`,
        className: 'bg-red-500/15 text-red-300 border border-red-500/30',
        isDueSoon: false,
      };
    }
    if (diffDays === 0) {
      return {
        label: 'Due Today',
        className: 'bg-rose-500/20 text-rose-200 border border-rose-500/40',
        isDueSoon: true,
      };
    }
    if (diffDays <= 7) {
      return {
        label: `Due in ${diffDays}d`,
        className: 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/30',
        isDueSoon: true,
      };
    }
    return {
      label: `Next: ${dateStr}`,
      className: 'bg-slate-800 text-slate-300 border border-slate-700',
      isDueSoon: false,
    };
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const fetchStaffProfiles = async (ownerRootId: string, currentUserId: string, currentUserEmail: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_id, owner_id, email, provider_name, role, is_pro, subscription_expires_at')
      .or(`user_id.eq.${ownerRootId},owner_id.eq.${ownerRootId},user_id.eq.${currentUserId},email.eq.${currentUserEmail}`)
      .order('id', { ascending: true });

    if (!error && data) {
      setStaffProfiles(data);
    }
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    async function getUserAndData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email) {
        setIsAuthenticated(true);
        setUserId(user.id);
        setUserEmail(user.email);

        let resolvedRole: UserRole = 'owner';
        let targetOwnerId = user.id;

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .or(`user_id.eq.${user.id},email.eq.${user.email}`)
          .maybeSingle();

        if (profileData) {
          if (profileData.owner_id) {
            targetOwnerId = profileData.owner_id;
          }
          setWorkspaceOwnerId(targetOwnerId);

          const validRoles: UserRole[] = ['owner', 'manager', 'receptionist', 'technician', 'super_admin'];
          if (profileData.role && validRoles.includes(profileData.role)) {
            resolvedRole = profileData.role;
            setUserRole(profileData.role);
          } else {
            setUserRole('owner');
          }

          if (profileData.owner_id && profileData.owner_id !== user.id) {
            const { data: ownerProfile } = await supabase
              .from('profiles')
              .select('provider_name, is_pro, free_entries_used, subscription_expires_at')
              .eq('user_id', profileData.owner_id)
              .maybeSingle();

            if (ownerProfile?.provider_name) {
              setProviderName(ownerProfile.provider_name);
            } else if (profileData.provider_name) {
              setProviderName(profileData.provider_name);
            } else {
              setProviderName('My Service Shop');
            }

            const entriesUsed = ownerProfile?.free_entries_used || 0;
            const isUserPro = ownerProfile?.is_pro || false;
            if (!isUserPro && entriesUsed >= 2) {
              setIsExpired(true);
            }
            if (ownerProfile?.subscription_expires_at) {
              const expiryDate = ownerProfile.subscription_expires_at;
              setSubscriptionExpiry(expiryDate);
              const today = new Date().toISOString().split('T')[0];
              if (today > expiryDate && !isUserPro) {
                setIsExpired(true);
              }
            }
          } else {
            if (profileData.provider_name) {
              setProviderName(profileData.provider_name);
            } else {
              setProviderName('My Service Shop');
            }

            const entriesUsed = profileData.free_entries_used || 0;
            const isUserPro = profileData.is_pro || false;

            if (!isUserPro && entriesUsed >= 2) {
              setIsExpired(true);
            }

            if (profileData.subscription_expires_at) {
              const expiryDate = profileData.subscription_expires_at;
              setSubscriptionExpiry(expiryDate);
              const today = new Date().toISOString().split('T')[0];
              if (today > expiryDate && !isUserPro) {
                setIsExpired(true);
              }
            }
          }
        } else {
          setWorkspaceOwnerId(user.id);
          setProviderName('My Service Shop');
          setUserRole('owner');
        }

        if (resolvedRole === 'owner' || resolvedRole === 'super_admin') {
          fetchStaffProfiles(targetOwnerId, user.id, user.email);
        }

        fetchBookings(targetOwnerId);
      } else {
        setIsAuthenticated(false);
      }
      setAuthChecking(false);
    }
    getUserAndData();
  }, []);

  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageRoles) {
      alert('Only Owner can assign staff.');
      return;
    }
    const cleanEmail = staffEmailInput.trim();
    if (!cleanEmail) return;

    setAssigningStaff(true);
    const { error } = await supabase.rpc('assign_staff_role', {
      staff_email: cleanEmail,
      assigned_role: staffRoleInput,
    });

    if (error) {
      alert(error.message);
    } else {
      alert('Staff role assigned successfully!');
      setStaffEmailInput('');
      if (userId && userEmail) {
        await fetchStaffProfiles(workspaceOwnerId || userId, userId, userEmail);
      }
    }
    setAssigningStaff(false);
  };

  const handleRoleChange = async (profileItem: any, nextRole: StaffAssignableRole) => {
    if (!canManageRoles) {
      alert('Only Owner can change roles.');
      return;
    }

    const rowKey = profileItem.id ?? profileItem.user_id ?? profileItem.email;
    setRoleSavingId(rowKey);

    let updateQuery = supabase.from('profiles').update({ role: nextRole });
    if (profileItem.id) {
      updateQuery = updateQuery.eq('id', profileItem.id);
    } else if (profileItem.user_id) {
      updateQuery = updateQuery.eq('user_id', profileItem.user_id);
    } else if (profileItem.email) {
      updateQuery = updateQuery.eq('email', profileItem.email);
    }

    const { error } = await updateQuery;

    if (error) {
      alert('Role update error: ' + error.message);
    } else {
      setStaffProfiles((prev) =>
        prev.map((p) => {
          const sameRow =
            (profileItem.id && p.id === profileItem.id) ||
            (profileItem.user_id && p.user_id === profileItem.user_id) ||
            (profileItem.email && p.email === profileItem.email);
          return sameRow ? { ...p, role: nextRole } : p;
        })
      );

      if (
        (userId && profileItem.user_id === userId) ||
        (userEmail && profileItem.email && profileItem.email.toLowerCase() === userEmail.toLowerCase())
      ) {
        setUserRole(nextRole);
      }
    }

    setRoleSavingId(null);
  };

  const fetchBookings = async (targetUserId?: string) => {
    let query = supabase.from('bookings').select('*').order('created_at', { ascending: false });

    if (targetUserId) {
      query = query.eq('user_id', targetUserId);
    }

    const { data } = await query;
    if (data) {
      setBookings(data);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUserId('');
    setUserEmail('');
    setWorkspaceOwnerId('');
    setUserRole('owner');
    setStaffProfiles([]);
    router.push('/login');
  };

  const handleRenewPlan = (planType: 'monthly' | 'yearly') => {
    if (!window.Razorpay) {
      alert('Razorpay SDK failed to load. Please check your internet connection.');
      return;
    }

    const amount = planType === 'yearly' ? 1999 : 499;
    const daysToAdd = planType === 'yearly' ? 365 : 30;
    const description = planType === 'yearly' ? 'Yearly Subscription (365 Days)' : 'Monthly Subscription (30 Days)';

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_TyTWGhk3pq3QSk',
      amount: amount * 100,
      currency: 'INR',
      name: providerName || 'ServiceMitra Pro',
      description: description,
      notes: {
        planType,
        userId: workspaceOwnerId || userId,
        userEmail,
      },
      handler: async function (response: any) {
        if (response.razorpay_payment_id) {
          try {
            const verifyRes = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id || null,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planType,
                userId: workspaceOwnerId || userId,
                userEmail,
              }),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || !verifyData.success) {
              alert('Payment verification failed: ' + (verifyData.error || 'Unknown error'));
              return;
            }

            if (verifyData.subscription_expires_at) {
              setSubscriptionExpiry(verifyData.subscription_expires_at);
            }
            setIsExpired(false);
            alert(
              `Payment Verified! Plan successfully renewed for ${
                daysToAdd === 365 ? '1 Year' : '30 Days'
              }.`
            );
          } catch (err: any) {
            alert('Verification request error: ' + (err?.message || 'Please contact support.'));
          }
        }
      },
      prefill: {
        email: userEmail,
      },
      theme: {
        color: '#06b6d4',
      },
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.open();
  };

  const handlePhoneChange = (inputPhone: string) => {
    setPhone(inputPhone);
    if (inputPhone.length === 10) {
      const existingCustomer = bookings.find((item) => item.phone === inputPhone);
      if (existingCustomer) {
        setName(existingCustomer.name);
      }
    }
  };

  const customerPastVisits =
    phone.length === 10 ? bookings.filter((item) => item.phone === phone).length : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateBooking) {
      alert('Technician role cannot create new bookings.');
      return;
    }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
      alert('User not logged in!');
      setLoading(false);
      return;
    }

    const effectiveOwnerId = workspaceOwnerId || user.id;

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_pro, free_entries_used')
      .eq('user_id', effectiveOwnerId)
      .maybeSingle();

    if (profile && !profile.is_pro) {
      const entriesUsed = profile.free_entries_used || 0;
      if (entriesUsed >= 2) {
        alert('Your 2 free trial entries have ended. Please upgrade to Pro to continue!');
        setIsExpired(true);
        setLoading(false);
        return;
      } else {
        await supabase
          .from('profiles')
          .update({ free_entries_used: entriesUsed + 1 })
          .eq('user_id', effectiveOwnerId);
      }
    }

    const { error: bookingError } = await supabase.from('bookings').insert([
      {
        name,
        phone,
        service,
        price: Number(price) || 0,
        status: 'Pending',
        next_service_date: nextServiceDate || null,
        user_id: effectiveOwnerId,
      },
    ]);

    if (userRole === 'owner' || userRole === 'manager' || userRole === 'super_admin') {
      await supabase
        .from('profiles')
        .update({ provider_name: providerName })
        .eq('user_id', effectiveOwnerId);
    }

    if (bookingError) {
      alert('Samasya aayi hai: ' + bookingError.message);
    } else {
      alert('Booking aur Shop Name safaltapoorvak save ho gaye hain!');
      setName('');
      setPhone('');
      setPrice('');
      setNextServiceDate('');
      fetchBookings(effectiveOwnerId);
    }
    setLoading(false);
  };

  const toggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'Pending' ? 'Completed' : 'Pending';
    await supabase.from('bookings').update({ status: newStatus }).eq('id', id);
    fetchBookings(workspaceOwnerId || userId);
  };

  const handlePrintInvoice = (item: any) => {
    if (!canBillingAndShare) {
      alert('Billing access is restricted for Technician role.');
      return;
    }
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
              ${item.next_service_date ? `<p><strong>Next Service Date:</strong> ${item.next_service_date}</p>` : ''}
            </div>
            <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const pendingCount = bookings.filter((item) => (item.status || 'Pending') === 'Pending').length;
  const completedCount = bookings.filter((item) => item.status === 'Completed').length;
  const dueSoonCount = bookings.filter((item) => Boolean(getDueBadge(item.next_service_date)?.isDueSoon)).length;

  const totalRevenue = bookings
    .filter((item) => item.status === 'Completed')
    .reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  const filteredBookings = bookings.filter((item) => {
    const currentStatus = item.status || 'Pending';
    const dueBadge = getDueBadge(item.next_service_date);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'DueSoon' ? Boolean(dueBadge?.isDueSoon) : currentStatus === statusFilter);
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.phone.includes(searchQuery) ||
      item.service.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (authChecking) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <p className="text-sm text-slate-400">Loading ServiceMitra...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 font-black text-slate-950">
                SM
              </div>
              <div>
                <span className="text-lg font-extrabold tracking-tight text-white">
                  ServiceMitra Pro
                </span>
                <span className="ml-2 hidden rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-xs font-medium text-cyan-300 sm:inline-block">
                  Service Bookings & Billing
                </span>
              </div>
            </div>

            <nav className="hidden items-center gap-6 text-sm font-medium text-slate-300 md:flex">
              <button type="button" onClick={() => scrollToSection('features')} className="hover:text-white transition">
                Features
              </button>
              <button type="button" onClick={() => scrollToSection('pricing')} className="hover:text-white transition">
                Pricing
              </button>
              <button type="button" onClick={() => scrollToSection('policies')} className="hover:text-white transition">
                Policies
              </button>
              <button type="button" onClick={() => scrollToSection('contact')} className="hover:text-white transition">
                Contact
              </button>
            </nav>

            <div className="flex items-center gap-2.5">
              <a
                href="/login"
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
              >
                Login
              </a>
              <a
                href="/signup"
                className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400 transition"
              >
                Start Free Trial
              </a>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-6xl px-4 pt-14 pb-12">
          <div className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 p-8 shadow-2xl md:p-12">
            <p className="inline-block rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold text-cyan-300">
              For AC Repair, Plumbing, Electrical, Carpentry & Home Services
            </p>
            <h1 className="mt-5 max-w-3xl text-3xl font-extrabold leading-tight text-white sm:text-5xl">
              Manage service bookings, customer history, invoices & WhatsApp follow-ups in one place.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              ServiceMitra Pro helps service shops and technicians track pending or completed jobs, check repeat customer visits, print bills, and send WhatsApp updates effortlessly.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="/signup"
                className="rounded-xl bg-cyan-400 px-7 py-3.5 text-base font-extrabold text-slate-950 shadow-lg shadow-cyan-500/25 hover:bg-cyan-300 transition"
              >
                Start Free Trial →
              </a>
              <button
                type="button"
                onClick={() => scrollToSection('pricing')}
                className="rounded-xl border-2 border-cyan-500/50 bg-slate-900/90 px-6 py-3.5 text-base font-bold text-cyan-300 hover:bg-slate-800 hover:text-white transition"
              >
                View Plans (₹499 / ₹1,999)
              </button>
              <a
                href="/login"
                className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-300 underline-offset-4 hover:text-white hover:underline"
              >
                Already have an account? Login
              </a>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Key Features</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
              <h3 className="text-lg font-semibold text-cyan-400">Repeat Customer History</h3>
              <p className="mt-2 text-sm text-slate-300">
                Automatically checks past visits when entering a 10-digit mobile number so you know returning customers immediately.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
              <h3 className="text-lg font-semibold text-emerald-400">Instant Bills & Status Tracking</h3>
              <p className="mt-2 text-sm text-slate-300">
                Switch booking status between Pending and Completed, track completed revenue, and print clean service invoices.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
              <h3 className="text-lg font-semibold text-sky-400">WhatsApp Bill & Review Sharing</h3>
              <p className="mt-2 text-sm text-slate-300">
                Send service bill details and ask customers for a 5-star review directly over WhatsApp with one click.
              </p>
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Subscription Plans</h2>
          <p className="mt-2 text-sm text-slate-400">
            Transparent pricing in INR (₹). New accounts can start with a limited free trial before upgrading.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-7">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Monthly Plan</h3>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-cyan-300">
                    30 Days Validity
                  </span>
                </div>
                <p className="mt-4 text-4xl font-extrabold text-white">
                  ₹499 <span className="text-sm font-normal text-slate-400">/ 30 days</span>
                </p>
                <ul className="mt-6 space-y-2.5 text-sm text-slate-300">
                  <li>• Unlimited service bookings & customer search</li>
                  <li>• Printable service invoices & revenue tracking</li>
                  <li>• One-click WhatsApp bill & review share</li>
                  <li>• Support via {supportEmail}</li>
                </ul>
              </div>
              <a
                href="/login"
                className="mt-8 block w-full rounded-xl bg-slate-800 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-slate-700 transition"
              >
                Login to Subscribe (₹499)
              </a>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-cyan-500/40 bg-slate-900 p-7">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Yearly Plan</h3>
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                    365 Days Validity
                  </span>
                </div>
                <p className="mt-4 text-4xl font-extrabold text-white">
                  ₹1,999 <span className="text-sm font-normal text-slate-400">/ 365 days</span>
                </p>
                <ul className="mt-6 space-y-2.5 text-sm text-slate-300">
                  <li>• Everything included in Monthly Plan</li>
                  <li>• Full 1-year uninterrupted subscription access</li>
                  <li>• Ideal for active service shops & teams</li>
                  <li>• Support via {supportEmail}</li>
                </ul>
              </div>
              <a
                href="/login"
                className="mt-8 block w-full rounded-xl bg-cyan-500 px-4 py-3 text-center text-sm font-bold text-slate-950 hover:bg-cyan-400 transition"
              >
                Login to Subscribe (₹1,999)
              </a>
            </div>
          </div>
        </section>

        <section id="policies" className="mx-auto max-w-6xl px-4 py-12">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <h2 className="text-2xl font-bold text-white">Policies & Terms</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Review our Refund & Cancellation, Privacy, and Terms of Service.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActivePolicy('refund')}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    activePolicy === 'refund'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Refund & Cancellation
                </button>
                <button
                  type="button"
                  onClick={() => setActivePolicy('privacy')}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    activePolicy === 'privacy'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Privacy Policy
                </button>
                <button
                  type="button"
                  onClick={() => setActivePolicy('terms')}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    activePolicy === 'terms'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Terms & Conditions
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm leading-relaxed text-slate-300">
              {activePolicy === 'refund' && (
                <>
                  <h3 className="text-lg font-semibold text-white">Refund & Cancellation Policy</h3>
                  <p>
                    <strong>No Refund After Activation:</strong> Once a subscription plan (₹499 for 30 days or ₹1,999 for 365 days) is activated on your account, payments are <strong>non-refundable</strong>.
                  </p>
                  <p>
                    <strong>Cancel Anytime:</strong> You can cancel or stop future subscription renewals anytime. Your active validity continues until the end of the current paid period.
                  </p>
                  <p>
                    <strong>Technical / Duplicate Charge Exception:</strong> If a duplicate payment occurs or a verified technical issue prevents activation, contact{' '}
                    <a href={`mailto:${supportEmail}`} className="text-cyan-400 underline">
                      {supportEmail}
                    </a>{' '}
                    with your payment ID for verification and resolution.
                  </p>
                </>
              )}

              {activePolicy === 'privacy' && (
                <>
                  <h3 className="text-lg font-semibold text-white">Privacy Policy</h3>
                  <p>
                    ServiceMitra Pro stores only the account, shop profile, and service booking details required to operate your workspace. We do not sell user data to third parties.
                  </p>
                  <p>
                    Payments are processed securely via authorized payment gateways; sensitive payment credentials are handled directly by the payment processor.
                  </p>
                </>
              )}

              {activePolicy === 'terms' && (
                <>
                  <h3 className="text-lg font-semibold text-white">Terms & Conditions</h3>
                  <p>
                    By using ServiceMitra Pro, you agree to use the platform for lawful business and service record management. Subscription validity and access depend on active plan status.
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        <section id="contact" className="mx-auto max-w-6xl px-4 pt-2 pb-16">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8">
            <h2 className="text-2xl font-bold text-white">Contact Us</h2>
            <p className="mt-2 text-sm text-slate-400">
              For support, billing queries, or account assistance, contact us below.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">Support Email</p>
                <a href={`mailto:${supportEmail}`} className="mt-1 block text-base font-medium text-cyan-400 hover:underline">
                  {supportEmail}
                </a>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">Business Location</p>
                <p className="mt-1 text-base font-medium text-white">{businessLocation}</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-auto border-t border-slate-800 bg-slate-950 py-6 text-sm text-slate-400">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
            <p>© {new Date().getFullYear()} ServiceMitra Pro • {businessLocation}</p>
            <div className="flex flex-wrap items-center gap-5">
              <button
                type="button"
                onClick={() => {
                  setActivePolicy('refund');
                  scrollToSection('policies');
                }}
                className="hover:text-white transition"
              >
                Refund & Cancellation
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivePolicy('privacy');
                  scrollToSection('policies');
                }}
                className="hover:text-white transition"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivePolicy('terms');
                  scrollToSection('policies');
                }}
                className="hover:text-white transition"
              >
                Terms & Conditions
              </button>
              <a href={`mailto:${supportEmail}`} className="hover:text-white transition">
                {supportEmail}
              </a>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      {isExpired && (
        <div className="bg-red-600 text-white text-center py-3 px-4 rounded-xl mb-6 font-bold text-sm shadow-lg animate-pulse flex flex-col md:flex-row justify-between items-center gap-3">
          <span>⚠️ Your Free Trial / Subscription Plan has Ended. Please renew to unlock full features!</span>
          <div className="flex gap-2">
            <button
              onClick={() => handleRenewPlan('monthly')}
              className="bg-white text-red-600 px-3 py-1.5 rounded-lg text-xs font-black shadow hover:bg-slate-100 transition"
            >
              Monthly (₹499)
            </button>
            <button
              onClick={() => handleRenewPlan('yearly')}
              className="bg-slate-950 text-white px-3 py-1.5 rounded-lg text-xs font-black shadow hover:bg-slate-900 transition border border-white/20"
            >
              Yearly (₹1999)
            </button>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center text-slate-950 justify-center font-black text-xl">
              {providerName ? providerName.charAt(0).toUpperCase() : 'V'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold text-white">{providerName}</h1>
                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase text-cyan-300">
                  {userRole}
                </span>
              </div>
              <p className="text-slate-400 text-xs md:text-sm">
                Logged in: <span className="text-cyan-400">{userEmail}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {canViewRevenue && (
              <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs md:text-sm">
                <p className="text-emerald-400 font-bold">💰 Total Revenue</p>
                <p className="text-white font-extrabold text-base">₹{totalRevenue}</p>
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs md:text-sm flex items-center gap-3">
              <div>
                <p className={isExpired ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {isExpired ? '❌ Trial/Plan Ended' : '💎 Active Plan: Pro'}
                </p>
                <p className="text-slate-400 text-[10px]">Expires: {subscriptionExpiry}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleRenewPlan('monthly')}
                  className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-cyan-500/20 transition"
                  title="Monthly ₹499"
                >
                  ₹499
                </button>
                <button
                  onClick={() => handleRenewPlan('yearly')}
                  className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-emerald-500/20 transition"
                  title="Yearly ₹1999"
                >
                  ₹1999
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl text-xs md:text-sm font-medium flex items-center gap-3">
              <span>
                Pending: <strong className="text-amber-400">{pendingCount}</strong>
              </span>
              <span className="text-slate-700">|</span>
              <span>
                Due Soon: <strong className="text-cyan-400">{dueSoonCount}</strong>
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-500/20 transition"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl lg:col-span-1">
            <h2 className="text-lg font-semibold text-cyan-400 mb-4">New Booking</h2>
            {!canCreateBooking ? (
              <p className="text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-xl p-4">
                Technician role has view &amp; status update access only.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Phone Number (Auto-Checks History)
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="Enter 10-digit mobile"
                    autoComplete="off"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                  />
                  {customerPastVisits > 0 && (
                    <p className="text-emerald-400 text-[11px] mt-1 font-medium">
                      ✨ Returning Customer! Past Services: {customerPastVisits}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    autoComplete="off"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Service Type
                  </label>
                  <select
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                  >
                    <option value="AC Repair & Service">AC Repair &amp; Service</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical Work">Electrical Work</option>
                    <option value="Carpentry">Carpentry</option>
                    <option value="Home Cleaning">Home Cleaning</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Service Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Enter amount in ₹"
                    autoComplete="off"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Next Service Date
                  </label>
                  <input
                    type="date"
                    value={nextServiceDate}
                    onChange={(e) => setNextServiceDate(e.target.value)}
                    autoComplete="off"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Shop Name (Auto-Syncs)
                  </label>
                  <input
                    type="text"
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    placeholder="Enter shop name"
                    autoComplete="off"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || isExpired}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold py-3 rounded-xl transition shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Confirm & Save Booking'}
                </button>
              </form>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl lg:col-span-2 space-y-5">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search by customer name, phone or service..."
              autoComplete="off"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500"
            />

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === 'all'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-slate-950 text-slate-300 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                All ({bookings.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Pending')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === 'Pending'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-950 text-amber-300 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Completed')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === 'Completed'
                    ? 'bg-emerald-400 text-slate-950'
                    : 'bg-slate-950 text-emerald-300 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                Completed ({completedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('DueSoon')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === 'DueSoon'
                    ? 'bg-sky-400 text-slate-950'
                    : 'bg-slate-950 text-sky-300 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                Due Soon ({dueSoonCount})
              </button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {filteredBookings.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Koi matching booking nahi mili.</p>
              ) : (
                filteredBookings.map((item, index) => {
                  const dueBadge = getDueBadge(item.next_service_date);
                  return (
                    <div
                      key={item.id || index}
                      className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-white text-base">{item.name}</h3>
                          {dueBadge && (
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${dueBadge.className}`}>
                              {dueBadge.label}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 text-xs mt-0.5">
                          📞 {item.phone}
                          {canViewRevenue ? ` | 💵 ₹${item.price || 0}` : ''}
                          {item.next_service_date && ` | 📅 ${item.next_service_date}`}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1 rounded-full text-xs font-semibold">
                          {item.service}
                        </span>

                        <button
                          onClick={() => toggleStatus(item.id, item.status)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                            item.status === 'Completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {item.status || 'Pending'}
                        </button>

                        {canBillingAndShare && (
                          <>
                            <button
                              onClick={() => handlePrintInvoice(item)}
                              className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-3 py-1 rounded-full text-xs font-bold"
                            >
                              📄 Bill
                            </button>

                            <a
                              href={`https://wa.me/91${item.phone}?text=Hello%20${encodeURIComponent(
                                item.name
                              )},%20thank%20you%20for%20choosing%20${encodeURIComponent(
                                providerName
                              )}!%20Your%20bill%20for%20${encodeURIComponent(item.service)}%20is%20₹${
                                item.price || 0
                              }.${
                                item.next_service_date
                                  ? `%20Next%20service%20date:%20${encodeURIComponent(item.next_service_date)}.`
                                  : ''
                              }%20Please%20rate%20our%20service%20out%20of%205%20stars!⭐️`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                            >
                              💬 WhatsApp &amp; Review
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {canManageRoles && (
          <section className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Staff &amp; Roles Management</h2>
                <p className="text-xs text-slate-400">
                  Staff must sign up once first, then enter their email here to link to your shop and assign a role.
                </p>
              </div>
              <span className="text-xs text-cyan-400 font-semibold">
                Accounts: {staffProfiles.length}
              </span>
            </div>

            <form onSubmit={handleAssignStaff} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="email"
                required
                value={staffEmailInput}
                onChange={(e) => setStaffEmailInput(e.target.value)}
                placeholder="Staff email (already signed up)"
                className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-cyan-500 outline-none"
              />
              <select
                value={staffRoleInput}
                onChange={(e) => setStaffRoleInput(e.target.value as StaffAssignableRole)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-cyan-500 outline-none"
              >
                <option value="technician">technician</option>
                <option value="receptionist">receptionist</option>
                <option value="manager">manager</option>
              </select>
              <button
                type="submit"
                disabled={assigningStaff}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl px-4 py-2 text-xs transition disabled:opacity-50"
              >
                {assigningStaff ? 'Assigning...' : '+ Assign Staff Role'}
              </button>
            </form>

            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {staffProfiles.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No profiles found.</p>
              ) : (
                staffProfiles.map((prof, idx) => {
                  const rowKey = prof.id ?? prof.user_id ?? prof.email ?? idx;
                  const currentRole: UserRole = prof.role || 'owner';
                  return (
                    <div
                      key={rowKey}
                      className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-white">
                          {prof.provider_name || 'Service Shop'}
                        </p>
                        <p className="text-xs text-slate-400">{prof.email || 'No email'}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase text-cyan-300">
                          {currentRole}
                        </span>
                        <select
                          value={currentRole === 'owner' || currentRole === 'super_admin' ? 'manager' : currentRole}
                          disabled={roleSavingId === rowKey || currentRole === 'owner' || currentRole === 'super_admin'}
                          onChange={(e) => handleRoleChange(prof, e.target.value as StaffAssignableRole)}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 outline-none disabled:opacity-60"
                        >
                          <option value="manager">manager</option>
                          <option value="receptionist">receptionist</option>
                          <option value="technician">technician</option>
                        </select>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
