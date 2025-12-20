import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import { Trophy, Home, Shield, LogIn, LogOut, UserPlus } from 'lucide-react';

// Importiamo le pagine
import StatsPage from './pages/StatsPage';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import MatchCreator from './pages/MatchCreator';

// --- HEADER ---
function Header({ session }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/'); 
    window.location.reload(); 
  };

  return (
    <header className="bg-green-600 text-white p-4 flex justify-between items-center shadow-md sticky top-0 z-50">
      <Link to="/" className="font-bold text-xl flex items-center gap-2">
        ⚽ <span className="hidden xs:inline">Calcetto App</span>
      </Link>
      
      <div>
        {session ? (
          <button onClick={handleLogout} className="flex items-center gap-1 text-sm bg-green-700 px-3 py-1.5 rounded hover:bg-green-800 transition">
            <LogOut size={16} /> Esci
          </button>
        ) : (
          <Link to="/login" className="flex items-center gap-1 text-sm bg-white text-green-700 px-3 py-1.5 rounded font-bold hover:bg-gray-100 transition">
            <LogIn size={16} /> Accedi
          </Link>
        )}
      </div>
    </header>
  );
}

// --- BOTTOM NAV ---
function BottomNav({ isAdmin }) {
  const location = useLocation();
  const hidePaths = ['/new-match', '/login'];
  const isEditing = location.pathname.includes('/edit-match');

  if (hidePaths.includes(location.pathname) || isEditing) return null;

  return (
    <nav className="fixed bottom-0 w-full bg-white border-t flex justify-around p-3 pb-5 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] z-40">
      <Link to="/" className={`flex flex-col items-center ${location.pathname === '/' ? 'text-green-600' : 'text-gray-400'}`}>
        <Home size={24} /> <span className="text-[10px] font-bold mt-1">Home</span>
      </Link>
      <Link to="/stats" className={`flex flex-col items-center ${location.pathname === '/stats' ? 'text-green-600' : 'text-gray-400'}`}>
        <Trophy size={24} /> <span className="text-[10px] font-bold mt-1">Stats</span>
      </Link>
      {isAdmin && (
        <Link to="/admin" className={`flex flex-col items-center ${location.pathname === '/admin' ? 'text-red-600' : 'text-gray-400'}`}>
          <Shield size={24} /> <span className="text-[10px] font-bold mt-1">Admin</span>
        </Link>
      )}
    </nav>
  );
}

// --- NUOVA PAGINA LOGIN & REGISTRAZIONE ---
function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // Toggle tra Login e Registrazione

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      // --- REGISTRAZIONE ---
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        alert("Errore registrazione: " + error.message);
      } else {
        alert("Registrazione completata! Ora sei loggato.");
        navigate('/'); // Vai alla home
        window.location.reload();
      }
    } else {
      // --- LOGIN ---
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        alert("Errore accesso: Credenziali sbagliate.");
      } else {
        navigate('/'); // Vai alla home
        window.location.reload();
      }
    }
    setLoading(false);
  };

  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[80vh]">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm border border-gray-100">
        <h1 className="text-2xl font-bold mb-2 text-center text-gray-800">
          {isSignUp ? 'Crea Account' : 'Bentornato'}
        </h1>
        <p className="text-gray-500 text-center mb-6 text-sm">
          {isSignUp ? 'Inserisci i dati per registrarti' : 'Accedi per gestire le partite'}
        </p>
        
        <form onSubmit={handleAuth} className="space-y-4">
          <input 
            type="email" 
            placeholder="Email" 
            required
            value={email} 
            onChange={e => setEmail(e.target.value)}
            className="border-2 border-gray-200 p-3 rounded-lg w-full focus:border-green-500 focus:outline-none transition"
          />
          <input 
            type="password" 
            placeholder="Password" 
            required
            value={password} 
            onChange={e => setPassword(e.target.value)}
            className="border-2 border-gray-200 p-3 rounded-lg w-full focus:border-green-500 focus:outline-none transition"
          />
          
          <button 
            type="submit" 
            disabled={loading} 
            className="bg-green-600 hover:bg-green-700 text-white font-bold p-3 rounded-lg w-full transition flex justify-center"
          >
            {loading ? 'Caricamento...' : (isSignUp ? 'Registrati' : 'Accedi')}
          </button>
        </form>
        
        <div className="mt-6 text-center border-t pt-4">
          <p className="text-sm text-gray-500 mb-2">
            {isSignUp ? 'Hai già un account?' : 'Non hai un account?'}
          </p>
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-green-600 font-bold hover:underline flex items-center justify-center gap-1 mx-auto"
          >
             {isSignUp ? <LogIn size={16}/> : <UserPlus size={16}/>}
             {isSignUp ? 'Vai al Login' : 'Registrati ora'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- APP PRINCIPALE ---
export default function App() {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkAdmin(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkAdmin(session.user.id);
      else setIsAdmin(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function checkAdmin(userId) {
    const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).single();
    if (data) setIsAdmin(data.is_admin);
  }

  const AccessDenied = () => <div className="p-10 text-center text-red-500">Accesso Negato. Devi essere Admin.</div>;

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 text-gray-800">
        <Header session={session} />

        <div className="pb-20"> 
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/login" element={<LoginPage />} />
            
            <Route path="/admin" element={isAdmin ? <AdminPage isAdmin={isAdmin} /> : <AccessDenied />} />
            <Route path="/new-match" element={isAdmin ? <MatchCreator /> : <AccessDenied />} />
            <Route path="/edit-match/:id" element={isAdmin ? <MatchCreator /> : <AccessDenied />} />
          </Routes>
        </div>

        <BottomNav isAdmin={isAdmin} />
      </div>
    </BrowserRouter>
  );
}