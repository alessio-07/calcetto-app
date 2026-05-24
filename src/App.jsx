import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { supabase } from './supabase';

import HomePage from './pages/HomePage';
import StatsPage from './pages/StatsPage';
import PlayersPage from './pages/PlayersPage';
import AdminPage from './pages/AdminPage';
import MatchCreator from './pages/MatchCreator';
import LoginPage from './pages/LoginPage';
import TeamGeneratorPage from './pages/TeamGeneratorPage'; 
// Importiamo il nuovo Header globale
import Header from './components/Header';

function AppContent() {
  const location = useLocation();
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState('user');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      fetchRole(session?.user?.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      fetchRole(session?.user?.id);
    });
    return () => subscription.unsubscribe();
  }, []);
  
  const fetchRole = async (userId) => {
    if (!userId) {
      setUserRole('user');
      return;
    }
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
    if (data) {
      setUserRole(data.role);
    }
  };

  // Se vuoi nascondere l'Header intero sulla pagina Login (facoltativo)
  const hideHeader = location.pathname === '/login';

  return (
    <div className="bg-slate-900 min-h-screen font-roboto text-slate-100 flex flex-col">
      
      {/* HEADER GLOBALE: Resta fisso qui sopra! */}
      {!hideHeader && <Header session={session} />}

      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage session={session} />} />
          <Route path="/stats" element={<StatsPage session={session} userRole={userRole} />} />
          <Route path="/players" element={<PlayersPage session={session} />} />
          <Route path="/generator" element={(userRole === 'admin' || userRole === 'founder') ? <TeamGeneratorPage session={session} /> : <LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={session ? <AdminPage session={session} userRole={userRole} /> : <LoginPage />} />
          <Route path="/new-match" element={session ? <MatchCreator /> : <LoginPage />} />
          <Route path="/edit-match/:id" element={session ? <MatchCreator /> : <LoginPage />} />
        </Routes>
      </div>

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