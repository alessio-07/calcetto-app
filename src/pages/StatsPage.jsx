import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { ArrowUpDown, ArrowUp, ArrowDown, Star } from 'lucide-react';

export default function StatsPage() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Configurazioni Tab
  const [mainTab, setMainTab] = useState('attack'); 
  const [subTab, setSubTab] = useState('goals'); 
  const [sortConfig, setSortConfig] = useState({ key: 'total_goals', direction: 'desc' });

  useEffect(() => {
    async function getStats() {
      const { data } = await supabase.from('player_stats_view').select('*');
      setStats(data || []);
      setLoading(false);
    }
    getStats();
  }, []);

  // --- CALCOLATORE VALORI ---
  function getValue(player, key) {
    const mp = player.matches_played || 1; 
    const gk = player.gk_turns || 1;

    switch (key) {
      case 'goal_ratio': return player.total_goals / mp;
      case 'assist_ratio': return player.total_assists / mp;
      case 'ga_total': return (player.total_goals || 0) + (player.total_assists || 0);
      case 'ga_ratio': return ((player.total_goals || 0) + (player.total_assists || 0)) / mp;

      case 'mini_clean_sheets': return player.gk_turns - player.gk_conceded;
      case 'conceded_ratio': return player.gk_conceded / gk;
      case 'presence_perc': return (player.matches_played / (player.total_matches_global || 1)) * 100;
      case 'win_perc': return (player.wins / mp) * 100;
      case 'draw_perc': return (player.draws / mp) * 100;
      case 'loss_perc': return (player.losses / mp) * 100;
      case 'mvp_perc': return (player.total_mvps / mp) * 100;
      
      default: return player[key] || 0;
    }
  }

  // --- ORDINAMENTO ---
  const sortedStats = [...stats].sort((a, b) => {
    const key = sortConfig.key;
    const dir = sortConfig.direction;

    let valA = getValue(a, key);
    let valB = getValue(b, key);

    let secondaryKey = null;
    if (key === 'total_goals') secondaryKey = 'goal_ratio';
    if (key === 'total_assists') secondaryKey = 'assist_ratio';
    if (key === 'ga_total') secondaryKey = 'ga_ratio';
    if (key === 'clean_sheets') secondaryKey = 'mini_clean_sheets';
    if (key === 'gk_conceded') secondaryKey = 'conceded_ratio';
    if (key === 'wins') secondaryKey = 'win_perc';
    if (key === 'total_mvps') secondaryKey = 'mvp_perc';

    if (valA !== valB) {
      if (valA < valB) return dir === 'asc' ? -1 : 1;
      if (valA > valB) return dir === 'asc' ? 1 : -1;
    }

    if (secondaryKey) {
      let secA = getValue(a, secondaryKey);
      let secB = getValue(b, secondaryKey);
      if (secA < secB) return dir === 'asc' ? -1 : 1;
      if (secA > secB) return dir === 'asc' ? 1 : -1;
    }

    return 0;
  });

  const handleSort = (key) => {
    let direction = 'desc';
    if (key === 'gk_conceded' && sortConfig.key !== 'gk_conceded') {
       direction = 'asc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
       direction = 'asc';
    } else if (sortConfig.key === key && sortConfig.direction === 'asc') {
       direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

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
        {['goals', 'assists', 'ga'].map(t => (
          <button key={t} onClick={() => {
              setSubTab(t); 
              handleSort(t === 'goals' ? 'total_goals' : (t === 'assists' ? 'total_assists' : 'ga_total'))
            }} 
            className={`flex-1 py-2 text-xs font-bold rounded uppercase ${subTab === t ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>
            {t === 'goals' ? 'Goal' : (t === 'assists' ? 'Assist' : 'G+A')}
          </button>
        ))}
      </div>
      <table className="w-full bg-white text-sm rounded shadow overflow-hidden">
        <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500">
          <tr>
            <Th label="Giocatore" sortKey="name" align="left" />
            <Th label={subTab === 'goals' ? 'Goal' : (subTab === 'assists' ? 'Assist' : 'G+A')} 
                sortKey={subTab === 'goals' ? 'total_goals' : (subTab === 'assists' ? 'total_assists' : 'ga_total')} align="center" />
            <Th label="Rateo" sortKey={subTab === 'goals' ? 'goal_ratio' : (subTab === 'assists' ? 'assist_ratio' : 'ga_ratio')} align="center" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {sortedStats.map((p, i) => (
            <tr key={p.id}>
              <td className="p-3 font-medium flex gap-2"><span className="text-gray-300 text-xs w-3">{i+1}</span>{p.name}</td>
              <td className="p-3 text-center font-bold text-lg">
                {subTab === 'goals' ? p.total_goals : (subTab === 'assists' ? p.total_assists : getValue(p, 'ga_total'))}
              </td>
              <td className="p-3 text-center font-mono text-gray-600">
                {getValue(p, subTab === 'goals' ? 'goal_ratio' : (subTab === 'assists' ? 'assist_ratio' : 'ga_ratio')).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 text-[10px] text-gray-500 bg-blue-50 p-2 rounded">
        {subTab === 'goals' && <><strong>goal:</strong> goal totali segnati. <strong>rateo:</strong> goal segnati a partita.</>}
        {subTab === 'assists' && <><strong>assist:</strong> assist totali effettuati. <strong>rateo:</strong> assist effettuati a partita.</>}
        {subTab === 'ga' && <><strong>G+A:</strong> goal + assist totali effettuati; <strong>rateo:</strong> G+A effettuati a partita</>}
      </div>
    </>
  );

  // --- TABELLA DIFESA ---
  const renderDefense = () => (
    <>
      <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
        {['clean', 'conceded'].map(t => (
          <button key={t} onClick={() => {
              setSubTab(t); 
              if (t === 'conceded') setSortConfig({key: 'gk_conceded', direction: 'asc'});
              else handleSort('clean_sheets');
            }} 
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
                <Th label="CS" sortKey="clean_sheets" align="center" />
                <Th label="Mini CS" sortKey="mini_clean_sheets" align="center" />
              </>
            ) : (
              <>
                <Th label="Subiti" sortKey="gk_conceded" align="center" />
                <Th label="Rateo" sortKey="conceded_ratio" align="center" />
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
                  <td className="p-3 text-center font-bold text-green-600 text-lg">{p.clean_sheets}</td>
                  <td className="p-3 text-center font-bold text-gray-600">{p.gk_turns - p.gk_conceded}</td>
                </>
              ) : (
                <>
                  <td className="p-3 text-center font-bold text-red-500 text-lg">{p.gk_conceded}</td>
                  <td className="p-3 text-center font-mono text-gray-600">{getValue(p, 'conceded_ratio').toFixed(2)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 text-[10px] text-gray-500 bg-green-50 p-2 rounded">
        {subTab === 'clean' 
          ? <><strong>cs:</strong> numero di partite senza subire neanche un goal. <strong>mini cs:</strong> numero di turni in porta senza subire goal.</>
          : <><strong>subiti:</strong> numero totale di goal subiti. <strong>rateo:</strong> numero di goal subiti per turno in porta.</>
        }
      </div>
    </>
  );

  // --- TABELLA GENERALI ---
  const renderGeneral = () => (
    <>
      <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {['presence', 'results', 'mvp'].map(t => (
          <button key={t} onClick={() => {setSubTab(t); handleSort(t === 'presence' ? 'matches_played' : (t === 'results' ? 'wins' : 'total_mvps'))}} 
            className={`flex-1 py-2 px-1 text-xs font-bold rounded uppercase min-w-[70px] ${subTab === t ? 'bg-white shadow text-purple-600' : 'text-gray-400'}`}>
            {t === 'presence' ? 'Presenze' : (t === 'results' ? 'Risultati' : 'MVP')}
          </button>
        ))}
      </div>
      
      {subTab === 'presence' && (
        <table className="w-full bg-white text-sm rounded shadow overflow-hidden">
          <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500">
            <tr>
              <Th label="Nome" sortKey="name" align="left" />
              <Th label="Presenze" sortKey="matches_played" align="center" />
              <Th label="% Presente" sortKey="presence_perc" align="center" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedStats.map((p, i) => (
              <tr key={p.id}>
                <td className="p-3 font-medium flex gap-2"><span className="text-gray-300 text-xs w-3">{i+1}</span>{p.name}</td>
                <td className="p-3 text-center font-bold">{p.matches_played}</td>
                <td className="p-3 text-center font-mono text-purple-600">{getValue(p, 'presence_perc').toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      
      {subTab === 'results' && (
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

      {subTab === 'mvp' && (
        <table className="w-full bg-white text-sm rounded shadow overflow-hidden">
          <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500">
            <tr>
              <Th label="Giocatore" sortKey="name" align="left" />
              <Th label="Totale MVP" sortKey="total_mvps" align="center" />
              <Th label="% MVP" sortKey="mvp_perc" align="center" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedStats.filter(p => p.total_mvps > 0).map((p, i) => (
              <tr key={p.id}>
                <td className="p-3 font-medium flex items-center gap-2">
                  <span className="text-gray-300 text-xs w-3">{i+1}</span>
                  {p.name}
                  <Star size={12} className="text-yellow-500 fill-yellow-500"/>
                </td>
                <td className="p-3 text-center font-bold text-yellow-600 text-lg">{p.total_mvps}</td>
                <td className="p-3 text-center font-mono text-gray-600">{getValue(p, 'mvp_perc').toFixed(1)}%</td>
              </tr>
            ))}
            {sortedStats.filter(p => p.total_mvps > 0).length === 0 && (
               <tr><td colSpan="3" className="p-4 text-center text-gray-400 italic">Nessun MVP assegnato finora.</td></tr>
            )}
          </tbody>
        </table>
      )}

      <div className="mt-2 text-[10px] text-gray-500 bg-purple-50 p-2 rounded">
         {subTab === 'presence' && <><strong>presenze:</strong> numero totale di presenze. <strong>%presenze:</strong> presenze/partite totali giocate.</>}
         {subTab === 'results' && <><strong>W</strong> = Vinte, <strong>D</strong> = Pareggiate, <strong>L</strong> = Perse.<br/><strong>%W</strong> = Vinte/Presenze, <strong>%D</strong> = Pareggiate/Presenze, <strong>%L</strong> = Perse/Presenze.</>}
         {subTab === 'mvp' && <><strong>mvp:</strong> numero totale di MVP. <strong>%mvp:</strong> numero di mvp/presenze.</>}
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