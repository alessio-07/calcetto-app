import React, { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  // RECUPERA LA MEMORIA DELLA PAGINA PRECEDENTE
  // Se arrivi premendo il tasto da "/stats", from sarà "/stats". Se arrivi direttamente, sarà "/" (Home).
  const from = location.state?.from || '/';

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Email o password errati");
      setLoading(false);
    } else {
      // REINDIRIZZAMENTO INTELLIGENTE!
      // Invece di mandarti forzatamente su /admin, ti rimanda da dove venivi.
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-700">
        
        <div className="flex justify-center mb-6">
          <div className="bg-cyan-500/20 p-4 rounded-full">
            <LogIn size={40} className="text-cyan-400" />
          </div>
        </div>
        
        {/* TITOLO AGGIORNATO (Senza "Admin") */}
        <h2 className="text-2xl font-black font-oswald tracking-widest text-white text-center mb-6 uppercase">
          Login
        </h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm text-center font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-slate-400 text-sm font-bold mb-2 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-cyan-400 transition"
              placeholder="La tua email..."
              required
            />
          </div>
          <div>
            <label className="block text-slate-400 text-sm font-bold mb-2 uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-cyan-400 transition"
              placeholder="La tua password..."
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-lg transition-colors mt-2 uppercase font-oswald tracking-wider"
          >
            {loading ? 'Accesso in corso...' : 'Entra'}
          </button>
        </form>
      </div>
    </div>
  );
}