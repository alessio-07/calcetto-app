import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  TouchSensor
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, Eye, Star, Clock, AlertTriangle, GripVertical } from 'lucide-react';

// --- COMPONENTE GIOCATORE ORDINABILE ---
function SortablePlayer({ player, mvpId, setMvpId, updateStat, disabled }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: player.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  const isMvp = mvpId === player.id;

  const handleInput = (field, valStr) => {
    const val = valStr === '' ? 0 : parseInt(valStr);
    updateStat(player.id, field, val);
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`bg-slate-700 border p-3 mb-2 rounded-xl shadow-md touch-manipulation relative transition group
        ${isMvp ? 'border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'border-slate-600'}
        ${isDragging ? 'bg-slate-600 ring-2 ring-cyan-400' : ''}
      `}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
           {/* Maniglia per trascinare (più intuitivo) */}
           <div {...attributes} {...listeners} className="text-slate-500 cursor-grab active:cursor-grabbing p-1">
             <GripVertical size={18} />
           </div>
           <div className="font-bold text-slate-100">{player.name}</div>
        </div>

        {!disabled && (
          <button onPointerDown={(e) => { e.stopPropagation(); setMvpId(isMvp ? null : player.id); }} className={`transition-all active:scale-125 ${isMvp ? 'text-yellow-400' : 'text-slate-600 hover:text-yellow-500'}`} title="Assegna MVP">
            <Star size={20} fill={isMvp ? "currentColor" : "none"} />
          </button>
        )}
      </div>

      {!disabled && (
        <div className="text-xs grid grid-cols-2 gap-2 mt-2 pl-7"> 
          <label className="flex flex-col"><span className="text-slate-400 mb-0.5">Gol</span>
            <input type="number" min="0" placeholder="0" value={player.stats.goals === 0 ? '' : player.stats.goals} onChange={(e) => handleInput('goals', e.target.value)} className="bg-slate-800 border border-slate-600 rounded p-1.5 text-white focus:border-cyan-400 outline-none"/>
          </label>
          <label className="flex flex-col"><span className="text-slate-400 mb-0.5">Assist</span>
            <input type="number" min="0" placeholder="0" value={player.stats.assists === 0 ? '' : player.stats.assists} onChange={(e) => handleInput('assists', e.target.value)} className="bg-slate-800 border border-slate-600 rounded p-1.5 text-white focus:border-cyan-400 outline-none"/>
          </label>
          <label className="flex flex-col"><span className="text-slate-400 mb-0.5">Porta</span>
            <input type="number" min="0" placeholder="0" value={player.stats.gk_turns === 0 ? '' : player.stats.gk_turns} onChange={(e) => handleInput('gk_turns', e.target.value)} className="bg-slate-800 border border-slate-600 rounded p-1.5 text-white focus:border-cyan-400 outline-none"/>
          </label>
          <label className="flex flex-col"><span className="text-slate-400 mb-0.5">Subiti</span>
            <input type="number" min="0" placeholder="0" value={player.stats.gk_conceded === 0 ? '' : player.stats.gk_conceded} onChange={(e) => handleInput('gk_conceded', e.target.value)} className="bg-slate-800 border border-slate-600 rounded p-1.5 text-white focus:border-fuchsia-400 outline-none"/>
          </label>
        </div>
      )}
    </div>
  );
}

