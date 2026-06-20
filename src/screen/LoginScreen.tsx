import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

export const LoginScreen: React.FC = () => {
  const { login, signup, error } = useAppStore();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Campi specifici per Signup
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState<number>(25);
  const [playerType, setPlayerType] = useState<'amateur' | 'competitive' | 'student'>('amateur');
  
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setLocalError('Compila tutti i campi obbligatori');
      return;
    }

    try {
      if (isSignup) {
        if (!username || !displayName) {
          setLocalError('Username e Nome Visualizzato sono richiesti per la registrazione');
          return;
        }
        // Validazione formati semplici
        if (username.includes(' ') || username.startsWith('@')) {
          setLocalError('L\'username non deve contenere spazi e non deve iniziare con @ (verrà aggiunto in automatico)');
          return;
        }
        await signup(email, password, username.toLowerCase(), displayName, age, playerType);
        setSuccessMsg('Registrazione avvenuta con successo!');
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      // Gli errori sono catturati dallo store, ma mostriamo feedback locale
      setLocalError(err.message || 'Operazione fallita. Riprova.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-base-100">
      <div className="w-full max-w-md p-6 rounded-2xl bg-neutral shadow-xl border border-slate-700/50">
        
        {/* Intestazione Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-2 shadow-lg shadow-primary/30">
            <span className="text-white text-3xl font-extrabold">RP</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">RankPong</h1>
          <p className="text-xs text-slate-400">
            {isSignup ? 'Crea il tuo profilo giocatore' : 'Accedi al ranking della community'}
          </p>
        </div>

        {/* Messaggi di feedback */}
        {(error || localError) && (
          <div className="alert alert-error shadow-sm mb-4 text-sm py-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{localError || error}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert alert-success shadow-sm mb-4 text-sm py-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form di input */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs text-slate-300 font-medium">Email</span>
            </label>
            <input
              type="email"
              placeholder="giocatore@esempio.com"
              className="input input-bordered input-sm w-full bg-slate-800 text-white focus:input-primary"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs text-slate-300 font-medium">Password</span>
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="input input-bordered input-sm w-full bg-slate-800 text-white focus:input-primary"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {isSignup && (
            <>
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs text-slate-300 font-medium">Username (senza spazi o @)</span>
                </label>
                <input
                  type="text"
                  placeholder="es. marco_topspin"
                  className="input input-bordered input-sm w-full bg-slate-800 text-white focus:input-primary"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required={isSignup}
                />
              </div>

              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-xs text-slate-300 font-medium">Nome e Cognome / Soprannome</span>
                </label>
                <input
                  type="text"
                  placeholder="es. Marco Rossi"
                  className="input input-bordered input-sm w-full bg-slate-800 text-white focus:input-primary"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required={isSignup}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text text-xs text-slate-300 font-medium">Età</span>
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    className="input input-bordered input-sm w-full bg-slate-800 text-white focus:input-primary"
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                    required={isSignup}
                  />
                </div>

                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text text-xs text-slate-300 font-medium">Livello Giocatore</span>
                  </label>
                  <select
                    className="select select-bordered select-sm w-full bg-slate-800 text-white focus:select-primary"
                    value={playerType}
                    onChange={(e) => setPlayerType(e.target.value as any)}
                  >
                    <option value="amateur">Amatore</option>
                    <option value="competitive">Agonista</option>
                    <option value="student">Studente</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary btn-sm w-full mt-6 text-white font-bold uppercase tracking-wider">
            {isSignup ? 'Registrati' : 'Accedi'}
          </button>
        </form>

        {/* Pulsante Switch Login/Signup */}
        <div className="divider text-xs text-slate-500 my-4">OPPURE</div>
        
        <button
          onClick={() => {
            setIsSignup(!isSignup);
            setLocalError(null);
            setSuccessMsg(null);
          }}
          className="btn btn-outline btn-sm w-full text-xs hover:btn-primary"
        >
          {isSignup ? 'Hai già un account? Accedi' : 'Nuovo utente? Crea un account'}
        </button>

      </div>
    </div>
  );
};
