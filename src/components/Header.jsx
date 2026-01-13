import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings, LogIn, LogOut } from 'lucide-react';
import { supabase } from '../supabase';

export default function Header({ title, session }) {
  const navigate = useNavigate();

  const handleAuthAction = async () => {
    if (session) {
      if(window.confirm("Vuoi uscire?")) {
        await supabase.auth.signOut();
        navigate('/');
      }
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="flex justify-between items-center mb-6 pt-2">
      <h1 className="text-3xl font-bold text-white font-oswald tracking-wide uppercase">
        {title}
      </h1>
      
      <div className="flex gap-3">
        {/* TASTO ADMIN (Visibile solo se loggato) */}
        {session && (
          <Link 
            to="/admin"
            className="p-2 bg-slate-800 rounded-full text-fuchsia-400 hover:text-white hover:bg-fuchsia-900 transition shadow-lg border border-slate-700"
            title="Pannello Admin"
          >
            <Settings size={20} />
          </Link>
        )}

        {/* TASTO LOGIN/LOGOUT */}
        <button 
          onClick={handleAuthAction}
          className={`p-2 rounded-full transition shadow-lg border border-slate-700 ${
            session 
              ? 'bg-slate-800 text-red-400 hover:bg-red-900/30' 
              : 'bg-slate-800 text-cyan-400 hover:bg-cyan-900/30'
          }`}
          title={session ? "Esci" : "Accedi"}
        >
          {session ? <LogOut size={20} /> : <LogIn size={20} />}
        </button>
      </div>
    </div>
  );
}