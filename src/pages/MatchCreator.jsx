import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useNavigate, useParams } from 'react-router-dom';
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Calendar, Eye, Star } from 'lucide-react';

// --- COMPONENTE GIOCATORE (Ora gestisce la Stella MVP) ---
function DraggablePlayer({ player, team, mvpId, setMvpId }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: player.id,
    data: { player, fromTeam: team },
  });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 999 } : undefined;

  const isMvp = mvpId === player.id;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={`bg-white border p-2 mb-2 rounded shadow-sm touch-none select-none relative ${isMvp ? 'border-yellow-400 ring-2 ring-yellow-100' : 'border-gray-300'}`}>
      
      {/* Intestazione: Nome e Stella MVP */}
      <div className="flex justify-between items-start mb-1">
        <div className="font-bold text-gray-800">{player.name}</div>
        
        {team !== 'pool' && (
          <button 
            onPointerDown={(e) => { e.stopPropagation(); setMvpId(isMvp ? null : player.id); }}
            className={`transition-all active:scale-125 ${isMvp ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-200'}`}
            title="Assegna MVP"
          >
            <Star size={20} fill={isMvp ? "currentColor" : "none"} />
          </button>
        )}
      </div>

      {/* Input Statistiche */}
      {team !== 'pool' && (
        <div className="text-xs grid grid-cols-2 gap-2 mt-2" onPointerDown={(e) => e.stopPropagation()}> 
          <label className="flex flex-col"><span className="text-gray-500">Gol</span>
            <input type="number" min="0" value={player.stats.goals} onChange={(e) => player.updateStat(player.id, 'goals', parseInt(e.target.value)||0)} className="border rounded p-1"/>
          </label>
          <label className="flex flex-col"><span className="text-gray-500">Assist</span>
            <input type="number" min="0" value={player.stats.assists} onChange={(e) => player.updateStat(player.id, 'assists', parseInt(e.target.value)||0)} className="border rounded p-1"/>
          </label>
          <label className="flex flex-col"><span className="text-gray-500">Porta</span>
            <input type="number" min="0" value={player.stats.gk_turns} onChange={(e) => player.updateStat(player.id, 'gk_turns', parseInt(e.target.value)||0)} className="border rounded p-1"/>
          </label>
          <label className="flex flex-col"><span className="text-gray-500">Subiti</span>
            <input type="number" min="0" value={player.stats.gk_conceded} onChange={(e) => player.updateStat(player.id, 'gk_conceded', parseInt(e.target.value)||0)} className="border rounded p-1"/>
          </label>
        </div>
      )}
    </div>
  );
}

// --- COMPONENTE SQUADRA ---
function DroppableTeam({ id, title, players, bgClass, mvpId, setMvpId, children }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`flex-1 p-3 rounded-lg min-h-[300px] ${bgClass}`}>
      <h3 className="font-bold text-center mb-2 text-gray-700">{title}</h3>
      {children}
      {players.map(p => (
        <DraggablePlayer key={p.id} player={p} team={id} mvpId={mvpId} setMvpId={setMvpId} />
      ))}
      {players.length === 0 && <div className="text-center text-gray-400 text-sm mt-10">Trascina qui</div>}
    </div>
  );
}

