import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart2, Users } from 'lucide-react'; // Users è la nuova icona

export default function Navbar() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  const noTapHighlight = { WebkitTapHighlightColor: 'transparent' };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 px-6 py-4 flex justify-around items-center z-50">
      
      {/* HOME */}
      <Link 
        to="/" 
        style={noTapHighlight}
        className={`flex flex-col items-center gap-1 transition-all duration-300 outline-none ${isActive('/') ? 'scale-110' : 'opacity-50 hover:opacity-80'}`}
      >
        <Home size={26} color={isActive('/') ? '#ffffff' : '#94a3b8'} strokeWidth={isActive('/') ? 3 : 2} className={isActive('/') ? 'drop-shadow-[0_0_5px_rgba(255,255,255,0.4)]' : ''}/>
        {isActive('/') && <span className="text-[10px] font-bold tracking-widest text-cyan-400 font-oswald">HOME</span>}
      </Link>
      
      {/* STATS (Classifiche generali) */}
      <Link 
        to="/stats" 
        style={noTapHighlight}
        className={`flex flex-col items-center gap-1 transition-all duration-300 outline-none ${isActive('/stats') ? 'scale-110' : 'opacity-50 hover:opacity-80'}`}
      >
        <BarChart2 size={26} color={isActive('/stats') ? '#ffffff' : '#94a3b8'} strokeWidth={isActive('/stats') ? 3 : 2} className={isActive('/stats') ? 'drop-shadow-[0_0_5px_rgba(255,255,255,0.4)]' : ''}/>
        {isActive('/stats') && <span className="text-[10px] font-bold tracking-widest text-lime-400 font-oswald">STATS</span>}
      </Link>
      
      {/* PLAYERS (Nuova Pagina) */}
      <Link 
        to="/players" 
        style={noTapHighlight}
        className={`flex flex-col items-center gap-1 transition-all duration-300 outline-none ${isActive('/players') ? 'scale-110' : 'opacity-50 hover:opacity-80'}`}
      >
        <Users size={26} color={isActive('/players') ? '#ffffff' : '#94a3b8'} strokeWidth={isActive('/players') ? 3 : 2} className={isActive('/players') ? 'drop-shadow-[0_0_5px_rgba(255,255,255,0.4)]' : ''}/>
        {isActive('/players') && <span className="text-[10px] font-bold tracking-widest text-fuchsia-400 font-oswald">PLAYERS</span>}
      </Link>

    </nav>
  );
}