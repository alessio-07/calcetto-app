import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import { Trophy, Home, Shield, LogIn, LogOut } from 'lucide-react';

// Importiamo le pagine
import StatsPage from './pages/StatsPage';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import MatchCreator from './pages/MatchCreator'; // Importiamo il creatore di partite

// --- COMPONENTE BARRA IN ALTO (HEADER) ---
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
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-1 text-sm bg-green-700 px-3 py-1.5 rounded hover:bg-green-800 transition"
          >
            <LogOut size={16} /> Esci
          </button>
        ) : (
          <Link 
            to="/login" 
            className="flex items-center gap-1 text-sm bg-white text-green-700 px-3 py-1.5 rounded font-bold hover:bg-gray-100 transition"
          >
            <LogIn size={16} /> Login
          </Link>
        )}
      </div>
    </header>
  );
}

// --- COMPONENTE BARRA IN BASSO (NAVIGAZIONE) ---
function BottomNav({ isAdmin }) {
  const location = useLocation();
  // Nascondi la barra se siamo nella pagina login o creazione/modifica partita
  const hidePaths = ['/new-match', '/login'];
  // Se l'URL contiene "edit-match", nascondiamo la barra
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

// --- PAGINA DI LOGIN DEDICATA ---
function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    const { error } = await supabase.auth.signInWithOtp({ 
      email,
      options: { emailRedirectTo: window.location.origin }
    });

    if (error) setMessage('Errore: ' + error.message);
    else setMessage('✅ Link inviato! Controlla la tua email.');
    
    setLoading(false);
  };

  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[80vh]">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm border border-gray-100">
        <h1 className="text-2xl font-bold mb-2 text-center text-gray-800">Benvenuto</h1>
        <p className="text-gray-500 text-center mb-6 text-sm">Inserisci la tua email per ricevere il link.</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="email" placeholder="nome@esempio.com" required value={email} onChange={e => setEmail(e.target.value)}
            className="border-2 border-gray-200 p-3 rounded-lg w-full focus:border-green-500 focus:outline-none transition"
          />
          <button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white font-bold p-3 rounded-lg w-full transition flex justify-center">
            {loading ? 'Invio...' : 'Mandami il Link Magico'}
          </button>
        </form>
        {message && <div className="mt-4 p-3 rounded text-sm text-center bg-green-100 text-green-800">{message}</div>}
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
            
            {/* --- LE ROTTE PROTETTE --- */}
            <Route path="/admin" element={isAdmin ? <AdminPage isAdmin={isAdmin} /> : <AccessDenied />} />
            
            {/* Questa è la rotta per CREARE una nuova partita */}
            <Route path="/new-match" element={isAdmin ? <MatchCreator /> : <AccessDenied />} />
            
            {/* Questa è la rotta NUOVA per MODIFICARE una partita (nota il /:id) */}
            <Route path="/edit-match/:id" element={isAdmin ? <MatchCreator /> : <AccessDenied />} />
            
          </Routes>
        </div>

        <BottomNav isAdmin={isAdmin} />
      </div>
    </BrowserRouter>
  );
}