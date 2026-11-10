'use client';

import { useState } from 'react';
import { supabase } from '../supabase';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [providerName, setProviderName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      alert('Signup Error: ' + authError.message);
      setLoading(false);
      return;
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    const formattedExpiry = expiryDate.toISOString().split('T')[0];

    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        { 
          email, 
          provider_name: providerName, 
          subscription_expires_at: formattedExpiry 
        }
      ]);

    if (profileError) {
      alert('Profile Error: ' + profileError.message);
    } else {
      alert('Account successfully created! Please login.');
      router.push('/login');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-extrabold text-white">Join ServiceMitra Pro</h1>
          <p className="text-slate-400 text-xs">Create your vendor account & get 30 days free trial</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Shop / Business Name</label>
            <input 
              type="text" 
              required 
              value={providerName} 
              onChange={(e) => setProviderName(e.target.value)} 
              placeholder="e.g. Sharma Electricals" 
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 outline-none" 
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Email Address</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="name@example.com" 
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 outline-none" 
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Password</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••" 
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-cyan-500 outline-none" 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold py-3 rounded-xl transition shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Register Business'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">
          Already have an account? <a href="/login" className="text-cyan-400 font-semibold hover:underline">Login here</a>
        </p>
      </div>
    </main>
  );
}