"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth, googleProvider } from "../../lib/firebase";

export default function Login({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // ✨ NEW: Specific loading states for our buttons
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsEmailLoading(true); // Start spinning

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setLoginError("Failed to log in. Please check your credentials.");
    } finally {
      setIsEmailLoading(false); // Stop spinning
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError("");
    setIsGoogleLoading(true); // Start spinning

    try {
      await signInWithPopup(auth, googleProvider);
    } catch {
      setLoginError("Google sign-in failed.");
    } finally {
      setIsGoogleLoading(false); // Stop spinning
    }
  };

  if (authLoading) {
    // A much cleaner initial load screen (optional: replace with just a spinner)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-950 p-4 relative">
        
        {/* ✨ NEW: Top Browser-Style Loading Bar */}
        {(isEmailLoading || isGoogleLoading) && (
          <div className="absolute top-0 left-0 w-full h-1 overflow-hidden bg-gray-900">
            <div className="h-full bg-blue-500 w-1/2 animate-pulse transition-all duration-500 ease-in-out shadow-[0_0_10px_#3b82f6]" />
          </div>
        )}

        {/* CARD */}
        <div className="flex w-full max-w-4xl bg-gray-900 border border-gray-800 rounded-2xl shadow-xl overflow-hidden z-10">

          {/* LEFT IMAGE */}
          <div className="hidden md:block md:w-3/5 relative">
            <Image
              src="/fun.gif"
              alt="Energy"
              fill
              className="object-cover"
              unoptimized={true}
            />
            <div className="absolute inset-0 bg-blue-900/40" />
          </div>

          {/* RIGHT FORM */}
          <div className="w-full md:w-2/5 p-8 text-white">

            {/* LOGO */}
            <div className="flex items-center gap-3 mb-6">
              <Image
                src="/wattwise.png"
                alt="Logo"
                width={40}
                height={40}
                className="rounded"
              />
              <h1 className="text-xl font-bold text-blue-400">
                WATTWISE
              </h1>
            </div>

            <h2 className="text-lg font-semibold text-gray-100 mb-4">
              Login to your account
            </h2>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Email</label>
                <input
                  type="email"
                  value={email}
                  disabled={isEmailLoading || isGoogleLoading}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mt-1 p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-gray-400">Password</label>
                <input
                  type="password"
                  value={password}
                  disabled={isEmailLoading || isGoogleLoading}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full mt-1 p-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                  required
                />
              </div>

              {loginError && (
                <p className="text-red-400 text-sm">{loginError}</p>
              )}

              {/* ✨ UPDATED: Email Login Button with Spinner */}
              <button
                type="submit"
                disabled={isEmailLoading || isGoogleLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isEmailLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  "Log In"
                )}
              </button>
            </form>

            {/* DIVIDER */}
            <div className="flex items-center my-6">
              <div className="flex-grow border-t border-gray-700"></div>
              <span className="mx-3 text-gray-500 text-sm">OR</span>
              <div className="flex-grow border-t border-gray-700"></div>
            </div>

            {/* ✨ UPDATED: Google Login Button with Spinner */}
            <button
              onClick={handleGoogleLogin}
              type="button"
              disabled={isEmailLoading || isGoogleLoading}
              className="w-full border border-gray-700 hover:bg-gray-800 text-gray-200 py-3 rounded-lg flex items-center justify-center gap-3 transition disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isGoogleLoading ? (
                <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>
                  <Image
                    src="https://www.svgrepo.com/show/475656/google-color.svg"
                    alt="Google"
                    width={20}
                    height={20}
                  />
                  Continue with Google
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}