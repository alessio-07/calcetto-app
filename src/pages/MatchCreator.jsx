import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { supabase } from '../supabase';
import Header from '../components/Header';
import { Save, Star, Shield, Goal, Footprints } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

// --- COMPONENTE CARD GIOCATORE (Draggable) ---
const DraggablePlayer = ({ player, index, listType, onUpdateStat }) => {
  const isTeam = listType === 'teamA' || listType === 'teamB';

  return (
    <Draggable draggableId={player.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{ ...provided.draggableProps.style, touchAction: 'none' }}
          className={`
            mb-2 rounded-xl border shadow-sm transition-colors select-none overflow-hidden
            ${snapshot.isDragging 
              ? 'bg-fuchsia-900/90 border-fuchsia-500 shadow-2xl scale-105 z-50 ring-2 ring-fuchsia-400' 
              : 'bg-slate-800 border-slate-700'
            }
          `}
        >
          {/* HEADER CARD: Avatar e Nome */}
          <div className="flex items-center gap-3 p-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0 pointer-events-none">
              {player.avatar_url ? (
                <img src={player.avatar_url} alt="av" className="w-full h-full rounded-full object-cover" />
              ) : (
                player.name.charAt(0)
              )}
            </div>
            <span className="font-bold text-slate-200 font-oswald truncate flex-1 pointer-events-none">
              {player.name}
            </span>
            
            {/* Tasto MVP */}
            {isTeam && (
              <button
                onPointerDown={(e) => e.stopPropagation()} 
                onClick={() => onUpdateStat(player.id, listType, 'is_mvp', !player.is_mvp)}
                className={`p-1.5 rounded-full transition ${player.is_mvp ? 'bg-yellow-500/20 text-yellow-400' : 'text-slate-600 hover:text-slate-400'}`}
              >
                <Star size={18} fill={player.is_mvp ? "currentColor" : "none"} />
              </button>
            )}
          </div>

          {/* SECTION STATISTICHE */}
          {isTeam && (
            <div className="bg-slate-900/50 p-2 flex items-center justify-between gap-2 border-t border-slate-700">
              
              <div className="flex flex-col items-center w-12">
                <label className="text-[9px] text-cyan-400 font-bold mb-0.5"><Goal size={10} className="inline"/> GOL</label>
                <input
                  type="number"
                  min="0"
                  value={player.goals || 0}
                  onPointerDown={(e) => e.stopPropagation()}
                  onChange={(e) => onUpdateStat(player.id, listType, 'goals', parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-800 border border-slate-600 rounded text-center text-white font-mono text-sm py-1 focus:border-cyan-500 outline-none"
                />
              </div>

              <div className="flex flex-col items-center w-12">
                <label className="text-[9px] text-fuchsia-400 font-bold mb-0.5"><Footprints size={10} className="inline"/> AST</label>
                <input
                  type="number"
                  min="0"
                  value={player.assists || 0}
                  onPointerDown={(e) => e.stopPropagation()}
                  onChange={(e) => onUpdateStat(player.id, listType, 'assists', parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-800 border border-slate-600 rounded text-center text-white font-mono text-sm py-1 focus:border-fuchsia-500 outline-none"
                />
              </div>

              <div className="w-px h-8 bg-slate-700 mx-1"></div>

              <div className="flex flex-col items-center w-12">
                <label className="text-[9px] text-slate-400 font-bold mb-0.5"><Shield size={10} className="inline"/> GK</label>
                <input
                  type="number"
                  min="0"
                  value={player.gk_turns || 0}
                  onPointerDown={(e) => e.stopPropagation()}
                  onChange={(e) => onUpdateStat(player.id, listType, 'gk_turns', parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-800 border border-slate-600 rounded text-center text-slate-300 font-mono text-sm py-1 focus:border-slate-400 outline-none"
                />
              </div>

              <div className="flex flex-col items-center w-12">
                <label className="text-[9px] text-red-400 font-bold mb-0.5">SUB</label>
                <input
                  type="number"
                  min="0"
                  value={player.gk_conceded || 0}
                  onPointerDown={(e) => e.stopPropagation()}
                  onChange={(e) => onUpdateStat(player.id, listType, 'gk_conceded', parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-800 border border-slate-600 rounded text-center text-red-300 font-mono text-sm py-1 focus:border-red-500 outline-none"
                />
              </div>

            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

// --- COMPONENTE COLONNA SQUADRA ---
const TeamColumn = ({ title, id, players, colorClass, placeholder, onUpdateStat }) => {
  return (
    <div className="flex flex-col flex-1 min-w-0 h-full">
      <div className={`p-3 rounded-t-xl font-bold font-oswald tracking-widest text-center border-b-4 ${colorClass} bg-slate-800`}>
        {title} <span className="text-xs font-normal text-slate-400">({players.length})</span>
      </div>
      
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`
              flex-1 p-2 rounded-b-xl border-x border-b border-slate-700/50 transition-colors
              min-h-[300px] // Area di rilascio MOLTO grande
              ${snapshot.isDraggingOver ? 'bg-slate-700/30 ring-2 ring-inset ring-cyan-500/30' : 'bg-slate-900/30'}
            `}
          >
            {players.length === 0 && !snapshot.isDraggingOver && (
              <div className="h-full flex items-center justify-center text-slate-600 text-xs italic p-4 text-center">
                {placeholder}
              </div>
            )}
            
            {players.map((p, index) => (
              <DraggablePlayer key={p.id} player={p} index={index} listType={id} onUpdateStat={onUpdateStat} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

// --- PAGINA PRINCIPALE ---
export default function MatchCreator({ session }) {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false); // NUOVO STATO: Traccia se stai trascinando
  
  // STATO LISTE
  const [bench, setBench] = useState([]);
  const [teamA, setTeamA] = useState([]);
  const [teamB, setTeamB] = useState([]);
  
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  
  const toLocalISO = (date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date - tzOffset).toISOString().slice(0, 16);
  };
  const [date, setDate] = useState(toLocalISO(new Date()));

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: allPlayers } = await supabase.from('players').select('*').order('name');
    
    const initializedPlayers = allPlayers.map(p => ({
        ...p, goals: 0, assists: 0, gk_turns: 0, gk_conceded: 0, is_mvp: false
    }));

    if (id) {
      const { data: match } = await supabase.from('matches').select('*, match_stats(*)').eq('id', id).single();
      
      if (match) {
        setScoreA(match.team_a_score);
        setScoreB(match.team_b_score);
        setDate(toLocalISO(new Date(match.date)));

        const mapStats = (player, statsArr) => {
            const stat = statsArr.find(s => s.player_id === player.id);
            if(stat) {
                return { ...player, goals: stat.goals, assists: stat.assists, gk_turns: stat.gk_turns, gk_conceded: stat.gk_conceded, is_mvp: stat.is_mvp };
            }
            return player;
        };

        const idsInA = match.match_stats.filter(s => s.team === 'A').map(s => s.player_id);
        const idsInB = match.match_stats.filter(s => s.team === 'B').map(s => s.player_id);
        
        setTeamA(initializedPlayers.filter(p => idsInA.includes(p.id)).map(p => mapStats(p, match.match_stats)));
        setTeamB(initializedPlayers.filter(p => idsInB.includes(p.id)).map(p => mapStats(p, match.match_stats)));
        setBench(initializedPlayers.filter(p => !idsInA.includes(p.id) && !idsInB.includes(p.id)));
      }
    } else {
      setBench(initializedPlayers || []);
    }
    setLoading(false);
  }

  const handleUpdateStat = (playerId, listType, field, value) => {
    const updateList = (list) => list.map(p => p.id === playerId ? { ...p, [field]: value } : p);
    if (listType === 'teamA') setTeamA(prev => updateList(prev));
    if (listType === 'teamB') setTeamB(prev => updateList(prev));
  };

  // --- DRAG GESTIONE ---
  const onDragStart = () => {
    setIsDragging(true); // Disabilita lo SNAP CSS
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const onDragEnd = (result) => {
    setIsDragging(false); // Riabilita lo SNAP CSS
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const getList = (id) => {
      if (id === 'bench') return [bench, setBench];
      if (id === 'teamA') return [teamA, setTeamA];
      if (id === 'teamB') return [teamB, setTeamB];
    };

    const [sourceList, setSourceList] = getList(source.droppableId);
    const [destList, setDestList] = getList(destination.droppableId);

    const newSource = Array.from(sourceList);
    const newDest = source.droppableId === destination.droppableId ? newSource : Array.from(destList);

    const [movedItem] = newSource.splice(source.index, 1);
    
    // Reset stats se torna in panchina
    if (destination.droppableId === 'bench') {
        movedItem.goals = 0; movedItem.assists = 0; movedItem.gk_turns = 0; movedItem.gk_conceded = 0; movedItem.is_mvp = false;
    }

    newDest.splice(destination.index, 0, movedItem);

    if (source.droppableId === destination.droppableId) {
      setSourceList(newSource);
    } else {
      setSourceList(newSource);
      setDestList(newDest);
    }
  };

  const handleSave = async () => {
    if (teamA.length === 0 || teamB.length === 0) {
      alert("Le squadre non possono essere vuote!");
      return;
    }
    setSaving(true);

    const matchData = {
      date: new Date(date).toISOString(), 
      team_a_score: scoreA,
      team_b_score: scoreB,
      status: new Date(date) < new Date() ? 'finished' : 'scheduled'
    };

    let matchId = id;

    if (matchId) {
      await supabase.from('matches').update(matchData).eq('id', matchId);
      await supabase.from('match_stats').delete().eq('match_id', matchId);
    } else {
      const { data, error } = await supabase.from('matches').insert([matchData]).select();
      if (error) { alert(error.message); setSaving(false); return; }
      matchId = data[0].id;
    }

    const prepareStats = (player, team) => ({
        match_id: matchId,
        player_id: player.id,
        team: team,
        goals: player.goals || 0,
        assists: player.assists || 0,
        gk_turns: player.gk_turns || 0,
        gk_conceded: player.gk_conceded || 0,
        is_mvp: player.is_mvp || false
    });

    const statsToInsert = [
      ...teamA.map(p => prepareStats(p, 'A')),
      ...teamB.map(p => prepareStats(p, 'B'))
    ];

    const { error: statsError } = await supabase.from('match_stats').insert(statsToInsert);

    setSaving(false);
    if (statsError) alert("Errore stats: " + statsError.message);
    else navigate('/');
  };

  if (loading) return <div className="p-10 text-center text-slate-500 animate-pulse">Caricamento Editor...</div>;

  return (
    <div className="w-full min-h-screen bg-slate-900 text-slate-100 p-4 pb-32">
      <Header title={id ? "Modifica" : "Nuova Partita"} session={session} />

      {/* DETTAGLI PARTITA */}
      <div className="bg-slate-800 p-4 rounded-2xl mb-6 border border-slate-700 shadow-xl">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-xl border border-slate-700">
             <input 
               type="datetime-local" 
               value={date} 
               onChange={(e) => setDate(e.target.value)}
               className="bg-transparent text-white font-oswald w-full focus:outline-none text-center uppercase tracking-wider"
             />
          </div>
          
          <div className="flex justify-between items-center gap-2">
             <div className="flex-1 flex flex-col items-center">
                <div className="text-[10px] text-cyan-400 font-bold mb-2 tracking-widest">TEAM A</div>
                <input type="number" value={scoreA} onClick={(e) => e.target.select()} onChange={e => setScoreA(parseInt(e.target.value) || 0)} className="w-16 h-16 text-4xl text-center bg-slate-900 rounded-2xl font-bold font-oswald border-2 border-cyan-500/30 focus:border-cyan-500 outline-none shadow-inner text-white" />
             </div>
             <div className="text-2xl font-light text-slate-600 pb-6">-</div>
             <div className="flex-1 flex flex-col items-center">
                <div className="text-[10px] text-fuchsia-400 font-bold mb-2 tracking-widest">TEAM B</div>
                <input type="number" value={scoreB} onClick={(e) => e.target.select()} onChange={e => setScoreB(parseInt(e.target.value) || 0)} className="w-16 h-16 text-4xl text-center bg-slate-900 rounded-2xl font-bold font-oswald border-2 border-fuchsia-500/30 focus:border-fuchsia-500 outline-none shadow-inner text-white" />
             </div>
          </div>
        </div>
      </div>

      {/* AREA DRAG AND DROP */}
      <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* CONTAINER SQUADRE: 
             - overflow-x-auto per lo scroll
             - snap-x disabilitato se isDragging è true
          */}
          <div className={`flex gap-4 overflow-x-auto pb-2 lg:w-2/3 ${isDragging ? '' : 'snap-x snap-mandatory'}`}>
             
             {/* SQUADRA A */}
             <div className="snap-center min-w-[85vw] md:min-w-[45%] h-full">
                <TeamColumn 
                  title="SQUADRA A" 
                  id="teamA" 
                  players={teamA} 
                  colorClass="border-cyan-500 text-cyan-400" 
                  placeholder="Trascina qui..."
                  onUpdateStat={handleUpdateStat}
                />
             </div>

             {/* SQUADRA B */}
             <div className="snap-center min-w-[85vw] md:min-w-[45%] h-full">
                <TeamColumn 
                  title="SQUADRA B" 
                  id="teamB" 
                  players={teamB} 
                  colorClass="border-fuchsia-500 text-fuchsia-400" 
                  placeholder="Trascina qui..."
                  onUpdateStat={handleUpdateStat}
                />
             </div>
          </div>

          {/* PANCHINA */}
          <div className="mt-4 lg:mt-0 lg:w-1/3">
             <div className="p-3 bg-slate-800 rounded-t-xl font-bold font-oswald tracking-widest text-center border-b-4 border-slate-600 text-slate-400 shadow-md">
               DISPONIBILI <span className="text-xs font-normal opacity-70">({bench.length})</span>
             </div>
             <Droppable droppableId="bench">
               {(provided, snapshot) => (
                 <div
                   ref={provided.innerRef}
                   {...provided.droppableProps}
                   className={`bg-slate-800/50 p-2 rounded-b-xl border-x border-b border-slate-700 h-[320px] overflow-y-auto ${snapshot.isDraggingOver ? 'bg-slate-800' : ''}`}
                 >
                   {bench.length === 0 && <div className="text-center text-slate-600 text-xs italic mt-10">Tutti i giocatori assegnati.</div>}
                   
                   {bench.map((p, index) => (
                     <DraggablePlayer key={p.id} player={p} index={index} listType="bench" />
                   ))}
                   {provided.placeholder}
                 </div>
               )}
             </Droppable>
          </div>

        </div>
      </DragDropContext>

      {/* FLOATING ACTION BUTTON */}
      <button 
        onClick={handleSave}
        disabled={saving}
        className="fixed bottom-8 right-6 bg-lime-500 hover:bg-lime-400 text-slate-900 p-4 rounded-full shadow-[0_0_20px_rgba(132,204,22,0.4)] transition-transform active:scale-95 z-50 flex items-center justify-center font-bold"
      >
        {saving ? <div className="w-7 h-7 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div> : <Save size={28} />}
      </button>

    </div>
  );
}