import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Leaf, LogIn } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
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
    } catch (error) {
      console.error('Login error:', error);
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

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-stone-900 text-white py-4 rounded-2xl font-semibold hover:bg-stone-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
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

        <p className="mt-8 text-xs text-stone-400">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}
