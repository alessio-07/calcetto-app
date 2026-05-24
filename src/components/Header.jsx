import React, { useState, useEffect } from 'react';
import { Settings, LogOut, LogIn, Menu, X, BarChart3, Users, Home } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';

const PitchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <rect x="2" y="3" width="20" height="18" rx="2" ry="2"></rect>
    <line x1="12" y1="3" x2="12" y2="21"></line>
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M2 8h3v8H2"></path>
    <path d="M22 8h-3v8h3"></path>
  </svg>
);

// NOTA: Non serve più passargli la prop "title"
export default function Header({ session }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState('user');

  useEffect(() => {
    async function fetchRole() {
      if (!session?.user?.id) {
        setUserRole('user');
        return;
      }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      if (data) setUserRole(data.role);
    }
    fetchRole();
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const NavButton = ({ path, icon: Icon, label, state }) => {
    const isActive = location.pathname === path;
    return (
      <button 
        onClick={() => { navigate(path, { state }); setMenuOpen(false); }}
        className={`flex items-center gap-2 px-4 py-2 w-full sm:w-auto font-oswald tracking-widest uppercase transition-colors rounded-lg ${isActive ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
      >
        <Icon size={18} /> <span className="text-sm">{label}</span>
      </button>
    );
  };

  const isAdmin = userRole === 'admin' || userRole === 'founder';

  // LOGICA DEL TITOLO DINAMICO
  const getPageTitle = () => {
    const p = location.pathname;
    if (p === '/') return 'CS Calcetto';
    if (p.startsWith('/stats')) return 'Statistiche';
    if (p.startsWith('/players')) return 'Roster';
    if (p.startsWith('/generator')) return 'Generatore';
    if (p.startsWith('/admin')) return 'Pannello Admin';
    if (p.startsWith('/login')) return 'Login';
    if (p.startsWith('/new-match') || p.startsWith('/edit-match')) return 'Match Editor';
    return 'CS Calcetto';
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 mb-6 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">
        
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-900 font-black p-1.5 rounded-lg transform -rotate-6">CS</div>
          {/* Usa il titolo dinamico */}
          <h1 className="font-black text-xl font-oswald tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
            {getPageTitle()}
          </h1>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <NavButton path="/" icon={Home} label="Home" />
          <NavButton path="/stats" icon={BarChart3} label="Stats" />
          <NavButton path="/players" icon={Users} label="Players" />
          
          <div className="w-px h-6 bg-slate-700 mx-2"></div>
          
          {isAdmin && (
            <button onClick={() => navigate('/generator')} className={`p-2 rounded-full transition-colors ${location.pathname === '/generator' ? 'bg-lime-500/20 text-lime-400' : 'text-lime-500 hover:bg-slate-800'}`} title="Generatore Squadre">
              <PitchIcon />
            </button>
          )}

          {session ? (
            <>
              {isAdmin && (
                <button onClick={() => navigate('/admin')} className="p-2 text-slate-400 hover:bg-slate-800 hover:text-white rounded-full transition-colors" title="Admin">
                  <Settings size={20} />
                </button>
              )}
              <button onClick={handleLogout} className="p-2 text-red-400 hover:bg-slate-800 hover:text-red-300 rounded-full transition-colors" title="Esci">
                <LogOut size={20} />
              </button>
            </>
          ) : (
            <button 
              onClick={() => navigate('/login', { state: { from: location.pathname } })} 
              className="p-2 text-cyan-400 hover:bg-slate-800 hover:text-cyan-300 rounded-full transition-colors" 
              title="Login"
            >
              <LogIn size={20} />
            </button>
          )}
        </div>

        <div className="sm:hidden flex items-center gap-3">
          {isAdmin && (
            <button onClick={() => navigate('/generator')} className={`p-2 rounded-full transition-colors ${location.pathname === '/generator' ? 'bg-lime-500/20 text-lime-400' : 'text-lime-500 hover:bg-slate-800'}`}>
              <PitchIcon />
            </button>
          )}
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-slate-400 p-2">{menuOpen ? <X size={24} /> : <Menu size={24} />}</button>
        </div>
      </div>

      {menuOpen && (
        <div className="sm:hidden bg-slate-900 border-b border-slate-800 p-4 flex flex-col gap-2 shadow-xl absolute w-full left-0 top-16">
          <NavButton path="/" icon={Home} label="Home" />
          <NavButton path="/stats" icon={BarChart3} label="Statistiche" />
          <NavButton path="/players" icon={Users} label="Giocatori" />
          <div className="h-px bg-slate-800 my-2"></div>
          
          {session ? (
            <>
              {isAdmin && <NavButton path="/admin" icon={Settings} label="Pannello Admin" />}
              <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 w-full text-red-400 hover:bg-slate-800 font-oswald tracking-widest uppercase rounded-lg">
                <LogOut size={18} /> <span className="text-sm">Esci</span>
              </button>
            </>
          ) : (
            <NavButton path="/login" state={{ from: location.pathname }} icon={LogIn} label="Login" />
          )}
        </div>
      )}
    </div>
  );
}