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
  is_secret?: boolean;
  password?: string | null;
  created_at?: string;
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
  public opponentId: string = '';
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

  // Gerador de código numérico de 6 dígitos único
  public async generateUniqueRoomCode(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const { data } = await supabase
        .from('game_rooms')
        .select('room_code, status')
        .eq('room_code', code)
        .maybeSingle();

      if (!data || data.status === 'finished') {
        return code;
      }
    }
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // 1. Criar Sala (Host)
  public async createRoom(roomCode: string, playerName: string, config: RoomConfig): Promise<RoomRecord> {
    this.roomCode = roomCode.trim();
    this.playerName = playerName.trim();
    this.isHost = true;
    this.opponentId = '';
    this.hasHandledGuestJoin = false;

    // BLOQUEIO 2: Impossibilitar criar uma sala com o mesmo código de outra que já está ocorrendo
    const { data: existingRoom } = await supabase
      .from('game_rooms')
      .select('room_code, host_id, status')
      .eq('room_code', this.roomCode)
      .maybeSingle();

    if (
      existingRoom &&
      existingRoom.host_id !== this.playerId &&
      (existingRoom.status === 'waiting' || existingRoom.status === 'choosing' || existingRoom.status === 'playing')
    ) {
      throw new Error(`A sala "${this.roomCode}" já existe e está em andamento. Tente novamente para gerar outro código.`);
    }

    const isSecret = Boolean(config.isSecret);
    const password = config.password ? String(config.password).trim() : null;

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
        is_secret: isSecret,
        password: password,
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

  // Obter detalhes rápidos da sala (se existe e se requer senha)
  public async getRoomDetails(roomCode: string): Promise<{ exists: boolean; isSecret: boolean; status: string } | null> {
    const { data: room } = await supabase
      .from('game_rooms')
      .select('room_code, is_secret, status, guest_id')
      .eq('room_code', roomCode.trim())
      .maybeSingle();

    if (!room) return null;
    return {
      exists: true,
      isSecret: Boolean(room.is_secret),
      status: room.status,
    };
  }

  // 2. Entrar em Sala Existente (Guest com suporte a senha e prevenção de corrida)
  public async joinRoom(roomCode: string, playerName: string, passwordInput?: string): Promise<RoomRecord> {
    this.roomCode = roomCode.trim();
    this.playerName = playerName.trim();
    this.isHost = false;
    this.hasHandledGuestJoin = true;

    const { data: room, error: fetchError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', this.roomCode)
      .maybeSingle();

    if (fetchError || !room) {
      throw new Error(`A sala "${this.roomCode}" não foi encontrada. Verifique se digitou o código de 6 números corretamente!`);
    }

    this.opponentId = room.host_id;

    if (room.status === 'finished') {
      throw new Error('Esta partida já foi encerrada.');
    }

    // BLOQUEIO 1: Impossibilitar um terceiro jogador de entrar em uma sala em andamento
    const isPlayerAlreadyInRoom = (room.host_id === this.playerId) || (room.guest_id === this.playerId);
    if (!isPlayerAlreadyInRoom) {
      if (room.guest_id || room.status === 'choosing' || room.status === 'playing') {
        throw new Error('Esta sala já está em andamento (dois jogadores já estão na partida).');
      }

      // Verificação de Senha para Salas Secretas
      if (room.is_secret) {
        if (!passwordInput) {
          const err: any = new Error('Esta sala é secreta e requer uma senha numérica para entrar.');
          err.requiresPassword = true;
          throw err;
        }
        if (passwordInput.trim() !== String(room.password || '').trim()) {
          throw new Error('Senha incorreta! Digite a senha numérica correta desta sala secreta.');
        }
      }
    }

    // ATOMIC UPDATE: Previne corrida se dois jogadores digitarem a senha e tentarem entrar ao mesmo tempo
    const { data: updatedRoom, error: updateError } = await supabase
      .from('game_rooms')
      .update({
        guest_id: this.playerId,
        guest_name: this.playerName,
        status: 'choosing',
        updated_at: new Date().toISOString(),
      })
      .eq('room_code', this.roomCode)
      .eq('status', 'waiting')
      .is('guest_id', null)
      .select('*')
      .maybeSingle();

    if (updateError || !updatedRoom) {
      throw new Error('Esta sala já está em andamento (outro jogador acabou de entrar primeiro).');
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

  // Buscar Lobbies Públicos Abertos (com limpeza de salas antigas)
  public async getPublicLobbies(): Promise<RoomRecord[]> {
    try {
      // Dispara a limpeza de salas com mais de 10 minutos sem começar
      await supabase.rpc('cleanup_stale_rooms');
    } catch {
      // ignore
    }

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('status', 'waiting')
      .eq('is_secret', false)
      .gte('created_at', tenMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error || !data) return [];
    return data as RoomRecord[];
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

    this.opponentId = isHost ? (room.guest_id || '') : room.host_id;

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
        // Dispara JOIN para o Host se o convidado acabou de entrar
        if (this.isHost && room.guest_id) {
          this.opponentId = room.guest_id;
          if (!this.hasHandledGuestJoin && room.status === 'choosing') {
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
        }

        // Sincronização redundante de turno e status caso o broadcast falhe
        if (room.status === 'playing' && room.current_turn) {
          this.messageListeners.forEach((fn) =>
            fn({
              type: 'SYNC_GAME_STATE',
              senderId: 'system',
              senderName: 'Sistema',
              payload: {
                status: 'playing',
                currentTurnPlayerId: room.current_turn,
                currentQuestion: room.current_question || null,
              },
              timestamp: Date.now(),
            })
          );
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

      // 1. Tentar deletar via RPC com SECURITY DEFINER
      await supabase.rpc('delete_game_room', {
        p_room_code: roomCode,
        p_player_id: this.playerId || null,
      });

      // 2. Fallback direto
      await supabase.from('game_rooms').delete().eq('room_code', roomCode);
    } catch (err) {
      console.warn('Erro ao limpar storage ou sala:', err);
    }
  }

  // Limpeza em segundo plano enviada quando o usuário fecha ou recarrega a página
  public cleanupStorageAndRoomBeacon(roomCode: string) {
    if (!roomCode) return;
    try {
      const url = 'https://ddfefbwauuhqxqufhwwr.supabase.co/rest/v1/rpc/delete_game_room';
      const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkZmVmYndhdXVocXhxdWZod3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1ODMxNjgsImV4cCI6MjEwOTE1OTE2OH0.l1eh6jmMsi1fTiqy7h28fjkgl0SJLegELUoNmk0dRPE';
      fetch(url, {
        method: 'POST',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_room_code: roomCode,
          p_player_id: this.playerId || null,
        }),
        keepalive: true,
      });
    } catch {
      // ignore
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
