import { getLang } from '../i18n/locale';
import { SaveManager } from '../meta/SaveManager';
import { PlatformSDK } from '../platform/PlatformSDK';
import { GameMode } from '../types';
import {
  DirectoryWireMessage,
  DuelLobbyState,
  DuelMember,
  DuelNetMessage,
  DuelNetStatus,
  DuelRole,
  isFastPvpSnapshot,
  PublicDuelRoomEntry,
} from './DuelProtocol';
import { MqttWsRoomBus, RoomWireEnvelope } from './MqttWsRoomBus';

const ROOM_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const PUBLIC_HALL_ROOM_ID = '__PUBLIC_HALL__';
const PUBLIC_ROOM_TTL_MS = 45_000;

const RTC_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.miwifi.com:3478' },
  { urls: 'stun:stun.qq.com:3478' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.l.google.com:19302' },
];

type SignalControlMsg =
  | { type: '__hb'; callsign?: string; rankLvl?: number }
  | { type: '__ping'; t0: number }
  | { type: '__pong'; t0: number }
  | { type: '__rtc'; sdp?: RTCSessionDescriptionInit; cand?: RTCIceCandidateInit };

type RoomBusPayload = DuelNetMessage | SignalControlMsg;

interface PeerRtcBundle {
  pc: RTCPeerConnection;
  dcFast: RTCDataChannel | null;
  dcRel: RTCDataChannel | null;
  pendingCands: RTCIceCandidateInit[];
  remoteDescSet: boolean;
}

function randomRoomCode(len = 5): string {
  let s = '';
  for (let i = 0; i < len; i++) {
    s += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
  }
  return s;
}

function randomPeerId(): string {
  let s = 'duel_';
  for (let i = 0; i < 8; i++) {
    s += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
  }
  return s;
}

function defaultCallsign(): string {
  const suffix = Math.floor(100 + Math.random() * 900);
  return getLang() === 'zh' ? `护主统帅${suffix}` : `Commander${suffix}`;
}

class DuelNetworkManager {
  public role: DuelRole = 'solo';
  public status: DuelNetStatus = 'offline';
  public errorMsg = '';
  public mySlot: 1 | 2 = 1;
  public myCallsign = '';
  public myPeerId = randomPeerId();
  public lobby: DuelLobbyState | null = null;
  public rttMs = 0;

  private bus: MqttWsRoomBus<RoomBusPayload> | null = null;
  private hostPeerId = '';
  private opponentPeerId = '';
  private opponentLastSeen = 0;
  private heartbeatTimer = 0;
  private joinRetryTimer = 0;
  private joinTimeoutTimer = 0;
  private inMatchTriggered = false;
  private hostMatchSeq = 0;
  public currentMatchSeq = 0;
  private lastClientMatchSeq = 0;

  private rtcPeers = new Map<string, PeerRtcBundle>();
  private pendingFastSyncRaw: string | null = null;

  private directoryBus: MqttWsRoomBus<DirectoryWireMessage> | null = null;
  private directoryReady = false;
  private publicRooms = new Map<string, PublicDuelRoomEntry>();
  private directoryPruneTimer = 0;
  private hostAnnounceTimer = 0;

  private onLobbyChangeCb: (() => void) | null = null;
  private onNetStatsChangeCb: (() => void) | null = null;
  private onPublicRoomsChangeCb: (() => void) | null = null;
  private onDuelStartCb:
    | ((stageId: string, mode: GameMode, matchSeed: number, matchSeq: number, lobby: DuelLobbyState) => void)
    | null = null;
  private onGameMessageCb: ((msg: DuelNetMessage, fromPeerId: string) => void) | null = null;
  private onPeerDisconnectedCb: ((callsign: string) => void) | null = null;
  private onReturnLobbyCb: (() => void) | null = null;

