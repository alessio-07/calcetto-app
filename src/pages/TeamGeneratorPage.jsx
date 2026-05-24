import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { supabase } from '../supabase';
import { Settings2, Flame, AlertTriangle, ArrowLeftRight, Wand2, RefreshCw, Link, Unlink, Plus, Trash2, Sliders, X } from 'lucide-react';

// --- COMPONENTE CARD GIOCATORE ---
const DraggablePlayer = ({ player, index, synergyFlags }) => {
  const synStatus = synergyFlags?.[player.id] || 0;

  return (
    <Draggable draggableId={player.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{ ...provided.draggableProps.style, touchAction: 'none' }}
          className={`flex items-center gap-3 p-3 mb-2 rounded-xl shadow-md select-none transition-all border ${
            snapshot.isDragging ? 'bg-slate-700 border-cyan-400 scale-105 z-50 ring-2 ring-cyan-500/50' : 'bg-slate-800 border-slate-700 hover:border-slate-500'
          }`}
        >
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-lg shrink-0 overflow-hidden border border-slate-600">
              {player.avatar ? <img src={player.avatar} alt="" className="w-full h-full object-cover" /> : player.name.charAt(0).toUpperCase()}
            </div>
            {player.hasOverride && <div className="absolute top-0 right-0 w-3 h-3 bg-yellow-400 rounded-full border border-slate-800 z-10" title="Valori Manuali"></div>}
            {synStatus > 0 && <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5 shadow-lg"><Flame size={14} className="text-orange-500 fill-orange-500 animate-pulse"/></div>}
            {synStatus < 0 && <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5 shadow-lg"><AlertTriangle size={14} className="text-red-500"/></div>}
          </div>

          <div className="flex flex-col flex-1 pointer-events-none">
              <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-100 font-oswald tracking-wide truncate text-lg">{player.name}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Score</span>
                    <span className="font-black text-xl text-white font-oswald">{player.PLAYER_SCORE.toFixed(0)}</span>
                  </div>
              </div>
              
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] font-bold text-cyan-400 w-5">OFF</span>
                    <div className="h-1 flex-1 bg-slate-900 rounded-full overflow-hidden"><div className="h-full bg-cyan-400" style={{ width: `${player.OFF}%` }}></div></div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] font-bold text-lime-400 w-5">DEF</span>
                    <div className="h-1 flex-1 bg-slate-900 rounded-full overflow-hidden"><div className="h-full bg-lime-400" style={{ width: `${player.DEF}%` }}></div></div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] font-bold text-yellow-400 w-5">GK</span>
                    <div className="h-1 flex-1 bg-slate-900 rounded-full overflow-hidden"><div className="h-full bg-yellow-400" style={{ width: `${player.GK}%` }}></div></div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] font-bold text-fuchsia-400 w-5">IMP</span>
                    <div className="h-1 flex-1 bg-slate-900 rounded-full overflow-hidden"><div className="h-full bg-fuchsia-400" style={{ width: `${player.IMP}%` }}></div></div>
                  </div>
              </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default function TeamGeneratorPage({ session }) {
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  const [isResultView, setIsResultView] = useState(false);
  const [teamA, setTeamA] = useState([]);
  const [teamB, setTeamB] = useState([]);
  const [teamStats, setTeamStats] = useState({ statA: null, statB: null, mismatch: 0, synergyFlags: {}, predictedScore: "" });
  const [synergiesMatrix, setSynergiesMatrix] = useState({});

  // REGOLE VINCOLI
  const [rules, setRules] = useState([]);
  const [ruleP1, setRuleP1] = useState('');
  const [ruleP2, setRuleP2] = useState('');
  const [ruleType, setRuleType] = useState('TOGETHER');

  // OVERRIDE MANUALI
  const [overrides, setOverrides] = useState({}); // { id: { OFF: 80, DEF: 20... } }
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editVals, setEditVals] = useState({ OFF: '', DEF: '', GK: '', IMP: '' });

  useEffect(() => {
    async function loadData() {
      const { data: pData } = await supabase.from('players').select('*').order('name');
      const { data: mData } = await supabase.from('matches').select('*, match_stats(*)').eq('status', 'finished');
      setPlayers(pData || []);
      setMatches(mData || []);
      setLoading(false);
    }
    loadData();
  }, []);

  const togglePlayer = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const addRule = () => {
    if (!ruleP1 || !ruleP2 || ruleP1 === ruleP2) return alert("Seleziona due giocatori diversi.");
    const newRule = { id: Date.now().toString(), player1: ruleP1, player2: ruleP2, type: ruleType };
    setRules([...rules, newRule]);
    setRuleP1(''); setRuleP2('');
  };

  const handleOpenEdit = (player) => {
      setEditingPlayer(player);
      setEditVals({
          OFF: overrides[player.id]?.OFF !== undefined ? overrides[player.id].OFF : '',
          DEF: overrides[player.id]?.DEF !== undefined ? overrides[player.id].DEF : '',
          GK: overrides[player.id]?.GK !== undefined ? overrides[player.id].GK : '',
          IMP: overrides[player.id]?.IMP !== undefined ? overrides[player.id].IMP : '',
      });
  };

  const handleSaveEdit = () => {
      const newOverrides = { ...overrides };
      if (editVals.OFF === '' && editVals.DEF === '' && editVals.GK === '' && editVals.IMP === '') {
          delete newOverrides[editingPlayer.id];
      } else {
          newOverrides[editingPlayer.id] = {
              OFF: editVals.OFF !== '' ? parseFloat(editVals.OFF) : undefined,
              DEF: editVals.DEF !== '' ? parseFloat(editVals.DEF) : undefined,
              GK: editVals.GK !== '' ? parseFloat(editVals.GK) : undefined,
              IMP: editVals.IMP !== '' ? parseFloat(editVals.IMP) : undefined,
          };
      }
      setOverrides(newOverrides);
      setEditingPlayer(null);
  };

  const prepareAlgorithmData = () => {
    const K = 5; 
    const selectedPlayers = players.filter(p => selectedIds.has(p.id));
    
    let globalStats = {};
    players.forEach(p => globalStats[p.id] = { goals: 0, presences: 0 });
    matches.forEach(m => m.match_stats.forEach(ms => {
        globalStats[ms.player_id].goals += (ms.goals || 0);
        globalStats[ms.player_id].presences += 1;
    }));
    const getGlobalGoalRate = (id) => globalStats[id].presences > 0 ? (globalStats[id].goals / globalStats[id].presences) : 0;

    let profiles = {};
    selectedPlayers.forEach(p => {
        profiles[p.id] = { 
            id: p.id, name: p.name, avatar: p.avatar_url, 
            presences: 0, ga: 0, goals: 0, wins: 0, 
            turns_in_goal: 0, goals_conceded: 0, mini_cs: 0, 
            mvp_count: 0, nominations: 0,
            def_performances: [], expected_goals: 0
        };
    });

    let synergies = {};
    selectedPlayers.forEach(p1 => {
        synergies[p1.id] = {};
        selectedPlayers.forEach(p2 => { if(p1.id !== p2.id) synergies[p1.id][p2.id] = { played: 0, won: 0 }; });
    });

    matches.forEach(m => {
      const winner = m.team_a_score > m.team_b_score ? 'A' : (m.team_b_score > m.team_a_score ? 'B' : 'D');
      const tA = m.match_stats.filter(s => s.team === 'A').map(s => s.player_id);
      const tB = m.match_stats.filter(s => s.team === 'B').map(s => s.player_id);

      const processSynergy = (arr, won) => {
          for(let i=0; i<arr.length; i++) {
              for(let j=i+1; j<arr.length; j++) {
                  if(synergies[arr[i]]?.[arr[j]]) {
                      synergies[arr[i]][arr[j]].played += 1; synergies[arr[j]][arr[i]].played += 1;
                      if(won) { synergies[arr[i]][arr[j]].won += 1; synergies[arr[j]][arr[i]].won += 1; }
                  }
              }
          }
      };
      processSynergy(tA, winner === 'A'); processSynergy(tB, winner === 'B');

      const expected_goals_A = tA.reduce((sum, id) => sum + getGlobalGoalRate(id), 0);
      const expected_goals_B = tB.reduce((sum, id) => sum + getGlobalGoalRate(id), 0);

      m.match_stats.forEach(ms => {
        if (profiles[ms.player_id]) {
            let prof = profiles[ms.player_id];
            prof.presences += 1; 
            prof.ga += (ms.goals || 0) + (ms.assists || 0); 
            prof.goals += (ms.goals || 0);
            prof.turns_in_goal += (ms.gk_turns || 0); 
            prof.goals_conceded += (ms.gk_conceded || 0);
            prof.mini_cs += Math.max(0, (ms.gk_turns || 0) - (ms.gk_conceded || 0));
            if (ms.is_mvp) prof.mvp_count += 1; 
            if (ms.is_candidate) prof.nominations += 1; 
            if (ms.team === winner) prof.wins += 1;

            const opp_expected = ms.team === 'A' ? expected_goals_B : expected_goals_A;
            const team_conceded = ms.team === 'A' ? m.team_b_score : m.team_a_score;
            const gol_subiti_outfield = team_conceded - (ms.gk_conceded || 0);
            const def_perf = opp_expected - gol_subiti_outfield;
            prof.def_performances.push(def_perf);
        }
      });
    });

    let means = { ga: 0, goals: 0, wins: 0, mvp_idx: 0, count: 0 };
    let valid_gk_raws = [];

    Object.values(profiles).forEach(p => {
        if (p.presences > 0) {
            means.ga += (p.ga / p.presences);
            means.goals += (p.goals / p.presences);
            means.wins += (p.wins / p.presences);
            means.mvp_idx += ((p.mvp_count * 1.0 + p.nominations * 0.4) / p.presences);
            means.count += 1;
        }
        if (p.turns_in_goal >= 3) {
            const save_rate = (p.turns_in_goal - p.goals_conceded) / p.turns_in_goal;
            const mini_cs_rate = p.mini_cs / p.turns_in_goal;
            valid_gk_raws.push((save_rate * 0.65) + (mini_cs_rate * 0.35));
        }
    });

    const mean_ga_rate = means.count > 0 ? means.ga / means.count : 0;
    const mean_goal_rate = means.count > 0 ? means.goals / means.count : 0;
    const mean_win_pct = means.count > 0 ? means.wins / means.count : 0;
    const mean_mvp_idx = means.count > 0 ? means.mvp_idx / means.count : 0;
    const mean_GK_raw = valid_gk_raws.length > 0 ? valid_gk_raws.reduce((a,b)=>a+b,0)/valid_gk_raws.length : 0;

    Object.values(profiles).forEach(p => {
        if (p.presences > 0) {
            const pr = p.presences;
            const adj_ga = (pr * (p.ga/pr) + K * mean_ga_rate) / (pr + K);
            const adj_goal = (pr * (p.goals/pr) + K * mean_goal_rate) / (pr + K);
            const adj_win = (pr * (p.wins/pr) + K * mean_win_pct) / (pr + K);
            const raw_mvp = (p.mvp_count * 1.0 + p.nominations * 0.4) / pr;
            const adj_mvp = (pr * raw_mvp + K * mean_mvp_idx) / (pr + K);

            p.OFF_raw = (adj_ga * 0.6) + (adj_goal * 0.4);
            p.IMP_raw = (adj_win * 0.70) + (adj_mvp * 0.30);
            p.DEF_raw = p.def_performances.length > 0 ? p.def_performances.reduce((a,b)=>a+b,0)/p.def_performances.length : 0;
            p.expected_goals = adj_goal;
        } else {
            p.OFF_raw = null; p.IMP_raw = null; p.DEF_raw = null;
        }

        if (p.turns_in_goal >= 3) {
            const save_rate = (p.turns_in_goal - p.goals_conceded) / p.turns_in_goal;
            const mini_cs_rate = p.mini_cs / p.turns_in_goal;
            p.GK_raw = (save_rate * 0.65) + (mini_cs_rate * 0.35);
        } else {
            p.GK_raw = p.presences > 0 ? mean_GK_raw : null;
        }
    });

    let limits = {
        minOFF: Infinity, maxOFF: -Infinity, minDEF: Infinity, maxDEF: -Infinity,
        minGK: Infinity, maxGK: -Infinity, minIMP: Infinity, maxIMP: -Infinity,
    };

    Object.values(profiles).forEach(p => {
        if (p.presences > 0) {
            if(p.OFF_raw < limits.minOFF) limits.minOFF = p.OFF_raw; if(p.OFF_raw > limits.maxOFF) limits.maxOFF = p.OFF_raw;
            if(p.DEF_raw < limits.minDEF) limits.minDEF = p.DEF_raw; if(p.DEF_raw > limits.maxDEF) limits.maxDEF = p.DEF_raw;
            if(p.GK_raw < limits.minGK) limits.minGK = p.GK_raw; if(p.GK_raw > limits.maxGK) limits.maxGK = p.GK_raw;
            if(p.IMP_raw < limits.minIMP) limits.minIMP = p.IMP_raw; if(p.IMP_raw > limits.maxIMP) limits.maxIMP = p.IMP_raw;
        }
    });

    const normalize = (val, min, max) => {
        if (val === null) return null;
        if (max === min || max === -Infinity) return 50;
        return ((val - min) / (max - min)) * 100;
    };

    let sum_norm = { OFF: 0, DEF: 0, GK: 0, IMP: 0, SCORE: 0, count: 0 };

    Object.values(profiles).forEach(p => {
        if (p.presences > 0) {
            p.OFF = normalize(p.OFF_raw, limits.minOFF, limits.maxOFF);
            p.DEF = normalize(p.DEF_raw, limits.minDEF, limits.maxDEF);
            p.GK = normalize(p.GK_raw, limits.minGK, limits.maxGK);
            p.IMP = normalize(p.IMP_raw, limits.minIMP, limits.maxIMP);
            
            p.PLAYER_SCORE = (p.OFF * 0.30) + (p.DEF * 0.30) + (p.GK * 0.20) + (p.IMP * 0.20);
            
            sum_norm.OFF += p.OFF; sum_norm.DEF += p.DEF; sum_norm.GK += p.GK; sum_norm.IMP += p.IMP; sum_norm.SCORE += p.PLAYER_SCORE;
            sum_norm.count += 1;
        }
    });

    const avg = {
        OFF: sum_norm.count > 0 ? sum_norm.OFF / sum_norm.count : 50,
        DEF: sum_norm.count > 0 ? sum_norm.DEF / sum_norm.count : 50,
        GK: sum_norm.count > 0 ? sum_norm.GK / sum_norm.count : 50,
        IMP: sum_norm.count > 0 ? sum_norm.IMP / sum_norm.count : 50,
        SCORE: sum_norm.count > 0 ? sum_norm.SCORE / sum_norm.count : 50,
    };

    Object.values(profiles).forEach(p => {
        if (p.presences === 0) {
            p.OFF = avg.OFF; p.DEF = avg.DEF; p.GK = avg.GK; p.IMP = avg.IMP; p.PLAYER_SCORE = avg.SCORE;
            p.expected_goals = mean_goal_rate;
        }

        // APPLICAZIONE OVERRIDE MANUALI
        if (overrides[p.id]) {
            p.hasOverride = true;
            if (overrides[p.id].OFF !== undefined) p.OFF = overrides[p.id].OFF;
            if (overrides[p.id].DEF !== undefined) p.DEF = overrides[p.id].DEF;
            if (overrides[p.id].GK !== undefined) p.GK = overrides[p.id].GK;
            if (overrides[p.id].IMP !== undefined) p.IMP = overrides[p.id].IMP;
            
            p.PLAYER_SCORE = (p.OFF * 0.30) + (p.DEF * 0.30) + (p.GK * 0.20) + (p.IMP * 0.20);
        } else {
            p.hasOverride = false;
        }
    });

    setSynergiesMatrix(synergies);
    return Object.values(profiles);
  };

  const evaluateMatchup = (tA, tB, synMatrix) => {
      let synergyFlags = {};

      const evalTeam = (team) => {
          let OFF = 0, DEF = 0, GK = 0, IMP = 0, synBonus = 0;
          team.forEach(p => { OFF += p.OFF; DEF += p.DEF; GK += p.GK; IMP += p.IMP; });

          for(let i=0; i<team.length; i++) {
              for(let j=i+1; j<team.length; j++) {
                  const p1 = team[i].id; const p2 = team[j].id;
                  const syn = synMatrix[p1]?.[p2];
                  if (syn && syn.played >= 5) {
                      const winRate = syn.won / syn.played;
                      if (winRate > 0.60) {
                          synBonus += 4;
                          synergyFlags[p1] = (synergyFlags[p1] || 0) + 1; synergyFlags[p2] = (synergyFlags[p2] || 0) + 1;
                      } else if (winRate < 0.40) {
                          synBonus -= 4;
                          synergyFlags[p1] = (synergyFlags[p1] || 0) - 1; synergyFlags[p2] = (synergyFlags[p2] || 0) - 1;
                      }
                  }
              }
          }
          return { OFF: OFF + synBonus, DEF: DEF + synBonus, GK, IMP, synBonus, TOTAL: OFF + DEF + GK + IMP + (synBonus*2) };
      };

      const statA = evalTeam(tA);
      const statB = evalTeam(tB);

      const deltaOFF = Math.abs(statA.OFF - statB.OFF);
      const deltaDEF = Math.abs(statA.DEF - statB.DEF);
      const deltaGK = Math.abs(statA.GK - statB.GK);
      const deltaIMP = Math.abs(statA.IMP - statB.IMP);
      
      const mismatch = (deltaOFF * 1.0) + (deltaDEF * 1.1) + (deltaGK * 1.3) + (deltaIMP * 0.7);

      let base_xG_A = tA.reduce((sum, p) => sum + (p.expected_goals || 1.2), 0);
      let base_xG_B = tB.reduce((sum, p) => sum + (p.expected_goals || 1.2), 0);

      base_xG_A += (statA.synBonus * 0.15);
      base_xG_B += (statB.synBonus * 0.15);

      const atkPowerA = (statA.OFF * 1.0) + (statA.IMP * 0.5);
      const defPowerA = (statA.DEF * 1.1) + (statA.GK * 1.3) + (statA.IMP * 0.5);
      
      const atkPowerB = (statB.OFF * 1.0) + (statB.IMP * 0.5);
      const defPowerB = (statB.DEF * 1.1) + (statB.GK * 1.3) + (statB.IMP * 0.5);

      const expectedAtk = tA.length * 50 * 1.5; 
      const expectedDef = tA.length * 50 * 2.9;

      const ratioAtkA = atkPowerA / (expectedAtk || 1);
      const ratioDefB = defPowerB / (expectedDef || 1);
      const ratioAtkB = atkPowerB / (expectedAtk || 1);
      const ratioDefA = defPowerA / (expectedDef || 1);

      const multA = Math.pow(ratioAtkA / Math.max(0.5, ratioDefB), 0.8);
      const multB = Math.pow(ratioAtkB / Math.max(0.5, ratioDefA), 0.8);

      let final_xG_A = Math.max(1, Math.round(base_xG_A * multA));
      let final_xG_B = Math.max(1, Math.round(base_xG_B * multB));

      const predictedScore = `${final_xG_A} - ${final_xG_B}`;

      return { statA, statB, mismatch, synergyFlags, predictedScore };
  };

  const checkConstraints = (tA_ids, tB_ids) => {
      for (let r of rules) {
          const p1InA = tA_ids.includes(r.player1); const p2InA = tA_ids.includes(r.player2);
          const p1InB = tB_ids.includes(r.player1); const p2InB = tB_ids.includes(r.player2);
          if (!((p1InA || p1InB) && (p2InA || p2InB))) continue;

          if (r.type === 'TOGETHER') {
              if ((p1InA && !p2InA) || (p2InA && !p1InA)) return false;
          } else if (r.type === 'APART') {
              if ((p1InA && p2InA) || (p1InB && p2InB)) return false;
          }
      }
      return true;
  };

  const generateAutoTeams = async () => {
    setGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 100)); 
    
    const profilesArray = prepareAlgorithmData();
    const teamSize = profilesArray.length / 2;
    const playerIds = profilesArray.map(p => p.id);
    
    let bestCombo = null; 
    let minMismatch = Infinity;
    let validCombosFound = 0;

    const getCombinations = (array, size) => {
        let result = [];
        const combine = (start, combo) => {
            if (combo.length === size) { result.push(combo); return; }
            for (let i = start; i < array.length; i++) combine(i + 1, [...combo, array[i]]);
        };
        combine(0, []); return result;
    };

    if (playerIds.length > 0) {
      const firstPlayer = playerIds[0];
      const remainingPlayers = playerIds.slice(1);
      const subCombos = getCombinations(remainingPlayers, teamSize - 1);
      
      subCombos.forEach(subCombo => {
          const tA_ids = [firstPlayer, ...subCombo];
          const tB_ids = playerIds.filter(id => !tA_ids.includes(id));

          if (!checkConstraints(tA_ids, tB_ids)) return;
          validCombosFound++;

          const tA_objs = tA_ids.map(id => profilesArray.find(p => p.id === id));
          const tB_objs = tB_ids.map(id => profilesArray.find(p => p.id === id));

          const stats = evaluateMatchup(tA_objs, tB_objs, synergiesMatrix);

          if (stats.mismatch < minMismatch) {
              minMismatch = stats.mismatch;
              bestCombo = { teamA: tA_objs, teamB: tB_objs, ...stats };
          }
      });
      
      if (validCombosFound === 0) {
          alert("Attenzione: I vincoli impostati sono impossibili da rispettare numericamente o vanno in conflitto. Rimuovi qualche regola e riprova.");
          setGenerating(false);
          return;
      }
    }

    setTeamA(bestCombo.teamA); setTeamB(bestCombo.teamB);
    setTeamStats({ statA: bestCombo.statA, statB: bestCombo.statB, mismatch: bestCombo.mismatch, synergyFlags: bestCombo.synergyFlags, predictedScore: bestCombo.predictedScore });
    setIsResultView(true); setGenerating(false);
  };

  const startManualEditor = () => {
    const profilesArray = prepareAlgorithmData();
    const shuffled = [...profilesArray].sort(() => 0.5 - Math.random());
    const half = Math.ceil(shuffled.length / 2);
    const tA = shuffled.slice(0, half); const tB = shuffled.slice(half);
    
    setTeamA(tA); setTeamB(tB);
    const ev = evaluateMatchup(tA, tB, synergiesMatrix); 
    setTeamStats(ev); setIsResultView(true);
  };

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    let sourceList = source.droppableId === 'teamA' ? [...teamA] : [...teamB];
    let destList = destination.droppableId === 'teamA' ? [...teamA] : [...teamB];

    const [movedItem] = sourceList.splice(source.index, 1);

    if (source.droppableId === destination.droppableId) {
        sourceList.splice(destination.index, 0, movedItem);
        if (source.droppableId === 'teamA') setTeamA(sourceList); else setTeamB(sourceList);
    } else {
        destList.splice(destination.index, 0, movedItem);
        const newTeamA = source.droppableId === 'teamA' ? sourceList : destList;
        const newTeamB = source.droppableId === 'teamB' ? sourceList : destList;
        
        if (source.droppableId === 'teamA') { setTeamA(sourceList); setTeamB(destList); } 
        else { setTeamB(sourceList); setTeamA(destList); }

        const ev = evaluateMatchup(newTeamA, newTeamB, synergiesMatrix);
        setTeamStats(ev);
    }
    if (navigator.vibrate) navigator.vibrate(10);
  };

  if (loading) return <div className="p-10 text-center text-slate-500 animate-pulse font-oswald text-xl mt-20">Inizializzazione Algoritmo...</div>;

  const isEven = selectedIds.size % 2 === 0;

  return (
    <div className="w-full min-h-screen bg-slate-900 text-slate-100 p-4 pb-24 relative">
      
      {!isResultView ? (
        <div className="animate-in fade-in max-w-4xl mx-auto">
            <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl mb-6 shadow-xl text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Wand2 size={100} /></div>
                <h2 className="text-xl font-oswald font-bold text-white mb-2 tracking-widest relative z-10">SELEZIONE ROSTER</h2>
                <p className="text-sm text-slate-400 mb-6 relative z-10">
                    L'algoritmo calcola 4 Assi (Attacco, Difesa Esterna, GK, Impatto), applica la correzione Bayesiana e normalizza da 0 a 100 per formare squadre perfette.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
                    <div className="font-oswald text-3xl font-black text-cyan-400 sm:mr-6">
                        {selectedIds.size} <span className="text-sm text-slate-500 font-normal uppercase tracking-widest">Presenti</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <button onClick={startManualEditor} disabled={selectedIds.size < 4} className={`px-6 py-3 rounded-xl font-bold font-oswald tracking-widest transition flex items-center justify-center gap-2 border ${selectedIds.size < 4 ? 'bg-slate-900 border-slate-700 text-slate-600' : 'bg-slate-800 border-slate-500 hover:bg-slate-700 text-white'}`}>
                            <Settings2 size={18}/> MANUALE
                        </button>
                        <button onClick={generateAutoTeams} disabled={!isEven || selectedIds.size < 4 || generating} className={`px-8 py-3 rounded-xl font-black font-oswald tracking-widest transition flex items-center justify-center gap-3 shadow-lg ${(!isEven || selectedIds.size < 4) ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-lime-500 hover:bg-lime-400 text-slate-900 hover:scale-105 active:scale-95'}`}>
                            {generating ? <RefreshCw className="animate-spin" size={20} /> : <Wand2 size={20} />} {generating ? 'CALCOLO IN CORSO...' : 'GENERA AI'}
                        </button>
                    </div>
                </div>
                {selectedIds.size > 0 && !isEven && <div className="text-xs text-yellow-500 mt-4 flex items-center justify-center gap-1 font-bold relative z-10"><AlertTriangle size={14}/> Numero dispari. Le squadre saranno sbilanciate numericamente.</div>}
            </div>

            {/* SEZIONE REGOLE E VINCOLI */}
            <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-2xl mb-6">
                <h3 className="text-sm font-bold font-oswald tracking-widest text-slate-400 mb-3 flex items-center gap-2"><Link size={16}/> REGOLE E VINCOLI</h3>
                
                <div className="flex flex-col md:flex-row gap-2 mb-4">
                    <select value={ruleP1} onChange={e=>setRuleP1(e.target.value)} className="bg-slate-900 border border-slate-700 text-white p-2 rounded-lg flex-1 outline-none focus:border-cyan-500">
                        <option value="">Seleziona Giocatore 1...</option>
                        {players.filter(p => selectedIds.has(p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    
                    <select value={ruleType} onChange={e=>setRuleType(e.target.value)} className="bg-slate-900 border border-slate-700 text-white p-2 rounded-lg outline-none font-bold text-center focus:border-cyan-500">
                        <option value="TOGETHER">🤝 DEVE stare con</option>
                        <option value="APART">⚔️ NON deve stare con</option>
                    </select>

                    <select value={ruleP2} onChange={e=>setRuleP2(e.target.value)} className="bg-slate-900 border border-slate-700 text-white p-2 rounded-lg flex-1 outline-none focus:border-cyan-500">
                        <option value="">Seleziona Giocatore 2...</option>
                        {players.filter(p => selectedIds.has(p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>

                    <button onClick={addRule} className="bg-cyan-600 hover:bg-cyan-500 text-white p-2 rounded-lg flex items-center justify-center transition active:scale-95"><Plus size={20}/></button>
                </div>

                <div className="space-y-2">
                    {rules.map(r => {
                        const p1 = players.find(p => p.id === r.player1)?.name;
                        const p2 = players.find(p => p.id === r.player2)?.name;
                        return (
                            <div key={r.id} className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-700/50 text-sm">
                                <div className="flex items-center gap-2">
                                    {r.type === 'TOGETHER' ? <Link size={14} className="text-lime-400"/> : <Unlink size={14} className="text-red-400"/>}
                                    <span className="font-bold text-white">{p1}</span>
                                    <span className="text-slate-500 text-xs">{r.type === 'TOGETHER' ? 'gioca con' : 'contro'}</span>
                                    <span className="font-bold text-white">{p2}</span>
                                </div>
                                <button onClick={() => setRules(rules.filter(ru => ru.id !== r.id))} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={16}/></button>
                            </div>
                        )
                    })}
                </div>
            </div>

            <h3 className="text-sm font-bold font-oswald tracking-widest text-slate-400 mb-3 ml-1">ROSTER (Clicca l'icona per valori fittizi)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {players.map(p => {
                    const isSelected = selectedIds.has(p.id);
                    const hasOverride = overrides[p.id] !== undefined;
                    return (
                        <div key={p.id} className={`p-1.5 rounded-xl border transition-all flex items-center gap-2 select-none ${isSelected ? 'bg-cyan-900/40 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}>
                            
                            <div onClick={() => togglePlayer(p.id)} className="flex-1 flex items-center gap-3 cursor-pointer p-1.5">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors relative ${isSelected ? 'bg-cyan-500 text-slate-900' : 'bg-slate-700 text-white'}`}>
                                    {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full rounded-full object-cover"/> : p.name.charAt(0).toUpperCase()}
                                    {hasOverride && <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-yellow-400 rounded-full border border-slate-800"></div>}
                                </div>
                                <span className={`font-oswald font-bold truncate ${isSelected ? 'text-cyan-400' : 'text-slate-300'}`}>{p.name}</span>
                            </div>

                            {isSelected && (
                                <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(p); }} className="p-2 text-slate-400 hover:text-cyan-400 transition" title="Modifica Statistiche Fittizie (0-100)">
                                    <Sliders size={16}/>
                                </button>
                            )}

                        </div>
                    )
                })}
            </div>
        </div>
      ) : (
        <div className="animate-in slide-in-from-bottom-8 duration-300 max-w-5xl mx-auto">
            
            <div className="bg-slate-950 border border-slate-800 p-6 rounded-3xl shadow-2xl mb-8 relative overflow-hidden">
                <button onClick={() => setIsResultView(false)} className="absolute top-4 left-4 p-2 text-slate-500 hover:text-white bg-slate-800 rounded-full transition z-20"><ArrowLeftRight size={18}/></button>
                
                <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
                    <div className="flex flex-col items-center text-center">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">Indice Mismatch</div>
                        <div className={`text-6xl font-black font-oswald tracking-tighter ${teamStats.mismatch < 10 ? 'text-lime-400 drop-shadow-[0_0_15px_rgba(163,230,53,0.3)]' : teamStats.mismatch < 25 ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.3)]' : 'text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]'}`}>
                            {teamStats.mismatch.toFixed(1)}
                        </div>
                    </div>
                    <div className="hidden md:block w-px h-20 bg-slate-800"></div>
                    <div className="flex flex-col items-center text-center">
                        <div className="text-xs font-bold text-cyan-500 uppercase tracking-[0.2em] mb-1">Risultato più probabile</div>
                        <div className="text-6xl font-black font-oswald tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                            {teamStats.predictedScore}
                        </div>
                    </div>
                </div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex flex-col md:flex-row gap-6">
                    
                    <div className="flex-1 flex flex-col">
                        <div className="bg-slate-800 border-t-4 border-cyan-500 rounded-t-2xl p-4 text-center shadow-md relative z-10">
                            <h3 className="font-oswald font-black text-2xl text-cyan-400 tracking-widest mb-1">TEAM A</h3>
                            <div className="flex justify-center gap-2 mt-2 text-[8px] uppercase font-bold text-slate-500">
                                <span>OFF: {teamStats.statA?.OFF.toFixed(0)}</span> |
                                <span>DEF: {teamStats.statA?.DEF.toFixed(0)}</span> |
                                <span>GK: {teamStats.statA?.GK.toFixed(0)}</span> |
                                <span>IMP: {teamStats.statA?.IMP.toFixed(0)}</span>
                            </div>
                        </div>
                        <Droppable droppableId="teamA">
                            {(provided, snapshot) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className={`flex-1 p-2 rounded-b-2xl border-x border-b border-slate-700/50 transition-colors min-h-[300px] ${snapshot.isDraggingOver ? 'bg-cyan-900/20' : 'bg-slate-800/30'}`}>
                                {teamA.map((p, index) => (<DraggablePlayer key={p.id} player={p} index={index} synergyFlags={teamStats.synergyFlags} />))}
                                {provided.placeholder}
                            </div>
                            )}
                        </Droppable>
                    </div>

                    <div className="hidden md:flex items-center justify-center">
                        <div className="w-12 h-12 bg-slate-950 border-2 border-slate-800 rounded-full flex items-center justify-center font-black font-oswald text-slate-600 shadow-xl">VS</div>
                    </div>

                    <div className="flex-1 flex flex-col">
                        <div className="bg-slate-800 border-t-4 border-fuchsia-500 rounded-t-2xl p-4 text-center shadow-md relative z-10">
                            <h3 className="font-oswald font-black text-2xl text-fuchsia-400 tracking-widest mb-1">TEAM B</h3>
                            <div className="flex justify-center gap-2 mt-2 text-[8px] uppercase font-bold text-slate-500">
                                <span>OFF: {teamStats.statB?.OFF.toFixed(0)}</span> |
                                <span>DEF: {teamStats.statB?.DEF.toFixed(0)}</span> |
                                <span>GK: {teamStats.statB?.GK.toFixed(0)}</span> |
                                <span>IMP: {teamStats.statB?.IMP.toFixed(0)}</span>
                            </div>
                        </div>
                        <Droppable droppableId="teamB">
                            {(provided, snapshot) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className={`flex-1 p-2 rounded-b-2xl border-x border-b border-slate-700/50 transition-colors min-h-[300px] ${snapshot.isDraggingOver ? 'bg-fuchsia-900/20' : 'bg-slate-800/30'}`}>
                                {teamB.map((p, index) => (<DraggablePlayer key={p.id} player={p} index={index} synergyFlags={teamStats.synergyFlags} />))}
                                {provided.placeholder}
                            </div>
                            )}
                        </Droppable>
                    </div>

                </div>
            </DragDropContext>
        </div>
      )}

      {/* MODALE VALORI FITTIZI (OVERRIDE) */}
      {editingPlayer && (
        <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-2xl w-full max-w-sm relative">
                <button onClick={() => setEditingPlayer(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20}/></button>
                <h3 className="text-lg font-oswald font-bold text-white mb-1">Valori Manuali: {editingPlayer.name}</h3>
                <p className="text-xs text-slate-400 mb-6">Inserisci dei valori fittizi (scala da 0 a 100) per forzare l'algoritmo. Lascia vuoto per usare le vere statistiche calcolate.</p>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-1.5 ml-1">Attacco (OFF)</label>
                        <input type="number" min="0" max="100" value={editVals.OFF} onChange={e => setEditVals({...editVals, OFF: e.target.value})} placeholder="0 - 100" className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 font-mono text-sm" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-lime-400 uppercase tracking-widest mb-1.5 ml-1">Difesa (DEF)</label>
                        <input type="number" min="0" max="100" value={editVals.DEF} onChange={e => setEditVals({...editVals, DEF: e.target.value})} placeholder="0 - 100" className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white focus:outline-none focus:border-lime-500 font-mono text-sm" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-yellow-400 uppercase tracking-widest mb-1.5 ml-1">Porta (GK)</label>
                        <input type="number" min="0" max="100" value={editVals.GK} onChange={e => setEditVals({...editVals, GK: e.target.value})} placeholder="0 - 100" className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500 font-mono text-sm" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-fuchsia-400 uppercase tracking-widest mb-1.5 ml-1">Impatto (IMP)</label>
                        <input type="number" min="0" max="100" value={editVals.IMP} onChange={e => setEditVals({...editVals, IMP: e.target.value})} placeholder="0 - 100" className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white focus:outline-none focus:border-fuchsia-500 font-mono text-sm" />
                    </div>
                </div>

                <div className="mt-8 flex gap-2">
                    <button onClick={() => {setEditVals({OFF:'', DEF:'', GK:'', IMP:''});}} className="px-4 py-3 rounded-xl font-bold text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 transition">Reset</button>
                    <button onClick={handleSaveEdit} className="flex-1 px-4 py-3 rounded-xl font-bold text-sm bg-cyan-600 text-white hover:bg-cyan-500 transition shadow-lg shadow-cyan-500/20">Salva Modifiche</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}