import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import { X, Star, Clock, Share2 } from 'lucide-react';
import html2canvas from 'html2canvas';

// --- COMPONENTE COUNTDOWN ---
function MatchCountdown({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const matchTime = new Date(targetDate);
      const diff = matchTime - now;

      if (diff <= 0) {
        setTimeLeft('VS'); 
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days >= 1) {
        setTimeLeft(`-${days}gg`);
      } else {
        const mString = minutes < 10 ? `0${minutes}` : minutes;
        setTimeLeft(`${hours}h ${mString}m`);
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 60000); 
    return () => clearInterval(timer);
  }, [targetDate]);

  return <span className="text-yellow-800 tracking-tight">{timeLeft}</span>;
}

// --- PAGINA HOME PRINCIPALE ---
export default function HomePage() {
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  
  // Ref per "catturare" l'immagine
  const printRef = useRef(null);

  useEffect(() => {
    fetchMatches();
  }, []);

  async function fetchMatches() {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        match_stats (
          team,
          goals,
          assists,
          gk_turns,
          gk_conceded,
          is_mvp,
          players ( name )
        )
      `)
      .order('date', { ascending: false });

    if (error) console.error('Errore:', error);
    else setMatches(data || []);
  }

  const getTeamNames = (matchStats, teamLetter) => {
    if (!matchStats) return '';
    return matchStats
      .filter(s => s.team === teamLetter)
      .map(s => s.players?.name || 'Sconosciuto')
      .join(', ');
  };

  // --- FUNZIONE CONDIVISIONE ---
  const handleShare = async () => {
    if (!printRef.current) return;

    try {
      // 1. Genera l'immagine dal div (con sfondo bianco forzato)
      const canvas = await html2canvas(printRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Migliora la qualità
      });
      const dataUrl = canvas.toDataURL('image/png');

      // 2. Converti in file per la condivisione mobile
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'match-stats.png', { type: 'image/png' });

      // 3. Prova a usare la condivisione nativa (Android/iOS)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Risultato Partita',
          text: 'Guarda le statistiche della nostra partita!',
        });
      } else {
        // 4. Fallback per PC: Scarica l'immagine
        const link = document.createElement('a');
        link.download = `partita-${selectedMatch.date.split('T')[0]}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (error) {
      console.error("Errore nella condivisione:", error);
      alert("Impossibile condividere l'immagine su questo dispositivo.");
    }
  };

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Partite</h1>
      
      {matches.length === 0 ? <p className="text-gray-500">Nessuna partita.</p> : null}
      
      <div className="space-y-4">
        {matches.map(match => {
          const isPreview = match.status === 'scheduled';

          return (
            <div 
              key={match.id} 
              onClick={() => setSelectedMatch(match)}
              className={`p-5 rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition active:scale-95 ${isPreview ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-100'}`}
            >
              <div className="flex justify-between items-center mb-3">
                 <div className="text-gray-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    {new Date(match.date).toLocaleDateString('it-IT')}
                    {isPreview && <span> - {new Date(match.date).toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'})}</span>}
                 </div>
                 {isPreview && (
                   <span className="bg-yellow-200 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                     <Clock size={10}/> PROGRAMMATA
                   </span>
                 )}
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="font-bold text-gray-800 text-lg leading-tight">
                    {getTeamNames(match.match_stats, 'A') || 'Squadra A'}
                  </div>
                </div>

                <div className={`mx-4 px-4 py-2 rounded-lg font-mono font-bold text-xl whitespace-nowrap border min-w-[100px] text-center ${isPreview ? 'bg-yellow-100 border-yellow-200' : 'bg-gray-100 border-gray-200'}`}>
                  {isPreview ? (
                    <MatchCountdown targetDate={match.date} />
                  ) : (
                    `${match.team_a_score} - ${match.team_b_score}`
                  )}
                </div>

                <div className="flex-1 text-right">
                  <div className="font-bold text-gray-800 text-lg leading-tight">
                    {getTeamNames(match.match_stats, 'B') || 'Squadra B'}
                  </div>
                </div>
              </div>

              <div className="text-center text-xs text-green-600 mt-3 font-semibold">
                Tocca per i dettagli
              </div>
            </div>
          );
        })}
      </div>

      {/* MODALE DETTAGLI */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedMatch(null)}>
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            
            {/* Header del Modale (Non viene fotografato) */}
            <div className="sticky top-0 bg-gray-100 p-4 flex justify-between items-center border-b z-10">
              <h2 className="font-bold text-lg">
                {selectedMatch.status === 'scheduled' ? 'Dettagli Anteprima' : 'Risultato'}
              </h2>
              <div className="flex gap-2">
                <button onClick={handleShare} className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition">
                  <Share2 size={20} />
                </button>
                <button onClick={() => setSelectedMatch(null)} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* CONTENUTO DA FOTOGRAFARE (ref={printRef}) */}
            <div ref={printRef} className="p-6 bg-white">
              <div className="text-center text-gray-400 text-xs uppercase font-bold mb-2">
                 {new Date(selectedMatch.date).toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>

              <div className="text-center text-4xl font-bold mb-6 text-gray-800">
                {selectedMatch.status === 'scheduled' 
                  ? <span className="text-yellow-600 text-2xl"><MatchCountdown targetDate={selectedMatch.date} /></span> 
                  : `${selectedMatch.team_a_score} - ${selectedMatch.team_b_score}`
                }
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs border-b">
                    <th className="text-left py-2">Formazioni</th>
                    {selectedMatch.status !== 'scheduled' && (
                      <>
                        <th className="text-center py-2" title="Gol Fatti">⚽</th>
                        <th className="text-center py-2" title="Assist">👟</th>
                        <th className="text-center py-2" title="Turni in Porta">🧤</th>
                        <th className="text-center py-2" title="Gol Subiti">🥅</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {selectedMatch.match_stats.map(stat => (
                    <tr key={stat.id} className={stat.team === 'A' ? 'bg-blue-50/50' : 'bg-red-50/50'}>
                      <td className="py-3 font-medium flex items-center gap-1">
                        <span className={`w-1 h-4 rounded mr-2 ${stat.team === 'A' ? 'bg-blue-500' : 'bg-red-500'}`}></span>
                        {stat.players?.name}
                        {stat.is_mvp && <Star size={14} className="text-yellow-500 fill-yellow-500 ml-1" />}
                      </td>
                      {selectedMatch.status !== 'scheduled' && (
                        <>
                          <td className="text-center font-bold">{stat.goals > 0 ? stat.goals : '-'}</td>
                          <td className="text-center text-gray-500">{stat.assists > 0 ? stat.assists : '-'}</td>
                          <td className="text-center text-gray-500">{stat.gk_turns > 0 ? stat.gk_turns : '-'}</td>
                          <td className="text-center font-bold text-red-400">
                            {stat.gk_turns > 0 ? stat.gk_conceded : '-'}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="mt-6 pt-4 border-t text-[10px] text-gray-400 text-center flex flex-wrap justify-center gap-2">
                 <span>Legenda:</span>
                 <span>⚽ Gol</span> | 
                 <span>👟 Assist</span> | 
                 <span>🧤 Turni Porta</span> | 
                 <span>🥅 Gol Subiti</span> |
                 <span className="flex items-center gap-0.5"><Star size={10} className="fill-yellow-500 text-yellow-500"/> MVP</span>
              </div>

              {selectedMatch.status === 'scheduled' && (
                <p className="text-center text-sm text-gray-500 mt-4 italic">
                  Partita non ancora giocata. Statistiche non disponibili.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}