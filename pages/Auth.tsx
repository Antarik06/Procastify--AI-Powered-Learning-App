import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../firebaseConfig';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    updateProfile
} from 'firebase/auth';
import { StorageService } from '../services/storageService';
import {
    Mail, Lock, User, ArrowRight, Loader2,
    Sparkles, Brain, Rocket, Globe, ChevronLeft
} from 'lucide-react';

interface AuthPageProps {
    onLoginSuccess: () => void;
    onGuestAccess: () => void;
    onBack?: () => void;
}

const backgrounds = [
    { icon: Brain, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', label: "Master New Skills" },
    { icon: Rocket, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', label: "Boost Productivity" },
    { icon: Globe, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: "Learn Anywhere" },
];

const Auth: React.FC<AuthPageProps> = ({ onLoginSuccess, onGuestAccess, onBack }) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form State
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Unique Visual State: Avatar Seed
    const [avatarSeed, setAvatarSeed] = useState(Math.random().toString());

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            // Profile checks are handled in App.tsx typically, but onLoginSuccess triggers view change
            onLoginSuccess();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Google login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;
        if (isSignUp && (!firstName || !lastName)) return;

        const fullName = `${firstName} ${lastName}`.trim();

        setLoading(true);
        setError('');

        try {
            if (isSignUp) {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const avatarUrl = `https://api.dicebear.com/7.x/notionists/svg?seed=${fullName}`;

                // Explicitly update profile with Name and Avatar
                await updateProfile(userCredential.user, {
                    displayName: fullName,
                    photoURL: avatarUrl
                });

                // Pre-create profile in Firestore to ensure data consistency
                await StorageService.saveUserProfile({
                    id: userCredential.user.uid,
                    name: fullName,
                    email: email,
                    avatarUrl: avatarUrl,
                    isGuest: false,
                    freeTimeHours: 2,
                    energyPeak: 'morning',
                    goal: 'Productivity',
                    distractionLevel: 'medium'
                });
            } else {
                await signInWithEmailAndPassword(auth, email, password);
                onLoginSuccess();
            }
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError('Invalid email or password. Please check your credentials or Sign Up if you are new.');
            } else {
                setError(err.message || 'Authentication failed');
            }
        } finally {
            setLoading(false);
        }
    };

    // Animation Variants
    const pageTransition = {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 }
    };

    return (
        <div className="min-h-screen w-full bg-[#1e1f22] flex overflow-hidden relative">
            {/* Left Panel - Visual & Interactive */}
            <div className="hidden lg:flex w-1/2 relative flex-col justify-center items-center p-12 overflow-hidden">
                {/* Background Underlay */}
                <img
                    src="https://meridianit.com.au/wp-content/uploads/2023/09/Meridian-SecurityServices-Governance-Banner.jpeg"
                    alt="Background"
                    className="absolute inset-0 w-full h-full object-cover z-0 opacity-40 mix-blend-overlay"
                />

                <div className="absolute inset-0 bg-[#5865F2]/5 z-0" />
                <div className="absolute top-0 -left-20 w-96 h-96 bg-[#5865F2]/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]" />

                <div className="relative z-10 max-w-md text-center">
                    <motion.div
                        key={isSignUp ? 'signup-art' : 'signin-art'}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="mb-8 relative"
                    >
                        {/* Unique Interaction: Dynamic Avatar Preview */}
                        <div className="w-48 h-48 mx-auto bg-white/5 rounded-full border border-white/10 flex items-center justify-center relative overflow-hidden group hover:border-[#5865F2]/50 transition-all cursor-pointer"
                            onClick={() => setAvatarSeed(Math.random().toString())}
                        >
                            <img
                                src={`https://api.dicebear.com/7.x/notionists/svg?seed=${isSignUp ? ((firstName || lastName) || avatarSeed) : 'procastify'}`}
                                alt="Avatar Preview"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-xs font-bold text-white flex items-center gap-1">
                                    <Sparkles size={12} /> Randomize
                                </span>
                            </div>
                        </div>
                    </motion.div>

                    <h2 className="text-3xl font-bold text-white mb-4">
                        {isSignUp ? "Join the Learning Revolution" : "Welcome Back, Learner"}
                    </h2>
                    <p className="text-gray-400 text-lg">
                        {isSignUp
                            ? "Create your unique profile and start conquering your study queues today."
                            : "Your personalized dashboard is ready. Let's get things done."}
                    </p>

                    {/* Feature Cards */}
                    <div className="mt-12 grid grid-cols-1 gap-4">
                        {backgrounds.map((bg, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + (idx * 0.1) }}
                                className={`p-4 rounded-xl border ${bg.border} ${bg.bg} backdrop-blur-sm flex items-center gap-4 text-left`}
                            >
                                <div className={`p-2 rounded-lg bg-white/10 ${bg.color}`}>
                                    <bg.icon size={20} />
                                </div>
                                <span className="font-bold text-white/80">{bg.label}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-24 relative z-20 bg-[#1e1f22] lg:bg-transparent">
                {onBack && (
                    <button onClick={onBack} className="absolute top-8 left-8 text-gray-400 hover:text-white flex items-center gap-2 transition-colors">
                        <ChevronLeft size={20} /> Back
                    </button>
                )}

                <div className="w-full max-w-sm">
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-white mb-2 font-mono">Procastify-AI</h1>
                        <p className="text-gray-400">
                            {isSignUp ? "Create an account" : "Sign in to your account"}
                        </p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
                        >
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleEmailAuth} className="space-y-4">
                        <AnimatePresence mode='wait'>
                            {isSignUp && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                                    animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                                    className="flex gap-2"
                                >
                                    <div className="relative group w-1/2">
                                        <User className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-[#5865F2] transition-colors" size={20} />
                                        <input
                                            type="text"
                                            placeholder="First Name"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            className="w-full bg-[#2b2d31] border border-black/20 group-focus-within:border-[#5865F2] rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none transition-all placeholder:text-gray-600"
                                            required={isSignUp}
                                        />
                                    </div>
                                    <div className="relative group w-1/2">
                                        <User className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-[#5865F2] transition-colors" size={20} />
                                        <input
                                            type="text"
                                            placeholder="Last Name"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            className="w-full bg-[#2b2d31] border border-black/20 group-focus-within:border-[#5865F2] rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none transition-all placeholder:text-gray-600"
                                            required={isSignUp}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="relative group">
                            <Mail className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-[#5865F2] transition-colors" size={20} />
                            <input
                                type="email"
                                placeholder="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[#2b2d31] border border-black/20 group-focus-within:border-[#5865F2] rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none transition-all placeholder:text-gray-600"
                                required
                            />
                        </div>

                        <div className="relative group">
                            <Lock className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-[#5865F2] transition-colors" size={20} />
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#2b2d31] border border-black/20 group-focus-within:border-[#5865F2] rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none transition-all placeholder:text-gray-600"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-[#5865F2]/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <ArrowRight size={20} />}
                            {isSignUp ? 'Create Account' : 'Sign In'}
                        </button>
                    </form>

                    <div className="my-6 flex items-center gap-4">
                        <div className="h-px bg-white/10 flex-1" />
                        <span className="text-xs text-gray-500 uppercase font-bold">Or continue with</span>
                        <div className="h-px bg-white/10 flex-1" />
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full bg-white text-black hover:bg-gray-200 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.17c-.22-.66-.35-1.36-.35-2.17s.13-1.51.35-2.17V7.06H2.18C.79 9.85 0 12 0 12s.79 2.15 2.18 4.94l3.66-2.77z" fill="#FBBC05" />
                            <path d="M12 4.81c1.61 0 3.09.55 4.23 1.64l3.17-3.17C17.45 1.5 14.97 0 12 0 7.7 0 3.99 2.47 2.18 5.23l3.66 2.77c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Google
                    </button>

                    <p className="text-center mt-8 text-gray-400">
                        {isSignUp ? "Already have an account?" : "Don't have an account?"}
                        <button
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="ml-2 text-[#5865F2] hover:text-white font-bold transition-colors"
                        >
                            {isSignUp ? "Sign In" : "Sign Up"}
                        </button>
                    </p>

                    {!onBack && (
                        <div className="mt-8 text-center">
                            <button
                                onClick={onGuestAccess}
                                className="text-xs text-gray-500 hover:text-gray-300 underline transition-colors"
                            >
                                Continue as Guest
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Auth;