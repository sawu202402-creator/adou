import { BossArchetype, EnemyKind, GameMode, PvPRaidKind, UnitId } from '../types';

export type DuelRole = 'solo' | 'host' | 'client';
export type DuelNetStatus = 'offline' | 'connecting' | 'ready' | 'error';
export type DuelEmoteKey = 'salute' | 'praise' | 'charge' | 'hold';

export interface DuelMember {
  peerId: string;
  slot: 1 | 2;
  callsign: string;
  ready: boolean;
  rankLvl: number;
}

export interface DuelLobbyState {
  roomCode: string;
  hostPeerId: string;
  stageId: string;
  mode: GameMode;
  isPublic: boolean;
  inGame: boolean;
  matchSeq: number;
  matchSeed: number;
  members: DuelMember[];
}

export interface PublicDuelRoomEntry {
  roomCode: string;
  hostPeerId: string;
  hostCallsign: string;
  stageId: string;
  mode: GameMode;
  memberCount: number;
  inGame: boolean;
  updatedAt: number;
}

export type DirectoryWireMessage =
  | {
      type: 'room_announce';
      room: Omit<PublicDuelRoomEntry, 'updatedAt'>;
    }
  | {
      type: 'room_close';
      roomCode: string;
    }
  | {
      type: 'room_query';
    };

/**
 * Compact tuple for each placed unit on the sender's bottom half (`rows 5..9, cols 0..7`):
 * `[uid, unitId, tier, combatLevel, anchorCol, anchorRow, secCol, secRow]`
 */
export type PvpUnitTuple = [
  number,
  UnitId,
  number,
  number,
  number,
  number,
  number,
  number,
];

/**
 * Compact tuple for each live enemy on the sender's bottom lane:
 * `[id, kind, bossType, wpIdx, segProg1000, hp, maxHp, spd100, flags]`
 * where `flags`: bit0 = isBoss, bit1 = isMiniBoss, bit2 = slow, bit3 = stun, bit4 = burn, bit5 = armorBroken
 */
export type PvpEnemyTuple = [
  number,
  EnemyKind,
  BossArchetype,
  number,
  number,
  number,
  number,
  number,
  number,
];

export interface PvpSyncPayload {
  mSeq: number;
  wave: number;
  hearts: number;
  maxHearts: number;
  barHp: number;
  barMaxHp: number;
  kills: number;
  merges: number;
  /** Bitmask or list of `col + (row - 5) * 8` (`0..39`) unlocked `'deploy'` cells on sender's half */
  dug: number[];
  units: PvpUnitTuple[];
  foes: PvpEnemyTuple[];
}

export type DuelNetMessage =
  | {
      type: 'join_req';
      callsign: string;
      rankLvl: number;
    }
  | {
      type: 'join_ack';
      accepted: boolean;
      reason?: 'full' | 'in_game';
      assignedSlot?: 1 | 2;
      lobby?: DuelLobbyState;
    }
  | {
      type: 'lobby_state';
      lobby: DuelLobbyState;
    }
  | {
      type: 'ready_toggle';
      ready: boolean;
      callsign: string;
      rankLvl: number;
    }
  | {
      type: 'start_duel';
      stageId: string;
      mode: GameMode;
      matchSeq: number;
      matchSeed: number;
      lobby: DuelLobbyState;
    }
  | {
      type: 'return_lobby';
      lobby: DuelLobbyState;
    }
  | {
      type: 'leave_room';
    }
  | {
      type: 'pvp_sync';
      s: PvpSyncPayload;
    }
  | {
      type: 'pvp_raid';
      mSeq: number;
      raid: PvPRaidKind;
      senderCallsign: string;
    }
  | {
      type: 'pvp_awaken';
      mSeq: number;
      unitId: UnitId;
    }
  | {
      type: 'pvp_emote';
      mSeq: number;
      emote: DuelEmoteKey;
    }
  | {
      type: 'pvp_finish';
      mSeq: number;
      outcome: 'i_lost_ko' | 'i_won_race';
      wave: number;
      kills: number;
      merges: number;
    };

export function isFastPvpSnapshot(msg: DuelNetMessage): boolean {
  return msg.type === 'pvp_sync';
}

/** Deterministic fast 32-bit PRNG (Mulberry32) so both players roll identical wave compositions & match heroes! */
export function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
