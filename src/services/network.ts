import mqtt, { type MqttClient } from 'mqtt';
import type { NetworkMessage } from '../types/game';

type MessageHandler = (msg: NetworkMessage) => void;
type StatusHandler = (connected: boolean, error?: string) => void;

const BROKER_URLS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt'
];

export class NetworkService {
  private client: MqttClient | null = null;
  private currentTopic: string = '';
  private messageListeners: Set<MessageHandler> = new Set();
  private statusListeners: Set<StatusHandler> = new Set();
  public isConnected: boolean = false;
  public playerId: string = '';
  public playerName: string = '';
  public roomCode: string = '';

  constructor() {
    let storedId = sessionStorage.getItem('cara_player_id');
    if (!storedId) {
      storedId = 'p_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('cara_player_id', storedId);
    }
    this.playerId = storedId;
  }

  public connect(roomCode: string, playerName: string, brokerIndex = 0): Promise<void> {
    return new Promise((resolve, reject) => {
      this.roomCode = roomCode.toUpperCase().trim();
      this.playerName = playerName.trim();
      this.currentTopic = `cara-a-cara/v1/room_${this.roomCode}`;

      const brokerUrl = BROKER_URLS[brokerIndex % BROKER_URLS.length];
      const clientId = `cara_${this.playerId}_${Math.random().toString(16).slice(2, 6)}`;

      if (this.client) {
        try {
          this.client.end(true);
        } catch (e) {
          console.error(e);
        }
      }

      try {
        this.client = mqtt.connect(brokerUrl, {
          clientId,
          clean: true,
          connectTimeout: 7000,
          reconnectPeriod: 3000,
          keepalive: 30,
        });

        this.client.on('connect', () => {
          this.isConnected = true;
          this.notifyStatus(true);
          
          this.client?.subscribe(this.currentTopic, { qos: 1 }, (err) => {
            if (err) {
              console.error('Erro ao inscrever no tópico:', err);
              this.notifyStatus(false, 'Falha ao entrar na sala');
              reject(err);
            } else {
              this.send('JOIN', {
                playerId: this.playerId,
                playerName: this.playerName
              });
              resolve();
            }
          });
        });

        this.client.on('message', (topic, payload) => {
          if (topic === this.currentTopic) {
            try {
              const msg: NetworkMessage = JSON.parse(payload.toString());
              this.messageListeners.forEach(fn => fn(msg));
            } catch (err) {
              console.error('Erro ao ler mensagem de rede:', err);
            }
          }
        });

        this.client.on('error', (err) => {
          console.warn('Erro na conexão MQTT:', err);
          this.isConnected = false;
          this.notifyStatus(false, err.message);
        });

        this.client.on('close', () => {
          this.isConnected = false;
          this.notifyStatus(false);
        });

      } catch (err: any) {
        if (brokerIndex < BROKER_URLS.length - 1) {
          this.connect(roomCode, playerName, brokerIndex + 1).then(resolve).catch(reject);
        } else {
          this.notifyStatus(false, err?.message || 'Falha de conexão');
          reject(err);
        }
      }
    });
  }

  public send(type: NetworkMessage['type'], payload: any) {
    if (!this.client || !this.isConnected || !this.currentTopic) {
      console.warn('Tentativa de envio sem conexão ativa');
      return;
    }

    const message: NetworkMessage = {
      type,
      senderId: this.playerId,
      senderName: this.playerName,
      payload,
      timestamp: Date.now()
    };

    this.client.publish(this.currentTopic, JSON.stringify(message), { qos: 1 });
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
    this.statusListeners.forEach(fn => fn(connected, error));
  }

  public disconnect() {
    if (this.client) {
      try {
        this.client.end(true);
      } catch (e) {
        console.error(e);
      }
      this.client = null;
    }
    this.isConnected = false;
    this.notifyStatus(false);
  }
}

export const network = new NetworkService();
