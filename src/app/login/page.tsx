'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser } from '../actions/auth';
import { toast } from 'sonner';

const credentials = [
  { role: 'Admin', phone: '+250788123456', password: 'admin123', color: 'bg-amber-100 border-amber-300 text-amber-900' },
  { role: 'Employee', phone: '+250788123457', password: 'john123', color: 'bg-orange-100 border-orange-300 text-orange-900' },
  { role: 'Employee', phone: '+250788123458', password: 'jane123', color: 'bg-orange-100 border-orange-300 text-orange-900' },
];

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('phoneNumber', phoneNumber);
      formData.append('password', password);
      const result = await loginUser(formData);
      if (result.success) {
        toast.success('Login successful!');
        router.push('/dashboard');
      } else {
        toast.error(result.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (phone: string, pass: string) => {
    setPhoneNumber(phone);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen flex bg-gray-950">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-amber-900 via-amber-800 to-orange-900 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 text-[180px] leading-none">🍺</div>
          <div className="absolute bottom-20 right-10 text-[140px] leading-none">🍻</div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[220px] leading-none">🍾</div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">🍺</span>
            <span className="text-white font-bold text-2xl tracking-wide">BarStock</span>
          </div>
          <p className="text-amber-200 text-sm">Bar Inventory Management</p>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Manage your bar<br />stock with ease
          </h1>
          <p className="text-amber-200 text-base leading-relaxed">
            Track every bottle, every sale, every purchase order — from opening to closing, all in one place.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              { icon: '📦', label: 'Stock Tracking' },
              { icon: '🧾', label: 'Purchase Orders' },
              { icon: '💳', label: 'Credit Sales' },
              { icon: '📊', label: 'Daily Reports' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-amber-100">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-amber-300 text-xs">
          © {new Date().getFullYear()} BarStock — All rights reserved
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12 bg-gray-950">
        <div className="w-full max-w-md space-y-8">

          {/* Mobile logo */}
          <div className="lg:hidden text-center">
            <span className="text-5xl">🍺</span>
            <h1 className="text-white font-bold text-2xl mt-2">BarStock</h1>
            <p className="text-gray-400 text-sm">Bar Inventory Management</p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white">Welcome back</h2>
            <p className="text-gray-400 text-sm mt-1">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                placeholder="+250788123456"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-gray-950"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Test credentials */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Test Credentials — click to fill
            </p>
            <div className="space-y-2">
              {credentials.map((cred) => (
                <button
                  key={cred.phone}
                  type="button"
                  onClick={() => fillCredentials(cred.phone, cred.password)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-900 border border-gray-800 hover:border-amber-700 rounded-lg transition group"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cred.color}`}>
                      {cred.role}
                    </span>
                    <span className="text-gray-300 text-sm font-mono">{cred.phone}</span>
                  </div>
                  <span className="text-gray-600 text-xs font-mono group-hover:text-amber-500 transition">
                    {cred.password}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
