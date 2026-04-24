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
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-stone-200/50 p-8 md:p-12 text-center"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-600 rounded-2xl mb-8 shadow-lg shadow-green-200">
          <Leaf className="text-white w-10 h-10" />
        </div>
        
        <h1 className="text-3xl font-bold text-stone-900 mb-2">GrowMate</h1>
        <p className="text-stone-500 mb-10 leading-relaxed">
          Your personal AI-powered plant care assistant. Manage, track, and grow your plants with ease.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-left">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-stone-900 border border-stone-200 py-4 rounded-2xl font-semibold hover:bg-stone-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            Continue with Google
          </button>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-stone-400 font-bold tracking-widest">Or Phone Number</span>
            </div>
          </div>

          {step === 'phone' ? (
            <form onSubmit={handlePhoneSignIn} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <div className="flex gap-2">
                   <select 
                    className="w-24 px-3 py-4 rounded-2xl border border-stone-200 focus:border-green-500 outline-none bg-stone-50 text-stone-600 font-bold text-sm"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                  >
                    <option value="+91">+91 (IN)</option>
                    <option value="+1">+1 (US)</option>
                    <option value="+44">+44 (UK)</option>
                    <option value="+61">+61 (AU)</option>
                    <option value="+971">+971 (AE)</option>
                    <option value="+65">+65 (SG)</option>
                    <option value="+49">+49 (DE)</option>
                    <option value="+33">+33 (FR)</option>
                    <option value="+81">+81 (JP)</option>
                    <option value="+86">+86 (CN)</option>
                    <option value="+7">+7 (RU)</option>
                    <option value="+55">+55 (BR)</option>
                  </select>
                  <input
                    type="tel"
                    placeholder="Mobile Number"
                    className="flex-1 px-5 py-4 rounded-2xl border border-stone-200 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all text-stone-900 font-medium"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                </div>
                <p className="text-[10px] text-stone-400 font-medium ml-2">
                  Enter number without country code. <span className="text-green-600 font-bold">Note:</span> Test numbers won't receive a real SMS.
                </p>
              </div>
              <button
                type="submit"
                disabled={loading || !phoneNumber}
                className="w-full bg-stone-900 text-white py-4 rounded-2xl font-semibold hover:bg-stone-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-left ml-1">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Verification Code</p>
                <p className="text-sm text-stone-600 mb-2">Sent to {phoneNumber}</p>
                <p className="text-[10px] text-green-600 font-bold mb-4">
                  For test numbers, enter the verification code you set in the Firebase Console.
                </p>
              </div>
              <input
                type="text"
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="w-full px-5 py-4 rounded-2xl border border-stone-200 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all text-stone-900 font-medium text-center tracking-[0.5em] text-xl"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full bg-green-600 text-white py-4 rounded-2xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-green-200"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Verify & Continue'}
              </button>
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="text-sm font-bold text-stone-400 hover:text-stone-600 transition-colors"
              >
                Change Phone Number
              </button>
            </form>
          )}

          <div id="recaptcha-container"></div>
        </div>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-4 text-stone-400 font-bold tracking-widest">Or try this</span>
          </div>
        </div>

        <button
          onClick={handleGuestLogin}
          className="w-full py-4 rounded-2xl font-semibold text-green-600 bg-green-50 hover:bg-green-100 transition-all border border-green-100 mb-8 flex items-center justify-center gap-2"
        >
          <Leaf className="w-5 h-5" />
          Continue as Guest (No Login Required)
        </button>

        <p className="mt-8 text-xs text-stone-400">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
        <p className="mt-6 text-[10px] font-bold text-stone-300 uppercase tracking-[0.3em]">
          an ashveth creation
        </p>
      </motion.div>
    </div>
  );
}
