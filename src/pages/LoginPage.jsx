import React, { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [isLogin, setIsLogin] = useState(true); // Modalità attiva (Login o Registrazione)
  
  const navigate = useNavigate();
  const location = useLocation();

  // RECUPERA LA MEMORIA DELLA PAGINA PRECEDENTE
  const from = location.state?.from || '/';

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    
    if (isLogin) {
      // --- LOGICA DI ACCESSO (LOGIN) ---
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError("Email o password errati");
        setLoading(false);
      } else {
        navigate(from, { replace: true });
      }

    } else {
      // --- LOGICA DI REGISTRAZIONE ---
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('already registered')) {
          setError("Esiste già un account con questa email.");
        } else {
          setError("La password deve contenere almeno 6 caratteri.");
        }
        setLoading(false);
      } else {
        // Controllo di sicurezza di Supabase (se l'email esiste ma non lancia un errore esplicito)
        if (data?.user && data.user.identities && data.user.identities.length === 0) {
          setError("Esiste già un account con questa email.");
          setLoading(false);
        } else {
          setMessage("Registrazione completata con successo!");
          // Se la conferma email è disattivata su Supabase, entrerà automaticamente
          setTimeout(() => {
            navigate(from, { replace: true });
          }, 1500);
        }
      }
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setMessage(null);
    setPassword('');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-700 transition-all">
        
        <div className="flex justify-center mb-6">
          <div className={`p-4 rounded-full transition-colors ${isLogin ? 'bg-cyan-500/20' : 'bg-fuchsia-500/20'}`}>
            {isLogin ? <LogIn size={40} className="text-cyan-400" /> : <UserPlus size={40} className="text-fuchsia-400" />}
          </div>
        </div>
        
        <h2 className="text-2xl font-black font-oswald tracking-widest text-white text-center mb-6 uppercase">
          {isLogin ? 'Login' : 'Registrati'}
        </h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm text-center font-bold">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-lime-500/10 border border-lime-500/50 text-lime-400 p-3 rounded-lg mb-6 text-sm text-center font-bold">
            {message}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
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
            className={`w-full text-white font-bold py-3 px-4 rounded-lg transition-colors mt-2 uppercase font-oswald tracking-wider ${isLogin ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-fuchsia-600 hover:bg-fuchsia-500'}`}
          >
            {loading ? 'Elaborazione in corso...' : (isLogin ? 'Entra' : 'Crea Account')}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-700 pt-6">
          <p className="text-slate-400 text-sm">
            {isLogin ? "Non hai ancora un account? " : "Hai già un account? "}
            <button 
              onClick={toggleMode} 
              className={`font-bold hover:underline transition-colors ${isLogin ? 'text-cyan-400' : 'text-fuchsia-400'}`}
            >
              {isLogin ? "Registrati" : "Effettua il Login"}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}