'use client';

import { useState } from 'react';
import { supabase } from '../supabase';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      alert('Update Error: ' + error.message);
    } else {
      alert('Password updated successfully! Please sign in with your new password.');
      await supabase.auth.signOut();
      router.push('/login');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-extrabold text-white">Reset Password</h1>
          <p className="text-slate-400 text-xs">Enter your new password for ServiceMitra Pro</p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold py-3 rounded-xl transition shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Save New Password'}
          </button>
        </form>
      </div>
    </main>
  );
}
