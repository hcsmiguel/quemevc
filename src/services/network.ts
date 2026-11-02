import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { NetworkMessage, RoomConfig, Question } from '../types/game';

type MessageHandler = (msg: NetworkMessage) => void;
type StatusHandler = (connected: boolean, error?: string) => void;

export interface RoomRecord {
  room_code: string;
  host_id: string;
  host_name: string;
  guest_id?: string | null;
  guest_name?: string | null;
  config: RoomConfig;
  status: 'waiting' | 'choosing' | 'playing' | 'finished';
  current_turn?: string | null;
  current_question?: Question | null;
}

export class NetworkService {
  private channel: RealtimeChannel | null = null;
  private pollInterval: number | null = null;
  private messageListeners: Set<MessageHandler> = new Set();
  private statusListeners: Set<StatusHandler> = new Set();
  private hasHandledGuestJoin: boolean = false;

  public isConnected: boolean = false;
  public playerId: string = '';
  public playerName: string = '';
  public roomCode: string = '';
  public isHost: boolean = false;

  constructor() {
    let savedId = sessionStorage.getItem('cara_player_tab_id');
    if (!savedId) {
      savedId = 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('cara_player_tab_id', savedId);
    }
    this.playerId = savedId;
  }

  // 1. Criar Sala (Host)
  public async createRoom(roomCode: string, playerName: string, config: RoomConfig): Promise<RoomRecord> {
    this.roomCode = roomCode.toUpperCase().trim();
    this.playerName = playerName.trim();
    this.isHost = true;
    this.hasHandledGuestJoin = false;

    const { data, error } = await supabase
      .from('game_rooms')
      .upsert({
        room_code: this.roomCode,
        host_id: this.playerId,
        host_name: this.playerName,
        config,
        status: 'waiting',
        current_turn: this.playerId,
        current_question: null,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('Erro ao criar sala:', error);
      throw new Error('Falha ao registrar sala no servidor: ' + (error?.message || 'Erro desconhecido'));
    }

    await this.subscribeToRoom(this.roomCode);
    this.startPollingRoom();
    return data as RoomRecord;
  }

  // 2. Entrar em Sala Existente (Guest)
  public async joinRoom(roomCode: string, playerName: string): Promise<RoomRecord> {
    this.roomCode = roomCode.toUpperCase().trim();
    this.playerName = playerName.trim();
    this.isHost = false;
    this.hasHandledGuestJoin = true;

    const { data: room, error: fetchError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', this.roomCode)
      .maybeSingle();

    if (fetchError || !room) {
      throw new Error(`Sala "${this.roomCode}" não foi encontrada. Verifique se o código está correto!`);
    }

    if (room.guest_id && room.guest_id !== this.playerId && room.status === 'playing') {
      throw new Error('Esta sala já está com dois jogadores em partida.');
    }

    const { data: updatedRoom, error: updateError } = await supabase
      .from('game_rooms')
      .update({
        guest_id: this.playerId,
        guest_name: this.playerName,
        status: 'choosing',
        updated_at: new Date().toISOString(),
      })
      .eq('room_code', this.roomCode)
      .select('*')
      .single();

    if (updateError || !updatedRoom) {
      throw new Error('Falha ao entrar na sala. Tente novamente.');
    }

    await this.subscribeToRoom(this.roomCode);

    this.send('JOIN', {
      playerId: this.playerId,
      playerName: this.playerName,
      config: updatedRoom.config,
    });

    this.startPollingRoom();
    return updatedRoom as RoomRecord;
  }

  // 3. Reconectar em sala existente (F5 / Refresh)
  public async reconnectRoom(roomCode: string, playerName: string, isHost: boolean): Promise<RoomRecord | null> {
    this.roomCode = roomCode.toUpperCase().trim();
    this.playerName = playerName.trim();
    this.isHost = isHost;

    const { data: room } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', this.roomCode)
      .maybeSingle();

    if (!room) return null;

    await this.subscribeToRoom(this.roomCode);
    this.startPollingRoom();
    return room as RoomRecord;
  }

  // Atualizar status e pergunta ativa no Supabase
  public async syncRoomState(dataToUpdate: Partial<RoomRecord>) {
    if (!this.roomCode) return;
    try {
      await supabase
        .from('game_rooms')
        .update({
          ...dataToUpdate,
          updated_at: new Date().toISOString(),
        })
        .eq('room_code', this.roomCode);
    } catch (err) {
      console.warn('Erro ao sincronizar estado da sala:', err);
    }
  }

  private async subscribeToRoom(roomCode: string): Promise<void> {
    if (this.channel) {
      await supabase.removeChannel(this.channel);
      this.channel = null;
    }

    return new Promise((resolve) => {
      this.channel = supabase.channel(`game_room_${roomCode}`, {
        config: { broadcast: { self: false } },
      });

      this.channel.on('broadcast', { event: 'game_message' }, ({ payload }) => {
        if (payload && payload.senderId !== this.playerId) {
          this.messageListeners.forEach((fn) => fn(payload));
        }
      });

      this.channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.isConnected = true;
          this.notifyStatus(true);
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.isConnected = false;
          this.notifyStatus(false, 'Erro de conexão no canal');
        }
      });
    });
  }

  private startPollingRoom() {
    if (this.pollInterval) clearInterval(this.pollInterval);

    this.pollInterval = window.setInterval(async () => {
      if (!this.roomCode) return;

      const { data: room } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', this.roomCode)
        .maybeSingle();

      if (room) {
        // Dispara JOIN para o Host se acabou de entrar
        if (this.isHost && room.guest_id && !this.hasHandledGuestJoin && room.status === 'choosing') {
          this.hasHandledGuestJoin = true;
          this.messageListeners.forEach((fn) =>
            fn({
              type: 'JOIN',
              senderId: room.guest_id!,
              senderName: room.guest_name || 'Oponente',
              payload: { config: room.config },
              timestamp: Date.now(),
            })
          );
        }

        // Se o jogo encerrou no banco e a mensagem de broadcast falhou
        if (room.status === 'finished') {
          // notifica ouvintes com GUESS_RESULT redundante
          // tratado no App.tsx
        }
      }
    }, 2000);
  }

  public send(type: NetworkMessage['type'], payload: any) {
    if (!this.channel) {
      console.warn('Tentativa de envio sem canal ativo');
      return;
    }

    const message: NetworkMessage = {
      type,
      senderId: this.playerId,
      senderName: this.playerName,
      payload,
      timestamp: Date.now(),
    };

    this.channel.send({
      type: 'broadcast',
      event: 'game_message',
      payload: message,
    });
  }

  public onMessage(fn: MessageHandler): () => void {
    this.messageListeners.add(fn);
    return () => this.messageListeners.delete(fn);
  }

  public onStatus(fn: StatusHandler): () => void {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  private notifyStatus(connected: boolean, error?: string) {
    this.statusListeners.forEach((fn) => fn(connected, error));
  }

  // Limpeza completa do Storage do Supabase e da Sala
  public async cleanupStorageAndRoom(roomCode: string) {
    if (!roomCode) return;
    try {
      const prefix = `room_${roomCode}`;
      const { data: files } = await supabase.storage
        .from('custom_faces')
        .list(prefix);

      if (files && files.length > 0) {
        const filePaths = files.map((f) => `${prefix}/${f.name}`);
        await supabase.storage.from('custom_faces').remove(filePaths);
      }

      await supabase.from('game_rooms').delete().eq('room_code', roomCode);
    } catch (err) {
      console.warn('Erro ao limpar storage ou sala:', err);
    }
  }

  public async disconnect() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.channel) {
      await supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.isConnected = false;
    this.notifyStatus(false);
  }
}

export const network = new NetworkService();
