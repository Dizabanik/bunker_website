import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GamePhase, Player, BunkerData, PlayerAttribute, VoteResult, ActionPayload } from './types';
import { generateSinglePlayer, calculateCapacity } from './services/gameService';
import { generateBunkerScenario, judgeSurvival } from './services/geminiService';
import { networkManager } from './services/networkService';
import { Button } from './components/Button';
import { getRevealSchedule, TIMER_SETTINGS } from './constants';
import { ExileOverlay } from './components/ExileOverlay';

// --- Icons ---
const Icons = {
    User: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    Eye: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
    Lock: () => <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
    Clock: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Megaphone: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>,
    Vote: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Skull: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.5 3.5a4.5 4.5 0 019 0c.348.65.6 1.35.732 2.083C19.508 6.476 21 8.242 21 10.5c0 3.314-2.686 6-6 6-.628 0-1.229-.098-1.797-.279A8.966 8.966 0 0112 21a8.966 8.966 0 01-3.203-4.779A5.986 5.986 0 017 16.5c-3.314 0-6-2.686-6-6 0-2.258 1.492-4.024 3.768-4.917A9.014 9.014 0 017.5 3.5zM10 9a1 1 0 11-2 0 1 1 0 012 0zm5 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
};

const COLUMNS = [
  { id: 'profession', label: 'Профессия', width: 'min-w-[140px] md:min-w-[160px]' },
  { id: 'biology', label: 'Биология', width: 'min-w-[100px] md:min-w-[120px]' },
  { id: 'health', label: 'Здоровье', width: 'min-w-[130px] md:min-w-[150px]' },
  { id: 'hobby', label: 'Хобби', width: 'min-w-[120px] md:min-w-[140px]' },
  { id: 'body', label: 'Тело', width: 'min-w-[100px] md:min-w-[110px]' },
  { id: 'phobia', label: 'Фобия', width: 'min-w-[130px] md:min-w-[150px]' },
  { id: 'inventory', label: 'Инвентарь', width: 'min-w-[130px] md:min-w-[150px]' },
  { id: 'baggage', label: 'Багаж', width: 'min-w-[130px] md:min-w-[150px]' },
  { id: 'fact', label: 'Факт', width: 'min-w-[140px] md:min-w-[160px]' },
  { id: 'action', label: 'Действие', width: 'min-w-[140px] md:min-w-[160px]' },
];

// --- Sub-Components defined OUTSIDE App to prevent re-renders ---

interface MainGameTableProps {
  gameState: GameState;
  activePlayer: Player | undefined;
  onToggleReveal: (id: string, type: keyof Player['stats']) => void;
  onCastVote: (id: string) => void;
  onSelectPlayer: (id: string) => void;
}