// --- PAGINA PRINCIPALE ---
export default function MatchCreator() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [pool, setPool] = useState([]);
  const [teamA, setTeamA] = useState([]);
  const [teamB, setTeamB] = useState([]);
  
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [isPreview, setIsPreview] = useState(false);
  const [mvpId, setMvpId] = useState(null); // NUOVO: Tiene traccia dell'ID dell'MVP

  const [loading, setLoading] = useState(true);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => { loadData(); }, [id]);

  async function loadData() {
    setLoading(true);
    const { data: allPlayers } = await supabase.from('players').select('*');
    let initialPool = allPlayers.map(p => ({ ...p, stats: { goals: 0, assists: 0, gk_turns: 0, gk_conceded: 0 } }));
    let initialA = [], initialB = [];

    if (id) {
      const { data: matchData } = await supabase.from('matches').select('*').eq('id', id).single();
      if (matchData) {
        setMatchDate(matchData.date);
        setIsPreview(matchData.status === 'scheduled');
      }

      // Carichiamo anche is_mvp
      const { data: matchStats } = await supabase.from('match_stats').select('player_id, team, goals, assists, gk_turns, gk_conceded, is_mvp').eq('match_id', id);
      
      // Cerchiamo chi era l'MVP
      const mvpFound = matchStats.find(s => s.is_mvp);
      if (mvpFound) setMvpId(mvpFound.player_id);

      matchStats.forEach(stat => {
        const playerIndex = initialPool.findIndex(p => p.id === stat.player_id);
        if (playerIndex > -1) {
          const player = initialPool[playerIndex];
          player.stats = { goals: stat.goals, assists: stat.assists, gk_turns: stat.gk_turns, gk_conceded: stat.gk_conceded };
          if (stat.team === 'A') initialA.push(player);
          else if (stat.team === 'B') initialB.push(player);
          initialPool.splice(playerIndex, 1);
        }
      });
    }
    setPool(initialPool); setTeamA(initialA); setTeamB(initialB); setLoading(false);
  }

  const updateStat = (playerId, field, value) => {
    const updateFn = (list) => list.map(p => p.id === playerId ? { ...p, stats: { ...p.stats, [field]: value } } : p);
    setTeamA(prev => updateFn(prev)); setTeamB(prev => updateFn(prev));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;
    const playerId = active.id, fromTeam = active.data.current.fromTeam, toTeam = over.id;
    if (fromTeam === toTeam) return;

    let playerObj;
    if (fromTeam === 'pool') playerObj = pool.find(p => p.id === playerId);
    else if (fromTeam === 'teamA') playerObj = teamA.find(p => p.id === playerId);
    else if (fromTeam === 'teamB') playerObj = teamB.find(p => p.id === playerId);

    playerObj = { ...playerObj, updateStat };

    if (fromTeam === 'pool') setPool(p => p.filter(x => x.id !== playerId));
    if (fromTeam === 'teamA') setTeamA(p => p.filter(x => x.id !== playerId));
    if (fromTeam === 'teamB') setTeamB(p => p.filter(x => x.id !== playerId));

    if (toTeam === 'pool') setPool(p => [...p, playerObj]);
    if (toTeam === 'teamA') setTeamA(p => [...p, playerObj]);
    if (toTeam === 'teamB') setTeamB(p => [...p, playerObj]);
    
    // Se sposti l'MVP in panchina, togli la stella
    if (toTeam === 'pool' && playerId === mvpId) setMvpId(null);
  };

  const scoreA = teamA.reduce((sum, p) => sum + p.stats.goals, 0);
  const scoreB = teamB.reduce((sum, p) => sum + p.stats.goals, 0);

  const saveMatch = async () => {
    if (teamA.length === 0 || teamB.length === 0) return alert('Attenzione: Squadre vuote!');
    setLoading(true);

    const statusValue = isPreview ? 'scheduled' : 'finished';

    try {
      let matchId = id;
      const matchDataPayload = { team_a_score: scoreA, team_b_score: scoreB, date: matchDate, status: statusValue };

      if (!matchId) {
        const { data, error } = await supabase.from('matches').insert([matchDataPayload]).select().single();
        if (error) throw error; matchId = data.id;
      } else {
        await supabase.from('matches').update(matchDataPayload).eq('id', matchId);
        await supabase.from('match_stats').delete().eq('match_id', matchId);
      }

      // Salviamo is_mvp confrontando l'id
      const statsToInsert = [
        ...teamA.map(p => ({ match_id: matchId, player_id: p.id, team: 'A', is_mvp: p.id === mvpId, ...p.stats })),
        ...teamB.map(p => ({ match_id: matchId, player_id: p.id, team: 'B', is_mvp: p.id === mvpId, ...p.stats }))
      ];

      const { error: statsError } = await supabase.from('match_stats').insert(statsToInsert);
      if (statsError) throw statsError;

      navigate('/');
    } catch (error) {
      alert('Errore: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !pool.length && !teamA.length) return <div className="p-10 text-center">Caricamento...</div>;

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="p-2 pb-24 max-w-lg mx-auto">
        
        <div className="bg-white p-4 rounded-xl shadow mb-4 border border-gray-200">
          <div className="flex gap-4 mb-3">
             <div className="flex-1">
                <label className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Calendar size={14}/> DATA</label>
                <input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} className="w-full border p-2 rounded bg-gray-50 font-bold"/>
             </div>
             <div className="flex-1">
                <label className="text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Eye size={14}/> STATO</label>
                <label className={`flex items-center justify-center gap-2 p-2 rounded cursor-pointer border transition ${isPreview ? 'bg-yellow-50 border-yellow-400 text-yellow-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                  <input type="checkbox" checked={isPreview} onChange={(e) => setIsPreview(e.target.checked)} className="w-4 h-4"/>
                  <span className="font-bold text-sm">Preview</span>
                </label>
             </div>
          </div>
          {isPreview && <div className="text-xs text-center text-yellow-600 font-medium">⚠️ Questa partita non conterà nelle statistiche</div>}
        </div>

        <div className={`flex justify-between items-center text-white p-4 rounded-xl mb-4 shadow-lg sticky top-20 z-40 ${isPreview ? 'bg-gray-600' : 'bg-gray-800'}`}>
          <div className="text-center"><div className="text-3xl font-bold text-blue-400">{isPreview ? '?' : scoreA}</div><div className="text-xs uppercase">Squadra A</div></div>
          <div className="text-xl font-bold text-gray-300">{isPreview ? 'VS' : (id ? "MODIFICA" : "NUOVA")}</div>
          <div className="text-center"><div className="text-3xl font-bold text-red-400">{isPreview ? '?' : scoreB}</div><div className="text-xs uppercase">Squadra B</div></div>
        </div>

        <div className="flex gap-2 mb-6">
          <DroppableTeam id="teamA" title="Squadra A" players={teamA} bgClass="bg-blue-50 border-2 border-blue-200" mvpId={mvpId} setMvpId={setMvpId} />
          <DroppableTeam id="teamB" title="Squadra B" players={teamB} bgClass="bg-red-50 border-2 border-red-200" mvpId={mvpId} setMvpId={setMvpId} />
        </div>

        <div className="mb-4">
          <h3 className="font-bold text-gray-700 mb-2">Panchina</h3>
          <DroppableTeam id="pool" title="" players={pool} bgClass="bg-gray-100 border-dashed border-2 border-gray-300 min-h-[100px]" mvpId={mvpId} setMvpId={setMvpId} />
        </div>

        <button onClick={saveMatch} disabled={loading} className={`w-full text-white font-bold py-4 rounded-xl shadow-lg text-xl active:scale-95 transition ${isPreview ? 'bg-yellow-600' : 'bg-green-600'}`}>
          {loading ? 'Salvataggio...' : (isPreview ? 'SALVA ANTEPRIMA' : 'SALVA PARTITA')}
        </button>
      </div>
    </DndContext>
  );
}