  constructor() {
    const savedName = PlatformSDK.getStorageItem('adou_duel_callsign_v1');
    this.myCallsign = savedName && savedName.trim() ? savedName.trim().slice(0, 12) : defaultCallsign();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.refreshPresenceTimestamps();
          if (this.role === 'host' && this.lobby) {
            this.broadcastLobby();
            this.publishHostDirectoryState();
          } else if (this.role === 'client' && this.bus && this.hostPeerId) {
            this.bus.send(this.hostPeerId, {
              type: '__hb',
              callsign: this.getEffectiveCallsign(),
              rankLvl: SaveManager.get().commanderLevel,
            });
          }
        }
      });
    }
  }

  public getEffectiveCallsign(): string {
    if (PlatformSDK.isChatDisabled()) {
      const code = this.myPeerId.slice(-3);
      return getLang() === 'zh' ? `统帅#${code}` : `Lord#${code}`;
    }
    return this.myCallsign;
  }

  public setCallsign(name: string): void {
    if (PlatformSDK.isChatDisabled()) return;
    const trimmed = name.trim().slice(0, 12);
    if (!trimmed) return;
    this.myCallsign = trimmed;
    PlatformSDK.setStorageItem('adou_duel_callsign_v1', trimmed);

    if (this.lobby) {
      const me = this.lobby.members.find((m) => m.peerId === this.myPeerId);
      if (me) {
        me.callsign = trimmed;
        if (this.role === 'host') {
          this.broadcastLobby();
          this.publishHostDirectoryState();
        } else if (this.role === 'client' && this.hostPeerId) {
          this.bus?.send(this.hostPeerId, {
            type: 'ready_toggle',
            ready: me.ready,
            callsign: trimmed,
            rankLvl: SaveManager.get().commanderLevel,
          });
        }
        this.notifyLobby();
      }
    }
  }

  public bindCallbacks(cbs: {
    onLobbyChange: () => void;
    onNetStatsChange?: () => void;
    onPublicRoomsChange?: () => void;
    onDuelStart: (
      stageId: string,
      mode: GameMode,
      matchSeed: number,
      matchSeq: number,
      lobby: DuelLobbyState
    ) => void;
    onGameMessage: (msg: DuelNetMessage, fromPeerId: string) => void;
    onPeerDisconnected?: (callsign: string) => void;
    onReturnLobby?: () => void;
  }): void {
    this.onLobbyChangeCb = cbs.onLobbyChange;
    this.onNetStatsChangeCb = cbs.onNetStatsChange || null;
    this.onPublicRoomsChangeCb = cbs.onPublicRoomsChange || null;
    this.onDuelStartCb = cbs.onDuelStart;
    this.onGameMessageCb = cbs.onGameMessage;
    this.onPeerDisconnectedCb = cbs.onPeerDisconnected || null;
    this.onReturnLobbyCb = cbs.onReturnLobby || null;
  }

  public isOnline(): boolean {
    return this.role !== 'solo' && this.status === 'ready' && Boolean(this.lobby);
  }

  public isInLiveDuel(): boolean {
    return Boolean(this.isOnline() && this.lobby?.inGame);
  }

  public getOpponentMember(): DuelMember | null {
    if (!this.lobby) return null;
    return this.lobby.members.find((m) => m.peerId !== this.myPeerId) ?? null;
  }

  public hasDirectP2P(): boolean {
    const oppId = this.role === 'client' ? this.hostPeerId : this.opponentPeerId;
    if (!oppId) return false;
    const b = this.rtcPeers.get(oppId);
    return Boolean(b?.dcFast && b.dcFast.readyState === 'open');
  }

  // ==================== PUBLIC DUEL HALL DIRECTORY ====================

  public ensurePublicDirectoryActive(): void {
    if (this.directoryBus) {
      this.directoryBus.wakeAndCheckLinks();
      if (this.directoryReady) {
        this.directoryBus.send('*', { type: 'room_query' });
      }
      return;
    }

    this.directoryReady = false;
    this.directoryBus = new MqttWsRoomBus<DirectoryWireMessage>(
      `${this.myPeerId}_DIR`,
      PUBLIC_HALL_ROOM_ID,
      () => {
        this.directoryReady = true;
        this.directoryBus?.send('*', { type: 'room_query' });
        this.publishHostDirectoryState();
        this.onPublicRoomsChangeCb?.();
      },
      (env) => this.handleDirectoryEnvelope(env),
      () => {
        this.directoryReady = false;
      },
      () => {
        this.directoryReady = true;
        this.directoryBus?.send('*', { type: 'room_query' });
        this.publishHostDirectoryState();
      }
    );

    window.clearInterval(this.directoryPruneTimer);
    this.directoryPruneTimer = window.setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [code, entry] of this.publicRooms.entries()) {
        if (now - entry.updatedAt > PUBLIC_ROOM_TTL_MS) {
          this.publicRooms.delete(code);
          changed = true;
        }
      }
      if (changed) {
        this.onPublicRoomsChangeCb?.();
      }
    }, 6000);
  }

  public getPublicRooms(): PublicDuelRoomEntry[] {
    const now = Date.now();
    const list: PublicDuelRoomEntry[] = [];
    for (const entry of this.publicRooms.values()) {
      if (now - entry.updatedAt <= PUBLIC_ROOM_TTL_MS && !entry.inGame && entry.memberCount < 2) {
        list.push(entry);
      }
    }
    list.sort((a, b) => b.updatedAt - a.updatedAt);
    return list;
  }

  public requestDirectoryRefresh(): void {
    this.ensurePublicDirectoryActive();
    if (this.directoryReady) {
      this.directoryBus?.send('*', { type: 'room_query' });
    }
  }

  private handleDirectoryEnvelope(env: RoomWireEnvelope<DirectoryWireMessage>): void {
    const msg = env.msg;
    if (!msg) return;

    if (msg.type === 'room_announce' && msg.room?.roomCode) {
      if (msg.room.inGame || msg.room.memberCount >= 2) {
        if (this.publicRooms.delete(msg.room.roomCode)) {
          this.onPublicRoomsChangeCb?.();
        }
        return;
      }
      this.publicRooms.set(msg.room.roomCode, {
        ...msg.room,
        updatedAt: Date.now(),
      });
      this.onPublicRoomsChangeCb?.();
    } else if (msg.type === 'room_close' && msg.roomCode) {
      if (this.publicRooms.delete(msg.roomCode)) {
        this.onPublicRoomsChangeCb?.();
      }
    } else if (msg.type === 'room_query') {
      if (
        this.role === 'host' &&
        this.status === 'ready' &&
        this.lobby &&
        this.lobby.isPublic &&
        !this.lobby.inGame &&
        this.lobby.members.length < 2
      ) {
        this.publishHostDirectoryState();
      }
    }
  }

  private publishHostDirectoryState(): void {
    if (!this.directoryBus || !this.directoryReady) return;
    if (this.role !== 'host' || this.status !== 'ready' || !this.lobby) return;

    if (!this.lobby.isPublic || this.lobby.inGame || this.lobby.members.length >= 2) {
      this.directoryBus.send('*', { type: 'room_close', roomCode: this.lobby.roomCode });
      this.publicRooms.delete(this.lobby.roomCode);
      return;
    }

    const hostMember = this.lobby.members[0];
    this.directoryBus.send('*', {
      type: 'room_announce',
      room: {
        roomCode: this.lobby.roomCode,
        hostPeerId: this.myPeerId,
        hostCallsign: hostMember ? hostMember.callsign : this.getEffectiveCallsign(),
        stageId: this.lobby.stageId,
        mode: this.lobby.mode,
        memberCount: this.lobby.members.length,
        inGame: this.lobby.inGame,
      },
    });
  }

  public quickMatchOrCreate(stageId: string, mode: GameMode): void {
    this.ensurePublicDirectoryActive();
    const candidates = this.getPublicRooms().filter((r) => r.hostPeerId !== this.myPeerId);
    if (candidates.length > 0) {
      this.joinRoom(candidates[0].roomCode);
      return;
    }
    this.createRoom(stageId, mode, true);
    window.setTimeout(() => {
      if (
        this.role === 'host' &&
        this.status === 'ready' &&
        this.lobby &&
        !this.lobby.inGame &&
        this.lobby.members.length === 1
      ) {
        const newer = this.getPublicRooms().filter(
          (r) => r.roomCode !== this.lobby!.roomCode && r.hostPeerId < this.myPeerId
        );
        if (newer.length > 0) {
          this.joinRoom(newer[0].roomCode);
        }
      }
    }, 900);
  }

  // ==================== CREATE / JOIN / LEAVE ROOM ====================

  public leaveRoom(): void {
    if (this.role === 'host' && this.lobby && this.directoryBus && this.directoryReady) {
      this.directoryBus.send('*', { type: 'room_close', roomCode: this.lobby.roomCode });
      this.publicRooms.delete(this.lobby.roomCode);
    }
    if (this.bus) {
      this.bus.send('*', { type: 'leave_room' });
    }
    this.cleanupSession();
    PlatformSDK.hideInviteButton();
    this.notifyLobby();
  }

  private cleanupSession(): void {
    window.clearInterval(this.heartbeatTimer);
    window.clearInterval(this.joinRetryTimer);
    window.clearInterval(this.hostAnnounceTimer);
    window.clearTimeout(this.joinTimeoutTimer);
    this.closeAllRtcPeers();
    this.bus?.close();
    this.bus = null;
    this.role = 'solo';
    this.status = 'offline';
    this.errorMsg = '';
    this.lobby = null;
    this.hostPeerId = '';
    this.opponentPeerId = '';
    this.opponentLastSeen = 0;
    this.inMatchTriggered = false;
    this.hostMatchSeq = 0;
    this.currentMatchSeq = 0;
    this.lastClientMatchSeq = 0;
    this.rttMs = 0;
    this.pendingFastSyncRaw = null;
  }

  private refreshPresenceTimestamps(): void {
    const now = performance.now();
    if (this.opponentLastSeen > 0) {
      this.opponentLastSeen = now;
    }
  }

  public createRoom(stageId: string, mode: GameMode, isPublic = true): void {
    this.cleanupSession();
    this.ensurePublicDirectoryActive();
    const code = randomRoomCode(5);
    this.role = 'host';
    this.status = 'connecting';
    this.mySlot = 1;
    this.notifyLobby();

    this.bus = new MqttWsRoomBus<RoomBusPayload>(
      this.myPeerId,
      code,
      () => {
        if (this.role !== 'host') return;
        this.status = 'ready';
        this.lobby = {
          roomCode: code,
          hostPeerId: this.myPeerId,
          stageId,
          mode,
          isPublic,
          inGame: false,
          matchSeq: 0,
          matchSeed: Math.floor(Math.random() * 0x7fffffff),
          members: [
            {
              peerId: this.myPeerId,
              slot: 1,
              callsign: this.getEffectiveCallsign(),
              ready: true,
              rankLvl: SaveManager.get().commanderLevel,
            },
          ],
        };
        PlatformSDK.showInviteButton(code, true);
        this.startHostHeartbeatLoop();
        this.publishHostDirectoryState();
        this.notifyLobby();
      },
      (env) => this.onHostEnvelope(env),
      () => {
        if (this.role !== 'host') return;
        this.status = 'error';
        this.errorMsg =
          getLang() === 'zh'
            ? '无法连接对战信令节点，请检查网络后重试'
            : 'Unable to reach signaling brokers. Check connection and retry.';
        this.notifyLobby();
      },
      () => {
        if (this.role !== 'host' || !this.lobby) return;
        this.refreshPresenceTimestamps();
        this.broadcastLobby();
        this.publishHostDirectoryState();
      }
    );
  }

  public joinRoom(rawCode: string): void {
    const code = rawCode
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    if (code.length < 4) {
      this.status = 'error';
      this.errorMsg = getLang() === 'zh' ? '请输入有效的 5 位对战房号' : 'Enter a valid 5-character Room Code';
      this.notifyLobby();
      return;
    }

    this.cleanupSession();
    this.role = 'client';
    this.status = 'connecting';
    this.notifyLobby();

    this.bus = new MqttWsRoomBus<RoomBusPayload>(
      this.myPeerId,
      code,
      () => {
        if (this.role !== 'client') return;
        const sendJoinReq = () => {
          if (this.role !== 'client' || this.status !== 'connecting') return;
          this.bus?.send('*', {
            type: 'join_req',
            callsign: this.getEffectiveCallsign(),
            rankLvl: SaveManager.get().commanderLevel,
          });
        };
        sendJoinReq();
        window.clearInterval(this.joinRetryTimer);
        this.joinRetryTimer = window.setInterval(sendJoinReq, 1100);

        window.clearTimeout(this.joinTimeoutTimer);
        this.joinTimeoutTimer = window.setTimeout(() => {
          if (this.role === 'client' && this.status === 'connecting') {
            window.clearInterval(this.joinRetryTimer);
            this.status = 'error';
            this.errorMsg =
              getLang() === 'zh'
                ? `未找到房间 [${code}] 或房主已离线`
                : `Room [${code}] not found or host offline`;
            this.notifyLobby();
          }
        }, 12_000);
      },
      (env) => this.onClientEnvelope(env),
      () => {
        if (this.role !== 'client') return;
        this.status = 'error';
        this.errorMsg =
          getLang() === 'zh'
            ? '无法连接对战信令节点，请检查网络后重试'
            : 'Unable to reach signaling brokers. Check connection and retry.';
        this.notifyLobby();
      },
      () => {
        if (this.role !== 'client' || !this.bus) return;
        this.refreshPresenceTimestamps();
        if (this.status === 'ready' && this.hostPeerId) {
          this.bus.send(this.hostPeerId, {
            type: '__hb',
            callsign: this.getEffectiveCallsign(),
            rankLvl: SaveManager.get().commanderLevel,
          });
        } else if (this.status === 'connecting') {
          this.bus.send('*', {
            type: 'join_req',
            callsign: this.getEffectiveCallsign(),
            rankLvl: SaveManager.get().commanderLevel,
          });
        }
      }
    );
  }

  public updateHostConfig(stageId: string, mode: GameMode, isPublic?: boolean): void {
    if (this.role !== 'host' || !this.lobby || this.lobby.inGame) return;
    this.lobby.stageId = stageId;
    this.lobby.mode = mode;
    if (isPublic !== undefined) {
      this.lobby.isPublic = isPublic;
    }
    this.broadcastLobby();
    this.publishHostDirectoryState();
    this.notifyLobby();
  }

  public toggleClientReady(): void {
    if (this.role !== 'client' || !this.lobby || !this.hostPeerId) return;
    const me = this.lobby.members.find((m) => m.peerId === this.myPeerId);
    if (!me) return;
    me.ready = !me.ready;
    this.sendReliable({
      type: 'ready_toggle',
      ready: me.ready,
      callsign: this.getEffectiveCallsign(),
      rankLvl: SaveManager.get().commanderLevel,
    });
    this.notifyLobby();
  }

  public launchHostDuel(): boolean {
    if (this.role !== 'host' || !this.lobby) return false;
    if (this.lobby.members.length < 2) return false;

    this.hostMatchSeq += 1;
    const curSeq = this.hostMatchSeq;
    const seed = Math.floor(100000 + Math.random() * 0x70000000);
    this.currentMatchSeq = curSeq;
    this.lobby.inGame = true;
    this.lobby.matchSeq = curSeq;
    this.lobby.matchSeed = seed;
    this.inMatchTriggered = true;
    this.pendingFastSyncRaw = null;

    PlatformSDK.hideInviteButton(this.lobby.roomCode);
    this.publishHostDirectoryState();

    const sendBurst = () => {
      if (this.role !== 'host' || !this.lobby || !this.lobby.inGame || this.currentMatchSeq !== curSeq) {
        return;
      }
      const pkt: DuelNetMessage = {
        type: 'start_duel',
        stageId: this.lobby.stageId,
        mode: this.lobby.mode,
        matchSeq: curSeq,
        matchSeed: seed,
        lobby: this.lobby,
      };
      this.bus?.send('*', pkt);
      if (this.opponentPeerId) {
        this.trySendOverRtc(this.opponentPeerId, pkt);
      }
    };
    sendBurst();
    window.setTimeout(sendBurst, 320);
    window.setTimeout(sendBurst, 850);

    this.onDuelStartCb?.(this.lobby.stageId, this.lobby.mode, seed, curSeq, this.lobby);
    return true;
  }

  /**
   * Persistent room across rounds per CrazyGames QA rules:
   * Returns both players to the live 2P room (or keeps room ready for instant Host rematch!).
   */
  public returnDuelToLobby(): void {
    if (!this.lobby) return;
    this.lobby.inGame = false;
    this.inMatchTriggered = false;
    this.pendingFastSyncRaw = null;
    PlatformSDK.showInviteButton(this.lobby.roomCode, this.lobby.members.length < 2);

    if (this.role === 'host') {
      // Keep challenger marked ready so Host can launch rematch immediately with 1 click!
      for (const m of this.lobby.members) {
        m.ready = true;
      }
      this.bus?.send('*', { type: 'return_lobby', lobby: this.lobby });
      this.broadcastLobby();
      this.publishHostDirectoryState();
    } else if (this.role === 'client' && this.hostPeerId) {
      const me = this.lobby.members.find((m) => m.peerId === this.myPeerId);
      if (me) me.ready = true;
      this.sendReliable({
        type: 'ready_toggle',
        ready: true,
        callsign: this.getEffectiveCallsign(),
        rankLvl: SaveManager.get().commanderLevel,
      });
    }
    this.notifyLobby();
  }

  // ==================== HOST & CLIENT ENVELOPE HANDLERS ====================

  private startHostHeartbeatLoop(): void {
    window.clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = window.setInterval(() => {
      if (this.role !== 'host' || !this.lobby || !this.bus) return;
      this.bus.send('*', { type: '__hb' });

      if (this.opponentPeerId && this.opponentLastSeen > 0) {
        this.sendRawPingPong(this.opponentPeerId, {
          type: '__ping',
          t0: Math.round(performance.now()),
        });
        const hiddenGrace = typeof document !== 'undefined' && document.hidden ? 60_000 : 0;
        const timeoutMs = (this.lobby.inGame ? 16_000 : 45_000) + hiddenGrace;
        if (performance.now() - this.opponentLastSeen > timeoutMs) {
          this.handleOpponentLeft();
        }
      }
    }, 2200);

    window.clearInterval(this.hostAnnounceTimer);
    this.hostAnnounceTimer = window.setInterval(() => {
      if (this.role === 'host' && this.lobby && !this.lobby.inGame) {
        this.publishHostDirectoryState();
      }
    }, 10_000);
  }

  private startClientHeartbeatLoop(): void {
    window.clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = window.setInterval(() => {
      if (this.role !== 'client' || !this.bus || !this.hostPeerId) return;
      this.bus.send(this.hostPeerId, {
        type: '__hb',
        callsign: this.getEffectiveCallsign(),
        rankLvl: SaveManager.get().commanderLevel,
      });
      this.sendRawPingPong(this.hostPeerId, {
        type: '__ping',
        t0: Math.round(performance.now()),
      });

      const hiddenGrace = typeof document !== 'undefined' && document.hidden ? 60_000 : 0;
      const timeoutMs = (this.inMatchTriggered ? 16_000 : 45_000) + hiddenGrace;
      if (this.opponentLastSeen > 0 && performance.now() - this.opponentLastSeen > timeoutMs) {
        const oppName = this.getOpponentMember()?.callsign || 'Host';
        const wasInGame = this.inMatchTriggered;
        this.cleanupSession();
        PlatformSDK.hideInviteButton();
        if (wasInGame) {
          this.onPeerDisconnectedCb?.(oppName);
        } else {
          this.status = 'error';
          this.errorMsg = getLang() === 'zh' ? '房主已断开连接' : 'Host disconnected';
          this.notifyLobby();
        }
      }
    }, 2000);
  }

  private handleOpponentLeft(): void {
    if (this.role !== 'host' || !this.lobby) return;
    const prevOpp = this.getOpponentMember();
    const oppName = prevOpp?.callsign || 'Rival';
    const wasInGame = this.lobby.inGame;

    if (this.opponentPeerId) {
      this.closeRtcPeer(this.opponentPeerId);
      this.bus?.forgetPeer(this.opponentPeerId);
    }
    this.opponentPeerId = '';
    this.opponentLastSeen = 0;
    this.rttMs = 0;
    this.lobby.members = this.lobby.members.filter((m) => m.peerId === this.myPeerId);
    this.lobby.inGame = false;
    this.inMatchTriggered = false;

    this.broadcastLobby();
    this.publishHostDirectoryState();
    this.notifyLobby();

    if (wasInGame) {
      this.onPeerDisconnectedCb?.(oppName);
    }
  }

  private onHostEnvelope(env: RoomWireEnvelope<RoomBusPayload>): void {
    if (this.role !== 'host' || !this.lobby || !this.bus) return;
    const from = env.from;
    const msg = env.msg;
    if (!msg) return;

    const now = performance.now();
    if (from === this.opponentPeerId) {
      this.opponentLastSeen = now;
    }

    if (msg.type === '__ping') {
      this.sendRawPingPong(from, { type: '__pong', t0: msg.t0 });
      return;
    }
    if (msg.type === '__pong') {
      this.updateRttSample(now - msg.t0);
      return;
    }
    if (msg.type === '__rtc') {
      if (from === this.opponentPeerId) {
        this.handleRtcSignal(from, msg);
      }
      return;
    }
    if (msg.type === '__hb') {
      if (from === this.opponentPeerId) {
        this.opponentLastSeen = now;
      }
      return;
    }

    if (msg.type === 'leave_room') {
      if (from === this.opponentPeerId) {
        this.handleOpponentLeft();
      }
      return;
    }

    if (msg.type === 'join_req') {
      const existing = this.lobby.members.find((m) => m.peerId === from);
      if (existing) {
        this.opponentPeerId = from;
        this.opponentLastSeen = now;
        existing.callsign = PlatformSDK.isChatDisabled()
          ? existing.callsign
          : (msg.callsign || existing.callsign).slice(0, 12);
        existing.rankLvl = msg.rankLvl || existing.rankLvl;
        this.bus.send(from, {
          type: 'join_ack',
          accepted: true,
          assignedSlot: 2,
          lobby: this.lobby,
        });
        this.ensureHostRtcOffer(from);
        this.broadcastLobby();
        this.notifyLobby();
        return;
      }

      if (this.lobby.inGame) {
        this.bus.send(from, { type: 'join_ack', accepted: false, reason: 'in_game' });
        return;
      }
      if (this.lobby.members.length >= 2) {
        this.bus.send(from, { type: 'join_ack', accepted: false, reason: 'full' });
        return;
      }

      const safeCallsign = PlatformSDK.isChatDisabled()
        ? getLang() === 'zh'
          ? `统帅#${from.slice(-3)}`
          : `Lord#${from.slice(-3)}`
        : (msg.callsign || defaultCallsign()).slice(0, 12);

      this.opponentPeerId = from;
      this.opponentLastSeen = now;
      this.lobby.members.push({
        peerId: from,
        slot: 2,
        callsign: safeCallsign,
        ready: true,
        rankLvl: msg.rankLvl || 1,
      });

      this.bus.send(from, {
        type: 'join_ack',
        accepted: true,
        assignedSlot: 2,
        lobby: this.lobby,
      });
      this.ensureHostRtcOffer(from);
      this.broadcastLobby();
      this.publishHostDirectoryState();
      this.notifyLobby();
      return;
    }

    if (from !== this.opponentPeerId) return;

    if (msg.type === 'ready_toggle') {
      const m = this.lobby.members.find((item) => item.peerId === from);
      if (m) {
        m.ready = msg.ready;
        if (!PlatformSDK.isChatDisabled() && msg.callsign) {
          m.callsign = msg.callsign.slice(0, 12);
        }
        m.rankLvl = msg.rankLvl || m.rankLvl;
        this.broadcastLobby();
        this.notifyLobby();
      }
      return;
    }

    this.onGameMessageCb?.(msg, from);
  }

  private onClientEnvelope(env: RoomWireEnvelope<RoomBusPayload>): void {
    if (this.role !== 'client' || !this.bus) return;
    const from = env.from;
    const msg = env.msg;
    if (!msg) return;

    const now = performance.now();
    if (!this.hostPeerId || from === this.hostPeerId) {
      this.opponentLastSeen = now;
    }

    if (msg.type === '__ping') {
      this.sendRawPingPong(from, { type: '__pong', t0: msg.t0 });
      return;
    }
    if (msg.type === '__pong') {
      this.updateRttSample(now - msg.t0);
      return;
    }
    if (msg.type === '__rtc') {
      if (!this.hostPeerId || from === this.hostPeerId) {
        this.handleRtcSignal(from, msg);
      }
      return;
    }
    if (msg.type === '__hb') {
      return;
    }

    if (msg.type === 'leave_room' && from === this.hostPeerId) {
      const hostName = this.getOpponentMember()?.callsign || 'Host';
      const wasInGame = this.inMatchTriggered;
      this.cleanupSession();
      PlatformSDK.hideInviteButton();
      if (wasInGame) {
        this.onPeerDisconnectedCb?.(hostName);
      } else {
        this.status = 'error';
        this.errorMsg = getLang() === 'zh' ? '房主已解散对战房间' : 'Host closed the duel room';
        this.notifyLobby();
      }
      return;
    }

    if (msg.type === 'join_ack') {
      window.clearInterval(this.joinRetryTimer);
      window.clearTimeout(this.joinTimeoutTimer);
      if (!msg.accepted || !msg.lobby || !msg.assignedSlot) {
        this.status = 'error';
        this.errorMsg =
          msg.reason === 'full'
            ? getLang() === 'zh'
              ? '该对战房间已满员 (2/2)'
              : 'Duel room is already full (2/2)'
            : getLang() === 'zh'
              ? '该房间正在激战中，请换一间或创建新房'
              : 'Duel already in progress — pick another room or create one';
        this.notifyLobby();
        return;
      }

      this.hostPeerId = from;
      this.opponentPeerId = from;
      this.opponentLastSeen = now;
      this.mySlot = msg.assignedSlot;
      this.lobby = msg.lobby;
      this.status = 'ready';
      PlatformSDK.showInviteButton(msg.lobby.roomCode, false);
      this.startClientHeartbeatLoop();
      this.notifyLobby();
      return;
    }

    if (this.hostPeerId && from !== this.hostPeerId) return;

    if (msg.type === 'lobby_state') {
      if (!msg.lobby.members.some((m) => m.peerId === this.myPeerId)) return;
      this.hostPeerId = msg.lobby.hostPeerId;
      this.opponentPeerId = msg.lobby.hostPeerId;
      this.lobby = msg.lobby;
      if (this.status === 'connecting') {
        window.clearInterval(this.joinRetryTimer);
        window.clearTimeout(this.joinTimeoutTimer);
        this.status = 'ready';
        this.startClientHeartbeatLoop();
      }
      this.notifyLobby();
      return;
    }

    if (msg.type === 'return_lobby') {
      this.lobby = { ...msg.lobby, inGame: false };
      this.inMatchTriggered = false;
      this.pendingFastSyncRaw = null;
      this.notifyLobby();
      this.onReturnLobbyCb?.();
      return;
    }

    if (msg.type === 'start_duel') {
      if (!msg.lobby.members.some((m) => m.peerId === this.myPeerId)) return;
      this.acceptClientDuelStart(msg.stageId, msg.mode, msg.matchSeed, msg.matchSeq, msg.lobby);
      return;
    }

    this.onGameMessageCb?.(msg, from);
  }

  private acceptClientDuelStart(
    stageId: string,
    mode: GameMode,
    matchSeed: number,
    seq: number,
    lobby: DuelLobbyState
  ): void {
    const effSeq = seq > 0 ? seq : lobby.matchSeq || 1;
    if (this.inMatchTriggered && effSeq === this.lastClientMatchSeq) return;
    if (effSeq < this.lastClientMatchSeq) return;
    this.lastClientMatchSeq = effSeq;
    this.currentMatchSeq = effSeq;
    this.lobby = { ...lobby, inGame: true, matchSeq: effSeq, matchSeed };
    this.inMatchTriggered = true;
    this.pendingFastSyncRaw = null;
    PlatformSDK.hideInviteButton(this.lobby.roomCode);
    this.onDuelStartCb?.(stageId, mode, matchSeed, effSeq, this.lobby);
  }

  private updateRttSample(rawMs: number): void {
    const sample = Math.max(1, Math.round(rawMs));
    if (sample < 5000) {
      this.rttMs =
        this.rttMs > 0 && this.rttMs < sample * 2.5
          ? Math.round(this.rttMs * 0.55 + sample * 0.45)
          : sample;
      this.onNetStatsChangeCb?.();
    }
  }

  // ==================== WEBRTC UDP DATACHANNEL DIRECT ACCELERATION ====================

  public flushCoalescedSnapshots(): void {
    const raw = this.pendingFastSyncRaw;
    if (!raw) return;
    this.pendingFastSyncRaw = null;
    try {
      const parsed = JSON.parse(raw) as { f: string; m: DuelNetMessage };
      if (parsed?.m) {
        this.onGameMessageCb?.(parsed.m, parsed.f);
      }
    } catch {
      // ignore
    }
  }

  private closeRtcPeer(peerId: string): void {
    const b = this.rtcPeers.get(peerId);
    if (!b) return;
    this.rtcPeers.delete(peerId);
    try {
      b.dcFast?.close();
    } catch {
      // ignore
    }
    try {
      b.dcRel?.close();
    } catch {
      // ignore
    }
    try {
      b.pc.close();
    } catch {
      // ignore
    }
  }

  private closeAllRtcPeers(): void {
    for (const pid of Array.from(this.rtcPeers.keys())) {
      this.closeRtcPeer(pid);
    }
  }

  private bindRtcChannel(peerId: string, bundle: PeerRtcBundle, dc: RTCDataChannel): void {
    if (dc.label === 'fast') {
      bundle.dcFast = dc;
      dc.onopen = () => {
        this.sendRawPingPong(peerId, { type: '__ping', t0: Math.round(performance.now()) });
        this.onNetStatsChangeCb?.();
      };
    } else {
      bundle.dcRel = dc;
    }

    dc.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      const raw = ev.data;
      const now = performance.now();
      this.opponentLastSeen = now;

      if (dc.label === 'fast' && raw.includes('"pvp_sync"')) {
        this.pendingFastSyncRaw = raw;
        return;
      }

      try {
        const parsed = JSON.parse(raw) as {
          f: string;
          m: DuelNetMessage | { type: '__ping'; t0: number } | { type: '__pong'; t0: number };
        };
        if (!parsed?.m) return;

        if (parsed.m.type === '__ping') {
          this.sendRawPingPong(peerId, { type: '__pong', t0: parsed.m.t0 });
          return;
        }
        if (parsed.m.type === '__pong') {
          this.updateRttSample(now - parsed.m.t0);
          return;
        }
        if (this.role === 'client' && parsed.m.type === 'start_duel') {
          this.acceptClientDuelStart(
            parsed.m.stageId,
            parsed.m.mode,
            parsed.m.matchSeed,
            parsed.m.matchSeq,
            parsed.m.lobby
          );
          return;
        }
        if (this.role === 'client' && parsed.m.type === 'return_lobby') {
          this.lobby = { ...parsed.m.lobby, inGame: false };
          this.inMatchTriggered = false;
          this.pendingFastSyncRaw = null;
          this.notifyLobby();
          this.onReturnLobbyCb?.();
          return;
        }
        this.onGameMessageCb?.(parsed.m, peerId);
      } catch {
        // ignore
      }
    };
  }

  private createRtcPeerBundle(peerId: string): PeerRtcBundle | null {
    if (typeof RTCPeerConnection === 'undefined') return null;
    this.closeRtcPeer(peerId);
    try {
      const pc = new RTCPeerConnection({ iceServers: RTC_ICE_SERVERS });
      const bundle: PeerRtcBundle = {
        pc,
        dcFast: null,
        dcRel: null,
        pendingCands: [],
        remoteDescSet: false,
      };
      this.rtcPeers.set(peerId, bundle);

      pc.onicecandidate = (ev) => {
        if (ev.candidate && this.bus) {
          this.bus.send(peerId, { type: '__rtc', cand: ev.candidate.toJSON() });
        }
      };
      pc.ondatachannel = (ev) => {
        this.bindRtcChannel(peerId, bundle, ev.channel);
      };
      return bundle;
    } catch {
      return null;
    }
  }

  private ensureHostRtcOffer(clientPeerId: string): void {
    if (this.role !== 'host' || typeof RTCPeerConnection === 'undefined') return;
    const cur = this.rtcPeers.get(clientPeerId);
    if (
      cur &&
      cur.pc.connectionState !== 'failed' &&
      cur.pc.connectionState !== 'closed' &&
      cur.pc.iceConnectionState !== 'failed' &&
      cur.pc.iceConnectionState !== 'disconnected'
    ) {
      return;
    }
    const bundle = this.createRtcPeerBundle(clientPeerId);
    if (!bundle) return;
    try {
      const dcFast = bundle.pc.createDataChannel('fast', { ordered: false, maxRetransmits: 0 });
      const dcRel = bundle.pc.createDataChannel('rel', { ordered: true });
      this.bindRtcChannel(clientPeerId, bundle, dcFast);
      this.bindRtcChannel(clientPeerId, bundle, dcRel);

      bundle.pc
        .createOffer()
        .then((offer) => bundle.pc.setLocalDescription(offer).then(() => offer))
        .then((offer) => {
          if (this.rtcPeers.get(clientPeerId) === bundle && this.bus) {
            this.bus.send(clientPeerId, { type: '__rtc', sdp: { type: offer.type, sdp: offer.sdp } });
          }
        })
        .catch(() => {
          // fallback seamlessly to MQTT
        });
    } catch {
      // fallback seamlessly to MQTT
    }
  }

  private handleRtcSignal(
    fromPeerId: string,
    sig: { type: '__rtc'; sdp?: RTCSessionDescriptionInit; cand?: RTCIceCandidateInit }
  ): void {
    if (typeof RTCPeerConnection === 'undefined') return;
    let bundle = this.rtcPeers.get(fromPeerId);

    if (sig.sdp) {
      if (sig.sdp.type === 'offer' && this.role === 'client') {
        bundle = this.createRtcPeerBundle(fromPeerId) || undefined;
        if (!bundle) return;
        const bRef = bundle;
        bRef.pc
          .setRemoteDescription(sig.sdp)
          .then(async () => {
            bRef.remoteDescSet = true;
            for (const c of bRef.pendingCands.splice(0)) {
              if (!c?.candidate) continue;
              try {
                await bRef.pc.addIceCandidate(c);
              } catch {
                // ignore
              }
            }
            const ans = await bRef.pc.createAnswer();
            await bRef.pc.setLocalDescription(ans);
            if (this.rtcPeers.get(fromPeerId) === bRef && this.bus) {
              this.bus.send(fromPeerId, { type: '__rtc', sdp: { type: ans.type, sdp: ans.sdp } });
            }
          })
          .catch(() => {
            // fallback to MQTT
          });
      } else if (sig.sdp.type === 'answer' && this.role === 'host' && bundle) {
        const bRef = bundle;
        bRef.pc
          .setRemoteDescription(sig.sdp)
          .then(async () => {
            bRef.remoteDescSet = true;
            for (const c of bRef.pendingCands.splice(0)) {
              if (!c?.candidate) continue;
              try {
                await bRef.pc.addIceCandidate(c);
              } catch {
                // ignore
              }
            }
          })
          .catch(() => {
            // fallback to MQTT
          });
      }
      return;
    }

    if (sig.cand?.candidate && bundle) {
      if (bundle.remoteDescSet) {
        bundle.pc.addIceCandidate(sig.cand).catch(() => {});
      } else {
        bundle.pendingCands.push(sig.cand);
      }
    }
  }

  private sendRawPingPong(
    peerId: string,
    pkt: { type: '__ping'; t0: number } | { type: '__pong'; t0: number }
  ): void {
    const b = this.rtcPeers.get(peerId);
    if (b?.dcFast && b.dcFast.readyState === 'open' && b.dcFast.bufferedAmount <= 24_576) {
      try {
        b.dcFast.send(JSON.stringify({ f: this.myPeerId, m: pkt }));
        return;
      } catch {
        // fallback to MQTT
      }
    }
    this.bus?.send(peerId, pkt);
  }

  private trySendOverRtc(peerId: string, msg: DuelNetMessage): boolean {
    if (
      msg.type === 'lobby_state' ||
      msg.type === 'join_req' ||
      msg.type === 'join_ack' ||
      msg.type === 'ready_toggle'
    ) {
      return false;
    }
    const b = this.rtcPeers.get(peerId);
    if (!b) return false;
    const isSnap = isFastPvpSnapshot(msg);
    const ch = isSnap ? b.dcFast : b.dcRel;
    if (!ch || ch.readyState !== 'open') return false;
    if (ch.bufferedAmount > 32_768) {
      return isSnap;
    }
    try {
      ch.send(JSON.stringify({ f: this.myPeerId, m: msg }));
      return true;
    } catch {
      return false;
    }
  }

  public sendFastSnapshot(msg: DuelNetMessage): void {
    const peerId = this.role === 'client' ? this.hostPeerId : this.opponentPeerId;
    if (!peerId || !this.bus) return;
    if (this.trySendOverRtc(peerId, msg)) return;
    if (!this.bus.isCongested()) {
      this.bus.send(peerId, msg);
    }
  }

  public sendReliable(msg: DuelNetMessage): void {
    const peerId = this.role === 'client' ? this.hostPeerId : this.opponentPeerId;
    if (!peerId || !this.bus) return;
    // Send critical reliable duel events over BOTH RTC reliable channel (instant) and MQTT bus (redundant delivery; receiver deduplicates by mSeq/state)
    const sentRtc = this.trySendOverRtc(peerId, msg);
    if (!sentRtc || msg.type === 'pvp_finish' || msg.type === 'return_lobby') {
      this.bus.send(peerId, msg);
    }
  }

  public broadcastLobby(): void {
    if (this.role !== 'host' || !this.lobby) return;
    PlatformSDK.showInviteButton(
      this.lobby.roomCode,
      !this.lobby.inGame && this.lobby.members.length < 2
    );
    this.bus?.send('*', { type: 'lobby_state', lobby: this.lobby });
  }

  private notifyLobby(): void {
    this.onLobbyChangeCb?.();
  }
}

export const DuelManager = new DuelNetworkManager();