const MainGameTable = React.memo(({ gameState, activePlayer, onToggleReveal, onCastVote, onSelectPlayer }: MainGameTableProps) => {
    const isVoting = gameState.phase === GamePhase.VOTING;
    const isSpeaking = gameState.phase === GamePhase.PLAYER_SPEECH || gameState.phase === GamePhase.JUSTIFICATION;

    return (
        <div className="w-full h-full flex flex-col glass-panel rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="overflow-x-auto flex-1 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-bunker-950/95 backdrop-blur sticky top-0 z-20 border-b border-bunker-accent/20">
                        <tr>
                            <th className="p-3 font-header text-[10px] md:text-xs tracking-[0.15em] text-gray-400 uppercase sticky left-0 z-30 bg-bunker-950 min-w-[180px] md:min-w-[220px] border-r border-white/5 shadow-[5px_0_15px_-5px_rgba(0,0,0,0.5)]">
                                Игрок
                            </th>
                            {COLUMNS.map(col => (
                                <th key={col.id} className={`p-3 font-header text-[10px] md:text-xs tracking-[0.15em] text-gray-500 uppercase ${col.width} border-r border-white/5 last:border-0`}>
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 bg-bunker-900/20">
                        {gameState.players.map((player) => {
                            const isActive = (isSpeaking || gameState.phase === GamePhase.VOTE_PREP_SPEECH) && activePlayer?.id === player.id;
                            const isCandidate = gameState.phase === GamePhase.JUSTIFICATION && gameState.candidatesForExile.includes(player.id);
                            const isMe = player.id === gameState.myId;
                            
                            return (
                                <tr 
                                    key={player.id} 
                                    className={`
                                        group transition-colors relative
                                        ${player.isExiled ? 'bg-red-900/10 grayscale opacity-50' : 'hover:bg-white/5'}
                                        ${isActive ? 'bg-bunker-accent/5' : ''}
                                        ${isCandidate ? 'bg-red-500/10' : ''}
                                        ${isMe ? 'bg-blue-500/5' : ''}
                                    `}
                                >
                                    {/* Name Column (Sticky) */}
                                    <td className={`p-2 sticky left-0 z-10 border-r border-white/10 transition-colors shadow-[5px_0_15px_-5px_rgba(0,0,0,0.5)] ${player.isExiled ? 'bg-black' : 'bg-[#0a0a0c] group-hover:bg-[#131316]'}`}>
                                        <div className="flex items-center gap-3 relative h-full">
                                            {isActive && <div className="absolute -left-2 top-0 bottom-0 w-0.5 bg-bunker-accent animate-pulse shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>}
                                            {isMe && <div className="absolute right-0 top-0 text-[8px] bg-blue-500 text-white px-1 rounded-bl">ВЫ</div>}
                                            
                                            <div 
                                                onClick={() => onSelectPlayer(player.id)}
                                                className="w-8 h-8 md:w-10 md:h-10 rounded bg-bunker-800 border border-white/10 flex items-center justify-center shrink-0 cursor-pointer hover:border-bunker-accent transition-colors"
                                            >
                                                <span className="font-header text-gray-400 text-xs md:text-sm">{player.avatarId}</span>
                                            </div>
                                            
                                            <div className="min-w-0 flex-1">
                                                <div 
                                                    onClick={() => onSelectPlayer(player.id)}
                                                    className="font-bold text-white text-xs md:text-sm leading-tight truncate cursor-pointer hover:text-bunker-accent transition-colors"
                                                >
                                                    {player.name}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {player.votesReceived > 0 && isVoting && (
                                                        <span className="text-[9px] uppercase tracking-wider bg-bunker-danger text-white px-1.5 py-0.5 rounded font-bold animate-pulse">
                                                            {player.votesReceived} голос(ов)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Vote Action */}
                                            {isVoting && !player.isExiled && (
                                                <button 
                                                    onClick={() => onCastVote(player.id)}
                                                    className="ml-2 w-7 h-7 rounded-full bg-bunker-danger/20 text-bunker-danger border border-bunker-danger/50 flex items-center justify-center hover:bg-bunker-danger hover:text-white transition-all shadow-[0_0_10px_rgba(244,63,94,0.3)] active:scale-90"
                                                    title="Голосовать против"
                                                >
                                                    <Icons.Vote />
                                                </button>
                                            )}
                                        </div>
                                    </td>

                                    {/* Attributes Columns */}
                                    {COLUMNS.map(col => {
                                        const attr = player.stats[col.id as keyof typeof player.stats] as PlayerAttribute;
                                        // Allow click if it's ME or I am HOST and game is over (optional) or just ME.
                                        const canReveal = !player.isExiled && isMe;
                                        
                                        return (
                                            <td 
                                                key={col.id} 
                                                onClick={() => canReveal && onToggleReveal(player.id, attr.type)}
                                                className={`p-2 md:p-3 border-r border-white/5 last:border-0 relative align-top ${canReveal ? 'cursor-pointer' : ''} ${player.isExiled ? 'cursor-not-allowed' : ''}`}
                                            >
                                                {attr.isRevealed ? (
                                                    <span className="font-mono text-xs md:text-sm text-gray-200 block animate-in fade-in duration-300 leading-tight whitespace-normal break-words">
                                                        {attr.value}
                                                    </span>
                                                ) : (
                                                    <div className="flex items-center gap-2 opacity-30 select-none group-hover:opacity-50 transition-opacity h-full min-h-[20px]">
                                                        <Icons.Lock />
                                                        <span className="font-mono text-[9px] tracking-widest hidden md:inline">ENCRYPTED</span>
                                                    </div>
                                                )}
                                                {/* Hover effect for hidden cells */}
                                                {!attr.isRevealed && !player.isExiled && canReveal && (
                                                    <div className="absolute inset-0 bg-bunker-accent/5 opacity-0 hover:opacity-100 flex items-center justify-center backdrop-blur-[1px] transition-all">
                                                        <span className="text-[9px] text-bunker-accent font-bold uppercase tracking-wider border border-bunker-accent/30 px-2 py-0.5 rounded bg-black/50">
                                                            Показать
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

const TimerDisplay = React.memo(({ timer, isRunning }: { timer: number, isRunning: boolean }) => (
    <div className={`fixed top-0 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${isRunning ? 'translate-y-4 opacity-100' : '-translate-y-20 opacity-0'}`}>
        <div className="glass-panel px-6 py-2 rounded-full border-bunker-accent/50 flex items-center gap-3 shadow-[0_0_20px_rgba(234,179,8,0.2)] bg-black/80">
            <span className="animate-pulse text-bunker-accent"><Icons.Clock /></span>
            <span className="font-mono text-2xl font-bold text-white tabular-nums">
                {Math.floor(timer / 60).toString().padStart(2, '0')}:{(timer % 60).toString().padStart(2, '0')}
            </span>
        </div>
    </div>
));

interface PlayerModalProps {
    playerId: string | null;
    players: Player[];
    onClose: () => void;
    onToggleReveal: (id: string, type: keyof Player['stats']) => void;
    onUseAction: (id: string) => void;
    myId: string | null;
}

const PlayerDetailModal = ({ playerId, players, onClose, onToggleReveal, onUseAction, myId }: PlayerModalProps) => {
    if (!playerId) return null;
    const player = players.find(p => p.id === playerId);
    if (!player) return null;
    
    const isMe = player.id === myId;

    const attributes = [
        { label: 'Профессия', val: player.stats.profession },
        { label: 'Биология', val: player.stats.biology },
        { label: 'Здоровье', val: player.stats.health },
        { label: 'Хобби', val: player.stats.hobby },
        { label: 'Тело', val: player.stats.body },
        { label: 'Фобия', val: player.stats.phobia },
        { label: 'Багаж', val: player.stats.baggage },
        { label: 'Инвентарь', val: player.stats.inventory },
        { label: 'Факт', val: player.stats.fact },
        { label: 'Спец. действие', val: player.stats.action },
    ];

    return (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="w-full max-w-2xl bg-bunker-900 border border-bunker-accent/30 shadow-[0_0_50px_rgba(234,179,8,0.1)] rounded-xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-bunker-950 p-6 border-b border-bunker-accent/20 flex items-start gap-6">
                     <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg bg-bunker-800 border-2 border-white/10 flex items-center justify-center overflow-hidden shrink-0 relative">
                         <span className="font-header text-4xl text-gray-600">{player.avatarId}</span>
                         {player.isExiled && <div className="absolute inset-0 bg-red-900/80 flex items-center justify-center text-red-500 font-bold border-4 border-red-500 rotate-12">ИЗГНАН</div>}
                     </div>
                     <div className="flex-1">
                         <div className="flex justify-between items-start">
                             <div>
                                <h2 className="text-2xl md:text-3xl font-header text-white uppercase tracking-wider">{player.name}</h2>
                                <p className="text-bunker-accent font-mono text-xs md:text-sm mt-1">ID: {player.avatarId} // СТАТУС: {player.isExiled ? 'ЛИКВИДИРОВАН' : 'АКТИВЕН'}</p>
                             </div>
                             <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                             </button>
                         </div>
                         <div className="mt-4 flex gap-2">
                             {!player.isExiled && !player.stats.action.isRevealed && isMe && (
                                 <button 
                                    onClick={() => onUseAction(player.id)}
                                    className="px-3 py-1 bg-bunker-accent/10 text-bunker-accent border border-bunker-accent/50 rounded hover:bg-bunker-accent/20 text-xs font-bold uppercase tracking-widest transition-all"
                                 >
                                     Использовать спец. карту
                                 </button>
                             )}
                         </div>
                     </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {attributes.map((attr, idx) => (
                            <div 
                                key={idx}
                                onClick={() => isMe && !player.isExiled && onToggleReveal(player.id, attr.val.type)}
                                className={`group p-4 border rounded-lg transition-all duration-300 relative overflow-hidden ${
                                    attr.val.isRevealed 
                                    ? 'bg-bunker-800/90 border-bunker-accent/30 shadow-[0_0_15px_rgba(234,179,8,0.05)]' 
                                    : 'bg-bunker-900/50 border-white/5 hover:border-white/20'
                                } ${isMe && !player.isExiled ? 'cursor-pointer' : 'cursor-default'}`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] uppercase font-bold tracking-[0.15em] text-gray-500 group-hover:text-bunker-accent transition-colors">{attr.label}</span>
                                    <span className={`text-gray-600 ${attr.val.isRevealed ? 'text-bunker-accent' : ''}`}>
                                        {attr.val.isRevealed ? <Icons.Eye /> : <Icons.Lock />}
                                    </span>
                                </div>
                                <div className={`font-mono text-sm leading-snug break-words ${attr.val.isRevealed ? 'text-white' : 'text-gray-700 blur-[3px] select-none'}`}>
                                    {attr.val.isRevealed ? attr.val.value : "ENCRYPTED_DATA_BLOCK_X9"}
                                </div>
                                {!attr.val.isRevealed && isMe && !player.isExiled && (
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[1px]">
                                        <span className="text-xs font-bold text-white uppercase tracking-widest border border-white/20 px-2 py-1 rounded bg-black/50">Раскрыть</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- View Components ---

const LobbyView = ({ onCreateRoom, onJoinRoom, loading }: { onCreateRoom: (name: string) => void, onJoinRoom: (code: string, name: string) => void, loading: boolean }) => {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [mode, setMode] = useState<'HOME' | 'JOIN'>('HOME');

    const handleCreate = () => {
        if (!name.trim()) return alert("Введите имя");
        onCreateRoom(name);
    };

    const handleJoin = () => {
        if (!name.trim() || !code.trim()) return alert("Заполните все поля");
        onJoinRoom(code, name);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 animate-in fade-in duration-700 relative overflow-hidden">
             <div className="absolute inset-0 opacity-20 pointer-events-none">
                 <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-bunker-accent/10 via-transparent to-transparent"></div>
             </div>
             
             <div className="relative mb-12 text-center">
                <h1 className="text-6xl md:text-8xl font-header font-bold text-transparent bg-clip-text bg-gradient-to-b from-bunker-accent to-yellow-600 tracking-tighter drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                    BUNKER
                </h1>
                <div className="text-bunker-danger font-mono text-sm tracking-[0.5em] animate-pulse mt-2">PROJECT: LAST HOPE</div>
             </div>

             <div className="glass-panel p-8 rounded-2xl w-full max-w-md space-y-6 border-t border-bunker-accent/20 relative z-10">
                 {mode === 'HOME' && (
                     <>
                        <div className="space-y-4">
                            <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Ваше имя</label>
                            <input 
                                type="text" 
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                className="w-full bg-black/50 border border-white/10 rounded p-3 text-white focus:border-bunker-accent outline-none font-mono text-center uppercase placeholder:text-gray-700"
                                placeholder="ИМЯ АГЕНТА"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <Button onClick={handleCreate} isLoading={loading} variant="primary">Создать</Button>
                            <Button onClick={() => setMode('JOIN')} variant="secondary">Войти</Button>
                        </div>
                     </>
                 )}

                 {mode === 'JOIN' && (
                     <>
                        <div className="space-y-4">
                             <div>
                                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Ваше имя</label>
                                <input 
                                    type="text" 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    className="w-full bg-black/50 border border-white/10 rounded p-3 text-white focus:border-bunker-accent outline-none font-mono text-center uppercase mb-4"
                                    placeholder="ИМЯ АГЕНТА"
                                />
                             </div>
                             <div>
                                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Код комнаты</label>
                                <input 
                                    type="text" 
                                    value={code} 
                                    onChange={e => setCode(e.target.value.toUpperCase())} 
                                    className="w-full bg-black/50 border border-white/10 rounded p-3 text-bunker-accent focus:border-bunker-accent outline-none font-mono text-center uppercase tracking-[0.5em] text-xl"
                                    placeholder="XXXX"
                                    maxLength={4}
                                />
                             </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <Button onClick={handleJoin} isLoading={loading} variant="primary">Подключиться</Button>
                            <Button onClick={() => setMode('HOME')} variant="ghost">Назад</Button>
                        </div>
                     </>
                 )}
             </div>
        </div>
    );
};

const SetupView = ({ players, onStartGame, loading, roomId, isHost }: any) => (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 animate-in fade-in duration-700">
        <div className="glass-panel p-8 rounded-2xl w-full max-w-lg space-y-6 border-t border-bunker-accent/20">
            <div className="text-center border-b border-white/10 pb-6">
                <h2 className="text-gray-400 text-sm font-mono mb-2">КОМНАТА СВЯЗИ</h2>
                <div className="text-5xl font-mono font-bold text-white tracking-[0.2em]">{roomId}</div>
                {!isHost && <p className="text-xs text-gray-500 mt-2 animate-pulse">Ожидание ведущего...</p>}
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                <div className="text-xs font-bold uppercase tracking-widest text-gray-500 flex justify-between">
                    <span>Подключено агентов</span>
                    <span>{players.length}</span>
                </div>
                {players.map((p: Player) => (
                    <div key={p.id} className="bg-white/5 p-3 rounded flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-bunker-success animate-pulse"></div>
                        <span className="font-bold text-white">{p.name}</span>
                        {p.isHost && <span className="text-[10px] bg-bunker-accent text-black px-1 rounded ml-auto font-bold">HOST</span>}
                    </div>
                ))}
            </div>

            {isHost && (
                <div className="pt-4 border-t border-white/10">
                    <p className="text-center text-xs text-gray-500 mb-4 font-mono">
                        МЕСТ В БУНКЕРЕ: <span className="text-bunker-accent">{calculateCapacity(players.length)}</span>
                    </p>
                    <Button onClick={onStartGame} isLoading={loading} size="lg" className="w-full" variant="primary" disabled={players.length < 2}>
                        НАЧАТЬ ПРОТОКОЛ
                    </Button>
                </div>
            )}
        </div>
    </div>
);

const ScenarioView = ({ gameState, beginRound, isHost }: any) => (
    <div className="min-h-screen p-6 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-red-500/5 animate-pulse-slow pointer-events-none"></div>
        
        <div className="glass-panel max-w-4xl w-full p-8 md:p-12 rounded-3xl border border-bunker-danger/20 shadow-[0_0_50px_rgba(244,63,94,0.1)] relative z-10">
            <div className="flex items-center justify-center mb-8 text-bunker-danger">
                <Icons.Megaphone />
                <span className="ml-3 font-mono text-xl tracking-widest uppercase">Внимание! Тревога!</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-header text-center mb-6 text-white">{gameState.bunker?.disaster}</h2>
            <p className="text-gray-300 text-lg md:text-xl text-center leading-relaxed mb-10 max-w-2xl mx-auto border-l-2 border-bunker-danger/50 pl-4 italic">
                "{gameState.bunker?.description}"
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <div className="bg-bunker-900/60 p-6 rounded-xl border border-white/5">
                    <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-4">Параметры убежища</h3>
                    <ul className="space-y-3 font-mono text-sm">
                        <li className="flex justify-between"><span className="text-gray-400">Локация:</span> <span className="text-white text-right">{gameState.bunker?.location}</span></li>
                        <li className="flex justify-between"><span className="text-gray-400">Площадь:</span> <span className="text-white text-right">{gameState.bunker?.bunkerSize} м²</span></li>
                        <li className="flex justify-between"><span className="text-gray-400">Вместимость:</span> <span className="text-bunker-accent text-right">{gameState.bunker?.capacity} чел.</span></li>
                        <li className="flex justify-between"><span className="text-gray-400">Еда:</span> <span className="text-white text-right">{gameState.bunker?.foodSupply}</span></li>
                    </ul>
                </div>
                <div className="bg-bunker-900/60 p-6 rounded-xl border border-white/5">
                     <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-4">Угрозы и Ресурсы</h3>
                     <div className="mb-4">
                         <span className="text-gray-400 block text-xs mb-1">Основная угроза:</span>
                         <span className="text-rose-400 font-bold">{gameState.bunker?.enemy}</span>
                     </div>
                     <div>
                         <span className="text-gray-400 block text-xs mb-1">Оборудование:</span>
                         <div className="flex flex-wrap gap-2">
                             {gameState.bunker?.equipment.map((e: string, i: number) => (
                                 <span key={i} className="px-2 py-1 bg-white/10 rounded text-xs text-bunker-accent border border-bunker-accent/20">{e}</span>
                             ))}
                         </div>
                     </div>
                </div>
            </div>

            {isHost && (
                <div className="flex justify-center">
                    <Button onClick={beginRound} size="lg" variant="success" className="animate-bounce">
                        ПЕРЕЙТИ К ВЫЖИВШИМ
                    </Button>
                </div>
            )}
            {!isHost && <div className="text-center text-gray-500 animate-pulse">Ожидание начала раунда...</div>}
        </div>
    </div>
);

const GameOverView = ({ gameState }: any) => (
    <div className="min-h-screen p-8 max-w-4xl mx-auto flex flex-col justify-center animate-in fade-in zoom-in duration-1000">
        <h1 className="text-5xl font-header text-center mb-8 text-bunker-success">БУНКЕР ЗАПЕЧАТАН</h1>
        
        <div className="glass-panel p-8 rounded-2xl mb-8 border-t-2 border-bunker-success">
            <h2 className="text-2xl font-bold mb-4 text-white">Хроника Выживания</h2>
            <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed font-mono text-sm">
                {gameState.endingStory ? (
                    gameState.endingStory.split('\n').map((p: string, i: number) => <p key={i} className="mb-4">{p}</p>)
                ) : (
                    <div className="flex flex-col items-center py-12">
                        <div className="w-12 h-12 border-4 border-bunker-success border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="animate-pulse">ИИ анализирует вероятность выживания...</p>
                    </div>
                )}
            </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
            <div>
                <h3 className="text-bunker-success font-bold uppercase tracking-widest mb-4 border-b border-white/10 pb-2">Выжившие</h3>
                <ul className="space-y-2">
                    {gameState.survivors.map((p: Player) => (
                        <li key={p.id} className="bg-white/5 p-3 rounded flex justify-between items-center">
                            <span>{p.name}</span>
                            <span className="text-xs text-gray-500">{p.stats.profession.value}</span>
                        </li>
                    ))}
                </ul>
            </div>
            <div>
                 <h3 className="text-bunker-danger font-bold uppercase tracking-widest mb-4 border-b border-white/10 pb-2">Погибшие</h3>
                 <ul className="space-y-2 opacity-60">
                    {gameState.players.filter((p: Player) => p.isExiled).map((p: Player) => (
                        <li key={p.id} className="p-3 flex justify-between items-center">
                            <span className="line-through">{p.name}</span>
                            <span className="text-xs">{p.stats.profession.value}</span>
                        </li>
                    ))}
                 </ul>
            </div>
        </div>

        <Button onClick={() => window.location.reload()} className="mt-12 mx-auto" size="lg">В ГЛАВНОЕ МЕНЮ</Button>
    </div>
);

// --- MAIN APP COMPONENT ---

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    myId: null,
    roomId: null,
    isHost: false,
    phase: GamePhase.LOBBY,
    round: 1,
    maxRounds: 5,
    turnDirection: 'CW',
    currentPlayerIndex: 0,
    players: [],
    bunker: null,
    history: [],
    survivors: [],
    endingStory: null,
    timer: 0,
    isTimerRunning: false,
    votingRound: 0,
    candidatesForExile: [],
    exiledPlayerId: null
  });

  const [loading, setLoading] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // --- Network Setup ---
  useEffect(() => {
    // We bind network events to state updates
    networkManager.onStateUpdate = (newState) => {
        setGameState(prev => ({
            ...newState, 
            myId: prev.myId, // Keep local session info
            isHost: prev.isHost
        }));
    };

    networkManager.onPlayerJoin = (id, name) => {
        // Only HOST handles this
        setGameState(prev => {
            if (prev.players.find(p => p.id === id)) return prev; // Already joined
            const newPlayer = generateSinglePlayer(id, name, false);
            const newState = {
                ...prev,
                players: [...prev.players, newPlayer]
            };
            networkManager.broadcastState(newState);
            return newState;
        });
    };

    networkManager.onPlayerDisconnect = (id) => {
        // Host logic for disconnect? For now, we keep them in state to avoid game breaking
        console.log("Player disconnected:", id);
    };

    networkManager.onPlayerAction = (action: ActionPayload) => {
        // Host processes actions
        handleActionAsHost(action);
    };

  }, []);

  // --- Host Logic: Processing Incoming Actions ---
  const handleActionAsHost = (action: ActionPayload) => {
      setGameState(prev => {
          let newState = { ...prev };

          if (action.type === 'REVEAL') {
              const { playerId, data } = action; // data = attribute type
              newState.players = prev.players.map(p => {
                  if (p.id !== playerId) return p;
                  const attr = p.stats[data as keyof Player['stats']] as PlayerAttribute;
                  return { ...p, stats: { ...p.stats, [data]: { ...attr, isRevealed: !attr.isRevealed } } };
              });
          } else if (action.type === 'VOTE') {
              const { data: targetId } = action;
              newState.players = prev.players.map(p => p.id === targetId ? { ...p, votesReceived: p.votesReceived + 1 } : p);
          } else if (action.type === 'USE_ACTION') {
              const { playerId } = action;
              newState.players = prev.players.map(p => {
                  if (p.id !== playerId) return p;
                  return { ...p, stats: { ...p.stats, action: { ...p.stats.action, isRevealed: true } } };
              });
          }

          networkManager.broadcastState(newState);
          return newState;
      });
  };

  // --- Timer Logic (Host Only) ---
  useEffect(() => {
    let interval: any;
    if (gameState.isHost && gameState.isTimerRunning && gameState.timer > 0) {
        interval = setInterval(() => {
            setGameState(prev => {
                const newState = {
                    ...prev,
                    timer: prev.timer - 1,
                    isTimerRunning: prev.timer - 1 > 0
                };
                // Broadcast timer sync every second is heavy, maybe optimize? 
                // For local network/PeerJS it's usually fine for small groups.
                networkManager.broadcastState(newState);
                return newState;
            });
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState.isHost, gameState.isTimerRunning, gameState.timer]);


  // --- Helper Functions ---
  const broadcast = (newState: GameState) => {
      setGameState(newState);
      networkManager.broadcastState(newState);
  };

  const generateCode = () => Math.random().toString(36).substring(2, 6).toUpperCase();

  // --- Actions ---

  const handleCreateRoom = (name: string) => {
      setLoading(true);
      const roomId = generateCode();
      const myId = Math.random().toString(36).substr(2, 9);
      
      networkManager.initialize(roomId); // Host uses Room ID as their Peer ID for simplicity in discovery
      
      const hostPlayer = generateSinglePlayer(myId, name, true);

      setGameState(prev => ({
          ...prev,
          myId,
          roomId,
          isHost: true,
          phase: GamePhase.SETUP,
          players: [hostPlayer]
      }));
      setLoading(false);
  };

  const handleJoinRoom = (code: string, name: string) => {
      setLoading(true);
      const myId = Math.random().toString(36).substr(2, 9);
      
      networkManager.initialize(myId);
      networkManager.connectToHost(code, name);
      
      setGameState(prev => ({
          ...prev,
          myId,
          roomId: code,
          isHost: false,
          phase: GamePhase.SETUP // Wait for state update
      }));
      setLoading(false);
  };

  const startTimer = (seconds: number) => {
      if (!gameState.isHost) return;
      broadcast({ ...gameState, timer: seconds, isTimerRunning: true });
  };

  const stopTimer = () => {
      if (!gameState.isHost) return;
      broadcast({ ...gameState, isTimerRunning: false });
  };

  const startGame = async () => {
    if (!gameState.isHost) return;
    setLoading(true);
    broadcast({ ...gameState, phase: GamePhase.SCENARIO_LOADING });
    
    const bunkerData = await generateBunkerScenario();
    bunkerData.capacity = calculateCapacity(gameState.players.length);
    
    const newState: GameState = {
      ...gameState,
      phase: GamePhase.SCENARIO_REVEAL,
      round: 1,
      maxRounds: 7, 
      turnDirection: 'CW',
      currentPlayerIndex: 0,
      bunker: bunkerData,
      history: ["Начало конца."],
      survivors: [],
      endingStory: null,
      timer: 0,
      isTimerRunning: false,
      votingRound: 0,
      candidatesForExile: [],
      exiledPlayerId: null
    };
    
    setLoading(false);
    broadcast(newState);
  };

  const beginRound = () => {
      if (!gameState.isHost) return;
      const direction = gameState.round % 2 !== 0 ? 'CW' : 'CCW';
      broadcast({
          ...gameState,
          phase: GamePhase.ROUND_START,
          turnDirection: direction,
          currentPlayerIndex: 0,
          timer: 0,
          isTimerRunning: false
      });
  };

  const startPlayerSpeech = () => {
      if (!gameState.isHost) return;
      broadcast({ ...gameState, phase: GamePhase.PLAYER_SPEECH, timer: TIMER_SETTINGS.SPEECH, isTimerRunning: true });
  };

  const nextPlayer = () => {
      if (!gameState.isHost) return;
      
      const activePlayers = gameState.players.filter(p => !p.isExiled);
      
      if (gameState.currentPlayerIndex >= activePlayers.length - 1) {
          // All players spoke, move to Discussion
          broadcast({ 
              ...gameState, 
              phase: GamePhase.GROUP_DISCUSSION,
              timer: TIMER_SETTINGS.DISCUSSION,
              isTimerRunning: true
          });
      } else {
          broadcast({ 
              ...gameState, 
              phase: GamePhase.PLAYER_SPEECH, 
              currentPlayerIndex: gameState.currentPlayerIndex + 1,
              timer: TIMER_SETTINGS.SPEECH,
              isTimerRunning: true
          });
      }
  };

  const endDiscussion = () => {
      if (!gameState.isHost) return;
      broadcast({
          ...gameState,
          phase: GamePhase.VOTE_PREP_SPEECH,
          currentPlayerIndex: 0,
          timer: TIMER_SETTINGS.JUSTIFICATION,
          isTimerRunning: true
      });
  };

  const nextVotePrepSpeaker = () => {
      if (!gameState.isHost) return;
      const activePlayers = gameState.players.filter(p => !p.isExiled);
      if (gameState.currentPlayerIndex >= activePlayers.length - 1) {
          startVoting();
      } else {
          broadcast({
              ...gameState,
              currentPlayerIndex: gameState.currentPlayerIndex + 1,
              timer: TIMER_SETTINGS.JUSTIFICATION,
              isTimerRunning: true
          });
      }
  };

  const startVoting = () => {
      if (!gameState.isHost) return;
      const playersReset = gameState.players.map(p => ({...p, votesReceived: 0}));
      broadcast({
          ...gameState,
          phase: GamePhase.VOTING,
          players: playersReset,
          timer: TIMER_SETTINGS.VOTE,
          isTimerRunning: true,
          candidatesForExile: []
      });
  };

  // --- Interaction (Both Host and Client) ---
  const castVote = useCallback((targetId: string) => {
      if (gameState.isHost) {
          handleActionAsHost({ type: 'VOTE', playerId: gameState.myId!, data: targetId });
      } else {
          networkManager.sendAction({ type: 'VOTE', playerId: gameState.myId!, data: targetId });
      }
  }, [gameState.isHost, gameState.myId]);

  const toggleReveal = useCallback((playerId: string, type: keyof Player['stats']) => {
      if (gameState.isHost) {
          handleActionAsHost({ type: 'REVEAL', playerId, data: type });
      } else {
          networkManager.sendAction({ type: 'REVEAL', playerId, data: type });
      }
  }, [gameState.isHost]);

  const useAction = useCallback((playerId: string) => {
      if (gameState.isHost) {
          handleActionAsHost({ type: 'USE_ACTION', playerId });
      } else {
          networkManager.sendAction({ type: 'USE_ACTION', playerId });
      }
  }, [gameState.isHost]);

  // --- Host Only Logic Again ---
  const resolveVote = () => {
      if (!gameState.isHost) return;
      
      const activePlayers = gameState.players.filter(p => !p.isExiled);
      const totalVotes = activePlayers.reduce((sum, p) => sum + p.votesReceived, 0);
      
      let maxVotes = 0;
      activePlayers.forEach(p => { if(p.votesReceived > maxVotes) maxVotes = p.votesReceived; });
      
      const candidates = activePlayers.filter(p => p.votesReceived === maxVotes);
      const percentage = totalVotes > 0 ? (maxVotes / totalVotes) : 0;
      const isAbsoluteMajority = percentage >= 0.7;

      broadcast({
          ...gameState,
          phase: GamePhase.VOTE_RESULTS,
          isTimerRunning: false,
          candidatesForExile: candidates.map(c => c.id)
      });

      setTimeout(() => {
        if (isAbsoluteMajority && candidates.length === 1) {
            exilePlayer(candidates[0].id);
        } else if (candidates.length > 1 || (candidates.length === 1 && !isAbsoluteMajority && gameState.votingRound === 0)) {
            broadcast({
                ...gameState,
                phase: GamePhase.JUSTIFICATION,
                candidatesForExile: candidates.map(c => c.id),
                currentPlayerIndex: 0,
                timer: TIMER_SETTINGS.JUSTIFICATION,
                isTimerRunning: true
            });
        } else {
            if (candidates.length === 1) {
                exilePlayer(candidates[0].id);
            } else {
                exileMultiple(candidates.map(c => c.id));
            }
        }
      }, 2000);
  };

  const nextJustification = () => {
      if (!gameState.isHost) return;
      const { candidatesForExile, currentPlayerIndex } = gameState;
      if (currentPlayerIndex >= candidatesForExile.length - 1) {
          // Re-vote
          const playersReset = gameState.players.map(p => ({...p, votesReceived: 0}));
          broadcast({
              ...gameState,
              votingRound: 1, 
              phase: GamePhase.VOTING,
              players: playersReset,
              timer: TIMER_SETTINGS.VOTE,
              isTimerRunning: true
          });
      } else {
          broadcast({
              ...gameState,
              currentPlayerIndex: gameState.currentPlayerIndex + 1,
              timer: TIMER_SETTINGS.JUSTIFICATION,
              isTimerRunning: true
          });
      }
  };

  const exilePlayer = (id: string) => {
    if (!gameState.isHost) return;
    
    // Trigger animation state
    const updatedPlayers = gameState.players.map(p => p.id === id ? { ...p, isExiled: true } : p);
    
    broadcast({
        ...gameState,
        players: updatedPlayers,
        phase: GamePhase.EXILE_ANIMATION,
        exiledPlayerId: id,
        history: [...gameState.history, `Игрок был изгнан.`]
    });
  };

  const exileMultiple = (ids: string[]) => {
      if (!gameState.isHost) return;
       const updatedPlayers = gameState.players.map(p => ids.includes(p.id) ? { ...p, isExiled: true } : p);
       
       broadcast({
            ...gameState,
            players: updatedPlayers,
            phase: GamePhase.EXILE_ANIMATION,
            exiledPlayerId: ids[0], // Animate first one for now, simplest approach
       });
  };

  const onExileAnimationComplete = () => {
      if (!gameState.isHost) return;

      // Check win condition
      const survivors = gameState.players.filter(p => !p.isExiled);
      if (survivors.length <= (gameState.bunker?.capacity || 0)) {
          finishGame(gameState.players);
      } else {
        // Go to next round if game not over
        finishRound();
      }
  };

  const finishRound = () => {
      if (!gameState.isHost) return;
      broadcast({
          ...gameState,
          round: gameState.round + 1,
          votingRound: 0,
          exiledPlayerId: null,
          phase: GamePhase.ROUND_START
      });
      // The host client will then trigger beginRound effectively via UI or we can chain it.
      // But let's leave it to manual click for pacing.
  };

  const finishGame = async (finalPlayers: Player[]) => {
    if (!gameState.isHost) return;
    broadcast({ ...gameState, players: finalPlayers, phase: GamePhase.ENDING_GENERATION });
    const survivors = finalPlayers.filter(p => !p.isExiled);
    const story = await judgeSurvival(survivors, gameState.bunker!);
    broadcast({
      ...gameState,
      phase: GamePhase.GAME_OVER,
      survivors,
      endingStory: story
    });
  };

  // --- Render Logic ---

  const exiledPlayerName = gameState.exiledPlayerId ? gameState.players.find(p => p.id === gameState.exiledPlayerId)?.name : null;

  if (gameState.phase === GamePhase.LOBBY) {
      return <LobbyView onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} loading={loading} />;
  }

  if (gameState.phase === GamePhase.SETUP) {
      return <SetupView players={gameState.players} onStartGame={startGame} loading={loading} roomId={gameState.roomId} isHost={gameState.isHost} />;
  }
  
  if (gameState.phase === GamePhase.SCENARIO_LOADING) {
      return <div className="h-screen flex flex-col items-center justify-center"><div className="animate-scanline text-bunker-accent font-mono text-2xl">ЗАГРУЗКА НЕЙРОСЕТИ...</div></div>;
  }
  
  if (gameState.phase === GamePhase.SCENARIO_REVEAL) {
      return <ScenarioView gameState={gameState} beginRound={beginRound} isHost={gameState.isHost} />;
  }
  
  if (gameState.phase === GamePhase.GAME_OVER || gameState.phase === GamePhase.ENDING_GENERATION) {
      return <GameOverView gameState={gameState} />;
  }

  // --- ROUND VIEW LOGIC ---
  const getCardsToRevealCount = () => {
    const schedule = getRevealSchedule(gameState.players.length);
    const roundIdx = gameState.round - 1;
    return roundIdx < schedule.length ? schedule[roundIdx] : 1;
  };
  
  const activePlayer = gameState.players.filter(p => !p.isExiled)[gameState.currentPlayerIndex];
  let title = "";
  let subtitle = "";
  let action = null;

  if (gameState.phase === GamePhase.ROUND_START) {
      title = `РАУНД ${gameState.round}`;
      subtitle = `Откройте ${getCardsToRevealCount()} карты. Направление: ${gameState.turnDirection === 'CW' ? 'По часовой' : 'Против часовой'}.`;
      if (gameState.isHost) {
        action = <Button size="lg" onClick={startPlayerSpeech}>Начать обсуждение</Button>;
      } else {
        action = <span className="text-gray-500 animate-pulse">Ожидание ведущего...</span>;
      }
  } else if (gameState.phase === GamePhase.PLAYER_SPEECH) {
      title = `ГОВОРИТ: ${activePlayer?.name}`;
      subtitle = "Представьтесь и откройте карты.";
      if (gameState.isHost) action = <Button onClick={nextPlayer} variant="secondary">Завершить ход</Button>;
  } else if (gameState.phase === GamePhase.GROUP_DISCUSSION) {
      title = "ОБЩЕЕ ОБСУЖДЕНИЕ";
      subtitle = "У вас есть время обсудить услышанное.";
      if (gameState.isHost) action = <Button onClick={endDiscussion} variant="danger">Перейти к оправданиям</Button>;
  } else if (gameState.phase === GamePhase.VOTE_PREP_SPEECH) {
      title = `ОПРАВДАНИЕ: ${activePlayer?.name}`;
      subtitle = "30 секунд на защиту или обвинение.";
      if (gameState.isHost) action = <Button onClick={nextVotePrepSpeaker} variant="secondary">Следующий</Button>;
  } else if (gameState.phase === GamePhase.VOTING) {
      title = "ГОЛОСОВАНИЕ";
      subtitle = "Выберите игрока для изгнания (нажмите на кнопку в таблице).";
      if (gameState.isHost) action = <Button onClick={resolveVote} variant="danger" size="lg">Подвести итоги</Button>;
  } else if (gameState.phase === GamePhase.VOTE_RESULTS) {
      title = "ПОДСЧЕТ ГОЛОСОВ...";
      subtitle = "";
  } else if (gameState.phase === GamePhase.JUSTIFICATION) {
      const candidate = gameState.players.find(p => p.id === gameState.candidatesForExile[gameState.currentPlayerIndex]);
      title = `ВТОРОЙ ШАНС: ${candidate?.name}`;
      subtitle = "Равное количество голосов. Оправдывайтесь.";
      if (gameState.isHost) action = <Button onClick={nextJustification}>Завершить речь</Button>;
  } else if (gameState.phase === GamePhase.EXILE_ANIMATION) {
       title = "ЛИКВИДАЦИЯ";
       if (gameState.isHost) {
        action = <Button onClick={finishRound} variant="primary">Следующий раунд</Button>;
       }
  }

  return (
      <div className="h-screen w-full flex flex-col overflow-hidden bg-bunker-950">
          <ExileOverlay exiledName={exiledPlayerName || null} onAnimationComplete={onExileAnimationComplete} />
          <TimerDisplay timer={gameState.timer} isRunning={gameState.isTimerRunning} />
          
          {/* Top Bar */}
          <div className="shrink-0 p-4 pb-0 z-30 flex justify-between items-end mb-4 border-b border-white/5 bg-bunker-950/80 backdrop-blur-sm">
              <div>
                <h2 className="text-2xl md:text-3xl font-header text-white flex items-center gap-3">
                    {title} 
                    {gameState.phase === GamePhase.VOTING && <span className="animate-pulse text-bunker-danger"><Icons.Skull /></span>}
                </h2>
                <p className="text-gray-400 font-mono text-xs md:text-sm mt-1 uppercase tracking-wider">{subtitle}</p>
              </div>
              
              <div className="flex gap-4 text-xs font-mono text-gray-500 uppercase tracking-widest hidden md:flex">
                  <div className="bg-white/5 px-3 py-1.5 rounded border border-white/5">Код: <span className="text-bunker-accent">{gameState.roomId}</span></div>
                  <div className="bg-white/5 px-3 py-1.5 rounded border border-white/5">Раунд: <span className="text-white">{gameState.round}</span></div>
                  <div className="bg-white/5 px-3 py-1.5 rounded border border-white/5">Мест: <span className="text-bunker-accent">{gameState.bunker?.capacity}</span></div>
              </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden px-4 pb-20 md:pb-24">
              <MainGameTable 
                gameState={gameState} 
                activePlayer={activePlayer} 
                onToggleReveal={toggleReveal}
                onCastVote={castVote}
                onSelectPlayer={setSelectedPlayerId}
              />
          </div>

          {/* Action Bar */}
          <div className="fixed bottom-0 left-0 w-full p-4 md:p-6 glass-panel border-t border-bunker-accent/20 flex justify-center z-40 bg-black/80 backdrop-blur-xl">
              {action}
          </div>

          <PlayerDetailModal 
            playerId={selectedPlayerId} 
            players={gameState.players} 
            onClose={() => setSelectedPlayerId(null)} 
            onToggleReveal={toggleReveal}
            onUseAction={useAction}
            myId={gameState.myId}
          />
      </div>
  );
}