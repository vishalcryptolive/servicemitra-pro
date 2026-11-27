'use client';

import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { useRouter } from 'next/navigation';

declare const window: any;

type PolicyTab = 'refund' | 'privacy' | 'terms';
type UserRole = 'owner' | 'manager' | 'receptionist' | 'technician' | 'super_admin';
type StaffAssignableRole = 'manager' | 'receptionist' | 'technician';
type StatusFilter = 'all' | 'Pending' | 'Completed' | 'DueToday' | 'DueSoon' | 'Overdue' | 'AmcExpiring';
type PaymentMethod = 'Cash' | 'UPI' | 'Due';

const FREE_TRIAL_LIMIT = 2;

function getLocalDateString(dateObj: Date = new Date()): string {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Home() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [applianceInfo, setApplianceInfo] = useState('');
  const [service, setService] = useState('AC Repair & Service');
  const [complaintIssue, setComplaintIssue] = useState('');
  const [assignedTechnician, setAssignedTechnician] = useState('');
  const [price, setPrice] = useState('');
  const [partsCost, setPartsCost] = useState('');
  const [labourCost, setLabourCost] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Due');
  const [paymentNote, setPaymentNote] = useState('');
  const [partsUsed, setPartsUsed] = useState('');
  const [amcExpiryDate, setAmcExpiryDate] = useState('');
  const [nextServiceDate, setNextServiceDate] = useState('');
  const [showExtraBookingFields, setShowExtraBookingFields] = useState(false);
  const [providerName, setProviderName] = useState('My Service Shop');
  const [shopPhone, setShopPhone] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [savingShopSettings, setSavingShopSettings] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('owner');
  const [workspaceOwnerId, setWorkspaceOwnerId] = useState('');
  const [staffProfiles, setStaffProfiles] = useState<any[]>([]);
  const [staffEmailInput, setStaffEmailInput] = useState('');
  const [staffRoleInput, setStaffRoleInput] = useState<StaffAssignableRole>('technician');
  const [assigningStaff, setAssigningStaff] = useState(false);
  const [roleSavingId, setRoleSavingId] = useState<string | number | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [technicianFilter, setTechnicianFilter] = useState<string>('all');
  const [selectedHistoryPhone, setSelectedHistoryPhone] = useState<string | null>(null);
  const [subscriptionExpiry, setSubscriptionExpiry] = useState('');
  const [isProPlan, setIsProPlan] = useState(false);
  const [freeEntriesUsed, setFreeEntriesUsed] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookings, setBookings] = useState<any[]>([]);
  const [editingBookingId, setEditingBookingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editApplianceInfo, setEditApplianceInfo] = useState('');
  const [editService, setEditService] = useState('AC Repair & Service');
  const [editComplaintIssue, setEditComplaintIssue] = useState('');
  const [editAssignedTechnician, setEditAssignedTechnician] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editPartsCost, setEditPartsCost] = useState('');
  const [editLabourCost, setEditLabourCost] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>('Due');
  const [editPaymentNote, setEditPaymentNote] = useState('');
  const [editPartsUsed, setEditPartsUsed] = useState('');
  const [editAmcExpiryDate, setEditAmcExpiryDate] = useState('');
  const [editStatus, setEditStatus] = useState('Pending');
  const [editNextServiceDate, setEditNextServiceDate] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingBookingId, setDeletingBookingId] = useState<number | null>(null);
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
  const canManageShopSettings = userRole === 'owner' || userRole === 'super_admin';
  const canCreateBooking = userRole !== 'technician';
  const canBillingAndShare = userRole !== 'technician';
  const canEditOrDeleteBooking = userRole !== 'technician';
  const canExportCsv = userRole !== 'technician';

  const normalizePaymentMethod = (val?: string | null): PaymentMethod => {
    if (val === 'Cash' || val === 'UPI' || val === 'Due') return val;
    return 'Due';
  };

  const evaluateSubscriptionState = (
    profileObj: any,
    currentBookingsCount: number
  ) => {
    const todayStr = getLocalDateString();
    const rawExpiry = profileObj?.subscription_expires_at || '';
    const expiryDate = rawExpiry ? String(rawExpiry).slice(0, 10) : '';
    const hasFutureExpiry = Boolean(expiryDate && expiryDate >= todayStr);
    const proFlag = Boolean(profileObj?.is_pro) && (!expiryDate || hasFutureExpiry);
    const usedCount = Math.max(
      Number(profileObj?.free_entries_used) || 0,
      currentBookingsCount
    );

    setIsProPlan(proFlag);
    setFreeEntriesUsed(usedCount);
    setSubscriptionExpiry(expiryDate || '');

    if (proFlag) {
      setIsExpired(false);
    } else if (usedCount >= FREE_TRIAL_LIMIT) {
      setIsExpired(true);
    } else {
      setIsExpired(false);
    }
  };

  const getDiffDaysFromToday = (dateStr?: string | null): number | null => {
    if (!dateStr) return null;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const parts = String(dateStr).slice(0, 10).split('-');
    if (parts.length !== 3) return null;
    const targetDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    targetDate.setHours(0, 0, 0, 0);
    if (Number.isNaN(targetDate.getTime())) return null;

    return Math.round((targetDate.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getDueBadge = (dateStr?: string | null) => {
    const diffDays = getDiffDaysFromToday(dateStr);
    if (diffDays === null || !dateStr) return null;

    if (diffDays < 0) {
      return {
        label: `🔴 Overdue (${Math.abs(diffDays)}d)`,
        className: 'bg-red-50 text-red-700 border border-red-200',
        isDueToday: false,
        isDueSoon: false,
        isOverdue: true,
      };
    }
    if (diffDays === 0) {
      return {
        label: '🔴 Due Today',
        className: 'bg-rose-50 text-rose-700 border border-rose-200',
        isDueToday: true,
        isDueSoon: true,
        isOverdue: false,
      };
    }
    if (diffDays <= 7) {
      return {
        label: `🔵 Due in ${diffDays}d`,
        className: 'bg-sky-50 text-sky-700 border border-sky-200',
        isDueToday: false,
        isDueSoon: true,
        isOverdue: false,
      };
    }
    return {
      label: `🗓️ Next: ${dateStr}`,
      className: 'bg-slate-100 text-slate-700 border border-slate-200',
      isDueToday: false,
      isDueSoon: false,
      isOverdue: false,
    };
  };

  const isAmcExpiringSoon = (amcDateStr?: string | null): boolean => {
    const diffDays = getDiffDaysFromToday(amcDateStr);
    if (diffDays === null) return false;
    return diffDays >= 0 && diffDays <= 15;
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
      .select('id, user_id, owner_id, email, provider_name, shop_phone, shop_address, role, is_pro, subscription_expires_at')
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

        let { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .or(`user_id.eq.${user.id},email.eq.${user.email}`)
          .maybeSingle();

        if (!profileData) {
          const { data: insertedProfile } = await supabase
            .from('profiles')
            .upsert(
              [
                {
                  user_id: user.id,
                  email: user.email,
                  provider_name: 'My Service Shop',
                  role: 'owner',
                  is_pro: false,
                  free_entries_used: 0,
                },
              ],
              { onConflict: 'user_id' }
            )
            .select('*')
            .maybeSingle();

          profileData = insertedProfile || {
            user_id: user.id,
            email: user.email,
            provider_name: 'My Service Shop',
            role: 'owner',
            is_pro: false,
            free_entries_used: 0,
          };
        }

        let effectiveProfileForPlan = profileData;

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
              .select('provider_name, shop_phone, shop_address, is_pro, free_entries_used, subscription_expires_at')
              .eq('user_id', profileData.owner_id)
              .maybeSingle();

            if (ownerProfile) {
              effectiveProfileForPlan = ownerProfile;
            }

            if (ownerProfile?.provider_name) {
              setProviderName(ownerProfile.provider_name);
            } else if (profileData.provider_name) {
              setProviderName(profileData.provider_name);
            } else {
              setProviderName('My Service Shop');
            }

            setShopPhone(ownerProfile?.shop_phone || profileData.shop_phone || '');
            setShopAddress(ownerProfile?.shop_address || profileData.shop_address || '');
          } else {
            if (profileData.provider_name) {
              setProviderName(profileData.provider_name);
            } else {
              setProviderName('My Service Shop');
            }
            setShopPhone(profileData.shop_phone || '');
            setShopAddress(profileData.shop_address || '');
          }
        }

        const loadedBookings = await fetchBookings(targetOwnerId);
        evaluateSubscriptionState(effectiveProfileForPlan, loadedBookings.length);

        if (resolvedRole === 'owner' || resolvedRole === 'super_admin') {
          fetchStaffProfiles(targetOwnerId, user.id, user.email);
        }
      } else {
        setIsAuthenticated(false);
      }
      setAuthChecking(false);
    }
    getUserAndData();
  }, []);

  const handleSaveShopSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageShopSettings) {
      alert('Only Owner can update shop settings.');
      return;
    }

    const effectiveOwnerId = workspaceOwnerId || userId;
    if (!effectiveOwnerId) {
      alert('User session not found.');
      return;
    }

    setSavingShopSettings(true);
    const cleanedShopName = providerName.trim() || 'My Service Shop';
    const cleanedPhone = shopPhone.trim();
    const cleanedAddress = shopAddress.trim();

    const { error } = await supabase
      .from('profiles')
      .update({
        provider_name: cleanedShopName,
        shop_phone: cleanedPhone || null,
        shop_address: cleanedAddress || null,
      })
      .eq('user_id', effectiveOwnerId);

    if (error) {
      alert('Shop settings save error: ' + error.message);
    } else {
      setProviderName(cleanedShopName);
      setShopPhone(cleanedPhone);
      setShopAddress(cleanedAddress);
      alert('Shop details updated successfully!');
      if (userId && userEmail) {
        await fetchStaffProfiles(effectiveOwnerId, userId, userEmail);
      }
    }
    setSavingShopSettings(false);
  };

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
    if (!['manager', 'receptionist', 'technician'].includes(nextRole)) {
      alert('Invalid role.');
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

  const fetchBookings = async (targetUserId?: string): Promise<any[]> => {
    let query = supabase.from('bookings').select('*').order('created_at', { ascending: false });

    if (targetUserId) {
      query = query.eq('user_id', targetUserId);
    }

    const { data } = await query;
    const rows = data || [];
    setBookings(rows);
    return rows;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUserId('');
    setUserEmail('');
    setWorkspaceOwnerId('');
    setUserRole('owner');
    setIsProPlan(false);
    setSubscriptionExpiry('');
    setFreeEntriesUsed(0);
    setIsExpired(false);
    setStaffProfiles([]);
    router.push('/login');
  };

  const handleRenewPlan = async (planType: 'monthly' | 'yearly') => {
    if (!window.Razorpay) {
      alert('Razorpay SDK failed to load. Please check your internet connection.');
      return;
    }

    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!razorpayKey) {
      alert('Payment gateway key is not configured.');
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token;
    if (!accessToken) {
      alert('Session expired. Please log in again.');
      return;
    }

    const amount = planType === 'yearly' ? 1999 : 499;
    const daysToAdd = planType === 'yearly' ? 365 : 30;
    const description =
      planType === 'yearly'
        ? 'Yearly Subscription (365 Days)'
        : 'Monthly Subscription (30 Days)';
    const targetOwner = workspaceOwnerId || userId;

    let orderId: string | undefined;
    try {
      const orderRes = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          amount: amount * 100,
          currency: 'INR',
          planType,
        }),
      });

      if (orderRes.ok) {
        const orderData = await orderRes.json();
        orderId = orderData.orderId || orderData.id || orderData.order_id;
      }
    } catch {
      // यदि /api/razorpay/order मौजूद नहीं है तो आगे बढ़ें
    }

    const options: any = {
      key: razorpayKey,
      amount: amount * 100,
      currency: 'INR',
      name: providerName || 'ServiceMitra Pro',
      description: description,
      ...(orderId ? { order_id: orderId } : {}),
      notes: {
        planType,
        userId: targetOwner,
        userEmail,
      },
      handler: async function (response: any) {
        if (response.razorpay_payment_id) {
          try {
            const verifyRes = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id || orderId || null,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature || null,
                planType,
              }),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || !verifyData.success) {
              alert('Payment verification failed: ' + (verifyData.error || 'Unknown error'));
              return;
            }

            const nextExpiry = verifyData.subscription_expires_at || '';
            setSubscriptionExpiry(nextExpiry);
            setIsProPlan(true);
            setIsExpired(false);
            alert(
              `Payment Verified! Plan successfully renewed for ${
                daysToAdd === 365 ? '1 Year' : '30 Days'
              }${nextExpiry ? ` (Valid till ${nextExpiry})` : ''}.`
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
        color: '#0d9488',
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
        if (!applianceInfo && existingCustomer.appliance_info) {
          setApplianceInfo(existingCustomer.appliance_info);
        }
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

    let { data: profile } = await supabase
      .from('profiles')
      .select('is_pro, free_entries_used, subscription_expires_at')
      .eq('user_id', effectiveOwnerId)
      .maybeSingle();

    if (!profile) {
      const { data: createdProfile } = await supabase
        .from('profiles')
        .upsert(
          [
            {
              user_id: effectiveOwnerId,
              email: user.email,
              provider_name: 'My Service Shop',
              role: 'owner',
              is_pro: false,
              free_entries_used: 0,
            },
          ],
          { onConflict: 'user_id' }
        )
        .select('is_pro, free_entries_used, subscription_expires_at')
        .maybeSingle();

      profile = createdProfile || {
        is_pro: false,
        free_entries_used: 0,
        subscription_expires_at: null,
      };
    }

    const todayStr = getLocalDateString();
    const expiryClean = profile?.subscription_expires_at
      ? String(profile.subscription_expires_at).slice(0, 10)
      : '';
    const hasActivePro = Boolean(profile?.is_pro) && (!expiryClean || expiryClean >= todayStr);

    const currentBookingCount = bookings.length;
    const entriesUsed = Math.max(Number(profile?.free_entries_used) || 0, currentBookingCount);

    if (!hasActivePro && entriesUsed >= FREE_TRIAL_LIMIT) {
      alert(
        `Your ${FREE_TRIAL_LIMIT} free trial entries have ended. Please activate a subscription plan to continue!`
      );
      setIsProPlan(false);
      setFreeEntriesUsed(entriesUsed);
      setIsExpired(true);
      setLoading(false);
      return;
    }

    const pCost = Number(partsCost) || 0;
    const lCost = Number(labourCost) || 0;
    const enteredPrice = Number(price) || 0;
    const finalPrice = enteredPrice > 0 ? enteredPrice : pCost + lCost;

    const { error: bookingError } = await supabase.from('bookings').insert([
      {
        name,
        phone,
        appliance_info: applianceInfo.trim() || null,
        service,
        complaint_issue: complaintIssue.trim() || null,
        assigned_technician: assignedTechnician.trim() || null,
        price: finalPrice,
        parts_cost: pCost,
        labour_cost: lCost,
        payment_method: paymentMethod,
        payment_note: paymentNote.trim() || null,
        parts_used: partsUsed.trim() || null,
        amc_expiry_date: amcExpiryDate || null,
        status: 'Pending',
        next_service_date: nextServiceDate || null,
        user_id: effectiveOwnerId,
      },
    ]);

    if (bookingError) {
      alert('Samasya aayi hai: ' + bookingError.message);
    } else {
      const nextUsedCount = entriesUsed + 1;
      if (!hasActivePro) {
        await supabase
          .from('profiles')
          .update({ free_entries_used: nextUsedCount })
          .eq('user_id', effectiveOwnerId);
      }

      alert('Booking safaltapoorvak save ho gayi hai!');
      setName('');
      setPhone('');
      setApplianceInfo('');
      setComplaintIssue('');
      setAssignedTechnician('');
      setPrice('');
      setPartsCost('');
      setLabourCost('');
      setPaymentMethod('Due');
      setPaymentNote('');
      setPartsUsed('');
      setAmcExpiryDate('');
      setNextServiceDate('');
      setShowExtraBookingFields(false);
      const updatedRows = await fetchBookings(effectiveOwnerId);
      evaluateSubscriptionState(
        {
          ...profile,
          free_entries_used: Math.max(nextUsedCount, updatedRows.length),
        },
        updatedRows.length
      );
    }
    setLoading(false);
  };

  const startEditingBooking = (item: any) => {
    if (!canEditOrDeleteBooking) {
      alert('Technician role cannot edit bookings.');
      return;
    }
    setEditingBookingId(item.id);
    setEditName(item.name || '');
    setEditPhone(item.phone || '');
    setEditApplianceInfo(item.appliance_info || '');
    setEditService(item.service || 'AC Repair & Service');
    setEditComplaintIssue(item.complaint_issue || '');
    setEditAssignedTechnician(item.assigned_technician || '');
    setEditPrice(String(item.price ?? ''));
    setEditPartsCost(String(item.parts_cost ?? ''));
    setEditLabourCost(String(item.labour_cost ?? ''));
    setEditPaymentMethod(normalizePaymentMethod(item.payment_method));
    setEditPaymentNote(item.payment_note || '');
    setEditPartsUsed(item.parts_used || '');
    setEditAmcExpiryDate(item.amc_expiry_date || '');
    setEditStatus(item.status || 'Pending');
    setEditNextServiceDate(item.next_service_date || '');
  };

  const cancelEditingBooking = () => {
    setEditingBookingId(null);
    setEditName('');
    setEditPhone('');
    setEditApplianceInfo('');
    setEditService('AC Repair & Service');
    setEditComplaintIssue('');
    setEditAssignedTechnician('');
    setEditPrice('');
    setEditPartsCost('');
    setEditLabourCost('');
    setEditPaymentMethod('Due');
    setEditPaymentNote('');
    setEditPartsUsed('');
    setEditAmcExpiryDate('');
    setEditStatus('Pending');
    setEditNextServiceDate('');
  };

  const handleSaveBookingEdit = async (e: React.FormEvent, id: number) => {
    e.preventDefault();
    if (!canEditOrDeleteBooking) {
      alert('Technician role cannot edit bookings.');
      return;
    }
    const effectiveOwnerId = workspaceOwnerId || userId;
    if (!effectiveOwnerId) {
      alert('Workspace not found.');
      return;
    }

    setSavingEdit(true);

    const pCost = Number(editPartsCost) || 0;
    const lCost = Number(editLabourCost) || 0;
    const enteredPrice = Number(editPrice) || 0;
    const finalPrice = enteredPrice > 0 ? enteredPrice : pCost + lCost;

    const { error } = await supabase
      .from('bookings')
      .update({
        name: editName.trim(),
        phone: editPhone.trim(),
        appliance_info: editApplianceInfo.trim() || null,
        service: editService,
        complaint_issue: editComplaintIssue.trim() || null,
        assigned_technician: editAssignedTechnician.trim() || null,
        price: finalPrice,
        parts_cost: pCost,
        labour_cost: lCost,
        payment_method: editPaymentMethod,
        payment_note: editPaymentNote.trim() || null,
        parts_used: editPartsUsed.trim() || null,
        amc_expiry_date: editAmcExpiryDate || null,
        status: editStatus,
        next_service_date: editNextServiceDate || null,
      })
      .eq('id', id)
      .eq('user_id', effectiveOwnerId);

    if (error) {
      alert('Update error: ' + error.message);
    } else {
      cancelEditingBooking();
      await fetchBookings(effectiveOwnerId);
    }
    setSavingEdit(false);
  };

  const handleDeleteBooking = async (id: number, customerName: string) => {
    if (!canEditOrDeleteBooking) {
      alert('Technician role cannot delete bookings.');
      return;
    }
    const effectiveOwnerId = workspaceOwnerId || userId;
    if (!effectiveOwnerId) {
      alert('Workspace not found.');
      return;
    }

    const confirmed = window.confirm(`Delete booking for "${customerName}"? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingBookingId(id);
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id)
      .eq('user_id', effectiveOwnerId);

    if (error) {
      alert('Delete error: ' + error.message);
    } else {
      if (editingBookingId === id) {
        cancelEditingBooking();
      }
      await fetchBookings(effectiveOwnerId);
    }
    setDeletingBookingId(null);
  };

  const toggleStatus = async (id: number, currentStatus: string) => {
    if (!['owner', 'manager', 'receptionist', 'technician', 'super_admin'].includes(userRole)) {
      return;
    }
    const effectiveOwnerId = workspaceOwnerId || userId;
    if (!effectiveOwnerId) return;

    const newStatus = currentStatus === 'Pending' ? 'Completed' : 'Pending';
    await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', id)
      .eq('user_id', effectiveOwnerId);
    fetchBookings(effectiveOwnerId);
  };

  const escapeCsvValue = (val: any) => {
    const str = String(val ?? '');
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const handleExportCsv = () => {
    if (!canExportCsv) {
      alert('CSV export is restricted for Technician role.');
      return;
    }
    if (filteredBookings.length === 0) {
      alert('Export karne ke liye koi booking nahi hai.');
      return;
    }

    const headers = canViewRevenue
      ? [
          'Booking ID',
          'Customer Name',
          'Phone',
          'Appliance / Machine',
          'Service',
          'Complaint / Job Note',
          'Technician',
          'Parts Used',
          'Parts Cost (INR)',
          'Labour Cost (INR)',
          'AMC Expiry Date',
          'Payment Mode',
          'Payment Note',
          'Total Price (INR)',
          'Status',
          'Next Service Date',
        ]
      : [
          'Booking ID',
          'Customer Name',
          'Phone',
          'Appliance / Machine',
          'Service',
          'Complaint / Job Note',
          'Technician',
          'Parts Used',
          'AMC Expiry Date',
          'Payment Mode',
          'Payment Note',
          'Status',
          'Next Service Date',
        ];

    const rows = filteredBookings.map((item) => {
      const baseCols = [
        escapeCsvValue(item.id ?? ''),
        escapeCsvValue(item.name ?? ''),
        escapeCsvValue(item.phone ?? ''),
        escapeCsvValue(item.appliance_info || ''),
        escapeCsvValue(item.service ?? ''),
        escapeCsvValue(item.complaint_issue || ''),
        escapeCsvValue(item.assigned_technician || ''),
        escapeCsvValue(item.parts_used || ''),
      ];
      if (canViewRevenue) {
        baseCols.push(
          escapeCsvValue(Number(item.parts_cost) || 0),
          escapeCsvValue(Number(item.labour_cost) || 0)
        );
      }
      baseCols.push(
        escapeCsvValue(item.amc_expiry_date || ''),
        escapeCsvValue(normalizePaymentMethod(item.payment_method)),
        escapeCsvValue(item.payment_note || '')
      );
      if (canViewRevenue) {
        baseCols.push(escapeCsvValue(Number(item.price) || 0));
      }
      baseCols.push(
        escapeCsvValue(item.status || 'Pending'),
        escapeCsvValue(item.next_service_date || '')
      );
      return baseCols.join(',');
    });

    const csvContent = [headers.map(escapeCsvValue).join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const todayStr = getLocalDateString();
    const safeShop = (providerName || 'bookings').toLowerCase().replace(/[^a-z0-9]+/g, '-');

    link.href = url;
    link.setAttribute('download', `${safeShop}-${statusFilter.toLowerCase()}-${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const buildCallUrl = (rawPhone?: string | null) => {
    const cleanPhone = String(rawPhone || '').replace(/\D/g, '');
    if (!cleanPhone) return '';
    return `tel:${cleanPhone}`;
  };

  const buildWhatsAppUrl = (item: any) => {
    const cleanPhone = String(item.phone || '').replace(/\D/g, '');
    const waNumber = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const dueBadge = getDueBadge(item.next_service_date);
    const amountVal = Number(item.price) || 0;
    const payMode = normalizePaymentMethod(item.payment_method);

    const lines = [
      `Hello ${item.name}, thank you for choosing ${providerName}!`,
      `Service: ${item.service}${item.appliance_info ? ` (${item.appliance_info})` : ''}`,
      `Bill Amount: ₹${amountVal} (${item.status || 'Pending'} • ${payMode})`,
    ];

    if (item.assigned_technician) {
      lines.push(`Technician: ${item.assigned_technician}`);
    }

    if (item.payment_note) {
      lines.push(`Payment Note: ${item.payment_note}`);
    }

    if (item.parts_used) {
      lines.push(`Parts/Items Used: ${item.parts_used}`);
    }

    if (item.amc_expiry_date) {
      lines.push(`AMC/Warranty Valid Till: ${item.amc_expiry_date}`);
    }

    if (item.next_service_date) {
      lines.push(
        dueBadge?.isDueToday
          ? `Reminder: Your next service is DUE TODAY (${item.next_service_date}).`
          : `Next Service Date: ${item.next_service_date}`
      );
    }

    if (shopPhone) {
      lines.push(`Shop Contact: ${shopPhone}`);
    }

    lines.push('Please rate our service out of 5 stars! ⭐️');

    return `https://wa.me/${waNumber}?text=${encodeURIComponent(lines.join('\n'))}`;
  };

  const handlePrintInvoice = (item: any) => {
    if (!canBillingAndShare) {
      alert('Billing access is restricted for Technician role.');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const invoiceDate = new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const amountVal = Number(item.price) || 0;
      const pCostVal = Number(item.parts_cost) || 0;
      const lCostVal = Number(item.labour_cost) || 0;
      const statusText = item.status || 'Pending';
      const payMode = normalizePaymentMethod(item.payment_method);
      const visitCount = item.phone
        ? bookings.filter((b) => String(b.phone || '').trim() === String(item.phone).trim()).length
        : 1;

      printWindow.document.write(`
        <html>
          <head>
            <title>Shop Receipt & Invoice #${item.id ?? ''} - ${item.name}</title>
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #0f172a; background: #f1f5f9; }
              .invoice-box { max-width: 680px; margin: auto; padding: 30px; background: #ffffff; border: 1px solid #cbd5e1; border-top: 6px solid #0f766e; border-radius: 12px; }
              .top-bar { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
              .shop-title { margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; }
              .shop-badge { display: inline-block; margin-top: 6px; padding: 3px 10px; border-radius: 999px; background: #f0fdfa; color: #0f766e; border: 1px solid #99f6e4; font-size: 11px; font-weight: 700; text-transform: uppercase; }
              .meta { text-align: right; font-size: 13px; color: #334155; line-height: 1.6; }
              .grid-2 { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 20px; font-size: 13.5px; }
              .box-card { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
              .box-label { font-size: 11px; text-transform: uppercase; color: #0f766e; font-weight: 800; letter-spacing: 0.04em; margin-bottom: 8px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
              th, td { border: 1px solid #e2e8f0; padding: 11px 12px; text-align: left; font-size: 13.5px; }
              th { background: #f8fafc; font-weight: 700; color: #1e293b; }
              .pay-strip { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; font-size: 13px; margin-bottom: 16px; }
              .pay-pill { padding: 4px 10px; border-radius: 999px; font-weight: 700; font-size: 12px; }
              .total-row td { font-weight: 800; font-size: 16px; background: #f0fdfa; color: #0f172a; }
              .footer { margin-top: 22px; padding-top: 14px; border-top: 1px dashed #cbd5e1; font-size: 12px; color: #64748b; text-align: center; }
            </style>
          </head>
          <body>
            <div class="invoice-box">
              <div class="top-bar">
                <div>
                  <h2 class="shop-title">${providerName}</h2>
                  <span class="shop-badge">Official Service Bill &amp; Job Receipt</span>
                  ${shopPhone ? `<div style="font-size: 13px; color: #334155; margin-top: 8px;"><strong>Contact:</strong> ${shopPhone}</div>` : ''}
                  ${shopAddress ? `<div style="font-size: 13px; color: #475569; margin-top: 2px;"><strong>Address:</strong> ${shopAddress}</div>` : ''}
                </div>
                <div class="meta">
                  <div><strong>Bill / Job No:</strong> #${item.id ?? 'N/A'}</div>
                  <div><strong>Bill Date:</strong> ${invoiceDate}</div>
                  <div><strong>Work Status:</strong> ${statusText}</div>
                  ${item.assigned_technician ? `<div><strong>Technician:</strong> ${item.assigned_technician}</div>` : ''}
                </div>
              </div>

              <div class="grid-2">
                <div class="box-card">
                  <div class="box-label">Customer &amp; Machine</div>
                  <div><strong>Customer:</strong> ${item.name}</div>
                  <div style="margin-top: 5px;"><strong>Mobile:</strong> ${item.phone}</div>
                  <div style="margin-top: 5px;"><strong>Machine / Unit:</strong> ${item.appliance_info || 'Not Specified'}</div>
                  <div style="margin-top: 5px;"><strong>Customer Visits:</strong> ${visitCount}</div>
                </div>
                <div class="box-card">
                  <div class="box-label">Service, AMC &amp; Schedule</div>
                  <div><strong>Service Type:</strong> ${item.service}</div>
                  <div style="margin-top: 5px;"><strong>Complaint:</strong> ${item.complaint_issue || 'General Service'}</div>
                  <div style="margin-top: 5px;"><strong>Parts Used:</strong> ${item.parts_used || 'None / Standard'}</div>
                  <div style="margin-top: 5px;"><strong>AMC Expiry:</strong> ${item.amc_expiry_date || 'N/A'}</div>
                  <div style="margin-top: 5px;"><strong>Next Service:</strong> ${item.next_service_date || 'Not Scheduled'}</div>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Service / Item Description</th>
                    <th style="text-align: right;">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    pCostVal > 0 || lCostVal > 0
                      ? `
                        <tr>
                          <td>Parts / Spares (${item.parts_used || 'Standard Parts'})</td>
                          <td style="text-align: right;">₹${pCostVal}</td>
                        </tr>
                        <tr>
                          <td>Service / Labour (${item.service})</td>
                          <td style="text-align: right;">₹${lCostVal}</td>
                        </tr>
                      `
                      : `
                        <tr>
                          <td>${item.service}${item.parts_used ? ` — ${item.parts_used}` : ''}</td>
                          <td style="text-align: right;">₹${amountVal}</td>
                        </tr>
                      `
                  }
                  <tr class="total-row">
                    <td>Grand Total</td>
                    <td style="text-align: right;">₹${amountVal}</td>
                  </tr>
                </tbody>
              </table>

              <div class="pay-strip">
                <div>
                  <strong>Payment Mode:</strong>
                  <span class="pay-pill" style="background: ${
                    payMode === 'Cash' ? '#dcfce7; color: #166534;' : payMode === 'UPI' ? '#e0f2fe; color: #075985;' : '#fef3c7; color: #92400e;'
                  }">${payMode}</span>
                </div>
                <div style="color: #334155;">
                  ${item.payment_note ? `<strong>Note:</strong> ${item.payment_note}` : '<strong>Note:</strong> —'}
                </div>
              </div>

              <div class="footer">
                Thank you for visiting <strong>${providerName}</strong>. Please keep this receipt for AMC &amp; service support.
              </div>
            </div>
            <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const uniqueCustomersCount = new Set(
    bookings
      .map((item) => String(item.phone || '').trim() || String(item.name || '').trim().toLowerCase())
      .filter(Boolean)
  ).size;

  const technicianOptions = Array.from(
    new Set(
      bookings
        .map((item) => String(item.assigned_technician || '').trim())
        .filter(Boolean)
    )
  );

  const pendingCount = bookings.filter((item) => (item.status || 'Pending') === 'Pending').length;
  const completedCount = bookings.filter((item) => item.status === 'Completed').length;
  const dueTodayCount = bookings.filter((item) => Boolean(getDueBadge(item.next_service_date)?.isDueToday)).length;
  const dueSoonCount = bookings.filter((item) => Boolean(getDueBadge(item.next_service_date)?.isDueSoon)).length;
  const overdueCount = bookings.filter((item) => Boolean(getDueBadge(item.next_service_date)?.isOverdue)).length;
  const amcExpiringCount = bookings.filter((item) => isAmcExpiringSoon(item.amc_expiry_date)).length;

  const totalRevenue = bookings
    .filter((item) => item.status === 'Completed')
    .reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  const pendingAmount = bookings
    .filter((item) => (item.status || 'Pending') === 'Pending')
    .reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  const filteredBookings = bookings.filter((item) => {
    const currentStatus = item.status || 'Pending';
    const dueBadge = getDueBadge(item.next_service_date);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'DueToday'
        ? Boolean(dueBadge?.isDueToday)
        : statusFilter === 'DueSoon'
        ? Boolean(dueBadge?.isDueSoon)
        : statusFilter === 'Overdue'
        ? Boolean(dueBadge?.isOverdue)
        : statusFilter === 'AmcExpiring'
        ? isAmcExpiringSoon(item.amc_expiry_date)
        : currentStatus === statusFilter);

    const matchesTechnician =
      technicianFilter === 'all' ||
      String(item.assigned_technician || '').trim() === technicianFilter;

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(q) ||
      item.phone.includes(searchQuery) ||
      item.service.toLowerCase().includes(q) ||
      String(item.appliance_info || '').toLowerCase().includes(q) ||
      String(item.complaint_issue || '').toLowerCase().includes(q) ||
      String(item.assigned_technician || '').toLowerCase().includes(q) ||
      String(item.parts_used || '').toLowerCase().includes(q) ||
      String(item.payment_note || '').toLowerCase().includes(q) ||
      String(item.payment_method || '').toLowerCase().includes(q);
    return matchesStatus && matchesTechnician && matchesSearch;
  });

  const selectedHistoryRecords = selectedHistoryPhone
    ? bookings.filter((b) => String(b.phone || '').trim() === selectedHistoryPhone)
    : [];

  const trialEntriesCount = Math.max(freeEntriesUsed, bookings.length);
  const trialLocked = !isProPlan && (isExpired || trialEntriesCount >= FREE_TRIAL_LIMIT);

  if (authChecking) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center p-6">
        <p className="text-sm font-medium text-slate-500">Loading ServiceMitra...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 font-black text-white shadow-sm">
                SM
              </div>
              <div>
                <span className="text-lg font-extrabold tracking-tight text-slate-900">
                  ServiceMitra Pro
                </span>
                <span className="ml-2 hidden rounded-full bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-xs font-semibold text-teal-700 sm:inline-block">
                  Service Bookings &amp; Billing
                </span>
              </div>
            </div>

            <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
              <button type="button" onClick={() => scrollToSection('features')} className="hover:text-teal-700 transition">
                Features
              </button>
              <button type="button" onClick={() => scrollToSection('pricing')} className="hover:text-teal-700 transition">
                Pricing
              </button>
              <button type="button" onClick={() => scrollToSection('policies')} className="hover:text-teal-700 transition">
                Policies
              </button>
              <button type="button" onClick={() => scrollToSection('contact')} className="hover:text-teal-700 transition">
                Contact
              </button>
            </nav>

            <div className="flex items-center gap-2.5">
              <a
                href="/login"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 transition"
              >
                Login
              </a>
              <a
                href="/signup"
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700 transition shadow-sm"
              >
                Start Free Trial
              </a>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-6xl px-4 pt-12 pb-10">
          <div className="rounded-3xl border border-teal-200 bg-white p-8 shadow-sm md:p-12">
            <p className="inline-block rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1 text-xs font-semibold text-teal-700">
              For AC Repair, RO Service, Plumbing, Electrical, Carpentry &amp; Home Services
            </p>
            <h1 className="mt-5 max-w-3xl text-3xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
              Manage service bookings, customer history, invoices &amp; WhatsApp follow-ups in one place.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              ServiceMitra Pro helps service shops and technicians track pending or completed jobs, check repeat customer visits, print bills, and send WhatsApp updates effortlessly.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="/signup"
                className="rounded-xl bg-teal-600 px-7 py-3.5 text-base font-extrabold text-white shadow-sm hover:bg-teal-700 transition"
              >
                Start Free Trial →
              </a>
              <button
                type="button"
                onClick={() => scrollToSection('pricing')}
                className="rounded-xl border border-teal-300 bg-teal-50 px-6 py-3.5 text-base font-bold text-teal-800 hover:bg-teal-100 transition"
              >
                View Plans (₹499 / ₹1,999)
              </button>
              <a
                href="/login"
                className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
              >
                Already have an account? Login
              </a>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Key Features</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-teal-700">Repeat Customer History</h3>
              <p className="mt-2 text-sm text-slate-600">
                Automatically checks past visits when entering a 10-digit mobile number so you know returning customers immediately.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-emerald-700">Instant Bills &amp; Status Tracking</h3>
              <p className="mt-2 text-sm text-slate-600">
                Switch booking status between Pending and Completed, track completed revenue, and print clean service invoices.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-sky-700">WhatsApp Bill &amp; Review Sharing</h3>
              <p className="mt-2 text-sm text-slate-600">
                Send service bill details and ask customers for a 5-star review directly over WhatsApp with one click.
              </p>
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Subscription Plans</h2>
          <p className="mt-2 text-sm text-slate-600">
            Transparent pricing in INR (₹). New accounts can start with a limited free trial before upgrading.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">Monthly Plan</h3>
                  <span className="rounded-full bg-teal-50 border border-teal-200 px-3 py-1 text-xs font-semibold text-teal-700">
                    30 Days Validity
                  </span>
                </div>
                <p className="mt-4 text-4xl font-extrabold text-slate-900">
                  ₹499 <span className="text-sm font-normal text-slate-500">/ 30 days</span>
                </p>
                <ul className="mt-6 space-y-2.5 text-sm text-slate-600">
                  <li>• Unlimited service bookings &amp; customer search</li>
                  <li>• Printable service invoices &amp; revenue tracking</li>
                  <li>• One-click WhatsApp bill &amp; review share</li>
                  <li>• Support via {supportEmail}</li>
                </ul>
              </div>
              <a
                href="/login"
                className="mt-8 block w-full rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800 transition"
              >
                Login to Subscribe (₹499)
              </a>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border-2 border-teal-500 bg-white p-7 shadow-sm">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900">Yearly Plan</h3>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
                    365 Days Validity
                  </span>
                </div>
                <p className="mt-4 text-4xl font-extrabold text-slate-900">
                  ₹1,999 <span className="text-sm font-normal text-slate-500">/ 365 days</span>
                </p>
                <ul className="mt-6 space-y-2.5 text-sm text-slate-600">
                  <li>• Everything included in Monthly Plan</li>
                  <li>• Full 1-year uninterrupted subscription access</li>
                  <li>• Ideal for active service shops &amp; teams</li>
                  <li>• Support via {supportEmail}</li>
                </ul>
              </div>
              <a
                href="/login"
                className="mt-8 block w-full rounded-xl bg-teal-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-teal-700 transition"
              >
                Login to Subscribe (₹1,999)
              </a>
            </div>
          </div>
        </section>

        <section id="policies" className="mx-auto max-w-6xl px-4 py-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Policies &amp; Terms</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Review our Refund &amp; Cancellation, Privacy, and Terms of Service.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActivePolicy('refund')}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    activePolicy === 'refund'
                      ? 'bg-teal-600 text-white font-bold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Refund &amp; Cancellation
                </button>
                <button
                  type="button"
                  onClick={() => setActivePolicy('privacy')}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    activePolicy === 'privacy'
                      ? 'bg-teal-600 text-white font-bold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Privacy Policy
                </button>
                <button
                  type="button"
                  onClick={() => setActivePolicy('terms')}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    activePolicy === 'terms'
                      ? 'bg-teal-600 text-white font-bold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Terms &amp; Conditions
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm leading-relaxed text-slate-700">
              {activePolicy === 'refund' && (
                <>
                  <h3 className="text-lg font-semibold text-slate-900">Refund &amp; Cancellation Policy</h3>
                  <p>
                    <strong>No Refund After Activation:</strong> Once a subscription plan (₹499 for 30 days or ₹1,999 for 365 days) is activated on your account, payments are <strong>non-refundable</strong>.
                  </p>
                  <p>
                    <strong>Cancel Anytime:</strong> You can cancel or stop future subscription renewals anytime. Your active validity continues until the end of the current paid period.
                  </p>
                  <p>
                    <strong>Technical / Duplicate Charge Exception:</strong> If a duplicate payment occurs or a verified technical issue prevents activation, contact{' '}
                    <a href={`mailto:${supportEmail}`} className="text-teal-700 font-semibold underline">
                      {supportEmail}
                    </a>{' '}
                    with your payment ID for verification and resolution.
                  </p>
                </>
              )}

              {activePolicy === 'privacy' && (
                <>
                  <h3 className="text-lg font-semibold text-slate-900">Privacy Policy</h3>
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
                  <h3 className="text-lg font-semibold text-slate-900">Terms &amp; Conditions</h3>
                  <p>
                    By using ServiceMitra Pro, you agree to use the platform for lawful business and service record management. Subscription validity and access depend on active plan status.
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        <section id="contact" className="mx-auto max-w-6xl px-4 pt-2 pb-14">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-bold text-slate-900">Contact Us</h2>
            <p className="mt-2 text-sm text-slate-600">
              For support, billing queries, or account assistance, contact us below.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Support Email</p>
                <a href={`mailto:${supportEmail}`} className="mt-1 block text-base font-semibold text-teal-700 hover:underline">
                  {supportEmail}
                </a>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Business Location</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{businessLocation}</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-sm text-slate-600">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
            <p>© {new Date().getFullYear()} ServiceMitra Pro • {businessLocation}</p>
            <div className="flex flex-wrap items-center gap-5">
              <button
                type="button"
                onClick={() => {
                  setActivePolicy('refund');
                  scrollToSection('policies');
                }}
                className="hover:text-teal-700 transition"
              >
                Refund &amp; Cancellation
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivePolicy('privacy');
                  scrollToSection('policies');
                }}
                className="hover:text-teal-700 transition"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivePolicy('terms');
                  scrollToSection('policies');
                }}
                className="hover:text-teal-700 transition"
              >
                Terms &amp; Conditions
              </button>
              <a href={`mailto:${supportEmail}`} className="hover:text-teal-700 transition">
                {supportEmail}
              </a>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-5 md:p-8">
      {trialLocked && (
        <div className="max-w-6xl mx-auto bg-red-600 text-white text-center py-3 px-4 rounded-xl mb-6 font-bold text-sm shadow-sm flex flex-col md:flex-row justify-between items-center gap-3">
          <span>
            ⚠️ Free Trial ({FREE_TRIAL_LIMIT} entries) / Plan ended ({trialEntriesCount} entries used). Activate a plan to continue!
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleRenewPlan('monthly')}
              className="bg-white text-red-700 px-3 py-1.5 rounded-lg text-xs font-black shadow hover:bg-slate-100 transition"
            >
              Monthly (₹499)
            </button>
            <button
              onClick={() => handleRenewPlan('yearly')}
              className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-black shadow hover:bg-slate-800 transition"
            >
              Yearly (₹1999)
            </button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-8">
        <header className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-teal-600 flex items-center text-white justify-center font-black text-xl shadow-sm">
              {providerName ? providerName.charAt(0).toUpperCase() : 'V'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">{providerName}</h1>
                <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold uppercase text-teal-700">
                  {userRole}
                </span>
              </div>
              <p className="text-slate-500 text-xs md:text-sm mt-0.5">
                Logged in: <span className="text-teal-700 font-medium">{userEmail}</span>
                {shopPhone ? ` • 📞 ${shopPhone}` : ''}
                {shopAddress ? ` • 📍 ${shopAddress}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs md:text-sm">
              <p className="text-sky-700 font-bold">👥 Customers</p>
              <p className="text-slate-900 font-extrabold text-base">{uniqueCustomersCount}</p>
            </div>

            {canViewRevenue && (
              <>
                <div className="bg-amber-50/70 border border-amber-200 px-3.5 py-2 rounded-xl text-xs md:text-sm">
                  <p className="text-amber-800 font-bold">⏳ Pending Due</p>
                  <p className="text-slate-900 font-extrabold text-base">₹{pendingAmount}</p>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs md:text-sm">
                  <p className="text-emerald-800 font-bold">💰 Revenue</p>
                  <p className="text-slate-900 font-extrabold text-base">₹{totalRevenue}</p>
                </div>
              </>
            )}

            <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs md:text-sm flex items-center gap-2.5">
              <div>
                <p
                  className={
                    isProPlan
                      ? 'text-emerald-700 font-bold'
                      : trialLocked
                      ? 'text-red-700 font-bold'
                      : 'text-amber-700 font-bold'
                  }
                >
                  {isProPlan
                    ? '💎 Pro Active'
                    : trialLocked
                    ? '❌ Trial Ended'
                    : `🆓 Trial (${trialEntriesCount}/${FREE_TRIAL_LIMIT})`}
                </p>
                <p className="text-slate-500 text-[10px]">
                  {isProPlan
                    ? subscriptionExpiry
                      ? `Exp: ${subscriptionExpiry}`
                      : 'Pro Active'
                    : `Free limit: ${FREE_TRIAL_LIMIT} entries`}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleRenewPlan('monthly')}
                  className="bg-teal-50 text-teal-800 border border-teal-200 px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-teal-100 transition"
                  title="Monthly ₹499"
                >
                  ₹499
                </button>
                <button
                  onClick={() => handleRenewPlan('yearly')}
                  className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition"
                  title="Yearly ₹1999"
                >
                  ₹1999
                </button>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="bg-red-50 text-red-700 border border-red-200 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-100 transition"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm lg:col-span-1">
            <h2 className="text-lg font-bold text-slate-900 mb-4">New Booking</h2>
            {!canCreateBooking ? (
              <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-4">
                Technician role has view &amp; status update access only.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5" autoComplete="off">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:bg-white outline-none"
                  />
                  {customerPastVisits > 0 && (
                    <p className="text-emerald-700 text-[11px] mt-1 font-semibold">
                      ✨ Returning Customer! Past Visits: {customerPastVisits}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    autoComplete="off"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Machine / Appliance Info
                  </label>
                  <input
                    type="text"
                    value={applianceInfo}
                    onChange={(e) => setApplianceInfo(e.target.value)}
                    placeholder="e.g. Split AC 1.5 Ton, Kent RO"
                    autoComplete="off"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Service Type
                  </label>
                  <select
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:bg-white outline-none"
                  >
                    <option value="AC Repair & Service">AC Repair &amp; Service</option>
                    <option value="RO Service & AMC">RO Service &amp; AMC</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical Work">Electrical Work</option>
                    <option value="Carpentry">Carpentry</option>
                    <option value="Home Cleaning">Home Cleaning</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                      Service Price (₹)
                    </label>
                    <input
                      type="number"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder={
                        Number(partsCost) || Number(labourCost)
                          ? `₹${(Number(partsCost) || 0) + (Number(labourCost) || 0)}`
                          : 'Amount in ₹'
                      }
                      autoComplete="off"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(normalizePaymentMethod(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:bg-white outline-none"
                    >
                      <option value="Due">Due (Baaki)</option>
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Next Service Date
                  </label>
                  <input
                    type="date"
                    value={nextServiceDate}
                    onChange={(e) => setNextServiceDate(e.target.value)}
                    autoComplete="off"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:bg-white outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowExtraBookingFields((prev) => !prev)}
                  className="w-full flex items-center justify-between bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-xl border border-slate-200 transition"
                >
                  <span>
                    {showExtraBookingFields
                      ? '▲ Hide Job, Parts & AMC Details'
                      : '▼ More: Complaint, Technician, Parts & AMC'}
                  </span>
                </button>

                {showExtraBookingFields && (
                  <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Complaint / Job Card Issue
                      </label>
                      <input
                        type="text"
                        value={complaintIssue}
                        onChange={(e) => setComplaintIssue(e.target.value)}
                        placeholder="e.g. Low cooling, water leakage"
                        autoComplete="off"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:border-teal-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Assign Technician
                      </label>
                      <input
                        type="text"
                        list="technician-suggestions"
                        value={assignedTechnician}
                        onChange={(e) => setAssignedTechnician(e.target.value)}
                        placeholder="Technician name or email"
                        autoComplete="off"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:border-teal-600 outline-none"
                      />
                      <datalist id="technician-suggestions">
                        {technicianOptions.map((tech) => (
                          <option key={tech} value={tech} />
                        ))}
                      </datalist>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                          Parts Cost (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={partsCost}
                          onChange={(e) => setPartsCost(e.target.value)}
                          placeholder="0"
                          autoComplete="off"
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-teal-600 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                          Labour Charge (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={labourCost}
                          onChange={(e) => setLabourCost(e.target.value)}
                          placeholder="0"
                          autoComplete="off"
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-teal-600 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Parts / Items Used
                      </label>
                      <input
                        type="text"
                        value={partsUsed}
                        onChange={(e) => setPartsUsed(e.target.value)}
                        placeholder="e.g. RO Membrane, Filter, Gas Refill"
                        autoComplete="off"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:border-teal-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        AMC / Warranty Expiry Date
                      </label>
                      <input
                        type="date"
                        value={amcExpiryDate}
                        onChange={(e) => setAmcExpiryDate(e.target.value)}
                        autoComplete="off"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:border-teal-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Payment / Pending Note
                      </label>
                      <input
                        type="text"
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                        placeholder="e.g. ₹200 due tomorrow, Paid via GPay"
                        autoComplete="off"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:border-teal-600 outline-none"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || trialLocked}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  {loading
                    ? 'Saving...'
                    : trialLocked
                    ? 'Trial Ended — Activate Plan'
                    : 'Confirm & Save Booking'}
                </button>
              </form>
            )}
          </div>

          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm lg:col-span-2 space-y-5">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Search by name, phone, machine, complaint, technician or parts..."
                autoComplete="off"
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:border-teal-600 focus:bg-white outline-none"
              />

              {technicianOptions.length > 0 && (
                <select
                  value={technicianFilter}
                  onChange={(e) => setTechnicianFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-3 text-xs font-semibold text-slate-800 focus:border-teal-600 outline-none"
                >
                  <option value="all">All Technicians</option>
                  {technicianOptions.map((tech) => (
                    <option key={tech} value={tech}>
                      {tech}
                    </option>
                  ))}
                </select>
              )}

              {canExportCsv && (
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 px-4 py-3 rounded-xl text-xs font-bold whitespace-nowrap transition"
                >
                  ⬇️ Export CSV ({filteredBookings.length})
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === 'all'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                }`}
              >
                All ({bookings.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Pending')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === 'Pending'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                ⏳ Pending ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Completed')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === 'Completed'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                ✅ Completed ({completedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('DueToday')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === 'DueToday'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                }`}
              >
                🔴 Due Today ({dueTodayCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('DueSoon')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === 'DueSoon'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100'
                }`}
              >
                🔵 Due Soon ({dueSoonCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('Overdue')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === 'Overdue'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-red-50 text-red-800 border border-red-200 hover:bg-red-100'
                }`}
              >
                ⚠️ Overdue ({overdueCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('AmcExpiring')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === 'AmcExpiring'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
                }`}
              >
                🛡️ AMC Expiring ({amcExpiringCount})
              </button>
            </div>

            {selectedHistoryPhone && (
              <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-teal-900">
                    📜 Service History — {selectedHistoryPhone} ({selectedHistoryRecords.length} visits)
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedHistoryPhone(null)}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Close ✕
                  </button>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selectedHistoryRecords.map((rec, i) => (
                    <div
                      key={rec.id || i}
                      className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 flex flex-wrap justify-between gap-2"
                    >
                      <span className="text-slate-900 font-semibold">
                        {rec.service}
                        {rec.appliance_info ? ` (${rec.appliance_info})` : ''}
                      </span>
                      <span className="text-slate-600">
                        {rec.status || 'Pending'}
                        {canViewRevenue ? ` • ₹${rec.price || 0}` : ''}
                        {rec.next_service_date ? ` • Next: ${rec.next_service_date}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {filteredBookings.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">Koi matching booking nahi mili.</p>
              ) : (
                filteredBookings.map((item, index) => {
                  const dueBadge = getDueBadge(item.next_service_date);
                  const amcAlert = isAmcExpiringSoon(item.amc_expiry_date);
                  const isEditing = editingBookingId === item.id;
                  const payMode = normalizePaymentMethod(item.payment_method);
                  const callHref = buildCallUrl(item.phone);
                  const phoneKey = String(item.phone || '').trim();
                  const totalCustomerVisits = phoneKey
                    ? bookings.filter((b) => String(b.phone || '').trim() === phoneKey).length
                    : 1;
                  const isCompleted = item.status === 'Completed';

                  if (isEditing) {
                    return (
                      <form
                        key={item.id || index}
                        onSubmit={(e) => handleSaveBookingEdit(e, item.id)}
                        className="bg-slate-50 border-2 border-teal-500 p-4 rounded-xl space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase text-teal-800">
                            Edit Booking #{item.id}
                          </span>
                          <button
                            type="button"
                            onClick={cancelEditingBooking}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                          >
                            Cancel
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            required
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Customer Name"
                            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                          />
                          <input
                            type="tel"
                            required
                            maxLength={10}
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            placeholder="10-digit Phone"
                            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                          />
                          <input
                            type="text"
                            value={editApplianceInfo}
                            onChange={(e) => setEditApplianceInfo(e.target.value)}
                            placeholder="Machine / Appliance Info"
                            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                          />
                          <select
                            value={editService}
                            onChange={(e) => setEditService(e.target.value)}
                            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                          >
                            <option value="AC Repair & Service">AC Repair &amp; Service</option>
                            <option value="RO Service & AMC">RO Service &amp; AMC</option>
                            <option value="Plumbing">Plumbing</option>
                            <option value="Electrical Work">Electrical Work</option>
                            <option value="Carpentry">Carpentry</option>
                            <option value="Home Cleaning">Home Cleaning</option>
                          </select>
                          <input
                            type="text"
                            value={editComplaintIssue}
                            onChange={(e) => setEditComplaintIssue(e.target.value)}
                            placeholder="Complaint / Job Card Issue"
                            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                          />
                          <input
                            type="text"
                            value={editAssignedTechnician}
                            onChange={(e) => setEditAssignedTechnician(e.target.value)}
                            placeholder="Assigned Technician"
                            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                          />
                          <input
                            type="number"
                            min="0"
                            value={editPartsCost}
                            onChange={(e) => setEditPartsCost(e.target.value)}
                            placeholder="Parts Cost (₹)"
                            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                          />
                          <input
                            type="number"
                            min="0"
                            value={editLabourCost}
                            onChange={(e) => setEditLabourCost(e.target.value)}
                            placeholder="Labour Charge (₹)"
                            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                          />
                          <input
                            type="number"
                            required
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            placeholder="Total Amount (₹)"
                            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                          />
                          <select
                            value={editPaymentMethod}
                            onChange={(e) => setEditPaymentMethod(normalizePaymentMethod(e.target.value))}
                            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                          >
                            <option value="Due">Due (Baaki / Pending)</option>
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                          </select>
                          <input
                            type="text"
                            value={editPaymentNote}
                            onChange={(e) => setEditPaymentNote(e.target.value)}
                            placeholder="Payment / Pending Note"
                            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                          />
                          <input
                            type="text"
                            value={editPartsUsed}
                            onChange={(e) => setEditPartsUsed(e.target.value)}
                            placeholder="Parts / Items Used"
                            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                          />
                          <input
                            type="date"
                            value={editAmcExpiryDate}
                            onChange={(e) => setEditAmcExpiryDate(e.target.value)}
                            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                          />
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Completed">Completed</option>
                          </select>
                          <input
                            type="date"
                            value={editNextServiceDate}
                            onChange={(e) => setEditNextServiceDate(e.target.value)}
                            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={cancelEditingBooking}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 text-slate-800 hover:bg-slate-300"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={savingEdit}
                            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                          >
                            {savingEdit ? 'Saving...' : 'Save Changes'}
                          </button>
                        </div>
                      </form>
                    );
                  }

                  return (
                    <div
                      key={item.id || index}
                      className="bg-white border border-slate-200 hover:border-slate-300 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-base">{item.name}</h3>
                          {item.id && (
                            <span className="text-[11px] font-semibold text-slate-500">
                              #{item.id}
                            </span>
                          )}
                          {dueBadge && (
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${dueBadge.className}`}>
                              {dueBadge.label}
                            </span>
                          )}
                          {item.amc_expiry_date && (
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                amcAlert
                                  ? 'bg-purple-100 text-purple-800 border-purple-300'
                                  : 'bg-purple-50 text-purple-700 border-purple-200'
                              }`}
                            >
                              🛡️ AMC: {item.amc_expiry_date}
                              {amcAlert ? ' (Expiring)' : ''}
                            </span>
                          )}
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              payMode === 'Cash'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : payMode === 'UPI'
                                ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            💳 {payMode}
                          </span>
                        </div>

                        <p className="text-slate-600 text-xs">
                          📞 {item.phone}
                          {item.appliance_info ? ` • 🖥️ ${item.appliance_info}` : ''}
                          {canViewRevenue ? ` • 💵 ₹${item.price || 0}` : ''}
                        </p>

                        {(item.complaint_issue || item.assigned_technician) && (
                          <p className="text-slate-700 text-xs">
                            {item.complaint_issue ? `🔧 ${item.complaint_issue}` : ''}
                            {item.complaint_issue && item.assigned_technician ? ' • ' : ''}
                            {item.assigned_technician ? `👷 ${item.assigned_technician}` : ''}
                          </p>
                        )}

                        {item.parts_used && (
                          <p className="text-teal-800 text-xs font-medium">
                            🛠️ Parts: {item.parts_used}
                            {canViewRevenue && (Number(item.parts_cost) > 0 || Number(item.labour_cost) > 0)
                              ? ` (Parts ₹${Number(item.parts_cost) || 0} + Labour ₹${Number(item.labour_cost) || 0})`
                              : ''}
                          </p>
                        )}

                        {item.payment_note && (
                          <p className="text-amber-800 text-xs font-medium">
                            📝 Note: {item.payment_note}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1 rounded-full text-xs font-semibold">
                          {item.service}
                        </span>

                        {phoneKey && totalCustomerVisits > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedHistoryPhone(selectedHistoryPhone === phoneKey ? null : phoneKey)
                            }
                            className="bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold transition"
                          >
                            📜 {totalCustomerVisits} Visits
                          </button>
                        )}

                        {callHref && (
                          <a
                            href={callHref}
                            className="bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100 px-3 py-1 rounded-full text-xs font-bold transition"
                          >
                            📞 Call
                          </a>
                        )}

                        <button
                          onClick={() => toggleStatus(item.id, item.status)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {isCompleted ? '✅ Completed' : '⏳ Pending'}
                        </button>

                        {canBillingAndShare && (
                          <>
                            <button
                              onClick={() => handlePrintInvoice(item)}
                              className="bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 px-3 py-1 rounded-full text-xs font-bold transition"
                            >
                              📄 Bill
                            </button>

                            <a
                              href={buildWhatsAppUrl(item)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition"
                            >
                              💬 WhatsApp
                            </a>
                          </>
                        )}

                        {canEditOrDeleteBooking && (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditingBooking(item)}
                              className="bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200 px-2.5 py-1 rounded-full text-xs font-semibold transition"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              disabled={deletingBookingId === item.id}
                              onClick={() => handleDeleteBooking(item.id, item.name)}
                              className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 px-2.5 py-1 rounded-full text-xs font-semibold transition disabled:opacity-50"
                            >
                              {deletingBookingId === item.id ? 'Deleting...' : '🗑️ Delete'}
                            </button>
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

        {canManageShopSettings && (
          <section className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Shop Settings</h2>
                <p className="text-xs text-slate-500">
                  Update your shop name, phone number, and address shown on dashboard header and printed invoices.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveShopSettings} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Shop Name
                </label>
                <input
                  type="text"
                  required
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  placeholder="Enter shop name"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:border-teal-600 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Shop Phone
                </label>
                <input
                  type="tel"
                  value={shopPhone}
                  onChange={(e) => setShopPhone(e.target.value)}
                  placeholder="Enter shop phone number"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:border-teal-600 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Shop Address
                </label>
                <input
                  type="text"
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  placeholder="Enter shop address"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:border-teal-600 focus:bg-white outline-none"
                />
              </div>

              <div className="sm:col-span-3 flex justify-end">
                <button
                  type="submit"
                  disabled={savingShopSettings}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl px-5 py-2 text-xs transition disabled:opacity-50"
                >
                  {savingShopSettings ? 'Saving...' : 'Save Shop Settings'}
                </button>
              </div>
            </form>
          </section>
        )}

        {canManageRoles && (
          <section className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Staff &amp; Roles Management</h2>
                <p className="text-xs text-slate-500">
                  Staff must sign up once first, then enter their email here to link to your shop and assign a role.
                </p>
              </div>
              <span className="text-xs text-teal-700 font-bold">
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
                className="bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:border-teal-600 focus:bg-white outline-none"
              />
              <select
                value={staffRoleInput}
                onChange={(e) => setStaffRoleInput(e.target.value as StaffAssignableRole)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:border-teal-600 focus:bg-white outline-none"
              >
                <option value="technician">technician</option>
                <option value="receptionist">receptionist</option>
                <option value="manager">manager</option>
              </select>
              <button
                type="submit"
                disabled={assigningStaff}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl px-4 py-2 text-xs transition disabled:opacity-50"
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
                      className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {prof.provider_name || 'Service Shop'}
                        </p>
                        <p className="text-xs text-slate-500">{prof.email || 'No email'}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold uppercase text-teal-800">
                          {currentRole}
                        </span>
                        <select
                          value={currentRole === 'owner' || currentRole === 'super_admin' ? 'manager' : currentRole}
                          disabled={roleSavingId === rowKey || currentRole === 'owner' || currentRole === 'super_admin'}
                          onChange={(e) => handleRoleChange(prof, e.target.value as StaffAssignableRole)}
                          className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-600 outline-none disabled:opacity-60"
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
