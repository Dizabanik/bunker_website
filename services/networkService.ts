import { Peer, DataConnection } from "peerjs";
import { GameState, NetworkPacket, Player } from "../types";
import { PEER_PREFIX } from "../constants";

export class NetworkManager {
    peer: Peer | null = null;
    connections: Map<string, DataConnection> = new Map();
    hostConnection: DataConnection | null = null;
    
    // Callbacks
    onStateUpdate: ((state: GameState) => void) | null = null;
    onPlayerAction: ((action: any) => void) | null = null;
    onPlayerJoin: ((id: string, name: string) => void) | null = null;
    onPlayerDisconnect: ((id: string) => void) | null = null;

    constructor() {}

    initialize(myId: string) {
        if (this.peer) return;
        
        // Create Peer with specified ID
        this.peer = new Peer(PEER_PREFIX + myId, {
            debug: 2,
        });

        this.peer.on('open', (id) => {
            console.log('My Peer ID is: ' + id);
        });

        this.peer.on('connection', (conn) => {
            this.handleIncomingConnection(conn);
        });

        this.peer.on('error', (err) => {
            console.error('Peer Error:', err);
        });
    }

    // --- Host Methods ---

    handleIncomingConnection(conn: DataConnection) {
        conn.on('open', () => {
            console.log(`Connected to: ${conn.peer}`);
            this.connections.set(conn.peer, conn);

            conn.on('data', (data: any) => {
                const packet = data as NetworkPacket;
                if (packet.type === 'JOIN') {
                    // Extract real ID from Peer ID if needed, or just use peer ID
                    this.onPlayerJoin?.(conn.peer.replace(PEER_PREFIX, ''), packet.payload.name);
                } else if (packet.type === 'ACTION') {
                    this.onPlayerAction?.(packet.payload);
                }
            });

            conn.on('close', () => {
                this.connections.delete(conn.peer);
                this.onPlayerDisconnect?.(conn.peer.replace(PEER_PREFIX, ''));
            });
        });
    }

    broadcastState(state: GameState) {
        const packet: NetworkPacket = { type: 'STATE_UPDATE', payload: state };
        this.connections.forEach(conn => {
            if (conn.open) conn.send(packet);
        });
    }

    // --- Client Methods ---

    connectToHost(hostId: string, myName: string) {
        if (!this.peer) return;
        
        const conn = this.peer.connect(PEER_PREFIX + hostId);
        
        conn.on('open', () => {
            this.hostConnection = conn;
            // Send join packet immediately
            conn.send({ type: 'JOIN', payload: { name: myName } });
        });

        conn.on('data', (data: any) => {
            const packet = data as NetworkPacket;
            if (packet.type === 'STATE_UPDATE') {
                this.onStateUpdate?.(packet.payload);
            }
        });

        conn.on('close', () => {
            console.log("Disconnected from host");
            this.hostConnection = null;
        });

        conn.on('error', (err) => {
            console.error("Connection error", err);
        });
    }

    sendAction(action: any) {
        if (this.hostConnection && this.hostConnection.open) {
            this.hostConnection.send({ type: 'ACTION', payload: action });
        }
    }

    destroy() {
        this.peer?.destroy();
        this.peer = null;
        this.connections.clear();
        this.hostConnection = null;
    }
}

export const networkManager = new NetworkManager();