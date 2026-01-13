import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';
import { Edit, Trash2, PlusCircle, User, Save, Pencil, Check, X, AlertTriangle } from 'lucide-react';

export default function AdminPage({ isAdmin }) {
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [newName, setNewName] = useState('');
  const [loadingPlayer, setLoadingPlayer] = useState(false);
  const inputRef = useRef(null);
  const [editingId, setEditingId] = useState(null); 
  const [editName, setEditName] = useState('');

  useEffect(() => { fetchMatches(); fetchPlayers(); }, []);

  async function fetchMatches() {
    const { data } = await supabase.from('matches').select('*, match_stats(*)').order('date', { ascending: false });
    setMatches(data || []);
  }

  function hasDataIssues(match) {
    if (match.status === 'scheduled') return false; 
    if (!match.match_stats) return false;
    const statsA = match.match_stats.filter(s => s.team === 'A');
    const statsB = match.match_stats.filter(s => s.team === 'B');
    const goalsA = statsA.reduce((sum, s) => sum + s.goals, 0);
    const goalsB = statsB.reduce((sum, s) => sum + s.goals, 0);
    const assistsA = statsA.reduce((sum, s) => sum + s.assists, 0);
    const assistsB = statsB.reduce((sum, s) => sum + s.assists, 0);
    const concededA = statsA.reduce((sum, s) => sum + s.gk_conceded, 0);
    const concededB = statsB.reduce((sum, s) => sum + s.gk_conceded, 0);
    if (concededA !== goalsB) return true;
    if (concededB !== goalsA) return true;
    if (assistsA > goalsA) return true;
    if (assistsB > goalsB) return true;
    const hasPlayerIssue = match.match_stats.some(s => s.gk_conceded > s.gk_turns);
    if (hasPlayerIssue) return true;
    return false;
  }

  async function deleteMatch(id) {
    if (!window.confirm("Sei sicuro?")) return;
    await supabase.from('matches').delete().eq('id', id);
    fetchMatches();
  }

  async function fetchPlayers() {
    const { data } = await supabase.from('players').select('*').order('name', { ascending: true });
    setPlayers(data || []);
  }

  async function addPlayer(e) {
    e.preventDefault();
    const nameToAdd = newName.trim();
    if (!nameToAdd) return;
    const exists = players.some(p => p.name.toLowerCase() === nameToAdd.toLowerCase());
    if (exists) { alert("Giocatore già esistente!"); return; }
    setLoadingPlayer(true);
    await supabase.from('players').insert([{ name: nameToAdd }]);
    setNewName(''); fetchPlayers(); setLoadingPlayer(false);
  }

  const saveEditedName = async (id) => {
    const nameToSave = editName.trim();
    if (!nameToSave) return setEditingId(null);
    await supabase.from('players').update({ name: nameToSave }).eq('id', id);
    fetchPlayers(); setEditingId(null); 
  };

  async function deletePlayer(id) {
    if (!window.confirm("Eliminare?")) return;
    await supabase.from('players').delete().eq('id', id);
    fetchPlayers();
  }

  if (!isAdmin) return <div className="p-4 text-white">Non autorizzato.</div>;

  return (
    <div className="w-full min-h-screen bg-slate-900 text-slate-100 p-4 pb-24">
      <h1 className="text-2xl font-bold mb-6 text-white flex items-center gap-2 font-oswald uppercase tracking-wider">
         Pannello Admin
      </h1>
      
      <Link to="/new-match" className="flex items-center justify-center gap-2 w-full bg-lime-600 text-white py-4 rounded-xl font-bold shadow-lg mb-8 hover:bg-lime-500 transition active:scale-95 font-oswald tracking-widest">
        <PlusCircle size={24} /> CREA NUOVA PARTITA
      </Link>

      <div className="bg-slate-800 p-6 rounded-xl shadow mb-8 border border-slate-700">
        <h2 className="text-lg font-bold mb-4 text-cyan-400 flex items-center gap-2 uppercase tracking-wider font-oswald">
          <User size={20}/> Anagrafica Giocatori
        </h2>
        
        <form onSubmit={addPlayer} className="flex gap-2 mb-6">
          <input ref={inputRef} className="border border-slate-600 p-3 rounded-lg flex-grow bg-slate-700 text-white focus:border-cyan-400 outline-none transition placeholder-slate-400" placeholder="Nome..." value={newName} onChange={e => setNewName(e.target.value)} />
          <button type="submit" disabled={loadingPlayer || !newName} className="bg-cyan-600 text-white px-4 rounded-lg font-bold hover:bg-cyan-500 disabled:opacity-50 transition"><Save size={20} /></button>
        </form>

        <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {players.map(player => (
            <div key={player.id} className={`flex justify-between items-center p-2 rounded-lg border transition ${editingId === player.id ? 'bg-yellow-900/30 border-yellow-500/50' : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'}`}>
              {editingId === player.id ? (
                <div className="flex items-center gap-2 w-full">
                  <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} className="flex-grow p-1 border rounded bg-slate-800 text-white border-slate-500" onKeyDown={e => { if(e.key === 'Enter') saveEditedName(player.id); }} />
                  <button onClick={() => saveEditedName(player.id)} className="text-lime-400 p-1"><Check size={18}/></button>
                  <button onClick={() => setEditingId(null)} className="text-red-400 p-1"><X size={18}/></button>
                </div>
              ) : (
                <>
                  <span className="font-medium text-slate-200 pl-2">{player.name}</span>
                  <div className="flex gap-1">
                    <button onClick={() => {setEditingId(player.id); setEditName(player.name);}} className="text-slate-400 hover:text-cyan-400 p-2"><Pencil size={16} /></button>
                    <button onClick={() => deletePlayer(player.id)} className="text-slate-400 hover:text-red-400 p-2"><Trash2 size={16} /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800 p-4 rounded-xl shadow border border-slate-700">
        <h2 className="text-lg font-bold mb-4 text-fuchsia-400 uppercase tracking-wider font-oswald">Storico Partite</h2>
        <div className="space-y-3">
          {matches.map(match => {
             const hasIssues = hasDataIssues(match);
             return (
              <div key={match.id} className="flex justify-between items-center border-b border-slate-700 pb-3 last:border-0">
                <div>
                  <div className="text-xs text-slate-400 font-bold">{new Date(match.date).toLocaleDateString()}</div>
                  <div className="font-bold text-white flex items-center gap-2 text-lg font-oswald">
                    {match.team_a_score} - {match.team_b_score}
                    {hasIssues && <AlertTriangle size={16} className="text-yellow-500 animate-bounce" />}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link to={`/edit-match/${match.id}`} className="p-2 bg-slate-700 text-cyan-400 rounded hover:bg-slate-600"><Edit size={18} /></Link>
                  <button onClick={() => deleteMatch(match.id)} className="p-2 bg-slate-700 text-red-400 rounded hover:bg-slate-600"><Trash2 size={18} /></button>
                </div>
              </div>
             );
          })}
        </div>
      </div>
    </div>
  );
}