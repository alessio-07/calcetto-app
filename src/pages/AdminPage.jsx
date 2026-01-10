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

  useEffect(() => {
    fetchMatches();
    fetchPlayers();
  }, []);

  async function fetchMatches() {
    // Scarico anche le stats per fare i controlli di coerenza
    const { data } = await supabase.from('matches').select('*, match_stats(*)').order('date', { ascending: false });
    setMatches(data || []);
  }

  // --- LOGICA DI CONTROLLO COERENZA ---
  function hasDataIssues(match) {
    if (match.status === 'scheduled') return false; // Le preview non hanno stats
    if (!match.match_stats) return false;

    const statsA = match.match_stats.filter(s => s.team === 'A');
    const statsB = match.match_stats.filter(s => s.team === 'B');

    const goalsA = statsA.reduce((sum, s) => sum + s.goals, 0);
    const goalsB = statsB.reduce((sum, s) => sum + s.goals, 0);
    
    const assistsA = statsA.reduce((sum, s) => sum + s.assists, 0);
    const assistsB = statsB.reduce((sum, s) => sum + s.assists, 0);
    
    const concededA = statsA.reduce((sum, s) => sum + s.gk_conceded, 0);
    const concededB = statsB.reduce((sum, s) => sum + s.gk_conceded, 0);

    // 1. Goal subiti A != Goal segnati B
    if (concededA !== goalsB) return true;
    if (concededB !== goalsA) return true;

    // 2. Assist > Goal
    if (assistsA > goalsA) return true;
    if (assistsB > goalsB) return true;

    // 3. Goal subiti > Turni (check singolo)
    const hasPlayerIssue = match.match_stats.some(s => s.gk_conceded > s.gk_turns);
    if (hasPlayerIssue) return true;

    return false;
  }

  async function deleteMatch(id) {
    if (!window.confirm("Sei sicuro di voler eliminare questa partita?")) return;
    const { error } = await supabase.from('matches').delete().eq('id', id);
    if (error) console.error(error);
    else fetchMatches();
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
    if (exists) {
      alert(`Attenzione: Il giocatore "${nameToAdd}" esiste già!`);
      setTimeout(() => inputRef.current?.focus(), 10);
      return;
    }
    setLoadingPlayer(true);
    const { error } = await supabase.from('players').insert([{ name: nameToAdd }]);
    if (error) alert('Errore: ' + error.message);
    else {
      setNewName('');
      fetchPlayers();
      setTimeout(() => inputRef.current?.focus(), 10);
    }
    setLoadingPlayer(false);
  }

  const startEditing = (player) => {
    setEditingId(player.id);
    setEditName(player.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveEditedName = async (id) => {
    const nameToSave = editName.trim();
    if (!nameToSave) return cancelEditing();
    const exists = players.some(p => p.id !== id && p.name.toLowerCase() === nameToSave.toLowerCase());
    if (exists) return alert(`Il nome "${nameToSave}" è già usato da un altro giocatore.`);
    const { error } = await supabase.from('players').update({ name: nameToSave }).eq('id', id);
    if (error) alert('Errore aggiornamento: ' + error.message);
    else {
      fetchPlayers(); 
      setEditingId(null); 
    }
  };

  async function deletePlayer(id, name) {
    if (!window.confirm(`Eliminare ${name}?`)) return;
    const { error } = await supabase.from('players').delete().eq('id', id);
    if (error) alert('Errore');
    else fetchPlayers();
  }

  if (!isAdmin) return <div className="p-4">Non sei autorizzato.</div>;

  return (
    <div className="p-4 pb-24 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
         Pannello Admin
      </h1>
      
      <Link to="/new-match" className="flex items-center justify-center gap-2 w-full bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg mb-8 hover:bg-green-700 transition active:scale-95">
        <PlusCircle size={24} /> CREA NUOVA PARTITA
      </Link>

      <div className="bg-white p-6 rounded-xl shadow mb-8 border border-gray-100">
        <h2 className="text-lg font-bold mb-4 text-gray-700 flex items-center gap-2">
          <User size={20}/> Anagrafica Giocatori
        </h2>
        
        <form onSubmit={addPlayer} className="flex gap-2 mb-6">
          <input 
            ref={inputRef}
            className="border-2 border-gray-200 p-3 rounded-lg flex-grow bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition"
            placeholder="Nome nuovo giocatore..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <button type="submit" disabled={loadingPlayer || !newName} className="bg-blue-600 text-white px-4 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition">
            <Save size={20} />
          </button>
        </form>

        <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {players.map(player => (
            <div key={player.id} className={`flex justify-between items-center p-2 rounded-lg border transition ${editingId === player.id ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-100 hover:border-blue-200'}`}>
              
              {editingId === player.id ? (
                <div className="flex items-center gap-2 w-full">
                  <input 
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="flex-grow p-1 border rounded"
                    onKeyDown={e => {
                      if(e.key === 'Enter') saveEditedName(player.id);
                      if(e.key === 'Escape') cancelEditing();
                    }}
                  />
                  <button onClick={() => saveEditedName(player.id)} className="text-green-600 p-1 hover:bg-green-100 rounded"><Check size={18}/></button>
                  <button onClick={cancelEditing} className="text-red-500 p-1 hover:bg-red-100 rounded"><X size={18}/></button>
                </div>
              ) : (
                <>
                  <span className="font-medium text-gray-700 pl-2">{player.name}</span>
                  <div className="flex gap-1">
                    <button onClick={() => startEditing(player)} className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-full transition" title="Rinomina">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => deletePlayer(player.id, player.name)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition" title="Elimina">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
        <h2 className="text-lg font-bold mb-4 text-gray-700">Storico Partite</h2>
        <div className="space-y-3">
          {matches.map(match => {
             const hasIssues = hasDataIssues(match);
             return (
              <div key={match.id} className="flex justify-between items-center border-b pb-3 last:border-0">
                <div>
                  <div className="text-xs text-gray-400">{new Date(match.date).toLocaleDateString()}</div>
                  <div className="font-bold text-gray-800 flex items-center gap-2">
                    {match.team_a_score} - {match.team_b_score}
                    {hasIssues && <AlertTriangle size={16} className="text-yellow-500" title="Dati incoerenti (es. Gol subiti != Gol segnati)" />}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link to={`/edit-match/${match.id}`} className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition"><Edit size={18} /></Link>
                  <button onClick={() => deleteMatch(match.id)} className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition"><Trash2 size={18} /></button>
                </div>
              </div>
             );
          })}
        </div>
      </div>
    </div>
  );
}