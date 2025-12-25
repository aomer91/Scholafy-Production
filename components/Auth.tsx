import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export const Auth = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [yearGroup, setYearGroup] = useState('');
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            name,
                            year_group: parseInt(yearGroup),
                        }
                    }
                });
                if (error) throw error;
                setMessage({ type: 'success', text: 'Check your email for the confirmation link!' });
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                navigate('/select-profile');
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'An error occurred' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-scholafy-card/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-white mb-2">
                        {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="text-scholafy-muted text-sm">
                        {mode === 'signin' ? 'Sign in to access your dashboard' : 'Sign up to get started'}
                    </p>
                </div>

                {message && (
                    <div className={`p-4 rounded-xl mb-6 text-sm font-medium ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    {mode === 'signup' && (
                        <>
                            <div>
                                <label className="block text-xs font-medium text-scholafy-muted mb-1.5 ml-1">Student Name</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-scholafy-accent/50 focus:border-transparent transition-all"
                                    placeholder="e.g. Shakir"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-scholafy-muted mb-1.5 ml-1">Year Group</label>
                                <select
                                    required
                                    value={yearGroup}
                                    onChange={(e) => setYearGroup(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-scholafy-accent/50 focus:border-transparent transition-all appearance-none"
                                >
                                    <option value="" disabled className="text-gray-500">Select Year...</option>
                                    {[1, 2, 3, 4, 5, 6].map(y => (
                                        <option key={y} value={y} className="bg-scholafy-navy text-white">Year {y}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-xs font-medium text-scholafy-muted mb-1.5 ml-1">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-scholafy-accent/50 focus:border-transparent transition-all"
                            placeholder="name@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-scholafy-muted mb-1.5 ml-1">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-scholafy-accent/50 focus:border-transparent transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-scholafy-accent hover:bg-scholafy-accent/90 text-scholafy-navy font-bold py-3.5 rounded-xl transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {loading ? 'Processing...' : (mode === 'signin' ? 'Sign In' : 'Sign Up')}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-scholafy-muted text-sm">
                        {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
                        <button
                            onClick={() => {
                                setMode(mode === 'signin' ? 'signup' : 'signin');
                                setMessage(null);
                            }}
                            className="text-scholafy-accent hover:underline font-medium"
                        >
                            {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};