// --- CONTENITORE SQUADRA ---
function SortableTeam({ id, title, players, bgClass, mvpId, setMvpId, updateStat, warnings }) {
  const { setNodeRef } = useSortable({ id });

  return (
    <div ref={setNodeRef} className={`flex-1 p-3 rounded-xl min-h-[300px] flex flex-col transition-colors ${bgClass}`}>
      <h3 className="font-bold text-center mb-3 text-white font-oswald tracking-wider">{title}</h3>
      
      <SortableContext items={players.map(p => p.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1">
          {players.map(p => (
            <SortablePlayer 
              key={p.id} 
              player={p} 
              mvpId={mvpId} 
              setMvpId={setMvpId} 
              updateStat={updateStat} 
              disabled={id === 'pool'}
            />
          ))}
          {players.length === 0 && <div className="text-center text-slate-500 text-sm mt-10 border-2 border-dashed border-slate-600 rounded-lg p-4">Trascina qui</div>}
        </div>
      </SortableContext>

      {warnings && warnings.length > 0 && (
        <div className="mt-4 bg-yellow-900/30 border border-yellow-700 p-2 rounded text-[10px] text-yellow-500">
           {warnings.map((w, i) => (
             <div key={i} className="flex items-start gap-1 mb-1 last:mb-0">
               <AlertTriangle size={12} className="shrink-0 mt-0.5"/> <span>{w}</span>
             </div>
           ))}
        </div>
      )}
    </div>
  );
}

// --- PAGINA PRINCIPALE ---
export default function MatchCreator() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // STATO UNICO PER GESTIRE IL DRAG & DROP FACILMENTE
  const [items, setItems] = useState({
    pool: [],
    teamA: [],
    teamB: []
  });

  const [matchDate, setMatchDate] = useState(new Date().toISOString().slice(0, 16));
  const [isPreview, setIsPreview] = useState(false);
  const [mvpId, setMvpId] = useState(null);
  const [loading, setLoading] = useState(true);

  // SENSORI OTTIMIZZATI PER MOBILE
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { 
      // Ritardo di 150ms per distinguere lo scroll dal drag su mobile
      activationConstraint: { delay: 150, tolerance: 5 } 
    }), 
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => { loadData(); }, [id]);

  async function loadData() {
    setLoading(true);
    const { data: allPlayers } = await supabase.from('players').select('*');
    // Aggiungo stats di base a tutti
    const fullPool = allPlayers.map(p => ({ ...p, stats: { goals: 0, assists: 0, gk_turns: 0, gk_conceded: 0 } }));
    
    let newItems = { pool: [...fullPool], teamA: [], teamB: [] };

    if (id) {
      const { data: matchData } = await supabase.from('matches').select('*').eq('id', id).single();
      if (matchData) {
        if (matchData.date) {
          const d = new Date(matchData.date);
          const offset = d.getTimezoneOffset() * 60000;
          const localISOTime = (new Date(d - offset)).toISOString().slice(0, 16);
          setMatchDate(localISOTime);
        }
        setIsPreview(matchData.status === 'scheduled');
      }
      const { data: matchStats } = await supabase.from('match_stats').select('*').eq('match_id', id);
      const mvpFound = matchStats.find(s => s.is_mvp);
      if (mvpFound) setMvpId(mvpFound.player_id);

      // Distribuisco i giocatori nelle squadre
      matchStats.forEach(stat => {
        const pIndex = newItems.pool.findIndex(p => p.id === stat.player_id);
        if (pIndex > -1) {
          const player = newItems.pool[pIndex];
          player.stats = { goals: stat.goals, assists: stat.assists, gk_turns: stat.gk_turns, gk_conceded: stat.gk_conceded };
          
          if (stat.team === 'A') newItems.teamA.push(player);
          else if (stat.team === 'B') newItems.teamB.push(player);
          
          newItems.pool.splice(pIndex, 1);
        }
      });
    }
    setItems(newItems);
    setLoading(false);
  }

  // Aggiornamento statistiche (nidificato dentro l'oggetto items)
  const updateStat = (playerId, field, value) => {
    const updateList = (list) => list.map(p => p.id === playerId ? { ...p, stats: { ...p.stats, [field]: value } } : p);
    setItems(prev => ({
      pool: updateList(prev.pool),
      teamA: updateList(prev.teamA),
      teamB: updateList(prev.teamB)
    }));
  };

  // Funzione helper per trovare in quale container è un item
  const findContainer = (id) => {
    if (items.pool.find(p => p.id === id)) return 'pool';
    if (items.teamA.find(p => p.id === id)) return 'teamA';
    if (items.teamB.find(p => p.id === id)) return 'teamB';
    return null;
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Trova i container di partenza e destinazione
    const activeContainer = findContainer(activeId);
    // Se overId è un container (es. "teamA"), usalo, altrimenti trova il container del giocatore su cui siamo sopra
    const overContainer = (overId === 'pool' || overId === 'teamA' || overId === 'teamB') 
      ? overId 
      : findContainer(overId);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    // Sposta l'item nell'altro array mentre trascini (crea lo spazio visivo)
    setItems((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];
      const activeIndex = activeItems.findIndex((p) => p.id === activeId);
      const overIndex = (overId === 'pool' || overId === 'teamA' || overId === 'teamB')
        ? overItems.length + 1
        : overItems.findIndex((p) => p.id === overId);

      let newIndex;
      if (overId === 'pool' || overId === 'teamA' || overId === 'teamB') {
        newIndex = overItems.length + 1;
      } else {
        const isBelowOverItem = over && active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height;
        const modifier = isBelowOverItem ? 1 : 0;
        newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
      }

      return {
        ...prev,
        [activeContainer]: [
          ...prev[activeContainer].filter((item) => item.id !== activeId)
        ],
        [overContainer]: [
          ...prev[overContainer].slice(0, newIndex),
          activeItems[activeIndex],
          ...prev[overContainer].slice(newIndex, prev[overContainer].length)
        ]
      };
    });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;
  
    const activeContainer = findContainer(active.id);
    const overContainer = (over.id === 'pool' || over.id === 'teamA' || over.id === 'teamB') 
      ? over.id 
      : findContainer(over.id);
  
    if (activeContainer && overContainer) {
      const activeIndex = items[activeContainer].findIndex((p) => p.id === active.id);
      const overIndex = (over.id === 'pool' || over.id === 'teamA' || over.id === 'teamB')
        ? items[overContainer].length + 1
        : items[overContainer].findIndex((p) => p.id === over.id);

      if (activeIndex !== overIndex) {
        setItems((prev) => ({
          ...prev,
          [activeContainer]: arrayMove(prev[activeContainer], activeIndex, overIndex),
        }));
      }

      // Se spostato in panchina, rimuovi MVP
      if (overContainer === 'pool' && active.id === mvpId) setMvpId(null);
    }
  };

  const scoreA = items.teamA.reduce((sum, p) => sum + p.stats.goals, 0);
  const scoreB = items.teamB.reduce((sum, p) => sum + p.stats.goals, 0);

  const getWarnings = (myTeam, opponentScore) => {
    const w = [];
    const myGoals = myTeam.reduce((acc, p) => acc + p.stats.goals, 0);
    const myAssists = myTeam.reduce((acc, p) => acc + p.stats.assists, 0);
    const myConcededTotal = myTeam.reduce((acc, p) => acc + p.stats.gk_conceded, 0);

    if (myAssists > myGoals) w.push(`Troppi assist! (${myAssists}) > Goal (${myGoals})`);
    if (myConcededTotal !== opponentScore) w.push(`Totale subiti (${myConcededTotal}) != gol avversari (${opponentScore})`);
    myTeam.forEach(p => {
      if (p.stats.gk_conceded > p.stats.gk_turns) {
        w.push(`${p.name}: subiti (${p.stats.gk_conceded}) > turni (${p.stats.gk_turns})`);
      }
    });
    return w;
  };

  const warningsA = getWarnings(items.teamA, scoreB);
  const warningsB = getWarnings(items.teamB, scoreA);

  const saveMatch = async () => {
    if (items.teamA.length === 0 || items.teamB.length === 0) return alert('Attenzione: Squadre vuote!');
    setLoading(true);
    const statusValue = isPreview ? 'scheduled' : 'finished';
    const dateToSave = new Date(matchDate).toISOString();

    try {
      let matchId = id;
      const matchDataPayload = { team_a_score: scoreA, team_b_score: scoreB, date: dateToSave, status: statusValue };

      if (!matchId) {
        const { data, error } = await supabase.from('matches').insert([matchDataPayload]).select().single();
        if (error) throw error; matchId = data.id;
      } else {
        await supabase.from('matches').update(matchDataPayload).eq('id', matchId);
        await supabase.from('match_stats').delete().eq('match_id', matchId);
      }

      const statsToInsert = [
        ...items.teamA.map(p => ({ match_id: matchId, player_id: p.id, team: 'A', is_mvp: p.id === mvpId, ...p.stats })),
        ...items.teamB.map(p => ({ match_id: matchId, player_id: p.id, team: 'B', is_mvp: p.id === mvpId, ...p.stats }))
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

  if (loading) return <div className="p-10 text-center text-slate-400 animate-pulse">Caricamento editor...</div>;

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCenter}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="p-4 pb-24 max-w-lg mx-auto bg-slate-900 min-h-screen text-slate-100">
        
        {/* HEADER CONTROLLI */}
        <div className="bg-slate-800 p-4 rounded-2xl shadow mb-6 border border-slate-700">
          <div className="flex gap-4 mb-3">
             <div className="flex-1">
                <label className="text-xs font-bold text-slate-400 mb-1 flex items-center gap-1"><Calendar size={14}/> DATA E ORA</label>
                <input type="datetime-local" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} className="w-full border border-slate-600 p-2 rounded bg-slate-700 text-white font-bold text-sm outline-none focus:border-cyan-400"/>
             </div>
             <div className="flex-1">
                <label className="text-xs font-bold text-slate-400 mb-1 flex items-center gap-1"><Eye size={14}/> STATO</label>
                <label className={`flex items-center justify-center gap-2 p-2 rounded cursor-pointer border transition ${isPreview ? 'bg-lime-900/30 border-lime-500 text-lime-400' : 'bg-slate-700 border-slate-600 text-slate-400'}`}>
                  <input type="checkbox" checked={isPreview} onChange={(e) => setIsPreview(e.target.checked)} className="w-4 h-4 accent-lime-500"/>
                  <span className="font-bold text-sm">Preview</span>
                </label>
             </div>
          </div>
          {isPreview && <div className="text-xs text-center text-lime-400 font-medium">⚠️ Partita programmata (Countdown attivo)</div>}
        </div>

        {/* HEADER RISULTATO - NON STICKY ORA (rimosso sticky top-20) */}
        <div className={`flex justify-between items-center text-white p-6 rounded-2xl mb-6 shadow-xl z-40 ${isPreview ? 'bg-slate-700' : 'bg-slate-800 border-b-2 border-slate-700'}`}>
          <div className="text-center"><div className="text-4xl font-bold font-oswald text-cyan-400">{isPreview ? '?' : scoreA}</div><div className="text-[10px] uppercase text-slate-400 tracking-widest">Team A</div></div>
          <div className="text-xl font-bold text-slate-500 flex flex-col items-center">
             {isPreview ? <Clock size={24} className="text-lime-400 animate-pulse"/> : (id ? "MODIFICA" : "VS")}
          </div>
          <div className="text-center"><div className="text-4xl font-bold font-oswald text-fuchsia-500">{isPreview ? '?' : scoreB}</div><div className="text-[10px] uppercase text-slate-400 tracking-widest">Team B</div></div>
        </div>

        {/* SQUADRE DROPPABLE */}
        <div className="flex gap-2 mb-8">
          <SortableTeam id="teamA" title="TEAM A" players={items.teamA} bgClass="bg-slate-800/50 border border-cyan-500/30" mvpId={mvpId} setMvpId={setMvpId} updateStat={updateStat} warnings={warningsA} />
          <SortableTeam id="teamB" title="TEAM B" players={items.teamB} bgClass="bg-slate-800/50 border border-fuchsia-500/30" mvpId={mvpId} setMvpId={setMvpId} updateStat={updateStat} warnings={warningsB} />
        </div>

        {/* PANCHINA DROPPABLE */}
        <div className="mb-6">
          <h3 className="font-bold text-slate-400 mb-2 uppercase text-xs tracking-widest">Panchina</h3>
          <SortableTeam id="pool" title="" players={items.pool} bgClass="bg-slate-800/30 border-2 border-dashed border-slate-700 min-h-[100px]" mvpId={mvpId} setMvpId={setMvpId} updateStat={updateStat} />
        </div>

        <button onClick={saveMatch} disabled={loading} className={`w-full text-white font-bold py-4 rounded-xl shadow-lg text-xl active:scale-95 transition font-oswald tracking-widest ${isPreview ? 'bg-lime-600 hover:bg-lime-500' : 'bg-cyan-600 hover:bg-cyan-500'}`}>
          {loading ? 'SALVATAGGIO...' : (isPreview ? 'SALVA ANTEPRIMA' : 'SALVA PARTITA')}
        </button>
      </div>
    </DndContext>
  );
}