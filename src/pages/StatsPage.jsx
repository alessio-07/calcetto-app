import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { ArrowUpDown, ArrowUp, ArrowDown, Star } from 'lucide-react';
import Header from '../components/Header';

export default function StatsPage({ session }) {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState('attack'); 
  const [subTab, setSubTab] = useState('goals'); 
  const [sortConfig, setSortConfig] = useState({ key: 'total_goals', direction: 'desc' });

  useEffect(() => {
    async function calculateStats() {
      // Calcolo le statistiche al volo per includere le candidature in modo dinamico
      const { data: players } = await supabase.from('players').select('*');
      const { data: matches } = await supabase.from('matches').select('*, match_stats(*)').eq('status', 'finished');

      if (!players || !matches) { setLoading(false); return; }

      const playerStats = {};
      players.forEach(p => {
        playerStats[p.id] = {
          id: p.id,
          name: p.name,
          total_goals: 0, total_assists: 0, total_mvps: 0, candidates: 0,
          matches_played: 0, wins: 0, draws: 0, losses: 0,
          gk_turns: 0, gk_conceded: 0, clean_sheets: 0
        };
      });

      matches.forEach(m => {
        const winner = m.team_a_score > m.team_b_score ? 'A' : (m.team_b_score > m.team_a_score ? 'B' : 'D');
        m.match_stats.forEach(ms => {
          if (playerStats[ms.player_id]) {
            const s = playerStats[ms.player_id];
            s.total_goals += ms.goals || 0;
            s.total_assists += ms.assists || 0;
            s.matches_played += 1;
            if (ms.is_mvp) s.total_mvps += 1;
            if (ms.is_candidate) s.candidates += 1; // Nuova Stat

            if (winner === 'D') s.draws += 1;
            else if (winner === ms.team) s.wins += 1;
            else s.losses += 1;

            if (ms.gk_turns > 0) {
              s.gk_turns += ms.gk_turns;
              s.gk_conceded += ms.gk_conceded;
              if (ms.gk_conceded === 0) s.clean_sheets += 1;
            }
          }
        });
      });
      // Calcolo Win Perc e total matches global (per presence)
      const totalGlobal = matches.length;
      Object.values(playerStats).forEach(p => {
         p.total_matches_global = totalGlobal;
      });

      setStats(Object.values(playerStats));
      setLoading(false);
    }
    calculateStats();
  }, []);

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
      case 'candidates': return player.candidates || 0;
      default: return player[key] || 0;
    }
  }

  const sortedStats = [...stats].sort((a, b) => {
    const key = sortConfig.key;
    const dir = sortConfig.direction;
    let valA = getValue(a, key);
    let valB = getValue(b, key);
    if (valA !== valB) { if (valA < valB) return dir === 'asc' ? -1 : 1; if (valA > valB) return dir === 'asc' ? 1 : -1; }
    return 0;
  });

  const handleSort = (key) => {
    let direction = 'desc';
    if (key === 'gk_conceded' && sortConfig.key !== 'gk_conceded') direction = 'asc';
    else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    else if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={12} className="text-slate-600 ml-1 inline" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-cyan-400 ml-1 inline" /> : <ArrowDown size={12} className="text-cyan-400 ml-1 inline" />;
  };

  const Th = ({ label, sortKey, align = 'right', w }) => (
    <th onClick={() => handleSort(sortKey)} className={`p-3 text-${align} cursor-pointer hover:bg-slate-800 transition text-slate-400 font-oswald uppercase tracking-wider ${w}`}>
      <div className={`flex items-center justify-${align === 'left' ? 'start' : (align === 'center' ? 'center' : 'end')}`}>
        {label} <SortIcon columnKey={sortKey} />
      </div>
    </th>
  );

  const renderAttack = () => (
    <>
      <div className="flex gap-2 mb-4 bg-slate-800 p-1 rounded-xl">
        {['goals', 'assists', 'ga'].map(t => (
          <button key={t} onClick={() => {setSubTab(t); handleSort(t === 'goals' ? 'total_goals' : (t === 'assists' ? 'total_assists' : 'ga_total'))}} className={`flex-1 py-2 text-xs font-bold rounded-lg uppercase tracking-wider font-oswald transition-all ${subTab === t ? 'bg-slate-700 text-cyan-400 shadow' : 'text-slate-500 hover:text-slate-300'}`}>{t === 'goals' ? 'Goal' : (t === 'assists' ? 'Assist' : 'G+A')}</button>
        ))}
      </div>
      <table className="w-full bg-slate-800 text-sm rounded-xl overflow-hidden shadow-lg">
        <thead className="bg-slate-900 border-b border-slate-700 text-xs"><tr><Th label="Giocatore" sortKey="name" align="left" /><Th label={subTab === 'goals' ? 'Goal' : (subTab === 'assists' ? 'Assist' : 'G+A')} sortKey={subTab === 'goals' ? 'total_goals' : (subTab === 'assists' ? 'total_assists' : 'ga_total')} align="center" /><Th label="Rateo" sortKey={subTab === 'goals' ? 'goal_ratio' : (subTab === 'assists' ? 'assist_ratio' : 'ga_ratio')} align="center" /></tr></thead>
        <tbody className="divide-y divide-slate-700">
          {sortedStats.map((p, i) => (
            <tr key={p.id} className="hover:bg-slate-700/50 transition">
              <td className="p-3 font-medium flex gap-3 text-white"><span className="text-slate-500 text-xs w-3 pt-0.5">{i+1}</span>{p.name}</td>
              <td className="p-3 text-center font-bold text-lg text-cyan-300 font-oswald">{subTab === 'goals' ? p.total_goals : (subTab === 'assists' ? p.total_assists : getValue(p, 'ga_total'))}</td>
              <td className="p-3 text-center font-mono text-slate-400">{getValue(p, subTab === 'goals' ? 'goal_ratio' : (subTab === 'assists' ? 'assist_ratio' : 'ga_ratio')).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );

  const renderDefense = () => (
    <>
      <div className="flex gap-2 mb-4 bg-slate-800 p-1 rounded-xl">
        {['clean', 'conceded'].map(t => (
          <button key={t} onClick={() => {setSubTab(t); if (t === 'conceded') setSortConfig({key: 'gk_conceded', direction: 'asc'}); else handleSort('clean_sheets');}} className={`flex-1 py-2 text-xs font-bold rounded-lg uppercase tracking-wider font-oswald transition-all ${subTab === t ? 'bg-slate-700 text-lime-400 shadow' : 'text-slate-500 hover:text-slate-300'}`}>{t === 'clean' ? 'Clean Sheet' : 'Subiti'}</button>
        ))}
      </div>
      <table className="w-full bg-slate-800 text-sm rounded-xl overflow-hidden shadow-lg">
        <thead className="bg-slate-900 border-b border-slate-700 text-xs"><tr><Th label="Portiere" sortKey="name" align="left" />{subTab === 'clean' ? (<><Th label="CS" sortKey="clean_sheets" align="center" /><Th label="Mini CS" sortKey="mini_clean_sheets" align="center" /></>) : (<><Th label="Subiti" sortKey="gk_conceded" align="center" /><Th label="Rateo" sortKey="conceded_ratio" align="center" /></>)}</tr></thead>
        <tbody className="divide-y divide-slate-700">
          {sortedStats.filter(p => p.gk_turns > 0).map((p, i) => (
            <tr key={p.id} className="hover:bg-slate-700/50 transition">
              <td className="p-3 font-medium flex gap-3 text-white"><span className="text-slate-500 text-xs w-3 pt-0.5">{i+1}</span>{p.name}</td>
              {subTab === 'clean' ? (<><td className="p-3 text-center font-bold text-lime-400 text-lg font-oswald">{p.clean_sheets}</td><td className="p-3 text-center font-bold text-slate-400">{p.gk_turns - p.gk_conceded}</td></>) : (<><td className="p-3 text-center font-bold text-fuchsia-400 text-lg font-oswald">{p.gk_conceded}</td><td className="p-3 text-center font-mono text-slate-400">{getValue(p, 'conceded_ratio').toFixed(2)}</td></>)}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );

  const renderGeneral = () => (
    <>
      <div className="flex gap-2 mb-4 bg-slate-800 p-1 rounded-xl overflow-x-auto">
        {['presence', 'results', 'mvp'].map(t => (
          <button key={t} onClick={() => {setSubTab(t); handleSort(t === 'presence' ? 'matches_played' : (t === 'results' ? 'wins' : 'total_mvps'))}} className={`flex-1 py-2 px-1 text-xs font-bold rounded-lg uppercase tracking-wider font-oswald min-w-[70px] transition-all ${subTab === t ? 'bg-slate-700 text-purple-400 shadow' : 'text-slate-500 hover:text-slate-300'}`}>{t === 'presence' ? 'Presenze' : (t === 'results' ? 'Risultati' : 'MVP')}</button>
        ))}
      </div>
      
      {subTab === 'presence' && (
        <table className="w-full bg-slate-800 text-sm rounded-xl overflow-hidden shadow-lg">
          <thead className="bg-slate-900 border-b border-slate-700 text-xs"><tr><Th label="Nome" sortKey="name" align="left" /><Th label="Presenze" sortKey="matches_played" align="center" /><Th label="% Pres" sortKey="presence_perc" align="center" /></tr></thead>
          <tbody className="divide-y divide-slate-700">{sortedStats.map((p, i) => (<tr key={p.id} className="hover:bg-slate-700/50 transition"><td className="p-3 font-medium flex gap-3 text-white"><span className="text-slate-500 text-xs w-3 pt-0.5">{i+1}</span>{p.name}</td><td className="p-3 text-center font-bold text-white">{p.matches_played}</td><td className="p-3 text-center font-mono text-purple-400">{getValue(p, 'presence_perc').toFixed(0)}%</td></tr>))}</tbody>
        </table>
      )}

      {subTab === 'results' && (
        <div className="overflow-x-auto rounded-xl shadow-lg"><table className="w-full bg-slate-800 text-xs min-w-[350px]"><thead className="bg-slate-900 border-b border-slate-700 uppercase text-slate-400 font-oswald"><tr><th className="p-3 text-left sticky left-0 bg-slate-900 z-10 border-r border-slate-800">Nome</th><Th label="W" sortKey="wins" align="center"/><Th label="D" sortKey="draws" align="center"/><Th label="L" sortKey="losses" align="center"/><Th label="%W" sortKey="win_perc" align="center"/><Th label="%D" sortKey="draw_perc" align="center"/><Th label="%L" sortKey="loss_perc" align="center"/></tr></thead><tbody className="divide-y divide-slate-700 text-slate-300">{sortedStats.map((p) => (<tr key={p.id} className="hover:bg-slate-700/50"><td className="p-3 font-bold sticky left-0 bg-slate-800 z-10 border-r border-slate-700 text-white">{p.name}</td><td className="p-3 text-center text-lime-500 font-bold">{p.wins}</td><td className="p-3 text-center text-slate-500">{p.draws}</td><td className="p-3 text-center text-fuchsia-500">{p.losses}</td><td className="p-3 text-center font-bold text-lime-400 bg-lime-500/10">{getValue(p, 'win_perc').toFixed(0)}%</td><td className="p-3 text-center text-slate-500">{getValue(p, 'draw_perc').toFixed(0)}%</td><td className="p-3 text-center text-fuchsia-400">{getValue(p, 'loss_perc').toFixed(0)}%</td></tr>))}</tbody></table></div>
      )}

      {subTab === 'mvp' && (
        <table className="w-full bg-slate-800 text-sm rounded-xl overflow-hidden shadow-lg">
          <thead className="bg-slate-900 border-b border-slate-700 text-xs"><tr><Th label="Giocatore" sortKey="name" align="left" /><Th label="Totale MVP" sortKey="total_mvps" align="center" /><Th label="Candidature" sortKey="candidates" align="center" /></tr></thead>
          <tbody className="divide-y divide-slate-700">
            {sortedStats.filter(p => p.total_mvps > 0 || p.candidates > 0).map((p, i) => (
              <tr key={p.id} className="hover:bg-slate-700/50 transition">
                <td className="p-3 font-medium flex items-center gap-3 text-white"><span className="text-slate-500 text-xs w-3">{i+1}</span>{p.name}<Star size={12} className="text-yellow-400 fill-yellow-400"/></td>
                <td className="p-3 text-center font-bold text-yellow-400 text-lg font-oswald">{p.total_mvps}</td>
                <td className="p-3 text-center font-bold text-cyan-400 text-lg font-oswald">{p.candidates}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );

  if (loading) return <div className="p-10 text-center text-slate-500 animate-pulse">Caricamento statistiche...</div>;

  return (
    <div className="w-full min-h-screen bg-slate-900 text-slate-100 p-4 pb-24">
      <Header title="Classifiche" session={session} />
      <div className="flex border-b border-slate-700 mb-6">{['attack', 'defense', 'general'].map(t => (<button key={t} onClick={() => {setMainTab(t); setSubTab(t==='attack'?'goals':t==='defense'?'clean':'presence'); if(t==='attack') setSortConfig({key:'total_goals', direction:'desc'}); if(t==='defense') setSortConfig({key:'clean_sheets', direction:'desc'}); if(t==='general') setSortConfig({key:'matches_played', direction:'desc'}); }} className={`flex-1 pb-3 text-sm font-bold uppercase tracking-widest font-oswald border-b-2 transition-all ${mainTab === t ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>{t === 'attack' ? 'Attacco' : t === 'defense' ? 'Difesa' : 'Generali'}</button>))}</div>
      <div className="animate-in fade-in zoom-in duration-200">{mainTab === 'attack' && renderAttack()}{mainTab === 'defense' && renderDefense()}{mainTab === 'general' && renderGeneral()}</div>
    </div>
  );
}