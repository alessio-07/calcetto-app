import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { ArrowUpDown, ArrowUp, ArrowDown, Info } from 'lucide-react';

export default function StatsPage() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Configurazioni Tab
  const [mainTab, setMainTab] = useState('attack'); 
  const [subTab, setSubTab] = useState('goals'); 
  // Default sorting
  const [sortConfig, setSortConfig] = useState({ key: 'total_goals', direction: 'desc' });

  useEffect(() => {
    async function getStats() {
      const { data } = await supabase.from('player_stats_view').select('*');
      setStats(data || []);
      setLoading(false);
    }
    getStats();
  }, []);

  // --- CALCOLATORE VALORI (Helper) ---
  function getValue(player, key) {
    const mp = player.matches_played || 1; 
    const gk = player.gk_turns || 1;

    switch (key) {
      // Attacco
      case 'goal_ratio': return player.total_goals / mp;
      case 'assist_ratio': return player.total_assists / mp;
      
      // Difesa
      case 'mini_clean_sheets': return player.gk_turns - player.gk_conceded;
      case 'conceded_ratio': return player.gk_conceded / gk;
      
      // Generali
      case 'presence_perc': return (player.matches_played / (player.total_matches_global || 1)) * 100;
      case 'win_perc': return (player.wins / mp) * 100;
      case 'draw_perc': return (player.draws / mp) * 100;
      case 'loss_perc': return (player.losses / mp) * 100;
      
      default: return player[key] || 0;
    }
  }

  // --- LOGICA DI ORDINAMENTO CON SPAREGGIO (TIE-BREAKER) ---
  const sortedStats = [...stats].sort((a, b) => {
    const key = sortConfig.key;
    const dir = sortConfig.direction;

    // 1. Prendi i valori della colonna principale
    let valA = getValue(a, key);
    let valB = getValue(b, key);

    // 2. Definisci la colonna di SPAREGGIO (Tie-breaker)
    let secondaryKey = null;
    if (key === 'total_goals') secondaryKey = 'goal_ratio';
    if (key === 'total_assists') secondaryKey = 'assist_ratio';
    if (key === 'clean_sheets') secondaryKey = 'mini_clean_sheets';
    if (key === 'gk_conceded') secondaryKey = 'conceded_ratio';
    if (key === 'wins') secondaryKey = 'win_perc';

    // 3. Confronto Primario
    if (valA !== valB) {
      if (valA < valB) return dir === 'asc' ? -1 : 1;
      if (valA > valB) return dir === 'asc' ? 1 : -1;
    }

    // 4. Confronto Secondario (se i valori primari sono uguali)
    if (secondaryKey) {
      let secA = getValue(a, secondaryKey);
      let secB = getValue(b, secondaryKey);
      
      // Lo spareggio segue la stessa direzione dell'ordinamento principale
      if (secA < secB) return dir === 'asc' ? -1 : 1;
      if (secA > secB) return dir === 'asc' ? 1 : -1;
    }

    return 0;
  });

  // --- GESTIONE CLICK ORDINAMENTO ---
  const handleSort = (key) => {
    let direction = 'desc';
    // Se clicco la stessa colonna, inverto l'ordine
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  // --- COMPONENTI UI ---
  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={12} className="text-gray-300 ml-1 inline" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={12} className="text-blue-600 ml-1 inline" /> 
      : <ArrowDown size={12} className="text-blue-600 ml-1 inline" />;
  };

  const Th = ({ label, sortKey, align = 'right', w }) => (
    <th onClick={() => handleSort(sortKey)} className={`p-2 text-${align} cursor-pointer hover:bg-gray-100 ${w}`}>
      <div className={`flex items-center justify-${align === 'left' ? 'start' : (align === 'center' ? 'center' : 'end')}`}>
        {label} <SortIcon columnKey={sortKey} />
      </div>
    </th>
  );

  // --- TABELLA ATTACCO ---
  const renderAttack = () => (
    <>
      <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
        {['goals', 'assists'].map(t => (
          <button key={t} onClick={() => {setSubTab(t); handleSort(t === 'goals' ? 'total_goals' : 'total_assists')}} 
            className={`flex-1 py-2 text-xs font-bold rounded uppercase ${subTab === t ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>
            {t === 'goals' ? 'Goal' : 'Assist'}
          </button>
        ))}
      </div>
      <table className="w-full bg-white text-sm rounded shadow overflow-hidden">
        <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500">
          <tr>
            <Th label="Giocatore" sortKey="name" align="left" />
            <Th label={subTab === 'goals' ? 'Goal' : 'Assist'} sortKey={subTab === 'goals' ? 'total_goals' : 'total_assists'} />
            <Th label="Rateo" sortKey={subTab === 'goals' ? 'goal_ratio' : 'assist_ratio'} />
          </tr>
        </thead>
        <tbody className="divide-y">
          {sortedStats.map((p, i) => (
            <tr key={p.id}>
              <td className="p-3 font-medium flex gap-2"><span className="text-gray-300 text-xs w-3">{i+1}</span>{p.name}</td>
              <td className="p-3 text-right font-bold text-lg">{subTab === 'goals' ? p.total_goals : p.total_assists}</td>
              <td className="p-3 text-right font-mono text-gray-600">{getValue(p, subTab === 'goals' ? 'goal_ratio' : 'assist_ratio').toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 text-[10px] text-gray-500 bg-blue-50 p-2 rounded">
        Info: A parità di {subTab === 'goals' ? 'Goal' : 'Assist'}, vince chi ha il <strong>Rateo migliore</strong>.
      </div>
    </>
  );

  // --- TABELLA DIFESA ---
  const renderDefense = () => (
    <>
      <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
        {['clean', 'conceded'].map(t => (
          <button key={t} onClick={() => {setSubTab(t); handleSort(t === 'clean' ? 'clean_sheets' : 'gk_conceded')}} 
            className={`flex-1 py-2 text-xs font-bold rounded uppercase ${subTab === t ? 'bg-white shadow text-green-600' : 'text-gray-400'}`}>
            {t === 'clean' ? 'Clean Sheet' : 'Subiti'}
          </button>
        ))}
      </div>
      <table className="w-full bg-white text-sm rounded shadow overflow-hidden">
        <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500">
          <tr>
            <Th label="Portiere" sortKey="name" align="left" />
            {subTab === 'clean' ? (
              <>
                <Th label="CS" sortKey="clean_sheets" />
                <Th label="Mini CS" sortKey="mini_clean_sheets" />
              </>
            ) : (
              <>
                <Th label="Subiti" sortKey="gk_conceded" />
                <Th label="Rateo" sortKey="conceded_ratio" />
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y">
          {sortedStats.filter(p => p.gk_turns > 0).map((p, i) => (
            <tr key={p.id}>
              <td className="p-3 font-medium flex gap-2"><span className="text-gray-300 text-xs w-3">{i+1}</span>{p.name}</td>
              {subTab === 'clean' ? (
                <>
                  <td className="p-3 text-right font-bold text-green-600 text-lg">{p.clean_sheets}</td>
                  <td className="p-3 text-right font-bold text-gray-600">{p.gk_turns - p.gk_conceded}</td>
                </>
              ) : (
                <>
                  <td className="p-3 text-right font-bold text-red-500 text-lg">{p.gk_conceded}</td>
                  <td className="p-3 text-right font-mono text-gray-600">{getValue(p, 'conceded_ratio').toFixed(2)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 text-[10px] text-gray-500 bg-green-50 p-2 rounded">
        Info: A parità di {subTab === 'clean' ? 'Clean Sheet' : 'Goal Subiti'}, vince chi ha {subTab === 'clean' ? 'più Mini Clean Sheet' : 'il Rateo migliore'}.
      </div>
    </>
  );

  // --- TABELLA GENERALI ---
  const renderGeneral = () => (
    <>
      <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
        {['presence', 'results'].map(t => (
          <button key={t} onClick={() => {setSubTab(t); handleSort(t === 'presence' ? 'matches_played' : 'wins')}} 
            className={`flex-1 py-2 text-xs font-bold rounded uppercase ${subTab === t ? 'bg-white shadow text-purple-600' : 'text-gray-400'}`}>
            {t === 'presence' ? 'Presenze' : 'Risultati'}
          </button>
        ))}
      </div>
      
      {subTab === 'presence' ? (
        <table className="w-full bg-white text-sm rounded shadow overflow-hidden">
          <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500">
            <tr>
              <Th label="Nome" sortKey="name" align="left" />
              <Th label="Presenze" sortKey="matches_played" align="center" />
              <Th label="% Presente" sortKey="presence_perc" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedStats.map((p, i) => (
              <tr key={p.id}>
                <td className="p-3 font-medium flex gap-2"><span className="text-gray-300 text-xs w-3">{i+1}</span>{p.name}</td>
                <td className="p-3 text-center font-bold">{p.matches_played}</td>
                <td className="p-3 text-right font-mono text-purple-600">{getValue(p, 'presence_perc').toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="overflow-x-auto rounded shadow">
          <table className="w-full bg-white text-xs min-w-[350px]">
            <thead className="bg-gray-50 border-b uppercase text-gray-500">
              <tr>
                <th className="p-2 text-left sticky left-0 bg-gray-50 z-10">Nome</th>
                <Th label="W" sortKey="wins" align="center"/>
                <Th label="D" sortKey="draws" align="center"/>
                <Th label="L" sortKey="losses" align="center"/>
                <Th label="%W" sortKey="win_perc" align="center"/>
                <Th label="%D" sortKey="draw_perc" align="center"/>
                <Th label="%L" sortKey="loss_perc" align="center"/>
              </tr>
            </thead>
            <tbody className="divide-y text-gray-700">
              {sortedStats.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="p-2 font-bold sticky left-0 bg-white z-10 border-r">{p.name}</td>
                  <td className="p-2 text-center text-green-600 font-bold">{p.wins}</td>
                  <td className="p-2 text-center text-gray-400">{p.draws}</td>
                  <td className="p-2 text-center text-red-400">{p.losses}</td>
                  <td className="p-2 text-center font-bold bg-green-50">{getValue(p, 'win_perc').toFixed(0)}%</td>
                  <td className="p-2 text-center text-gray-500">{getValue(p, 'draw_perc').toFixed(0)}%</td>
                  <td className="p-2 text-center text-red-300">{getValue(p, 'loss_perc').toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-2 text-[10px] text-gray-500 bg-purple-50 p-2 rounded">
         {subTab === 'results' && "Info: A parità di Vittorie (W), vince chi ha la %W migliore."}
      </div>
    </>
  );

  if (loading) return <div className="p-10 text-center text-gray-500">Analisi statistiche...</div>;

  return (
    <div className="p-4 pb-24 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Classifiche</h1>
      
      <div className="flex border-b border-gray-200 mb-6">
        {['attack', 'defense', 'general'].map(t => (
          <button key={t} onClick={() => {setMainTab(t); setSubTab(t==='attack'?'goals':t==='defense'?'clean':'presence'); 
            // Reset sort automatico quando cambi tab principale
            if(t==='attack') setSortConfig({key:'total_goals', direction:'desc'});
            if(t==='defense') setSortConfig({key:'clean_sheets', direction:'desc'});
            if(t==='general') setSortConfig({key:'matches_played', direction:'desc'});
          }} 
            className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wide border-b-2 transition ${mainTab === t ? 'border-gray-800 text-gray-800' : 'border-transparent text-gray-400'}`}>
            {t === 'attack' ? 'Attacco' : t === 'defense' ? 'Difesa' : 'Generali'}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in zoom-in duration-200">
        {mainTab === 'attack' && renderAttack()}
        {mainTab === 'defense' && renderDefense()}
        {mainTab === 'general' && renderGeneral()}
      </div>
    </div>
  );
}