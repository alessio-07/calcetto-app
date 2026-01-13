import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import Header from '../components/Header';
import { ChevronDown, ChevronUp, Star, HelpCircle, Share2, X } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useLocation } from 'react-router-dom';

// --- HELPER COMPONENTS ---
const FormBadge = ({ type }) => {
  const base = "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-xs border border-slate-700 shadow-md shrink-0";
  if (type === 'W') return <div className={`${base} bg-green-600 text-white`}>W</div>;
  if (type === 'D') return <div className={`${base} bg-slate-500 text-white`}>D</div>;
  if (type === 'L') return <div className={`${base} bg-red-600 text-white`}>L</div>;
  if (type === 'X') return <div className={`${base} bg-slate-800 text-slate-500 relative overflow-hidden`}><div className="absolute inset-0 border-t border-slate-600 rotate-45 transform scale-150 origin-center"></div></div>;
  if (type === 'F') return <div className={`${base} bg-slate-800 text-cyan-400 border-cyan-900 border-dashed`}><HelpCircle size={12}/></div>;
  return null;
};

const HighlightCard = ({ title, value, match, label, onClick }) => (
  <div 
    onClick={() => onClick(match)}
    className="bg-slate-800 p-2 rounded-lg border border-slate-700 flex flex-col items-center gap-0.5 min-w-[90px] cursor-pointer hover:bg-slate-700 hover:border-cyan-500/50 transition group"
  >
    <div className="text-[8px] text-slate-400 uppercase tracking-widest group-hover:text-cyan-400 transition-colors truncate w-full text-center">{title}</div>
    <div className="text-xl font-black text-white font-oswald">{value}</div>
    <div className="text-[8px] text-fuchsia-400 font-bold uppercase truncate w-full text-center">{label}</div>
    <div className="text-[8px] text-slate-500 mt-0.5">{new Date(match.date).toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit'})}</div>
  </div>
);

// Stat Box "Mini" Compatto (Senza descrizioni)
const MiniStatBox = ({ label, value, rank, colorClass = "text-white" }) => (
  <div className="bg-slate-800 p-2 rounded-lg border border-slate-700/50 flex flex-col justify-center h-full hover:border-slate-600 transition">
    <div className="text-slate-500 text-[9px] uppercase tracking-wide truncate mb-0.5">{label}</div>
    <div className={`text-base font-bold font-oswald leading-none ${colorClass}`}>
      {value} 
      {rank && <span className="text-[10px] text-slate-400 font-sans font-normal ml-1">({rank}°)</span>}
    </div>
  </div>
);

// --- COMPONENTE SCHEDA GIOCATORE ---
const PlayerCard = ({ player, isExpanded, onToggle, onHighlightClick }) => {
  const [activeTab, setActiveTab] = useState('attack'); 

  return (
    <div id={`player-${player.id}`} className={`bg-slate-800 rounded-xl border transition-all shadow-md ${isExpanded ? 'border-cyan-500/30 ring-1 ring-cyan-500/20' : 'border-slate-700'}`}>
      
      {/* HEADER */}
      <div 
        onClick={onToggle}
        className="flex items-center justify-between p-3 sm:p-4 cursor-pointer active:bg-slate-700/50"
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-lg border-2 border-slate-600 shrink-0 overflow-hidden">
             {player.avatar_url ? <img src={player.avatar_url} alt={player.name} className="w-full h-full object-cover"/> : player.name.charAt(0)}
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white font-oswald tracking-wide">{player.name}</h3>
            <div className="text-[10px] sm:text-xs text-slate-400 flex gap-2">
              <span>{player.stats.matches} Pres</span>
              <span>•</span>
              <span>{player.stats.goals} Gol</span>
              <span>•</span>
              <span className="text-yellow-500 flex items-center gap-0.5">{player.stats.mvps} <Star size={8} fill="currentColor"/></span>
            </div>
          </div>
        </div>
        <div className="text-slate-500">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {/* CONTENUTO ESPANDIBILE */}
      {isExpanded && (
        <div className="bg-slate-900/50 border-t border-slate-700 animate-in slide-in-from-top-2 duration-200">
          
          {/* 1. FORMA RECENTE */}
          <div className="p-4 border-b border-slate-700/50">
            <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Stato Forma</h4>
            <div className="flex gap-1.5 items-center overflow-x-auto pb-1 scrollbar-hide">
              <FormBadge type="F" />
              {player.form.map((res, idx) => (<FormBadge key={idx} type={res} />))}
            </div>
          </div>

          {/* 2. TABS STATISTICHE */}
          <div className="px-4 pt-4">
            <div className="flex p-1 bg-slate-800 rounded-lg border border-slate-700 mb-4">
              <button onClick={() => setActiveTab('attack')} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition ${activeTab === 'attack' ? 'bg-slate-700 text-cyan-400 shadow' : 'text-slate-500 hover:text-slate-300'}`}>Attacco</button>
              <button onClick={() => setActiveTab('defense')} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition ${activeTab === 'defense' ? 'bg-slate-700 text-lime-400 shadow' : 'text-slate-500 hover:text-slate-300'}`}>Difesa</button>
              <button onClick={() => setActiveTab('general')} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition ${activeTab === 'general' ? 'bg-slate-700 text-fuchsia-400 shadow' : 'text-slate-500 hover:text-slate-300'}`}>Generali</button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-6">
              {activeTab === 'attack' && (
                <>
                  <MiniStatBox label="Gol Totali" value={player.stats.goals} rank={player.ranks.goals} colorClass="text-cyan-400" />
                  <MiniStatBox label="Assist Totali" value={player.stats.assists} rank={player.ranks.assists} colorClass="text-fuchsia-400" />
                  <MiniStatBox label="G + A" value={player.stats.ga} rank={player.ranks.ga} />
                  <MiniStatBox label="Rateo Gol" value={player.ratios.goal} rank={player.ranks.r_goal} />
                  <MiniStatBox label="Rateo Assist" value={player.ratios.assist} rank={player.ranks.r_assist} />
                  <MiniStatBox label="Rateo G+A" value={player.ratios.ga} rank={player.ranks.r_ga} />
                </>
              )}
              {activeTab === 'defense' && (
                <>
                  <MiniStatBox label="Clean Sheet" value={player.stats.clean_sheets} rank={player.ranks.clean_sheets} colorClass="text-lime-400" />
                  <MiniStatBox label="Mini CS" value={player.stats.mini_clean_sheets} rank={player.ranks.mini_clean_sheets} />
                  <MiniStatBox label="Turni Porta" value={player.stats.gk_turns} rank={player.ranks.gk_turns} />
                  <MiniStatBox label="Gol Subiti" value={player.stats.gk_conceded} rank={player.ranks.gk_conceded} colorClass="text-red-400" />
                  <MiniStatBox label="Rateo Subiti" value={player.ratios.conceded} rank={player.ranks.r_conceded} />
                  <MiniStatBox label="Rateo Porta" value={player.ratios.gk_rate} rank={player.ranks.r_gk_rate} />
                </>
              )}
              {activeTab === 'general' && (
                <>
                  <MiniStatBox label="Presenze" value={player.stats.matches} rank={player.ranks.matches} />
                  <MiniStatBox label="% Presenza" value={player.ratios.presence + '%'} rank={player.ranks.r_presence} />
                  <MiniStatBox label="MVP Totali" value={player.stats.mvps} rank={player.ranks.mvps} colorClass="text-yellow-400" />
                  
                  <MiniStatBox label="Vittorie" value={player.stats.wins} rank={player.ranks.wins} colorClass="text-green-500" />
                  <MiniStatBox label="Pareggi" value={player.stats.draws} rank={player.ranks.draws} />
                  <MiniStatBox label="Sconfitte" value={player.stats.losses} rank={player.ranks.losses} colorClass="text-red-400" />
                  
                  <MiniStatBox label="Win Rate" value={player.ratios.win_rate.toFixed(0) + '%'} rank={player.ranks.r_win_rate} />
                  <MiniStatBox label="MVP Rate" value={player.ratios.mvp_rate.toFixed(0) + '%'} rank={player.ranks.r_mvp_rate} />
                  <MiniStatBox label="Punti Totali" value={player.ratios.points} rank={player.ranks.points} colorClass="text-lime-400" />
                </>
              )}
            </div>
          </div>

          {/* 3. HIGHLIGHTS */}
          {(player.highlights.goal || player.highlights.wall || player.highlights.mvp) && (
            <div className="px-4 pb-4">
                <h4 className="text-[9px] font-bold text-red-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> Highlights
                </h4>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {player.highlights.goal && <HighlightCard title="MOST GOALS" value={`${player.highlights.goal.val} GOL`} match={player.highlights.goal.match} label="RECORD" onClick={onHighlightClick} />}
                  {player.highlights.assist && <HighlightCard title="MOST ASSISTS" value={`${player.highlights.assist.val} AST`} match={player.highlights.assist.match} label="PLAYMAKER" onClick={onHighlightClick} />}
                  {player.highlights.ga && <HighlightCard title="BEST G+A" value={player.highlights.ga.val} match={player.highlights.ga.match} label="CONTRIBUTION" onClick={onHighlightClick} />}
                  {player.highlights.mvp && <HighlightCard title="MVP" value="MVP" match={player.highlights.mvp.match} label="TOP MATCH" onClick={onHighlightClick} />}
                  {player.highlights.miniCs && <HighlightCard title="MINI CS RECORD" value={player.highlights.miniCs.val} match={player.highlights.miniCs.match} label="TURNI NO GOL" onClick={onHighlightClick} />}
                  {player.highlights.wall && <HighlightCard title="THE WALL" value={`${player.highlights.wall.val} SUB`} match={player.highlights.wall.match} label={`SU ${player.highlights.wall.gk_turns} TURNI`} onClick={onHighlightClick} />}
                </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- PAGINA PRINCIPALE ---
export default function PlayersPage({ session }) {
  const [playersData, setPlayersData] = useState([]);
  const [expandedIds, setExpandedIds] = useState(new Set()); 
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const exportRef = useRef(null);
  const location = useLocation(); 

  useEffect(() => { loadData(); }, []);

  // --- EFFETTO PER APERTURA AUTOMATICA ---
  useEffect(() => {
    if (!loading && location.state?.targetPlayerId) {
      const id = location.state.targetPlayerId;
      setExpandedIds(prev => new Set(prev).add(id));
      setTimeout(() => {
        const element = document.getElementById(`player-${id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [loading, location.state]);

  async function loadData() {
    setLoading(true);
    const { data: players } = await supabase.from('players').select('*').order('name');
    const { data: matches } = await supabase.from('matches').select('*, match_stats(*, players(*))').order('date', { ascending: false });

    if (!players || !matches) { setLoading(false); return; }

    const totalGlobalMatches = matches.filter(m => m.status === 'finished').length;

    let allStats = players.map(p => {
        let s = { 
            id: p.id, 
            goals: 0, assists: 0, ga: 0,
            matches: 0, wins: 0, draws: 0, losses: 0, mvps: 0,
            clean_sheets: 0, mini_clean_sheets: 0, gk_conceded: 0, gk_turns: 0
        };

        matches.forEach(m => {
            if (m.status !== 'finished') return;
            const winner = m.team_a_score > m.team_b_score ? 'A' : (m.team_b_score > m.team_a_score ? 'B' : 'D');
            const ms = m.match_stats.find(stat => stat.player_id === p.id);
            if (ms) {
                s.goals += ms.goals || 0;
                s.assists += ms.assists || 0;
                s.ga += (ms.goals || 0) + (ms.assists || 0);
                s.matches += 1;
                if (ms.is_mvp) s.mvps += 1;
                if (winner === 'D') s.draws += 1;
                else if (winner === ms.team) s.wins += 1;
                else s.losses += 1;
                if (ms.gk_turns > 0) {
                    s.gk_turns += ms.gk_turns;
                    s.gk_conceded += ms.gk_conceded;
                    s.mini_clean_sheets += (ms.gk_turns - ms.gk_conceded);
                    if (ms.gk_conceded === 0) s.clean_sheets += 1; 
                }
            }
        });

        const mp = s.matches || 1;
        const gk = s.gk_turns || 1;
        const ratios = {
            goal: parseFloat((s.goals / mp).toFixed(2)),
            assist: parseFloat((s.assists / mp).toFixed(2)),
            ga: parseFloat((s.ga / mp).toFixed(2)),
            conceded: parseFloat((s.gk_conceded / gk).toFixed(2)),
            gk_rate: parseFloat((s.gk_turns / mp).toFixed(2)),
            presence: totalGlobalMatches > 0 ? Math.round((s.matches / totalGlobalMatches) * 100) : 0,
            win_rate: (s.wins / mp) * 100,
            mvp_rate: (s.mvps / mp) * 100,
            points: (s.wins * 3) + s.draws
        };
        return { ...p, stats: s, ratios };
    });

    const getRankMap = (list, keyGetter, reverse = false) => {
        const sorted = [...list].sort((a, b) => {
            const valA = keyGetter(a);
            const valB = keyGetter(b);
            return reverse ? valA - valB : valB - valA;
        });
        let rankMap = {};
        sorted.forEach((item, index) => {
            const val = keyGetter(item);
            const prevVal = index > 0 ? keyGetter(sorted[index - 1]) : null;
            if (val === prevVal) rankMap[item.id] = rankMap[sorted[index - 1].id];
            else rankMap[item.id] = index + 1;
        });
        return rankMap;
    };

    const ranks = {
        goals: getRankMap(allStats, i => i.stats.goals),
        assists: getRankMap(allStats, i => i.stats.assists),
        ga: getRankMap(allStats, i => i.stats.ga),
        r_goal: getRankMap(allStats, i => i.ratios.goal),
        r_assist: getRankMap(allStats, i => i.ratios.assist),
        r_ga: getRankMap(allStats, i => i.ratios.ga),
        clean_sheets: getRankMap(allStats, i => i.stats.clean_sheets),
        mini_clean_sheets: getRankMap(allStats, i => i.stats.mini_clean_sheets),
        gk_turns: getRankMap(allStats, i => i.stats.gk_turns),
        gk_conceded: getRankMap(allStats, i => i.stats.gk_conceded, true),
        r_conceded: getRankMap(allStats, i => i.ratios.conceded, true),
        r_gk_rate: getRankMap(allStats, i => i.ratios.gk_rate),
        matches: getRankMap(allStats, i => i.stats.matches),
        mvps: getRankMap(allStats, i => i.stats.mvps),
        wins: getRankMap(allStats, i => i.stats.wins),
        draws: getRankMap(allStats, i => i.stats.draws),
        losses: getRankMap(allStats, i => i.stats.losses),
        points: getRankMap(allStats, i => i.ratios.points),
        r_presence: getRankMap(allStats, i => i.ratios.presence),
        r_win_rate: getRankMap(allStats, i => i.ratios.win_rate),
        r_mvp_rate: getRankMap(allStats, i => i.ratios.mvp_rate),
    };

    const finalData = allStats.map(p => {
        let history = [];
        matches.filter(m => m.status === 'finished').forEach(m => {
            const ms = m.match_stats.find(s => s.player_id === p.id);
            if (ms) {
                const myTeam = ms.team;
                const myScore = myTeam === 'A' ? m.team_a_score : m.team_b_score;
                const oppScore = myTeam === 'A' ? m.team_b_score : m.team_a_score;
                history.push(myScore > oppScore ? 'W' : (myScore === oppScore ? 'D' : 'L'));
            } else {
                history.push('X');
            }
        });

        let h = { goal: null, assist: null, ga: null, miniCs: null, mvp: null, wall: null };
        matches.filter(m => m.status === 'finished').forEach(m => {
            const ms = m.match_stats.find(s => s.player_id === p.id);
            if (!ms) return;
            if (ms.goals > 0 && (!h.goal || ms.goals > h.goal.val)) h.goal = { val: ms.goals, match: m, ...ms };
            if (ms.assists > 0 && (!h.assist || ms.assists > h.assist.val)) h.assist = { val: ms.assists, match: m, ...ms };
            const matchGA = ms.goals + ms.assists;
            if (matchGA > 0 && (!h.ga || matchGA > h.ga.val)) h.ga = { val: matchGA, match: m, ...ms };
            if (ms.is_mvp && !h.mvp) h.mvp = { val: 'MVP', match: m, ...ms };
            const matchMiniCs = ms.gk_turns - ms.gk_conceded;
            if (ms.gk_turns > 0 && matchMiniCs > 0 && (!h.miniCs || matchMiniCs > h.miniCs.val)) h.miniCs = { val: matchMiniCs, match: m, ...ms };
            if (ms.gk_turns > 0) {
               const currentIsClean = ms.gk_conceded === 0;
               const bestIsClean = h.wall ? h.wall.gk_conceded === 0 : false;
               if (!h.wall) h.wall = { val: ms.gk_conceded, match: m, ...ms };
               else if (currentIsClean && !bestIsClean) h.wall = { val: ms.gk_conceded, match: m, ...ms };
               else if (currentIsClean === bestIsClean && ms.gk_turns > h.wall.gk_turns) h.wall = { val: ms.gk_conceded, match: m, ...ms };
            }
        });

        return {
            ...p,
            ranks: {
                goals: ranks.goals[p.id], assists: ranks.assists[p.id], ga: ranks.ga[p.id],
                r_goal: ranks.r_goal[p.id], r_assist: ranks.r_assist[p.id], r_ga: ranks.r_ga[p.id],
                clean_sheets: ranks.clean_sheets[p.id], mini_clean_sheets: ranks.mini_clean_sheets[p.id],
                gk_turns: ranks.gk_turns[p.id], gk_conceded: ranks.gk_conceded[p.id],
                r_conceded: ranks.r_conceded[p.id], r_gk_rate: ranks.r_gk_rate[p.id],
                matches: ranks.matches[p.id], mvps: ranks.mvps[p.id], wins: ranks.wins[p.id],
                draws: ranks.draws[p.id], losses: ranks.losses[p.id], points: ranks.points[p.id],
                r_presence: ranks.r_presence[p.id], r_win_rate: ranks.r_win_rate[p.id], r_mvp_rate: ranks.r_mvp_rate[p.id]
            },
            form: history.slice(0, 5),
            highlights: h
        };
    });

    setPlayersData(finalData);
    setLoading(false);
  }

  const toggleExpand = (id) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedIds(newSet);
  };

  const handleShare = async () => {
    if (!exportRef.current) return;
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const dataUrl = await toPng(exportRef.current, { cacheBust: true, backgroundColor: '#0f172a', pixelRatio: 2, width: 650 });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'risultato-partita.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Risultato Partita' }); } 
      else { const link = document.createElement('a'); link.download = `partita.png`; link.href = dataUrl; link.click(); }
    } catch (error) { console.error("Errore condivisione:", error); alert("Errore generazione immagine."); }
  };

  const goToPlayer = (id) => {
    setExpandedIds(new Set([id]));
    setSelectedMatch(null); 
    setTimeout(() => {
        const element = document.getElementById(`player-${id}`);
        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  return (
    <div className="w-full min-h-screen bg-slate-900 text-slate-100 p-4 pb-24">
      <Header title="Giocatori" session={session} />

      {loading ? <div className="text-center text-slate-500 mt-10 animate-pulse">Scouting giocatori...</div> : (
        <div className="space-y-4">
          {playersData.map(player => (
            <PlayerCard 
              key={player.id} 
              player={player} 
              isExpanded={expandedIds.has(player.id)} 
              onToggle={() => toggleExpand(player.id)}
              onHighlightClick={setSelectedMatch}
            />
          ))}
        </div>
      )}

      {/* --- MODALE PARTITA --- */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-slate-950/80 z-[70] flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setSelectedMatch(null)}>
          <div className="bg-slate-900 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl flex flex-col border border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-900/95 p-4 flex justify-between items-center border-b border-slate-800 z-10 backdrop-blur">
              <h2 className="font-bold text-lg font-oswald tracking-wide text-white">MATCH REPORT</h2>
              <div className="flex gap-2">
                <button onClick={handleShare} className="p-2 bg-slate-800 text-cyan-400 rounded-full hover:bg-slate-700 transition active:scale-90"><Share2 size={20}/></button>
                <button onClick={() => setSelectedMatch(null)} className="p-2 bg-slate-800 text-slate-400 rounded-full hover:bg-slate-700 transition active:scale-90"><X size={20}/></button>
              </div>
            </div>
            <div className="p-6">
              <div className="text-center mb-8">
                 <div className="text-5xl sm:text-6xl font-bold text-white font-oswald drop-shadow-xl">
                    <>{selectedMatch.team_a_score} <span className="text-slate-700/80 text-4xl sm:text-5xl align-middle font-light mx-3 sm:mx-4">-</span> {selectedMatch.team_b_score}</>
                 </div>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="text-slate-500 text-xs uppercase border-b border-slate-800 font-oswald tracking-wider"><th className="text-left py-3 pl-2">Giocatori</th><th className="text-center py-3 text-lg" title="Gol">⚽</th><th className="text-center py-3 text-lg" title="Assist">👟</th><th className="text-center py-3 text-lg" title="Porta">🧤</th><th className="text-center py-3 text-lg" title="Subiti">🥅</th></tr></thead>
                <tbody className="divide-y divide-slate-800">{selectedMatch.match_stats.map(stat => (
                    <tr key={stat.id} onClick={() => goToPlayer(stat.player_id)} className="group hover:bg-slate-800/50 transition cursor-pointer">
                        <td className="py-3 pl-2 font-medium flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${stat.team === 'A' ? 'bg-cyan-500' : 'bg-fuchsia-600'}`}>{stat.players?.name?.charAt(0)}</div>
                            <span className="text-slate-200 text-base truncate max-w-[120px] underline decoration-transparent group-hover:decoration-slate-500 underline-offset-2 transition-all">{stat.players?.name}</span>
                            {stat.is_mvp && <Star size={14} className="text-yellow-400 fill-yellow-400 animate-pulse shrink-0" />}
                        </td>
                        <td className="text-center font-bold text-lg text-white font-oswald">{stat.goals > 0 ? stat.goals : <span className="text-slate-700 font-sans text-sm">-</span>}</td>
                        <td className="text-center text-slate-400">{stat.assists > 0 ? stat.assists : '-'}</td>
                        <td className="text-center text-slate-400">{stat.gk_turns > 0 ? stat.gk_turns : '-'}</td>
                        <td className="text-center font-bold text-fuchsia-400">{stat.gk_turns > 0 ? stat.gk_conceded : '-'}</td>
                    </tr>
                ))}</tbody>
              </table>
              <div className="mt-8 pt-4 border-t border-slate-800 text-[10px] text-slate-500 text-center flex flex-wrap justify-center items-center gap-3 uppercase tracking-widest font-bold"><span>Legenda:</span><span>⚽ Gol</span> | <span>👟 Assist</span> | <span>🧤 Turni Porta</span> | <span>🥅 Gol Subiti</span> |<span className="flex items-center gap-0.5 text-yellow-500"><Star size={10} className="fill-yellow-500"/> MVP</span></div>
            </div>
          </div>
        </div>
      )}

      {/* --- EXPORT --- */}
      {selectedMatch && (
        <div ref={exportRef} style={{ position: 'fixed', top: 0, left: 0, width: '650px', zIndex: -50, backgroundColor: '#0f172a', padding: '40px', boxSizing: 'border-box', pointerEvents: 'none', fontFamily: 'Roboto, sans-serif' }}>
           <div className="text-center text-cyan-400 text-sm uppercase font-bold mb-2 tracking-[0.3em] font-oswald">{new Date(selectedMatch.date).toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
           <div className="text-center mb-10"><div className="text-8xl font-black text-white font-oswald drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"><>{selectedMatch.team_a_score} <span className="text-slate-700/80 text-6xl align-middle font-light mx-6">-</span> {selectedMatch.team_b_score}</></div></div>
           <div className="border-t-2 border-slate-700">
             <div className="flex items-center py-4 border-b border-slate-800"><div className="flex-grow font-bold text-slate-500 text-xs uppercase pl-4 tracking-widest font-oswald">Player</div><div className="w-16 text-center text-2xl">⚽</div><div className="w-16 text-center text-2xl">👟</div><div className="w-16 text-center text-2xl">🧤</div><div className="w-16 text-center text-2xl">🥅</div></div>
             <div className="flex flex-col">{selectedMatch.match_stats.map(stat => (<div key={stat.id} className="flex items-center h-16 border-b border-slate-800/50"><div className="flex-grow pl-4 flex items-center h-full"><div className={`w-1.5 h-8 mr-4 rounded-full ${stat.team === 'A' ? 'bg-cyan-500' : 'bg-fuchsia-600'}`}></div><span className="font-bold text-slate-100 text-xl mr-3 leading-none">{stat.players?.name}</span>{stat.is_mvp && <Star size={22} className="text-yellow-400 fill-yellow-400" />}</div><div className="w-16 flex items-center justify-center h-full"><span className={`font-bold text-2xl font-oswald ${stat.goals > 0 ? 'text-white' : 'text-slate-700'}`}>{stat.goals > 0 ? stat.goals : '-'}</span></div><div className="w-16 flex items-center justify-center h-full"><span className={`font-medium text-xl font-oswald ${stat.assists > 0 ? 'text-slate-300' : 'text-slate-700'}`}>{stat.assists > 0 ? stat.assists : '-'}</span></div><div className="w-16 flex items-center justify-center h-full"><span className={`font-medium text-xl font-oswald ${stat.gk_turns > 0 ? 'text-slate-300' : 'text-slate-700'}`}>{stat.gk_turns > 0 ? stat.gk_turns : '-'}</span></div><div className="w-16 flex items-center justify-center h-full"><span className={`font-bold text-2xl font-oswald ${stat.gk_turns > 0 ? 'text-fuchsia-500' : 'text-slate-700'}`}>{stat.gk_turns > 0 ? stat.gk_conceded : '-'}</span></div></div>))}</div>
           </div>
           <div className="mt-10 flex justify-center gap-6 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] font-oswald"><span>⚽ Gol</span> <span>👟 Assist</span> <span>🧤 Turni Porta</span> <span>🥅 Subiti</span> <span className="text-yellow-500">★ MVP</span></div>
        </div>
      )}
    </div>
  );
}