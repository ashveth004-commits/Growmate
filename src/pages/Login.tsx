import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Leaf, LogIn, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connStatus, setConnStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const navigate = useNavigate();

  const testFirebaseConnection = async () => {
    setTesting(true);
    try {
      // Try to read a non-existent doc to test connectivity
      await getDoc(doc(db, '_connection_test', 'ping'));
      setConnStatus('success');
      setTimeout(() => setConnStatus('idle'), 3000);
    } catch (err: any) {
      console.error('Connection test failed:', err);
      setConnStatus('error');
      setError(`Firebase connection failed: ${err.message}. Check your API Key and Project ID.`);
    } finally {
      setTesting(false);
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
        message = 'The login popup was blocked. Please allow popups for this site in your browser settings.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        message = 'The login window was closed before completion. Please try again and keep the window open.';
      } else if (err.code === 'auth/unauthorised-domain' || err.code === 'auth/unauthorized-domain') {
        message = 'This domain is not authorized for login in the Firebase Console.';
      } else if (err.message?.includes('cross-origin')) {
        message = 'Cross-origin error detected. This usually happens when third-party cookies are blocked.';
      } else if (err.code === 'auth/network-request-failed') {
        message = 'Network error. Please check your internet connection or Firebase configuration.';
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
        
        <h1 className="text-3xl font-bold text-stone-900 mb-2">PlantCare AI</h1>
        <p className="text-stone-500 mb-10 leading-relaxed">
          Your personal AI-powered plant care assistant. Manage, track, and grow your plants with ease.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium flex items-start gap-3 text-left">
            <div className="bg-red-100 p-1 rounded-lg mt-0.5">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="font-bold mb-1">Login failed</p>
              <p className="opacity-90 leading-relaxed">{error}</p>
              
              <div className="mt-4 pt-4 border-t border-red-100 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-red-400">Troubleshooting:</p>
                <ul className="text-xs space-y-2 list-disc ml-4 opacity-80">
                  <li>Ensure <strong>third-party cookies</strong> are enabled in your browser.</li>
                  <li>Try clicking the <strong>"Open in new tab"</strong> button at the top right of this preview.</li>
                  <li>Verify that this domain is added to <strong>Authorized Domains</strong> in your Firebase Console.</li>
                </ul>
                <div className="bg-white/50 p-2 rounded-lg border border-red-100 mt-2">
                  <p className="text-[10px] text-stone-400 mb-1 uppercase font-bold">Your App Domain:</p>
                  <code className="text-[10px] block break-all bg-stone-100 p-1 rounded select-all">
                    {window.location.hostname}
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-stone-900 text-white py-4 rounded-2xl font-semibold hover:bg-stone-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed group mb-4"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              Continue with Google
            </>
          )}
        </button>

        <button
          onClick={handleGuestLogin}
          className="w-full py-4 rounded-2xl font-semibold text-stone-600 hover:bg-stone-100 transition-all border border-stone-200 mb-8"
        >
          Continue as Guest (No Login Required)
        </button>

        <div className="flex flex-col gap-3">
          <button
            onClick={testFirebaseConnection}
            disabled={testing}
            className={cn(
              "text-xs font-bold py-2 px-4 rounded-xl transition-all border",
              connStatus === 'success' ? "bg-green-50 border-green-200 text-green-600" :
              connStatus === 'error' ? "bg-red-50 border-red-200 text-red-600" :
              "bg-stone-50 border-stone-100 text-stone-400 hover:bg-stone-100"
            )}
          >
            {testing ? 'Testing Connection...' : 
             connStatus === 'success' ? '✓ Firebase Connected' :
             connStatus === 'error' ? '✕ Connection Failed' :
             'Test Firebase Connection'}
          </button>
          
          <a 
            href={window.location.href} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs font-bold text-green-600 hover:text-green-700 py-2 px-4 rounded-xl bg-green-50 border border-green-100 transition-all text-center"
          >
            Open in New Tab (Fixes most login issues)
          </a>
        </div>

        <p className="mt-8 text-xs text-stone-400">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}
