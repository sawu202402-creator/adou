import './style.css';
import { Assets } from './game/AssetLoader';
import { GameEngine } from './game/GameEngine';
import { BoardRenderer } from './game/Renderer';
import { SaveManager } from './meta/SaveManager';
import { DuelManager } from './net/DuelManager';
import { PlatformSDK } from './platform/PlatformSDK';
import { UIManager } from './ui/UIManager';

async function bootstrap() {
  PlatformSDK.loadingStart();
  SaveManager.load();
  await Assets.preloadAll();

  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const uiLayer = document.getElementById('ui-layer') as HTMLElement;
  const ctx = canvas.getContext('2d', { alpha: false })!;

  let viewW = window.innerWidth;
  let viewH = window.innerHeight;

  const resize = () => {
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, viewW > 1440 ? 1.35 : 1.75);
    canvas.width = Math.floor(viewW * dpr);
    canvas.height = Math.floor(viewH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  window.addEventListener('resize', resize);
  resize();

  let ui!: UIManager;
  const renderer = new BoardRenderer();

  const engine = new GameEngine(canvas, {
    onTogglePause: () => ui.togglePauseModal(),
    onRequestRevive: (canRevive) => ui.showReviveModal(canRevive),
    onRunFinished: (victory, summary) => ui.showSettlementModal(victory, summary),
    onRequestShovelAd: () => ui.promptShovelAd(),
  });

  ui = new UIManager(uiLayer, engine);

  DuelManager.bindCallbacks({
    onLobbyChange: () => ui.refreshDuelHubIfVisible(),
    onNetStatsChange: () => ui.refreshDuelHubIfVisible(),
    onPublicRoomsChange: () => ui.refreshDuelHubIfVisible(),
    onDuelStart: (stageId, mode, matchSeed, matchSeq, lobby) => {
      ui.startPvpDuelRun(stageId, mode, matchSeed, matchSeq, lobby);
    },
    onGameMessage: (msg) => {
      engine.handlePvpNetMessage(msg);
    },
    onPeerDisconnected: (oppName) => {
      engine.handleOpponentDisconnectedInPvp(oppName);
    },
    onReturnLobby: () => {
      if (!engine.state || engine.state.wavePhase === 'ended') {
        ui.openDuelLobbyTab();
      }
    },
  });

  await PlatformSDK.init((adPaused) => {
    engine.paused = adPaused;
    if (adPaused) {
      engine.drag = null;
    }
  });
  PlatformSDK.loadingStop();

  // Live CrazyGames friend-list Join Room listener
  PlatformSDK.registerJoinRoomListener((inviteCode) => {
    ui.joinDuelRoomFromInvite(inviteCode);
  });

  // Instant Join on boot via ?room=CODE or CrazyGames.SDK.game.inviteParams
  const bootInviteCode = PlatformSDK.consumeInviteRoomCode();
  if (bootInviteCode) {
    ui.joinDuelRoomFromInvite(bootInviteCode);
  } else if (PlatformSDK.isInstantMultiplayerRequested()) {
    ui.openDuelLobbyTab();
    DuelManager.quickMatchOrCreate('hulao', 'standard');
  } else {
    ui.showHomeHub();
  }

  let lastTime = performance.now();
  let hudTick = 0;

  const loop = (now: number) => {
    requestAnimationFrame(loop);

    const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;

    try {
      if (engine.state) {
        engine.update(dt, viewW, viewH);
        renderer.render(ctx, engine, viewW, viewH, dt);
        hudTick += dt;
        if (hudTick >= 0.08) {
          hudTick = 0;
          ui.syncHUD();
        }
      }
    } catch (err) {
      console.error('[GameLoop Recovered]', err);
    }
  };

  requestAnimationFrame(loop);
}

bootstrap();
