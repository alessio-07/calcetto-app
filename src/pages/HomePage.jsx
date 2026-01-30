import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import { X, Star, Clock, Share2, Medal } from 'lucide-react';
import { toPng } from 'html-to-image';
import Header from '../components/Header';
import { useNavigate } from 'react-router-dom';

const getUniquePrefix = (targetName, allNames) => {
  if (!targetName) return { main: '?', sub: '' };
  const cleanTarget = targetName.trim().toUpperCase();
  const otherNames = allNames.map(n => n?.trim().toUpperCase()).filter(n => n !== cleanTarget); 
  let length = 1;
  while (length <= cleanTarget.length) {
    const prefix = cleanTarget.substring(0, length);
    const collision = otherNames.some(other => other.startsWith(prefix));
    if (!collision) return { main: prefix.charAt(0), sub: prefix.substring(1).toLowerCase() };
    length++;
  }
  return { main: cleanTarget.charAt(0), sub: cleanTarget.substring(1).toLowerCase() };
};

const PlayerAvatar = ({ player, team, isMvp, overlapClass, allTeamPlayers }) => {
  const navigate = useNavigate();
  const allNames = allTeamPlayers.map(p => p.name);
  const { main, sub } = getUniquePrefix(player.name, allNames);
  const bgClass = team === 'A' ? 'bg-gradient-to-br from-cyan-400 to-cyan-600' : 'bg-gradient-to-br from-fuchsia-400 to-fuchsia-600';
  const borderClass = isMvp ? 'ring-1 md:ring-2 ring-inset ring-yellow-400' : 'ring-1 md:ring-2 ring-inset ring-slate-800';

  const handleAvatarClick = (e) => {
    if (window.innerWidth < 768) return;
    e.stopPropagation(); 
    navigate('/players', { state: { targetPlayerId: player.id } });
  };

  return (
    <div onClick={handleAvatarClick} className={`relative w-6 h-6 sm:w-10 sm:h-10 md:w-14 md:h-14 rounded-full overflow-hidden flex items-center justify-center text-white font-bold shrink-0 z-10 ${bgClass} ${borderClass} ${overlapClass} md:cursor-pointer md:hover:scale-110 md:transition-transform`} title={player.name}>
      {player.avatar_url ? (<img src={player.avatar_url} alt={player.name} className="w-full h-full rounded-full object-cover" />) : (<div className="flex items-baseline leading-none drop-shadow-md"><span className="text-[9px] sm:text-sm md:text-2xl font-oswald">{main}</span>{sub && <span className="text-[7px] sm:text-[9px] md:text-xs italic ml-[0.5px] opacity-90">{sub}</span>}</div>)}
    </div>
  );
};

function MatchCountdown({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const calculateTime = () => {
      const now = new Date(); const matchTime = new Date(targetDate); const diff = matchTime - now;
      if (diff <= 0) { setTimeLeft('VS'); return; }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24)); const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)); const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      if (days >= 1) { setTimeLeft(`-${days}gg`); } else { const mString = minutes < 10 ? `0${minutes}` : minutes; setTimeLeft(`${hours}h ${mString}m`); }
    };
    calculateTime(); const timer = setInterval(calculateTime, 60000); return () => clearInterval(timer);
  }, [targetDate]);
  return <span className="text-lime-400 tracking-tight font-oswald">{timeLeft}</span>;
}

