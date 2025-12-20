import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { X, Star } from 'lucide-react';

export default function HomePage() {
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);

  useEffect(() => {
    fetchMatches();
  }, []);

  async function fetchMatches() {
    // Scarichiamo anche il campo 'status'
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
                 <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">
                    {new Date(match.date).toLocaleDateString('it-IT')}
                 </div>
                 {isPreview && (
                   <span className="bg-yellow-200 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                     PROGRAMMATA
                   </span>
                 )}
              </div>
              
              <div className="flex justify-between items-center">
                {/* Squadra A */}
                <div className="flex-1">
                  <div className="font-bold text-gray-800 text-lg leading-tight">
                    {getTeamNames(match.match_stats, 'A') || 'Squadra A'}
                  </div>
                </div>

                {/* Punteggio o VS */}
                <div className={`mx-4 px-4 py-2 rounded-lg font-mono font-bold text-xl whitespace-nowrap border ${isPreview ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-gray-100 border-gray-200'}`}>
                  {isPreview ? 'VS' : `${match.team_a_score} - ${match.team_b_score}`}
                </div>

                {/* Squadra B */}
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
          <div className="bg-white w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-100 p-4 flex justify-between items-center border-b z-10">
              <h2 className="font-bold text-lg">
                {selectedMatch.status === 'scheduled' ? 'Dettagli Anteprima' : 'Risultato Partita'}
              </h2>
              <button onClick={() => setSelectedMatch(null)} className="p-1 bg-gray-200 rounded-full hover:bg-gray-300">
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              <div className="text-center text-3xl font-bold mb-6 text-gray-800">
                {selectedMatch.status === 'scheduled' 
                  ? <span className="text-yellow-600">VS</span> 
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
                        {/* ECCOLA QUI SOTTO: L'ICONA MANCANTE */}
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
                          {/* ECCO I DATI MANCANTI */}
                          <td className="text-center font-bold text-red-400">
                            {stat.gk_turns > 0 ? stat.gk_conceded : '-'}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="mt-4 text-[10px] text-gray-400 text-center">
                 Legenda: ⚽ Gol | 👟 Assist | 🧤 Turni Porta | 🥅 Gol Subiti
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