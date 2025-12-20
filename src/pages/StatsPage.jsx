import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function StatsPage() {
  const [stats, setStats] = useState([]);
  const [tab, setTab] = useState('goals'); // 'goals' o 'defense'

  useEffect(() => {
    async function getStats() {
      const { data } = await supabase.from('player_stats_view').select('*');
      setStats(data || []);
    }
    getStats();
  }, []);

  const sortedStats = [...stats].sort((a, b) => {
    if (tab === 'goals') return b.total_goals - a.total_goals;
    if (tab === 'defense') return b.clean_sheets - a.clean_sheets;
    return 0;
  });

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Statistiche</h1>
      
      <div className="flex mb-4 bg-gray-200 rounded p-1">
        <button 
          onClick={() => setTab('goals')}
          className={`flex-1 py-2 rounded ${tab === 'goals' ? 'bg-white shadow' : ''}`}
        >Attacco</button>
        <button 
          onClick={() => setTab('defense')}
          className={`flex-1 py-2 rounded ${tab === 'defense' ? 'bg-white shadow' : ''}`}
        >Difesa</button>
      </div>

      <table className="w-full bg-white rounded shadow text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left">
            <th className="p-3">Giocatore</th>
            <th className="p-3 text-right">{tab === 'goals' ? 'Gol' : 'Clean Sheets'}</th>
          </tr>
        </thead>
        <tbody>
          {sortedStats.map(p => (
            <tr key={p.id} className="border-b last:border-0">
              <td className="p-3 font-medium">{p.name}</td>
              <td className="p-3 text-right font-bold">
                {tab === 'goals' ? p.total_goals : p.clean_sheets}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}