export default function HomePage({ session }) {
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const exportRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { fetchMatches(); }, []);

  async function fetchMatches() {
    const { data, error } = await supabase.from('matches').select(`*, match_stats (team, goals, assists, gk_turns, gk_conceded, is_mvp, is_candidate, player_id, players ( * ) )`).order('date', { ascending: false });
    if (error) console.error('Errore:', error); else setMatches(data || []);
  }

  const getTeamPlayers = (matchStats, teamLetter) => { if (!matchStats) return []; return matchStats.filter(s => s.team === teamLetter).map(s => ({ ...s.players, is_mvp: s.is_mvp })); };

  const handleShare = async () => {
    if (!exportRef.current) return;
    try { 
        await new Promise(resolve => setTimeout(resolve, 500)); 
        // FIX: Rimosso width fisso e pixelRatio per lasciare che l'HTML definisca la dimensione
        const dataUrl = await toPng(exportRef.current, { cacheBust: true, backgroundColor: '#0f172a' }); 
        const blob = await (await fetch(dataUrl)).blob(); 
        const file = new File([blob], 'risultato-partita.png', { type: 'image/png' }); 
        if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Risultato Partita' }); } 
        else { const link = document.createElement('a'); link.download = `partita-${selectedMatch.date.split('T')[0]}.png`; link.href = dataUrl; link.click(); } 
    } catch (error) { console.error("Errore condivisione:", error); alert("Errore nella generazione dell'immagine."); }
  };

  const goToPlayer = (playerId) => { navigate('/players', { state: { targetPlayerId: playerId } }); };

  return (
    <div className="w-full min-h-screen bg-slate-900 text-slate-100 p-4 pb-24">
      <Header title="Partite" session={session} />
      {matches.length === 0 ? <p className="text-slate-500">Nessuna partita trovata.</p> : null}
      <div className="space-y-6">
        {matches.map(match => {
          const isPreview = match.status === 'scheduled';
          const teamAPlayers = getTeamPlayers(match.match_stats, 'A');
          const teamBPlayers = getTeamPlayers(match.match_stats, 'B');
          return (
            <div key={match.id} onClick={() => setSelectedMatch(match)} className={`relative p-3 sm:p-6 rounded-3xl shadow-xl cursor-pointer transition-transform active:scale-95 overflow-hidden group border border-slate-700/50 bg-gradient-to-br from-cyan-950/40 via-slate-800 to-fuchsia-950/40 hover:from-cyan-900/50 hover:to-fuchsia-900/50`}>
              <div className="flex justify-between items-center mb-4 sm:mb-8">
                 <div className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-2 font-oswald">{new Date(match.date).toLocaleDateString('it-IT')} {isPreview && <span className="text-slate-500 hidden sm:inline">- {new Date(match.date).toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'})}</span>}</div>
                 {isPreview && (<span className="bg-lime-500/10 text-lime-400 border border-lime-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-[0_0_10px_rgba(132,204,22,0.2)]"><Clock size={10}/> <span className="hidden sm:inline">PREVIEW</span></span>)}
              </div>
              <div className="flex justify-between items-center relative z-10">
                <div className="flex-1 min-w-0"><div className="flex overflow-hidden p-1 pl-1">{teamAPlayers.map(player => (<PlayerAvatar key={player.id} player={player} team="A" isMvp={player.is_mvp} overlapClass="-ml-1.5 sm:-ml-3 md:-ml-5 first:ml-0" allTeamPlayers={teamAPlayers}/>))}</div></div>
                <div className={`mx-1 sm:mx-4 px-0 font-oswald font-black text-3xl sm:text-6xl whitespace-nowrap text-center ${isPreview ? 'text-lime-400 tracking-tight' : 'text-white'}`}>{isPreview ? (<MatchCountdown targetDate={match.date} />) : (<span className="drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">{match.team_a_score}<span className="text-slate-700/80 text-xl sm:text-4xl align-middle mx-1 sm:mx-3 font-light">-</span>{match.team_b_score}</span>)}</div>
                <div className="flex-1 min-w-0"><div className="flex flex-row-reverse overflow-hidden p-1 pr-1">{teamBPlayers.map(player => (<PlayerAvatar key={player.id} player={player} team="B" isMvp={player.is_mvp} overlapClass="-mr-1.5 sm:-mr-3 md:-mr-5 first:mr-0" allTeamPlayers={teamBPlayers}/>))}</div></div>
              </div>
              <div className="text-center text-[8px] sm:text-[10px] uppercase tracking-widest text-slate-500 mt-4 sm:mt-6 font-bold group-hover:text-white transition-colors">Tocca per i dettagli</div>
            </div>
          );
        })}
      </div>
      
      {/* MODALE VISUALE */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-slate-950/80 z-[60] flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setSelectedMatch(null)}>
          <div className="bg-slate-900 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl flex flex-col border border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-slate-900/95 p-4 flex justify-between items-center border-b border-slate-800 z-10 backdrop-blur">
              <h2 className="font-bold text-lg font-oswald tracking-wide text-white">MATCH REPORT</h2>
              <div className="flex gap-2">
                <button onClick={handleShare} className="p-2 bg-slate-800 text-cyan-400 rounded-full hover:bg-slate-700 transition active:scale-90"><Share2 size={20} /></button>
                <button onClick={() => setSelectedMatch(null)} className="p-2 bg-slate-800 text-slate-400 rounded-full hover:bg-slate-700 transition active:scale-90"><X size={20} /></button>
              </div>
            </div>
            <div className="p-6">
              <div className="text-center mb-8">
                 <div className="text-5xl sm:text-6xl font-bold text-white font-oswald drop-shadow-xl">{selectedMatch.status === 'scheduled' ? <span className="text-lime-400 text-2xl sm:text-3xl tracking-tight"><MatchCountdown targetDate={selectedMatch.date} /></span> : <>{selectedMatch.team_a_score} <span className="text-slate-700/80 text-4xl sm:text-5xl align-middle font-light mx-3 sm:mx-4">-</span> {selectedMatch.team_b_score}</>}</div>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="text-slate-500 text-xs uppercase border-b border-slate-800 font-oswald tracking-wider"><th className="text-left py-3 pl-2">Giocatori</th>{selectedMatch.status !== 'scheduled' && (<><th className="text-center py-3 text-lg" title="Gol">⚽</th><th className="text-center py-3 text-lg" title="Assist">👟</th><th className="text-center py-3 text-lg" title="Porta">🧤</th><th className="text-center py-3 text-lg" title="Subiti">🥅</th></>)}</tr></thead>
                <tbody className="divide-y divide-slate-800">{selectedMatch.match_stats.map(stat => (
                    <tr key={stat.id} onClick={() => goToPlayer(stat.player_id)} className="group hover:bg-slate-800/50 transition cursor-pointer">
                      <td className="py-3 pl-2 font-medium flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${stat.team === 'A' ? 'bg-cyan-500' : 'bg-fuchsia-600'}`}>{stat.players?.name?.charAt(0)}</div>
                        <span className="text-slate-200 text-base truncate max-w-[120px] underline decoration-transparent group-hover:decoration-slate-500 underline-offset-2 transition-all">{stat.players?.name}</span>
                        {stat.is_mvp ? <Star size={14} className="text-yellow-400 fill-yellow-400 animate-pulse shrink-0" /> : stat.is_candidate ? <Medal size={14} className="text-cyan-400 shrink-0" /> : null}
                      </td>
                      {selectedMatch.status !== 'scheduled' && (<><td className="text-center font-bold text-lg text-white font-oswald">{stat.goals > 0 ? stat.goals : <span className="text-slate-700 font-sans text-sm">-</span>}</td><td className="text-center text-slate-400">{stat.assists > 0 ? stat.assists : '-'}</td><td className="text-center text-slate-400">{stat.gk_turns > 0 ? stat.gk_turns : '-'}</td><td className="text-center font-bold text-fuchsia-400">{stat.gk_turns > 0 ? stat.gk_conceded : '-'}</td></>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-8 pt-4 border-t border-slate-800 text-[10px] text-slate-500 text-center flex flex-wrap justify-center items-center gap-3 uppercase tracking-widest font-bold">
                  <span>Legenda:</span>
                  <span>⚽ Gol</span> | <span>👟 Assist</span> | <span>🧤 Turni Porta</span> | <span>🥅 Gol Subiti</span> |
                  <span className="flex items-center gap-0.5 text-yellow-500"><Star size={10} className="fill-yellow-500"/> MVP</span> |
                  <span className="flex items-center gap-0.5 text-cyan-400"><Medal size={10} className=""/> Candidature</span>
              </div>
              {selectedMatch.status === 'scheduled' && (<p className="text-center text-sm text-slate-500 mt-4 italic">Statistiche non ancora disponibili.</p>)}
            </div>
          </div>
        </div>
      )}

      {/* EXPORT HIDDEN (Corretto per evitare tagli) */}
      {selectedMatch && (
        <div ref={exportRef} style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '650px', // Larghezza fissa per l'export
            height: 'auto', // Altezza automatica in base al contenuto
            minHeight: '100%', // Assicura che non sia zero
            zIndex: -50, 
            backgroundColor: '#0f172a', 
            padding: '40px', 
            boxSizing: 'border-box', 
            pointerEvents: 'none', 
            fontFamily: 'Roboto, sans-serif' 
        }}>
           <div className="text-center text-cyan-400 text-sm uppercase font-bold mb-2 tracking-[0.3em] font-oswald">{new Date(selectedMatch.date).toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
           <div className="text-center mb-10"><div className="text-8xl font-black text-white font-oswald drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">{selectedMatch.status === 'scheduled' ? <span className="text-lime-400">VS</span> : <>{selectedMatch.team_a_score} <span className="text-slate-700/80 text-6xl align-middle font-light mx-6">-</span> {selectedMatch.team_b_score}</>}</div></div>
           <div className="border-t-2 border-slate-700">
             <div className="flex items-center py-4 border-b border-slate-800"><div className="flex-grow font-bold text-slate-500 text-xs uppercase pl-4 tracking-widest font-oswald">Player</div>{selectedMatch.status !== 'scheduled' && (<><div className="w-16 text-center text-2xl">⚽</div><div className="w-16 text-center text-2xl">👟</div><div className="w-16 text-center text-2xl">🧤</div><div className="w-16 text-center text-2xl">🥅</div></>)}</div>
             <div className="flex flex-col">{selectedMatch.match_stats.map(stat => (
                 <div key={stat.id} className="flex items-center h-16 border-b border-slate-800/50">
                    <div className="flex-grow pl-4 flex items-center h-full">
                        <div className={`w-1.5 h-8 mr-4 rounded-full ${stat.team === 'A' ? 'bg-cyan-500' : 'bg-fuchsia-600'}`}></div>
                        <span className="font-bold text-slate-100 text-xl mr-3 leading-none">{stat.players?.name}</span>
                        {/* MEDAGLIE ANCHE NELL'EXPORT */}
                        {stat.is_mvp ? <Star size={22} className="text-yellow-400 fill-yellow-400" /> : stat.is_candidate ? <Medal size={22} className="text-cyan-400" /> : null}
                    </div>
                    {selectedMatch.status !== 'scheduled' && (<><div className="w-16 flex items-center justify-center h-full"><span className={`font-bold text-2xl font-oswald ${stat.goals > 0 ? 'text-white' : 'text-slate-700'}`}>{stat.goals > 0 ? stat.goals : '-'}</span></div><div className="w-16 flex items-center justify-center h-full"><span className={`font-medium text-xl font-oswald ${stat.assists > 0 ? 'text-slate-300' : 'text-slate-700'}`}>{stat.assists > 0 ? stat.assists : '-'}</span></div><div className="w-16 flex items-center justify-center h-full"><span className={`font-medium text-xl font-oswald ${stat.gk_turns > 0 ? 'text-slate-300' : 'text-slate-700'}`}>{stat.gk_turns > 0 ? stat.gk_turns : '-'}</span></div><div className="w-16 flex items-center justify-center h-full"><span className={`font-bold text-2xl font-oswald ${stat.gk_turns > 0 ? 'text-fuchsia-500' : 'text-slate-700'}`}>{stat.gk_turns > 0 ? stat.gk_conceded : '-'}</span></div></>)}
                 </div>
             ))}</div>
           </div>
           <div className="mt-10 flex justify-center gap-6 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] font-oswald">
               <span>⚽ Gol</span> <span>👟 Assist</span> <span>🧤 Turni Porta</span> <span>🥅 Subiti</span> 
               <span className="text-yellow-500">★ MVP</span>
               <span className="text-cyan-400">🏅 Candidature</span>
           </div>
        </div>
      )}
    </div>
  );
}