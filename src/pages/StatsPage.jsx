import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { ArrowUpDown, ArrowUp, ArrowDown, Star } from 'lucide-react';

export default function StatsPage({ session, userRole = 'user' }) {
  const [stats, setStats] = useState([]);
  const [synergyStats, setSynergyStats] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState('attack'); // 'attack' | 'defense' | 'general' | 'match_value'
  const [subTab, setSubTab] = useState('goals'); 
  const [sortConfig, setSortConfig] = useState({ key: 'total_goals', direction: 'desc' });
  
  // Configurazione ordinamento separata per il mini-tab delle Sinergie
  const [synSortConfig, setSynSortConfig] = useState({ key: 'bonus', direction: 'desc' });

  useEffect(() => {
    async function calculateStats() {
      const { data: players } = await supabase.from('players').select('*');
      const { data: matches } = await supabase.from('matches').select('*, match_stats(*)').eq('status', 'finished');

      if (!players || !matches) { setLoading(false); return; }

      let globalStats = {};
      players.forEach(p => globalStats[p.id] = { goals: 0, presences: 0 });
      matches.forEach(m => m.match_stats.forEach(ms => {
          globalStats[ms.player_id].goals += (ms.goals || 0);
          globalStats[ms.player_id].presences += 1;
      }));
      const getGlobalGoalRate = (id) => globalStats[id].presences > 0 ? (globalStats[id].goals / globalStats[id].presences) : 0;

      const playerStats = {};
      players.forEach(p => {
        playerStats[p.id] = { 
            id: p.id, name: p.name, 
            total_goals: 0, total_assists: 0, total_mvps: 0, candidates: 0, 
            matches_played: 0, wins: 0, draws: 0, losses: 0, 
            gk_turns: 0, gk_conceded: 0, clean_sheets: 0,
            def_performances: [] 
        };
      });

      let synergies = {};
      players.forEach(p1 => {
          players.forEach(p2 => {
              if (p1.id < p2.id) synergies[`${p1.id}-${p2.id}`] = { p1: p1.name, p2: p2.name, played: 0, won: 0 };
          });
      });

      matches.forEach(m => {
        const winner = m.team_a_score > m.team_b_score ? 'A' : (m.team_b_score > m.team_a_score ? 'B' : 'D');
        const tA = m.match_stats.filter(s => s.team === 'A').map(s => s.player_id);
        const tB = m.match_stats.filter(s => s.team === 'B').map(s => s.player_id);

        m.match_stats.forEach(ms => {
          if (playerStats[ms.player_id]) {
            const s = playerStats[ms.player_id];
            s.total_goals += ms.goals || 0; s.total_assists += ms.assists || 0; s.matches_played += 1;
            if (ms.is_mvp) s.total_mvps += 1; if (ms.is_candidate) s.candidates += 1;
            if (winner === 'D') s.draws += 1; else if (winner === ms.team) s.wins += 1; else s.losses += 1;
            if (ms.gk_turns > 0) { s.gk_turns += ms.gk_turns; s.gk_conceded += ms.gk_conceded; if (ms.gk_conceded === 0) s.clean_sheets += 1; }

            const expected_goals_A = tA.reduce((sum, id) => sum + getGlobalGoalRate(id), 0);
            const expected_goals_B = tB.reduce((sum, id) => sum + getGlobalGoalRate(id), 0);
            const opp_expected = ms.team === 'A' ? expected_goals_B : expected_goals_A;
            const team_conceded = ms.team === 'A' ? m.team_b_score : m.team_a_score;
            const gol_subiti_outfield = team_conceded - (ms.gk_conceded || 0);
            s.def_performances.push(opp_expected - gol_subiti_outfield);
          }
        });

        const processSynergy = (arr, isWinner) => {
            for (let i = 0; i < arr.length; i++) {
                for (let j = i + 1; j < arr.length; j++) {
                    const key = arr[i] < arr[j] ? `${arr[i]}-${arr[j]}` : `${arr[j]}-${arr[i]}`;
                    if (synergies[key]) {
                        synergies[key].played += 1;
                        if (isWinner) synergies[key].won += 1;
                    }
                }
            }
        };
        processSynergy(tA, winner === 'A'); processSynergy(tB, winner === 'B');
      });

      const K = 5;
      let means = { ga: 0, goals: 0, wins: 0, mvp_idx: 0, count: 0 };
      let valid_gk_raws = [];

      Object.values(playerStats).forEach(p => {
          if (p.matches_played > 0) {
              means.ga += ((p.total_goals + p.total_assists) / p.matches_played);
              means.goals += (p.total_goals / p.matches_played);
              means.wins += (p.wins / p.matches_played);
              means.mvp_idx += ((p.total_mvps * 1.0 + p.candidates * 0.4) / p.matches_played);
              means.count += 1;
          }
          if (p.gk_turns >= 3) {
              const mini_cs = Math.max(0, p.gk_turns - p.gk_conceded);
              const save_rate = (p.gk_turns - p.gk_conceded) / p.gk_turns;
              const mini_cs_rate = mini_cs / p.gk_turns;
              valid_gk_raws.push((save_rate * 0.65) + (mini_cs_rate * 0.35));
          }
      });

      const mean_ga = means.count > 0 ? means.ga / means.count : 0;
      const mean_goal = means.count > 0 ? means.goals / means.count : 0;
      const mean_win = means.count > 0 ? means.wins / means.count : 0;
      const mean_mvp = means.count > 0 ? means.mvp_idx / means.count : 0;
      const mean_GK_raw = valid_gk_raws.length > 0 ? valid_gk_raws.reduce((a,b)=>a+b,0)/valid_gk_raws.length : 0;

      let limits = { minOFF: Infinity, maxOFF: -Infinity, minDEF: Infinity, maxDEF: -Infinity, minGK: Infinity, maxGK: -Infinity, minIMP: Infinity, maxIMP: -Infinity };

      Object.values(playerStats).forEach(p => {
          if (p.matches_played > 0) {
              const pr = p.matches_played;
              const adj_ga = (pr * ((p.total_goals + p.total_assists)/pr) + K * mean_ga) / (pr + K);
              const adj_goal = (pr * (p.total_goals/pr) + K * mean_goal) / (pr + K);
              const adj_win = (pr * (p.wins/pr) + K * mean_win) / (pr + K);
              const adj_mvp = (pr * ((p.total_mvps * 1.0 + p.candidates * 0.4)/pr) + K * mean_mvp) / (pr + K);

              p.OFF_raw = (adj_ga * 0.6) + (adj_goal * 0.4);
              p.IMP_raw = (adj_win * 0.70) + (adj_mvp * 0.30);
              p.DEF_raw = p.def_performances.length > 0 ? p.def_performances.reduce((a,b)=>a+b,0)/p.def_performances.length : 0;
              
              if (p.gk_turns >= 3) {
                  const mini_cs = Math.max(0, p.gk_turns - p.gk_conceded);
                  p.GK_raw = (((p.gk_turns - p.gk_conceded) / p.gk_turns) * 0.65) + ((mini_cs / p.gk_turns) * 0.35);
              } else {
                  p.GK_raw = mean_GK_raw;
              }

              if(p.OFF_raw < limits.minOFF) limits.minOFF = p.OFF_raw; if(p.OFF_raw > limits.maxOFF) limits.maxOFF = p.OFF_raw;
              if(p.DEF_raw < limits.minDEF) limits.minDEF = p.DEF_raw; if(p.DEF_raw > limits.maxDEF) limits.maxDEF = p.DEF_raw;
              if(p.GK_raw < limits.minGK) limits.minGK = p.GK_raw; if(p.GK_raw > limits.maxGK) limits.maxGK = p.GK_raw;
              if(p.IMP_raw < limits.minIMP) limits.minIMP = p.IMP_raw; if(p.IMP_raw > limits.maxIMP) limits.maxIMP = p.IMP_raw;
          }
      });

      const normalize = (val, min, max) => (val === null) ? null : (max === min ? 50 : ((val - min) / (max - min)) * 100);

      Object.values(playerStats).forEach(p => {
          if (p.matches_played > 0) {
              p.OFF = normalize(p.OFF_raw, limits.minOFF, limits.maxOFF);
              p.DEF = normalize(p.DEF_raw, limits.minDEF, limits.maxDEF);
              p.GK = normalize(p.GK_raw, limits.minGK, limits.maxGK);
              p.IMP = normalize(p.IMP_raw, limits.minIMP, limits.maxIMP);
              p.PLAYER_SCORE = (p.OFF * 0.30) + (p.DEF * 0.30) + (p.GK * 0.20) + (p.IMP * 0.20);
          } else {
              p.OFF = 0; p.DEF = 0; p.GK = 0; p.IMP = 0; p.PLAYER_SCORE = 0;
          }
          p.total_matches_global = matches.length;
      });

      setStats(Object.values(playerStats));

      const synergyArray = Object.values(synergies)
        .filter(syn => syn.played >= 5) 
        .map(syn => {
            const winRate = syn.won / syn.played;
            let bonus = 0;
            if (winRate > 0.6) bonus = 4;
            if (winRate < 0.4) bonus = -4;
            return { ...syn, winRate, bonus };
        });

      setSynergyStats(synergyArray);
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
      case 'points': return (player.wins * 3) + player.draws;
      default: return player[key] || 0;
    }
  }

  // LOGICA DI ORDINAMENTO PER TABELLE STANDARD GIOCATORI
  const sortedStats = [...stats].sort((a, b) => {
    const key = sortConfig.key;
    const dir = sortConfig.direction === 'asc' ? 1 : -1;
    let valA = getValue(a, key); let valB = getValue(b, key);
    if (valA !== valB) { return (valA > valB ? 1 : -1) * dir; }
    if (key === 'total_goals') return getValue(b, 'goal_ratio') - getValue(a, 'goal_ratio');
    if (key === 'total_assists') return getValue(b, 'assist_ratio') - getValue(a, 'assist_ratio');
    if (key === 'ga_total') return getValue(b, 'ga_ratio') - getValue(a, 'ga_ratio');
    if (key === 'clean_sheets') return getValue(b, 'mini_clean_sheets') - getValue(a, 'mini_clean_sheets');
    if (key === 'gk_conceded') return getValue(a, 'conceded_ratio') - getValue(b, 'conceded_ratio');
    if (key === 'total_mvps') return getValue(b, 'candidates') - getValue(a, 'candidates');
    return 0;
  });

  const handleSort = (key) => {
    let direction = 'desc';
    if ((key === 'gk_conceded' || key === 'losses' || key === 'loss_perc') && sortConfig.key !== key) direction = 'asc';
    else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    else if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  // LOGICA DI ORDINAMENTO SPECIFICA PER MINI-TABELLE DELLE SINERGIE
  const sortedSynergyStats = [...synergyStats].sort((a, b) => {
    const key = synSortConfig.key;
    const dir = synSortConfig.direction === 'asc' ? 1 : -1;

    let valA = a[key];
    let valB = b[key];

    if (key === 'p1') {
      // Per il nome della coppia ordiniamo in base al nome del primo giocatore
      return a.p1.localeCompare(b.p1) * dir;
    }

    if (valA !== valB) return (valA > valB ? 1 : -1) * dir;
    return b.played - a.played; // In caso di parità, chi ha più presenze va in cima
  });

  const handleSynergySort = (key) => {
    let direction = 'desc';
    if (synSortConfig.key === key && synSortConfig.direction === 'desc') direction = 'asc';
    else if (synSortConfig.key === key && synSortConfig.direction === 'asc') direction = 'desc';
    setSynSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey, isSynergy = false }) => {
    const config = isSynergy ? synSortConfig : sortConfig;
    if (config.key !== columnKey) return <ArrowUpDown size={12} className="text-slate-600 ml-1 inline" />;
    return config.direction === 'asc' ? <ArrowUp size={12} className="text-cyan-400 ml-1 inline" /> : <ArrowDown size={12} className="text-cyan-400 ml-1 inline" />;
  };

  const Th = ({ label, sortKey, align = 'right', w, isSynergy = false }) => (
    <th 
      onClick={() => isSynergy ? handleSynergySort(sortKey) : handleSort(sortKey)} 
      className={`p-3 text-${align} cursor-pointer hover:bg-slate-800 transition text-slate-400 font-oswald uppercase tracking-wider ${w}`}
    >
      <div className={`flex items-center justify-${align === 'left' ? 'start' : (align === 'center' ? 'center' : 'end')}`}>
        {label} <SortIcon columnKey={sortKey} isSynergy={isSynergy} />
      </div>
    </th>
  );

  return (
    <div className="w-full min-h-screen bg-slate-900 text-slate-100 p-4 pb-24">
      
      <div className="flex border-b border-slate-700 mb-6 overflow-x-auto scrollbar-hide">
        {['attack', 'defense', 'general', (userRole === 'admin' || userRole === 'founder') ? 'match_value' : null].filter(Boolean).map(t => (
          <button 
            key={t} 
            onClick={() => {
              setMainTab(t); 
              if(t==='attack') { setSubTab('goals'); setSortConfig({key:'total_goals', direction:'desc'}); }
              if(t==='defense') { setSubTab('clean'); setSortConfig({key:'clean_sheets', direction:'desc'}); }
              if(t==='general') { setSubTab('presence'); setSortConfig({key:'matches_played', direction:'desc'}); }
              if(t==='match_value') { setSubTab('score'); setSortConfig({key:'PLAYER_SCORE', direction:'desc'}); }
            }} 
            className={`flex-1 py-3 px-2 text-xs sm:text-sm font-bold uppercase tracking-widest font-oswald border-b-2 transition-all whitespace-nowrap ${mainTab === t ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            {t === 'attack' ? 'Attacco' : t === 'defense' ? 'Difesa' : t === 'general' ? 'Generali' : 'Match Value'}
          </button>
        ))}
      </div>
      
      <div className="animate-in fade-in zoom-in duration-200">
        
        {mainTab === 'attack' && (
            <>
              <div className="flex gap-2 mb-4 bg-slate-800 p-1 rounded-xl">
                {['goals', 'assists', 'ga'].map(t => (<button key={t} onClick={() => {setSubTab(t); handleSort(t === 'goals' ? 'total_goals' : (t === 'assists' ? 'total_assists' : 'ga_total'))}} className={`flex-1 py-2 text-xs font-bold rounded-lg uppercase tracking-wider font-oswald transition-all ${subTab === t ? 'bg-slate-700 text-cyan-400 shadow' : 'text-slate-500 hover:text-slate-300'}`}>{t === 'goals' ? 'Goal' : (t === 'assists' ? 'Assist' : 'G+A')}</button>))}
              </div>
              <table className="w-full bg-slate-800 text-sm rounded-xl overflow-hidden shadow-lg">
                <thead className="bg-slate-900 border-b border-slate-700 text-xs"><tr><Th label="Giocatore" sortKey="name" align="left" /><Th label={subTab === 'goals' ? 'Goal' : (subTab === 'assists' ? 'Assist' : 'G+A')} sortKey={subTab === 'goals' ? 'total_goals' : (subTab === 'assists' ? 'total_assists' : 'ga_total')} align="center" /><Th label="Rateo" sortKey={subTab === 'goals' ? 'goal_ratio' : (subTab === 'assists' ? 'assist_ratio' : 'ga_ratio')} align="center" /></tr></thead>
                <tbody className="divide-y divide-slate-700">
                  {sortedStats.map((p, i) => (<tr key={p.id} className="hover:bg-slate-700/50 transition"><td className="p-3 font-medium flex gap-3 text-white"><span className="text-slate-500 text-xs w-3 pt-0.5">{i+1}</span>{p.name}</td><td className="p-3 text-center font-bold text-lg text-cyan-300 font-oswald">{subTab === 'goals' ? p.total_goals : (subTab === 'assists' ? p.total_assists : getValue(p, 'ga_total'))}</td><td className="p-3 text-center font-mono text-slate-400">{getValue(p, subTab === 'goals' ? 'goal_ratio' : (subTab === 'assists' ? 'assist_ratio' : 'ga_ratio')).toFixed(2)}</td></tr>))}
                </tbody>
              </table>
            </>
        )}

        {mainTab === 'defense' && (
            <>
              <div className="flex gap-2 mb-4 bg-slate-800 p-1 rounded-xl">
                {['clean', 'conceded'].map(t => (<button key={t} onClick={() => {setSubTab(t); if (t === 'conceded') setSortConfig({key: 'gk_conceded', direction: 'asc'}); else handleSort('clean_sheets');}} className={`flex-1 py-2 text-xs font-bold rounded-lg uppercase tracking-wider font-oswald transition-all ${subTab === t ? 'bg-slate-700 text-lime-400 shadow' : 'text-slate-500 hover:text-slate-300'}`}>{t === 'clean' ? 'Clean Sheet' : 'Subiti'}</button>))}
              </div>
              <table className="w-full bg-slate-800 text-sm rounded-xl overflow-hidden shadow-lg">
                <thead className="bg-slate-900 border-b border-slate-700 text-xs"><tr><Th label="Portiere" sortKey="name" align="left" />{subTab === 'clean' ? (<><Th label="CS" sortKey="clean_sheets" align="center" /><Th label="Mini CS" sortKey="mini_clean_sheets" align="center" /></>) : (<><Th label="Subiti" sortKey="gk_conceded" align="center" /><Th label="Rateo" sortKey="conceded_ratio" align="center" /></>)}</tr></thead>
                <tbody className="divide-y divide-slate-700">
                  {sortedStats.filter(p => p.gk_turns > 0).map((p, i) => (<tr key={p.id} className="hover:bg-slate-700/50 transition"><td className="p-3 font-medium flex gap-3 text-white"><span className="text-slate-500 text-xs w-3 pt-0.5">{i+1}</span>{p.name}</td>{subTab === 'clean' ? (<><td className="p-3 text-center font-bold text-lime-400 text-lg font-oswald">{p.clean_sheets}</td><td className="p-3 text-center font-bold text-slate-400">{p.gk_turns - p.gk_conceded}</td></>) : (<><td className="p-3 text-center font-bold text-fuchsia-400 text-lg font-oswald">{p.gk_conceded}</td><td className="p-3 text-center font-mono text-slate-400">{getValue(p, 'conceded_ratio').toFixed(2)}</td></>)}</tr>))}
                </tbody>
              </table>
            </>
        )}

        {mainTab === 'general' && (
            <>
              <div className="flex gap-2 mb-4 bg-slate-800 p-1 rounded-xl overflow-x-auto">
                {['presence', 'results', 'mvp'].map(t => (<button key={t} onClick={() => {setSubTab(t); handleSort(t === 'presence' ? 'matches_played' : (t === 'results' ? 'points' : 'total_mvps'))}} className={`flex-1 py-2 px-1 text-xs font-bold rounded-lg uppercase tracking-wider font-oswald min-w-[70px] transition-all ${subTab === t ? 'bg-slate-700 text-purple-400 shadow' : 'text-slate-500 hover:text-slate-300'}`}>{t === 'presence' ? 'Presenze' : (t === 'results' ? 'Risultati' : 'MVP')}</button>))}
              </div>
              
              {subTab === 'presence' && (
                <table className="w-full bg-slate-800 text-sm rounded-xl overflow-hidden shadow-lg"><thead className="bg-slate-900 border-b border-slate-700 text-xs"><tr><Th label="Nome" sortKey="name" align="left" /><Th label="Presenze" sortKey="matches_played" align="center" /><Th label="% Pres" sortKey="presence_perc" align="center" /></tr></thead><tbody className="divide-y divide-slate-700">{sortedStats.map((p, i) => (<tr key={p.id} className="hover:bg-slate-700/50 transition"><td className="p-3 font-medium flex gap-3 text-white"><span className="text-slate-500 text-xs w-3 pt-0.5">{i+1}</span>{p.name}</td><td className="p-3 text-center font-bold text-white">{p.matches_played}</td><td className="p-3 text-center font-mono text-purple-400">{getValue(p, 'presence_perc').toFixed(0)}%</td></tr>))}</tbody></table>
              )}

              {subTab === 'results' && (
                <div className="overflow-x-auto rounded-xl shadow-lg"><table className="w-full bg-slate-800 text-xs min-w-[400px]"><thead className="bg-slate-900 border-b border-slate-700 uppercase text-slate-400 font-oswald"><tr><th className="p-3 text-left sticky left-0 bg-slate-900 z-10 border-r border-slate-800">Nome</th><Th label="W" sortKey="wins" align="center"/><Th label="D" sortKey="draws" align="center"/><Th label="L" sortKey="losses" align="center"/><Th label="PTS" sortKey="points" align="center"/><Th label="%W" sortKey="win_perc" align="center"/><Th label="%D" sortKey="draw_perc" align="center"/><Th label="%L" sortKey="loss_perc" align="center"/></tr></thead><tbody className="divide-y divide-slate-700 text-slate-300">{sortedStats.map((p) => (<tr key={p.id} className="hover:bg-slate-700/50"><td className="p-3 font-bold sticky left-0 bg-slate-800 z-10 border-r border-slate-700 text-white">{p.name}</td><td className="p-3 text-center text-lime-500 font-bold">{p.wins}</td><td className="p-3 text-center text-slate-500">{p.draws}</td><td className="p-3 text-center text-red-400">{p.losses}</td><td className="p-3 text-center font-black text-cyan-400 bg-slate-700/30 text-sm font-oswald">{getValue(p, 'points')}</td><td className="p-3 text-center font-bold text-lime-400 bg-lime-500/10">{getValue(p, 'win_perc').toFixed(0)}%</td><td className="p-3 text-center text-slate-500">{getValue(p, 'draw_perc').toFixed(0)}%</td><td className="p-3 text-center text-red-400/80">{getValue(p, 'loss_perc').toFixed(0)}%</td></tr>))}</tbody></table></div>
              )}

              {subTab === 'mvp' && (
                <table className="w-full bg-slate-800 text-sm rounded-xl overflow-hidden shadow-lg"><thead className="bg-slate-900 border-b border-slate-700 text-xs"><tr><Th label="Giocatore" sortKey="name" align="left" /><Th label="Totale MVP" sortKey="total_mvps" align="center" /><Th label="Candidature" sortKey="candidates" align="center" /></tr></thead><tbody className="divide-y divide-slate-700">{sortedStats.filter(p => p.total_mvps > 0 || p.candidates > 0).map((p, i) => (<tr key={p.id} className="hover:bg-slate-700/50 transition"><td className="p-3 font-medium flex items-center gap-3 text-white"><span className="text-slate-500 text-xs w-3">{i+1}</span>{p.name}<Star size={12} className="text-yellow-400 fill-yellow-400"/></td><td className="p-3 text-center font-bold text-yellow-400 text-lg font-oswald">{p.total_mvps}</td><td className="p-3 text-center font-bold text-cyan-400 text-lg font-oswald">{p.candidates}</td></tr>))}</tbody></table>
              )}
            </>
        )}

        {/* TAB MATCH VALUE CON SOTTO-TAB SCORE E SINERGIE (ENTRAMBI ORDINABILI) */}
        {mainTab === 'match_value' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex gap-2 mb-4 bg-slate-800 p-1 rounded-xl">
              {['score', 'synergy'].map(t => (
                <button 
                  key={t} 
                  onClick={() => { setSubTab(t); if(t==='score') setSortConfig({key:'PLAYER_SCORE', direction:'desc'}); else setSynSortConfig({key:'bonus', direction:'desc'}); }} 
                  className={`flex-1 py-2 text-xs font-bold rounded-lg uppercase tracking-wider font-oswald transition-all ${subTab === t ? 'bg-slate-700 text-indigo-400 shadow' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {t === 'score' ? 'Score Assoluto' : 'Sinergie'}
                </button>
              ))}
            </div>

            {subTab === 'score' && (
              <div className="overflow-x-auto rounded-xl shadow-lg border border-slate-700">
                <table className="w-full bg-slate-800 text-sm min-w-[400px]">
                  <thead className="bg-slate-900 border-b border-slate-700 text-xs">
                    <tr>
                      <Th label="Giocatore" sortKey="name" align="left" />
                      <Th label="Score Totale" sortKey="PLAYER_SCORE" align="center" />
                      <Th label="Attacco" sortKey="OFF" align="center" />
                      <Th label="Difesa" sortKey="DEF" align="center" />
                      <Th label="Porta" sortKey="GK" align="center" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700 text-slate-300">
                    {sortedStats.filter(p => p.matches_played > 0).map((p, i) => (
                        <tr key={p.id} className="hover:bg-slate-700/50 transition">
                            <td className="p-3 font-bold text-white flex items-center gap-2">
                                <span className="text-slate-500 text-xs w-4">{i+1}°</span>
                                {p.name}
                            </td>
                            <td className="p-3 text-center font-black font-oswald text-lg text-white">
                                {p.PLAYER_SCORE.toFixed(1)}
                            </td>
                            <td className="p-3 text-center font-mono text-cyan-400">{p.OFF.toFixed(0)}</td>
                            <td className="p-3 text-center font-mono text-lime-400">{p.DEF.toFixed(0)}</td>
                            <td className="p-3 text-center font-mono text-yellow-400">{p.GK.toFixed(0)}</td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {subTab === 'synergy' && (
              <div className="overflow-x-auto rounded-xl shadow-lg border border-slate-700">
                <table className="w-full bg-slate-800 text-sm min-w-[450px]">
                  <thead className="bg-slate-900 border-b border-slate-700 uppercase text-slate-400 font-oswald text-xs">
                    <tr>
                      <Th label="Coppia" sortKey="p1" align="left" isSynergy={true} />
                      <Th label="Partite" sortKey="played" align="center" isSynergy={true} />
                      <Th label="Vittorie" sortKey="won" align="center" isSynergy={true} />
                      <Th label="Win %" sortKey="winRate" align="center" isSynergy={true} />
                      <Th label="Bonus" sortKey="bonus" align="center" isSynergy={true} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700 text-slate-300">
                    {sortedSynergyStats.length === 0 ? (
                      <tr><td colSpan="5" className="p-6 text-center text-slate-500 italic">Nessuna coppia ha ancora raggiunto le 5 partite assieme.</td></tr>
                    ) : (
                      sortedSynergyStats.map((syn, i) => (
                        <tr key={i} className="hover:bg-slate-700/50 transition">
                          <td className="p-3 font-bold text-white flex items-center gap-2">
                            <span className="text-slate-500 text-[10px] w-4 text-right pr-2">{i+1}°</span>
                            {syn.p1} <span className="text-slate-600 font-normal mx-1">&</span> {syn.p2}
                          </td>
                          <td className="p-3 text-center font-bold text-slate-400">{syn.played}</td>
                          <td className="p-3 text-center text-lime-500 font-bold">{syn.won}</td>
                          <td className="p-3 text-center font-mono text-slate-300">{(syn.winRate * 100).toFixed(0)}%</td>
                          <td className={`p-3 text-center font-black font-oswald text-lg ${syn.bonus > 0 ? 'text-lime-400' : syn.bonus < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                            {syn.bonus > 0 ? '+' : ''}{syn.bonus.toFixed(0)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}