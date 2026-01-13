import React, { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ChevronLeft } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert('Errore: ' + error.message);
    } else {
      navigate('/admin'); 
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative">
      
      {/* TASTO INDIETRO */}
      <Link to="/" className="absolute top-6 left-6 text-slate-400 hover:text-white transition p-2 bg-slate-800 rounded-full">
        <ChevronLeft size={24} />
      </Link>

      <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-700 w-full max-w-sm mt-10">
        <h1 className="text-3xl font-oswald font-bold text-center text-white mb-8 tracking-wide">
          LOGIN <span className="text-fuchsia-500">ADMIN</span>
        </h1>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-slate-500" size={20} />
            <input 
              type="email" 
              placeholder="Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 text-white pl-10 p-3 rounded-xl focus:outline-none focus:border-cyan-400 transition"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3 text-slate-500" size={20} />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 text-white pl-10 p-3 rounded-xl focus:outline-none focus:border-cyan-400 transition"
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold py-3 rounded-xl font-oswald tracking-widest hover:from-cyan-500 hover:to-blue-500 transition active:scale-95 shadow-lg"
          >
            {loading ? 'ACCESSO...' : 'ENTRA'}
          </button>
        </form>
      </div>
    </div>
  );
}