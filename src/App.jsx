import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { supabase } from './supabase';

import HomePage from './pages/HomePage';
import StatsPage from './pages/StatsPage';
import PlayersPage from './pages/PlayersPage'; // IMPORTA LA NUOVA PAGINA
import AdminPage from './pages/AdminPage';
import MatchCreator from './pages/MatchCreator';
import LoginPage from './pages/LoginPage';
import Navbar from './components/Navbar';

function AppContent() {
  const location = useLocation();
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);
  
  const hideNavbar = location.pathname === '/login' || location.pathname.includes('new-match') || location.pathname.includes('edit-match');

  return (
    <div className="bg-slate-900 min-h-screen font-roboto text-slate-100">
      <Routes>
        <Route path="/" element={<HomePage session={session} />} />
        <Route path="/stats" element={<StatsPage session={session} />} />
        <Route path="/players" element={<PlayersPage session={session} />} /> {/* NUOVA ROTTA */}
        
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={session ? <AdminPage isAdmin={true} /> : <LoginPage />} />
        <Route path="/new-match" element={session ? <MatchCreator /> : <LoginPage />} />
        <Route path="/edit-match/:id" element={session ? <MatchCreator /> : <LoginPage />} />
      </Routes>

      {!hideNavbar && <Navbar />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;