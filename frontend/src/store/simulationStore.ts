import { create } from "zustand";
import { WS_BASE_URL } from "../lib/constants";
import { CandidateMaterial } from "../lib/api";

export type PageId =
  | "mission-control"
  | "molecule-lab"
  | "voltage-explorer"
  | "noise-lab"
  | "candidate-ranking"
  | "active-learning"
  | "fault-tolerant"
  | "battery-twin"
  | "about-methodology";

export interface VQETelemetryStep {
  iteration: number;
  energy: number;
  best_energy: number;
  energy_error_mHa: number;
  theta: number[];
  grad_norm?: number;
}

export interface ExplainContext {
  title: string;
  category: string;
  summary: string;
  physicsDetails: string[];
  honestLimits: string;
}

interface SimulationState {
  activePage: PageId;
  setActivePage: (page: PageId) => void;

  // Global Pipeline stage state
  activePipelineStage: string | null;
  setActivePipelineStage: (stage: string | null) => void;

  // Command Palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // Explain Drawer
  explainDrawerOpen: boolean;
  explainContent: ExplainContext | null;
  openExplain: (content: ExplainContext) => void;
  closeExplain: () => void;

  // Live VQE WebSocket stream
  isVQEStreaming: boolean;
  vqeStreamHistory: VQETelemetryStep[];
  vqeExactEnergy: number | null;
  vqeOptimalResult: { energy: number; theta: number[]; error_mHa: number } | null;
  startVQEStream: (distance: number, optimizer?: string) => void;
  stopVQEStream: () => void;

  // Synced Cathode Voltage (from Voltage Explorer to Battery Twin)
  simulatedCathodeVoltage: number;
  setSimulatedCathodeVoltage: (v: number) => void;

  // Candidate Materials
  candidates: CandidateMaterial[];
  setCandidates: (candidates: CandidateMaterial[]) => void;
  weights: { w_capacity: number; w_voltage: number; w_volume: number; w_barrier: number };
  setWeights: (w: { w_capacity: number; w_voltage: number; w_volume: number; w_barrier: number }) => void;
}

let activeSocket: WebSocket | null = null;

export const useSimulationStore = create<SimulationState>((set, get) => ({
  activePage: "mission-control",
  setActivePage: (page) => set({ activePage: page }),

  activePipelineStage: null,
  setActivePipelineStage: (stage) => set({ activePipelineStage: stage }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  explainDrawerOpen: false,
  explainContent: null,
  openExplain: (content) => set({ explainDrawerOpen: true, explainContent: content }),
  closeExplain: () => set({ explainDrawerOpen: false }),

  isVQEStreaming: false,
  vqeStreamHistory: [],
  vqeExactEnergy: null,
  vqeOptimalResult: null,

  startVQEStream: (distance: number, optimizer: string = "BFGS") => {
    if (activeSocket) {
      activeSocket.close();
      activeSocket = null;
    }

    set({
      isVQEStreaming: true,
      vqeStreamHistory: [],
      vqeExactEnergy: null,
      vqeOptimalResult: null,
      activePipelineStage: "solve",
    });

    try {
      const ws = new WebSocket(WS_BASE_URL);
      activeSocket = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            system: "h2",
            distance,
            optimizer,
            maxiter: 25,
          })
        );
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "start") {
          set({ vqeExactEnergy: data.exact_energy });
        } else if (data.type === "step") {
          set((state) => ({
            vqeStreamHistory: [
              ...state.vqeStreamHistory,
              {
                iteration: data.iteration,
                energy: data.energy,
                best_energy: data.best_energy,
                energy_error_mHa: data.energy_error_mHa,
                theta: data.theta,
                grad_norm: data.grad_norm,
              },
            ],
          }));
        } else if (data.type === "done") {
          set({
            isVQEStreaming: false,
            activePipelineStage: null,
            vqeOptimalResult: {
              energy: data.optimal_energy,
              theta: data.optimal_theta,
              error_mHa: data.final_error_mHa,
            },
          });
          if (activeSocket) {
            activeSocket.close();
            activeSocket = null;
          }
        }
      };

      ws.onerror = () => {
        set({ isVQEStreaming: false, activePipelineStage: null });
      };

      ws.onclose = () => {
        set({ isVQEStreaming: false, activePipelineStage: null });
        activeSocket = null;
      };
    } catch {
      set({ isVQEStreaming: false, activePipelineStage: null });
    }
  },

  stopVQEStream: () => {
    if (activeSocket) {
      activeSocket.close();
      activeSocket = null;
    }
    set({ isVQEStreaming: false, activePipelineStage: null });
  },

  simulatedCathodeVoltage: 3.85,
  setSimulatedCathodeVoltage: (v) => set({ simulatedCathodeVoltage: v }),

  candidates: [],
  setCandidates: (candidates) => set({ candidates }),
  weights: { w_capacity: 0.35, w_voltage: 0.25, w_volume: 0.2, w_barrier: 0.2 },
  setWeights: (weights) => set({ weights }),
}));
