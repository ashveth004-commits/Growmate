import { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult 
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Leaf, LogIn, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize recaptcha verifier
    let verifier: RecaptchaVerifier | null = null;
    
    try {
      const container = document.getElementById('recaptcha-container');
      if (container) {
        verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
          'callback': () => {
            console.log('reCAPTCHA solved');
          },
          'expired-callback': () => {
            console.log('reCAPTCHA expired');
          }
        });
        
        (window as any).recaptchaVerifier = verifier;
        
        // Render it once to ensure it's ready
        verifier.render().catch(err => {
          console.error('Error rendering reCAPTCHA:', err);
        });
      }
    } catch (err) {
      console.error('Error initializing reCAPTCHA:', err);
    }

    return () => {
      if (verifier) {
        try {
          verifier.clear();
          delete (window as any).recaptchaVerifier;
        } catch (err) {
          console.error('Error clearing reCAPTCHA:', err);
        }
      }
    };
  }, [step]); // Re-initialize when step changes to ensure container is fresh if it was affected by DOM changes

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;
    
    // Sanitize input: remove spaces, dashes, parentheses
    const sanitizedNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Ensure we have a country code
    let finalNumber = sanitizedNumber;
    if (!finalNumber.startsWith('+')) {
      finalNumber = countryCode + finalNumber;
    }

    setLoading(true);
    setError(null);
    try {
      const appVerifier = (window as any).recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, finalNumber, appVerifier);
      setConfirmationResult(result);
      setStep('otp');
    } catch (err: any) {
      console.error('Phone sign in error:', err);
      if (err.code === 'auth/billing-not-enabled') {
        setError('Phone Authentication requires a Billing Account or "Identity Platform" upgrade in Firebase Console. \n\nTESTING TIP: You can use "Test Phone Numbers" in Firebase Console for free without billing.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Phone Authentication is not enabled in your Firebase Console. Go to Authentication > Sign-in method to enable it.');
      } else if (err.code === 'auth/invalid-phone-number') {
        setError('The phone number format is invalid. Ensure it includes the selected country code and 10 digits.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. You have been temporarily blocked for security reasons. Try again later.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(`This domain is not authorized for phone login.\n\nFix: In Firebase Console > Authentication > Settings > Authorized domains, add: ${window.location.hostname}`);
      } else {
        setError(err.message || 'Failed to send OTP.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !confirmationResult) return;

    setLoading(true);
    setError(null);
    try {
      const result = await confirmationResult.confirm(otp);
      const user = result.user;

      // Check/create user in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          phoneNumber: user.phoneNumber,
          role: 'user',
          createdAt: new Date().toISOString()
        });
      }

      navigate('/');
    } catch (err: any) {
      console.error('OTP verification error:', err);
      setError('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    // Set a flag in localStorage to indicate guest mode
    localStorage.setItem('isGuest', 'true');
    // We can't easily mock auth.currentUser globally without more complex state,
    // so we'll just navigate and handle it in ProtectedRoute
    navigate('/');
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Force account selection to help with some session issues
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: 'user',
          createdAt: new Date().toISOString()
        });
      }

      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      let message = 'An unexpected error occurred. Please try again.';
      const errorCode = err.code || 'unknown';
      
      if (err.code === 'auth/popup-blocked') {
        message = 'The login popup was blocked. Please allow popups for this site in your browser settings (usually an icon in the address bar).';
      } else if (err.code === 'auth/popup-closed-by-user') {
        message = 'The login window was closed before completion. Please try again and complete the sign-in in the popup.';
      } else if (err.code === 'auth/unauthorised-domain' || err.code === 'auth/unauthorized-domain') {
        message = `This domain is not authorized for login.\n\nFix: In Firebase Console > Authentication > Settings > Authorized domains, add: ${window.location.hostname}`;
      } else if (err.message?.includes('cross-origin')) {
        message = 'Cross-origin error detected. This usually happens when third-party cookies are blocked or the environment restricts popups.';
      } else if (err.code === 'auth/network-request-failed') {
        message = 'Network error. Please check your internet connection and ensure Firebase is correctly configured.';
      } else if (err.code === 'auth/operation-not-allowed') {
        message = 'Google sign-in is not enabled. Go to Firebase Console > Authentication > Sign-in method and enable Google.';
      }
      
      setError(`${message} (Error Code: ${errorCode})`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9f8] flex items-center justify-center p-4 selection:bg-green-100">
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:32px_32px] opacity-40"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[1000px] w-full bg-white rounded-[2.5rem] shadow-2xl shadow-stone-200/50 flex flex-col md:flex-row overflow-hidden relative z-10"
      >
        {/* Left Side: Visual/Branding */}
        <div className="hidden md:flex md:w-1/2 bg-[#f0f2f0] p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-100/50 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-50 rounded-full blur-3xl -ml-32 -mb-32"></div>
          
          <div className="relative z-10">
            <img src="/logo.png" alt="GrowMate Logo" className="w-20 h-20 mb-8 rounded-2xl shadow-lg shadow-green-900/10" />
            <h2 className="text-4xl font-bold text-stone-900 tracking-tight leading-tight mb-4">
              Nurture your plants with <span className="text-green-600">intelligence.</span>
            </h2>
            <p className="text-stone-500 text-lg leading-relaxed max-w-sm">
              Your comprehensive AI-powered companion for smarter farming and garden management.
            </p>
          </div>

          <div className="relative z-10">
            <div className="flex -space-x-3 mb-4">
              {[1, 2, 3, 4].map(i => (
                <img 
                  key={i}
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${i}`}
                  alt=""
                  className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                />
              ))}
              <div className="w-10 h-10 rounded-full bg-green-600 border-2 border-white shadow-sm flex items-center justify-center text-[10px] text-white font-bold">
                +2k
              </div>
            </div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">
              Join 2,000+ farmers growing better
            </p>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="flex-1 p-8 md:p-16 flex flex-col justify-center bg-white">
          <div className="md:hidden flex flex-col items-center mb-8">
            <img src="/logo.png" alt="GrowMate Logo" className="w-16 h-16 mb-4 rounded-xl shadow-lg shadow-green-900/5" />
            <h1 className="text-2xl font-bold text-stone-900">GrowMate</h1>
          </div>

          <div className="mb-10">
            <h3 className="text-2xl font-bold text-stone-900 mb-2">Welcome Back</h3>
            <p className="text-stone-500 font-medium">Log in to manage your green space</p>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-medium flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-left">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-4 bg-white text-stone-900 border border-stone-100 py-4 rounded-2xl font-bold hover:bg-stone-50 hover:shadow-lg hover:shadow-stone-200/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-sm text-sm"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="" />
              Sign in with Google
            </button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-stone-100"></div>
              <span className="flex-shrink mx-4 text-xs font-bold text-stone-300 uppercase tracking-[0.2em]">or</span>
              <div className="flex-grow border-t border-stone-100"></div>
            </div>

            {step === 'phone' ? (
              <form onSubmit={handlePhoneSignIn} className="space-y-4">
                <div className="flex gap-2">
                  <select 
                    className="w-24 px-3 py-4 rounded-2xl border border-stone-100 focus:border-green-500 outline-none bg-stone-50 text-stone-600 font-bold text-sm transition-all"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                  >
                    <option value="+91">+91</option>
                    <option value="+1">+1</option>
                    <option value="+44">+44</option>
                  </select>
                  <input
                    type="tel"
                    placeholder="Enter Phone Number"
                    className="flex-1 px-5 py-4 rounded-2xl border border-stone-100 focus:border-green-500 focus:ring-4 focus:ring-green-500/5 outline-none transition-all text-stone-900 font-bold bg-stone-50"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !phoneNumber}
                  className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-stone-900/10"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Get OTP Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="text-center mb-6">
                  <p className="text-sm font-bold text-stone-400 mb-1">ENTER VERIFICATION CODE</p>
                  <p className="text-xs text-stone-500">Sent to {countryCode} {phoneNumber}</p>
                </div>
                <input
                  type="text"
                  placeholder="000 000"
                  maxLength={6}
                  className="w-full px-5 py-4 rounded-2xl border border-stone-100 focus:border-green-500 focus:ring-4 focus:ring-green-500/5 outline-none transition-all text-stone-900 font-black text-center tracking-[0.5em] text-2xl bg-stone-50"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-green-600/20"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Verify Code'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="w-full text-sm font-bold text-stone-400 hover:text-stone-600 transition-colors"
                >
                  Back to Phone Login
                </button>
              </form>
            )}

            <div id="recaptcha-container"></div>

            <button
              onClick={handleGuestLogin}
              className="w-full py-4 rounded-2xl font-bold text-green-700 bg-green-50 hover:bg-green-100/80 transition-all border border-green-100 mt-4 flex items-center justify-center gap-2"
            >
              Explore as Guest
            </button>
          </div>

          <div className="mt-12 pt-8 border-t border-stone-50 text-center">
            <p className="text-[10px] font-bold text-stone-300 uppercase tracking-[0.4em] mb-2">
              AN ASHVETH CREATION
            </p>
            <p className="text-[10px] text-stone-400">
              GrowMate &copy; 2024. All rights reserved.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
