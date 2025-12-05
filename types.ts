export enum GamePhase {
  LOBBY = 'LOBBY',
  SETUP = 'SETUP',
  SCENARIO_LOADING = 'SCENARIO_LOADING',
  SCENARIO_REVEAL = 'SCENARIO_REVEAL',
  ROUND_START = 'ROUND_START',
  PLAYER_SPEECH = 'PLAYER_SPEECH',
  GROUP_DISCUSSION = 'GROUP_DISCUSSION',
  VOTE_PREP_SPEECH = 'VOTE_PREP_SPEECH', // 30s before vote
  VOTING = 'VOTING',
  VOTE_RESULTS = 'VOTE_RESULTS',
  JUSTIFICATION = 'JUSTIFICATION', // 30s for tie or leader
  EXILE_ANIMATION = 'EXILE_ANIMATION',
  GAME_OVER = 'GAME_OVER',
  ENDING_GENERATION = 'ENDING_GENERATION'
}

export interface BunkerData {
  disaster: string;
  bunkerSize: number; // M2
  capacity: number; // Seats
  foodSupply: string;
  equipment: string[];
  location: string;
  enemy: string;
  description: string; // Full text
}

export type AttributeType = 
  'profession' | 'biology' | 'health' | 'hobby' | 
  'baggage' | 'fact' | 'action' | 'phobia' | 'body' | 'inventory';

export interface PlayerAttribute {
  value: string;
  isRevealed: boolean;
  type: AttributeType;
}

export interface Player {
  id: string; // Network ID (Peer ID)
  name: string;
  isHost: boolean;
  isExiled: boolean;
  avatarId: number;
  votesReceived: number;
  hasJustified: boolean; // Track if they used their defense speech
  stats: {
    profession: PlayerAttribute;
    biology: PlayerAttribute; // Sex/Age
    body: PlayerAttribute; // Constitution
    health: PlayerAttribute;
    hobby: PlayerAttribute;
    phobia: PlayerAttribute;
    inventory: PlayerAttribute; // Big items
    baggage: PlayerAttribute; // Backpack
    fact: PlayerAttribute;
    action: PlayerAttribute;
  };
}

export interface VoteResult {
    maxVotes: number;
    candidates: string[]; // IDs of people with max votes
    percentage: number;
    isTie: boolean;
    isAbsoluteMajority: boolean; // > 70%
}

export interface GameState {
  myId: string | null; // ID of the local user
  roomId: string | null;
  isHost: boolean;
  
  phase: GamePhase;
  round: number; // 1-7
  maxRounds: number;
  turnDirection: 'CW' | 'CCW'; // Clockwise / Counter-Clockwise
  currentPlayerIndex: number; // Who is speaking
  players: Player[];
  bunker: BunkerData | null;
  history: string[]; 
  survivors: Player[];
  endingStory: string | null;
  
  // Timer State
  timer: number;
  isTimerRunning: boolean;
  
  // Voting State
  votingRound: number; // 0 = main, 1 = revote
  candidatesForExile: string[]; // IDs
  exiledPlayerId: string | null; // For animation
}

// Network Types
export type PacketType = 'STATE_UPDATE' | 'ACTION' | 'JOIN' | 'KICK';

export interface NetworkPacket {
  type: PacketType;
  payload: any;
}

export interface ActionPayload {
  type: 'REVEAL' | 'VOTE' | 'USE_ACTION' | 'UPDATE_NAME';
  playerId: string;
  data?: any;
}