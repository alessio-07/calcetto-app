import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { supabase } from '../supabase';
import Header from '../components/Header';
import { Save, Star, Shield, Goal, Footprints, ChevronUp, ChevronDown, Medal, X } from 'lucide-react'; // Aggiunta X
import { useNavigate, useParams } from 'react-router-dom';

// --- COMPONENTE INPUT PERSONALIZZATO (StatInput) ---
const StatInput = ({ label, icon: Icon, value, onChange, colorLabel }) => {
  const displayValue = value === 0 ? '' : value;
  
  const handleChange = (e) => {
    const val = e.target.value;
    onChange(val === '' ? 0 : parseInt(val));
  };

  const handleStep = (amount) => {
    const newValue = Math.max(0, (value || 0) + amount);
    onChange(newValue);
  };

  return (
    <div className="flex flex-col items-center w-14">
      <label className={`text-[9px] ${colorLabel} font-bold mb-0.5 flex items-center gap-0.5`}>
        {Icon && <Icon size={10} />} {label}
      </label>
      <div className="relative w-full flex items-center bg-slate-800 border border-slate-600 rounded overflow-hidden focus-within:border-slate-400 transition-colors">
        <input 
          type="number" 
          min="0" 
          value={displayValue} 
          onFocus={(e) => e.target.select()} 
          onPointerDown={(e) => e.stopPropagation()} 
          onChange={handleChange} 
          placeholder="0" 
          className={`w-full bg-transparent text-center text-white font-mono text-sm py-1 pl-1 focus:outline-none appearance-none`} 
          style={{ MozAppearance: 'textfield' }} 
        />
        <div className="flex flex-col border-l border-slate-600">
          <button 
            onPointerDown={(e) => e.stopPropagation()} 
            onClick={() => handleStep(1)} 
            className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-0.5 h-3.5 flex items-center justify-center border-b border-slate-600 active:bg-slate-500"
          >
            <ChevronUp size={10} />
          </button>
          <button 
            onPointerDown={(e) => e.stopPropagation()} 
            onClick={() => handleStep(-1)} 
            className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-0.5 h-3.5 flex items-center justify-center active:bg-slate-500"
          >
            <ChevronDown size={10} />
          </button>
        </div>
      </div>
    </div>
  );
};

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
          className={`mb-2 rounded-xl border shadow-sm transition-colors select-none overflow-hidden ${snapshot.isDragging ? 'bg-fuchsia-900/90 border-fuchsia-500 shadow-2xl scale-105 z-50 ring-2 ring-fuchsia-400' : 'bg-slate-800 border-slate-700'}`}
        >
          {/* HEADER CARD */}
          <div className="flex items-center gap-3 p-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0 pointer-events-none">
              {player.avatar_url ? <img src={player.avatar_url} alt="av" className="w-full h-full rounded-full object-cover" /> : player.name.charAt(0)}
            </div>
            <span className="font-bold text-slate-200 font-oswald truncate flex-1 pointer-events-none">{player.name}</span>
            
            {isTeam && (
              <div className="flex gap-1">
                {/* Tasto CANDIDATO (Medaglia) */}
                <button
                  onPointerDown={(e) => e.stopPropagation()} 
                  onClick={() => onUpdateStat(player.id, listType, 'is_candidate', !player.is_candidate)}
                  className={`p-1.5 rounded-full transition ${player.is_candidate ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-600 hover:text-slate-400'}`}
                  title="Candidato MVP"
                >
                  <Medal size={18} fill={player.is_candidate ? "currentColor" : "none"} />
                </button>

                {/* Tasto MVP (Stella) */}
                <button
                  onPointerDown={(e) => e.stopPropagation()} 
                  onClick={() => onUpdateStat(player.id, listType, 'is_mvp', !player.is_mvp)}
                  className={`p-1.5 rounded-full transition ${player.is_mvp ? 'bg-yellow-500/20 text-yellow-400' : 'text-slate-600 hover:text-slate-400'}`}
                  title="MVP Vincitore"
                >
                  <Star size={18} fill={player.is_mvp ? "currentColor" : "none"} />
                </button>
              </div>
            )}
          </div>

          {/* SECTION STATISTICHE */}
          {isTeam && (
            <div className="bg-slate-900/50 p-2 flex items-center justify-between gap-1 border-t border-slate-700">
              <StatInput label="GOL" icon={Goal} value={player.goals || 0} onChange={(val) => onUpdateStat(player.id, listType, 'goals', val)} colorLabel="text-cyan-400"/>
              <StatInput label="AST" icon={Footprints} value={player.assists || 0} onChange={(val) => onUpdateStat(player.id, listType, 'assists', val)} colorLabel="text-fuchsia-400"/>
              <div className="w-px h-8 bg-slate-700 mx-1"></div>
              <StatInput label="GK" icon={Shield} value={player.gk_turns || 0} onChange={(val) => onUpdateStat(player.id, listType, 'gk_turns', val)} colorLabel="text-slate-400"/>
              <StatInput label="SUB" value={player.gk_conceded || 0} onChange={(val) => onUpdateStat(player.id, listType, 'gk_conceded', val)} colorLabel="text-red-400"/>
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
      <div className={`p-3 rounded-t-xl font-bold font-oswald tracking-widest text-center border-b-4 ${colorClass} bg-slate-800`}>{title} <span className="text-xs font-normal text-slate-400">({players.length})</span></div>
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className={`flex-1 p-2 rounded-b-xl border-x border-b border-slate-700/50 transition-colors min-h-[300px] ${snapshot.isDraggingOver ? 'bg-slate-700/30 ring-2 ring-inset ring-cyan-500/30' : 'bg-slate-900/30'}`}>
            {players.length === 0 && !snapshot.isDraggingOver && <div className="h-full flex items-center justify-center text-slate-600 text-xs italic p-4 text-center">{placeholder}</div>}
            {players.map((p, index) => (<DraggablePlayer key={p.id} player={p} index={index} listType={id} onUpdateStat={onUpdateStat} />))}
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
  const [isDragging, setIsDragging] = useState(false); 
  
  const [bench, setBench] = useState([]);
  const [teamA, setTeamA] = useState([]);
  const [teamB, setTeamB] = useState([]);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  
  const toLocalISO = (date) => { const tzOffset = date.getTimezoneOffset() * 60000; return new Date(date - tzOffset).toISOString().slice(0, 16); };
  const [date, setDate] = useState(toLocalISO(new Date()));

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: allPlayers } = await supabase.from('players').select('*').order('name');
    const initializedPlayers = allPlayers.map(p => ({ ...p, goals: 0, assists: 0, gk_turns: 0, gk_conceded: 0, is_mvp: false, is_candidate: false }));

    if (id) {
      const { data: match } = await supabase.from('matches').select('*, match_stats(*)').eq('id', id).single();
      if (match) {
        setScoreA(match.team_a_score); setScoreB(match.team_b_score); setDate(toLocalISO(new Date(match.date)));
        const mapStats = (player, statsArr) => {
            const stat = statsArr.find(s => s.player_id === player.id);
            if(stat) return { ...player, goals: stat.goals, assists: stat.assists, gk_turns: stat.gk_turns, gk_conceded: stat.gk_conceded, is_mvp: stat.is_mvp, is_candidate: stat.is_candidate };
            return player;
        };
        const idsInA = match.match_stats.filter(s => s.team === 'A').map(s => s.player_id);
        const idsInB = match.match_stats.filter(s => s.team === 'B').map(s => s.player_id);
        setTeamA(initializedPlayers.filter(p => idsInA.includes(p.id)).map(p => mapStats(p, match.match_stats)));
        setTeamB(initializedPlayers.filter(p => idsInB.includes(p.id)).map(p => mapStats(p, match.match_stats)));
        setBench(initializedPlayers.filter(p => !idsInA.includes(p.id) && !idsInB.includes(p.id)));
      }
    } else { setBench(initializedPlayers || []); }
    setLoading(false);
  }

  const handleUpdateStat = (playerId, listType, field, value) => {
    const updateList = (list) => list.map(p => p.id === playerId ? { ...p, [field]: value } : p);
    if (listType === 'teamA') setTeamA(prev => updateList(prev));
    if (listType === 'teamB') setTeamB(prev => updateList(prev));
  };

  const onDragStart = () => { setIsDragging(true); if (navigator.vibrate) navigator.vibrate(10); };
  const onDragEnd = (result) => {
    setIsDragging(false); 
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    const getList = (id) => { if (id === 'bench') return [bench, setBench]; if (id === 'teamA') return [teamA, setTeamA]; if (id === 'teamB') return [teamB, setTeamB]; };
    const [sourceList, setSourceList] = getList(source.droppableId);
    const [destList, setDestList] = getList(destination.droppableId);
    const newSource = Array.from(sourceList);
    const newDest = source.droppableId === destination.droppableId ? newSource : Array.from(destList);
    const [movedItem] = newSource.splice(source.index, 1);
    if (destination.droppableId === 'bench') { movedItem.goals = 0; movedItem.assists = 0; movedItem.gk_turns = 0; movedItem.gk_conceded = 0; movedItem.is_mvp = false; movedItem.is_candidate = false; }
    newDest.splice(destination.index, 0, movedItem);
    if (source.droppableId === destination.droppableId) { setSourceList(newSource); } else { setSourceList(newSource); setDestList(newDest); }
  };

  const handleSave = async () => {
    if (teamA.length === 0 || teamB.length === 0) { alert("Le squadre non possono essere vuote!"); return; }
    setSaving(true);
    const matchData = { date: new Date(date).toISOString(), team_a_score: scoreA, team_b_score: scoreB, status: new Date(date) < new Date() ? 'finished' : 'scheduled' };
    let matchId = id;
    if (matchId) { await supabase.from('matches').update(matchData).eq('id', matchId); await supabase.from('match_stats').delete().eq('match_id', matchId); } 
    else { const { data, error } = await supabase.from('matches').insert([matchData]).select(); if (error) { alert(error.message); setSaving(false); return; } matchId = data[0].id; }
    
    const prepareStats = (player, team) => ({ match_id: matchId, player_id: player.id, team: team, goals: player.goals || 0, assists: player.assists || 0, gk_turns: player.gk_turns || 0, gk_conceded: player.gk_conceded || 0, is_mvp: player.is_mvp || false, is_candidate: player.is_candidate || false });
    const statsToInsert = [ ...teamA.map(p => prepareStats(p, 'A')), ...teamB.map(p => prepareStats(p, 'B')) ];
    const { error: statsError } = await supabase.from('match_stats').insert(statsToInsert);
    setSaving(false);
    if (statsError) alert("Errore stats: " + statsError.message); else navigate('/');
  };

  if (loading) return <div className="p-10 text-center text-slate-500 animate-pulse">Caricamento Editor...</div>;

  return (
    <div className="w-full min-h-screen bg-slate-900 text-slate-100 p-4 pb-32">
      <div className="relative">
        <Header title={id ? "Modifica" : "Nuova Partita"} session={session} />
        {/* TASTO INDIETRO (X) POSIZIONATO SOPRA L'HEADER/TITOLO */}
        <button 
            onClick={() => navigate('/admin')}
            className="absolute top-0 right-0 p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition shadow-lg border border-slate-700"
        >
            <X size={24} />
        </button>
      </div>

      <div className="bg-slate-800 p-4 rounded-2xl mb-6 border border-slate-700 shadow-xl">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-xl border border-slate-700"><input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent text-white font-oswald w-full focus:outline-none text-center uppercase tracking-wider" /></div>
          <div className="flex justify-between items-center gap-2">
             <div className="flex-1 flex flex-col items-center"><div className="text-[10px] text-cyan-400 font-bold mb-2 tracking-widest">TEAM A</div><input type="number" value={scoreA} onClick={(e) => e.target.select()} onChange={e => setScoreA(parseInt(e.target.value) || 0)} className="w-16 h-16 text-4xl text-center bg-slate-900 rounded-2xl font-bold font-oswald border-2 border-cyan-500/30 focus:border-cyan-500 outline-none shadow-inner text-white" /></div>
             <div className="text-2xl font-light text-slate-600 pb-6">-</div>
             <div className="flex-1 flex flex-col items-center"><div className="text-[10px] text-fuchsia-400 font-bold mb-2 tracking-widest">TEAM B</div><input type="number" value={scoreB} onClick={(e) => e.target.select()} onChange={e => setScoreB(parseInt(e.target.value) || 0)} className="w-16 h-16 text-4xl text-center bg-slate-900 rounded-2xl font-bold font-oswald border-2 border-fuchsia-500/30 focus:border-fuchsia-500 outline-none shadow-inner text-white" /></div>
          </div>
        </div>
      </div>
      <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
        <div className="flex flex-col lg:flex-row gap-6">
          <div className={`flex gap-4 overflow-x-auto pb-2 lg:w-2/3 ${isDragging ? '' : 'snap-x snap-mandatory'}`}>
             <div className="snap-center min-w-[85vw] md:min-w-[45%] h-full"><TeamColumn title="SQUADRA A" id="teamA" players={teamA} colorClass="border-cyan-500 text-cyan-400" placeholder="Trascina qui..." onUpdateStat={handleUpdateStat} /></div>
             <div className="snap-center min-w-[85vw] md:min-w-[45%] h-full"><TeamColumn title="SQUADRA B" id="teamB" players={teamB} colorClass="border-fuchsia-500 text-fuchsia-400" placeholder="Trascina qui..." onUpdateStat={handleUpdateStat} /></div>
          </div>
          <div className="mt-4 lg:mt-0 lg:w-1/3"><div className="p-3 bg-slate-800 rounded-t-xl font-bold font-oswald tracking-widest text-center border-b-4 border-slate-600 text-slate-400 shadow-md">DISPONIBILI <span className="text-xs font-normal opacity-70">({bench.length})</span></div><Droppable droppableId="bench">{(provided, snapshot) => (<div ref={provided.innerRef} {...provided.droppableProps} className={`bg-slate-800/50 p-2 rounded-b-xl border-x border-b border-slate-700 h-[320px] overflow-y-auto ${snapshot.isDraggingOver ? 'bg-slate-800' : ''}`}>{bench.length === 0 && <div className="text-center text-slate-600 text-xs italic mt-10">Tutti i giocatori assegnati.</div>}{bench.map((p, index) => (<DraggablePlayer key={p.id} player={p} index={index} listType="bench" />))}{provided.placeholder}</div>)}</Droppable></div>
        </div>
      </DragDropContext>
      <button onClick={handleSave} disabled={saving} className="fixed bottom-8 right-6 bg-lime-500 hover:bg-lime-400 text-slate-900 p-4 rounded-full shadow-[0_0_20px_rgba(132,204,22,0.4)] transition-transform active:scale-95 z-50 flex items-center justify-center font-bold">{saving ? <div className="w-7 h-7 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div> : <Save size={28} />}</button>
    </div>
  );
}