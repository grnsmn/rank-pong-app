import React, { useState, useEffect } from 'react';
import { dbService, type Profile } from '../services/db';
import { useAppStore } from '../store/useAppStore';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface SetInput {
  score1: string;
  score2: string;
}

export const NewMatchScreen: React.FC = () => {
  const { currentUser } = useAppStore();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [opponentId, setOpponentId] = useState('');
  const [bestOf, setBestOf] = useState<3 | 5>(3);
  
  const [sets, setSets] = useState<SetInput[]>([
    { score1: '', score2: '' }
  ]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const data = await dbService.getProfiles();
        setProfiles(data.filter(p => p.id !== currentUser?.id));
      } catch (err) {
        console.error('Errore caricamento profili:', err);
      }
    };
    fetchProfiles();
  }, [currentUser]);

  const validateSet = (score1: number, score2: number): { isValid: boolean; winner: 1 | 2 | null; error?: string } => {
    if (isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) {
      return { isValid: false, winner: null, error: 'I punteggi devono essere numeri positivi' };
    }
    
    if (score1 < 11 && score2 < 11) {
      return { isValid: false, winner: null, error: 'Almeno un giocatore deve raggiungere 11 punti' };
    }

    const diff = Math.abs(score1 - score2);
    if (diff < 2) {
      return { isValid: false, winner: null, error: 'Il set deve terminare con almeno 2 punti di scarto (es. 11-9 o 12-10)' };
    }

    if (score1 >= 11 && score1 - score2 >= 2) {
      if (score1 > 11 && score1 - score2 > 2) {
        return { isValid: false, winner: null, error: `Punteggio non valido: sul 10-10 si vince con 2 punti di scarto (es. ${score2 + 2}-${score2})` };
      }
      return { isValid: true, winner: 1 };
    }

    if (score2 >= 11 && score2 - score1 >= 2) {
      if (score2 > 11 && score2 - score1 > 2) {
        return { isValid: false, winner: null, error: `Punteggio non valido: sul 10-10 si vince con 2 punti di scarto (es. ${score1 + 2}-${score1})` };
      }
      return { isValid: true, winner: 2 };
    }

    return { isValid: false, winner: null };
  };

  const getMatchStatus = () => {
    let setsWonP1 = 0;
    let setsWonP2 = 0;
    let allSetsValid = true;
    let errors: string[] = [];

    sets.forEach((set, index) => {
      const s1 = parseInt(set.score1);
      const s2 = parseInt(set.score2);

      if (set.score1 === '' || set.score2 === '') {
        allSetsValid = false;
        return;
      }

      const val = validateSet(s1, s2);
      if (!val.isValid) {
        allSetsValid = false;
        if (val.error) errors.push(`Set ${index + 1}: ${val.error}`);
      } else {
        if (val.winner === 1) setsWonP1++;
        if (val.winner === 2) setsWonP2++;
      }
    });

    const targetWins = bestOf === 3 ? 2 : 3;
    const matchFinished = setsWonP1 === targetWins || setsWonP2 === targetWins;
    const tooManySets = (setsWonP1 + setsWonP2) > (bestOf === 3 ? 3 : 5);
    
    let excessSets = false;
    let accumulatedWins1 = 0;
    let accumulatedWins2 = 0;
    sets.forEach(set => {
      if (accumulatedWins1 === targetWins || accumulatedWins2 === targetWins) {
        excessSets = true;
      }
      const s1 = parseInt(set.score1);
      const s2 = parseInt(set.score2);
      const val = validateSet(s1, s2);
      if (val.isValid) {
        if (val.winner === 1) accumulatedWins1++;
        if (val.winner === 2) accumulatedWins2++;
      }
    });

    return {
      setsWonP1,
      setsWonP2,
      allSetsValid,
      matchFinished,
      tooManySets,
      excessSets,
      errors,
      canSubmit: allSetsValid && matchFinished && !tooManySets && !excessSets && opponentId !== ''
    };
  };

  const status = getMatchStatus();

  const handleSetChange = (index: number, player: 1 | 2, value: string) => {
    if (value !== '' && !/^\d+$/.test(value)) return;
    
    const newSets = [...sets];
    if (player === 1) newSets[index].score1 = value;
    else newSets[index].score2 = value;
    
    setSets(newSets);
    setErrorMsg(null);
  };

  const addSetRow = () => {
    if (sets.length >= (bestOf === 3 ? 3 : 5)) return;
    setSets([...sets, { score1: '', score2: '' }]);
  };

  const removeLastSetRow = () => {
    if (sets.length <= 1) return;
    setSets(sets.slice(0, -1));
  };

  const handleBestOfChange = (val: 3 | 5) => {
    setBestOf(val);
    setSets([{ score1: '', score2: '' }]);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!opponentId) {
      setErrorMsg('Seleziona un avversario');
      return;
    }

    if (!status.canSubmit) {
      setErrorMsg('Il punteggio inserito non è valido o il match non è concluso.');
      return;
    }

    setIsLoading(true);
    try {
      const formattedScores = sets.map((set, idx) => ({
        set_number: idx + 1,
        score_p1: parseInt(set.score1),
        score_p2: parseInt(set.score2)
      }));

      await dbService.createMatch(currentUser?.id || '', opponentId, bestOf, formattedScores);
      
      setSuccessMsg('Match registrato con successo! Attendi la conferma del tuo avversario per aggiornare il ranking.');
      setOpponentId('');
      setSets([{ score1: '', score2: '' }]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Errore durante il salvataggio del match.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedOpponent = profiles.find(p => p.id === opponentId);

  return (
    <div className="flex flex-col h-full bg-base-100 text-white">
      <div className="px-4 pt-6 pb-2">
        <h2 className="text-xl font-bold tracking-tight text-white mb-1">Registra Partita</h2>
        <p className="text-xs text-slate-400">Inserisci i punteggi. L'avversario dovrà confermare il risultato.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24">
        <form onSubmit={handleSubmit} className="space-y-5 pt-3">
          
          <div className="form-control w-full p-4 rounded-2xl bg-neutral border border-slate-800">
            <label className="label py-1">
              <span className="label-text text-xs text-slate-300 font-bold">1. SELEZIONA L'AVVERSARIO</span>
            </label>
            <select
              className="select select-bordered select-sm w-full bg-slate-800 text-white mt-1 focus:select-primary"
              value={opponentId}
              onChange={(e) => setOpponentId(e.target.value)}
              required
            >
              <option value="">-- Scegli giocatore --</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.display_name} (@{p.username}) - {p.elo_rating} ELO
                </option>
              ))}
            </select>
          </div>

          <div className="p-4 rounded-2xl bg-neutral border border-slate-800">
            <label className="label py-0 mb-2">
              <span className="label-text text-xs text-slate-300 font-bold">2. FORMATO DEL MATCH</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleBestOfChange(3)}
                className={`flex-1 btn btn-sm font-bold text-xs uppercase ${bestOf === 3 ? 'btn-primary text-white' : 'btn-outline border-slate-700'}`}
              >
                Al meglio di 3 set
              </button>
              <button
                type="button"
                onClick={() => handleBestOfChange(5)}
                className={`flex-1 btn btn-sm font-bold text-xs uppercase ${bestOf === 5 ? 'btn-primary text-white' : 'btn-outline border-slate-700'}`}
              >
                Al meglio di 5 set
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 text-center">
              {bestOf === 3 ? 'Vince chi si aggiudica 2 set (fino a 3 set giocabili)' : 'Vince chi si aggiudica 3 set (fino a 5 set giocabili)'}
            </p>
          </div>

          {opponentId && (
            <div className="p-4 rounded-2xl bg-neutral border border-slate-800 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300">3. PUNTEGGI DEI SET</span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Tu vs {selectedOpponent?.display_name.split(' ')[0]}</span>
              </div>

              <div className="space-y-3.5">
                {sets.map((set, index) => {
                  const s1 = parseInt(set.score1);
                  const s2 = parseInt(set.score2);
                  const setVal = validateSet(s1, s2);
                  
                  return (
                    <div key={index} className="flex items-center gap-3 bg-slate-950/40 p-2.5 rounded-xl border border-slate-850">
                      <span className="text-xs font-black text-slate-400 w-12 shrink-0">SET {index + 1}</span>
                      
                      <input
                        type="text"
                        pattern="\d*"
                        placeholder="Tu"
                        className="input input-bordered input-sm w-full bg-slate-800 text-center font-bold text-white text-sm focus:input-primary"
                        value={set.score1}
                        onChange={(e) => handleSetChange(index, 1, e.target.value)}
                        required
                      />
                      
                      <span className="text-slate-500 font-black text-sm">-</span>
                      
                      <input
                        type="text"
                        pattern="\d*"
                        placeholder="Avv."
                        className="input input-bordered input-sm w-full bg-slate-800 text-center font-bold text-white text-sm focus:input-primary"
                        value={set.score2}
                        onChange={(e) => handleSetChange(index, 2, e.target.value)}
                        required
                      />

                      <div className="w-16 shrink-0 text-center">
                        {set.score1 !== '' && set.score2 !== '' && (
                          setVal.isValid ? (
                            <span className={`text-[10px] font-black uppercase ${setVal.winner === 1 ? 'text-success' : 'text-error'}`}>
                              {setVal.winner === 1 ? 'Vinto' : 'Perso'}
                            </span>
                          ) : (
                            <span className="text-[9px] text-warning font-semibold">Non valido</span>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2">
                {sets.length < (bestOf === 3 ? 3 : 5) && !status.matchFinished && (
                  <button
                    type="button"
                    onClick={addSetRow}
                    className="btn btn-outline btn-sm btn-primary flex-1 text-xs font-bold"
                  >
                    Set Successivo
                  </button>
                )}
                {sets.length > 1 && (
                  <button
                    type="button"
                    onClick={removeLastSetRow}
                    className="btn btn-outline btn-error btn-sm text-xs font-bold w-12"
                    title="Rimuovi ultimo set"
                  >
                    Rimuovi
                  </button>
                )}
              </div>
            </div>
          )}

          {status.errors.length > 0 && opponentId !== '' && (
            <div className="p-3 bg-warning/10 border border-warning/20 text-warning rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <AlertTriangle className="w-4 h-4" /> Correggi i punteggi dei set:
              </div>
              {status.errors.map((err, i) => (
                <div key={i}>• {err}</div>
              ))}
            </div>
          )}

          {opponentId !== '' && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span>Set vinti da te:</span>
                <span className="font-extrabold text-success">{status.setsWonP1}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span>Set vinti da {selectedOpponent?.display_name.split(' ')[0]}:</span>
                <span className="font-extrabold text-error">{status.setsWonP2}</span>
              </div>
              
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold">Stato Match:</span>
                {status.matchFinished ? (
                  status.excessSets ? (
                    <span className="text-xs text-error font-extrabold">Set in eccesso</span>
                  ) : (
                    <span className="text-xs text-success font-black flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Pronto all'invio
                    </span>
                  )
                ) : (
                  <span className="text-xs text-yellow-500 font-bold">In corso (mancano set)</span>
                )}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="alert alert-error text-sm py-2 px-3 shadow-md">
              <AlertTriangle className="w-5 h-5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="alert alert-success text-sm py-2 px-3 shadow-md">
              <CheckCircle2 className="w-5 h-5 text-white" />
              <span className="text-white">{successMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!status.canSubmit || isLoading}
            className={`btn btn-primary w-full text-white font-bold uppercase tracking-wider ${isLoading ? 'loading' : ''}`}
          >
            Invia per la Conferma
          </button>

        </form>
      </div>
    </div>
  );
};
