export const API_BASE_URL = "http://127.0.0.1:8001/api";
export const WS_BASE_URL = "ws://127.0.0.1:8001/ws/vqe";

export const THEME_COLORS = {
  bg: "#0B1220",
  card: "#111B30",
  cardHover: "#16223D",
  border: "#1E2B44",
  borderActive: "#2A3C5E",
  text: "#E6EDF7",
  muted: "#9FB3CC",
  cyan: "#22D3EE",
  cyanDark: "#0891B2",
  magenta: "#E879F9",
  magentaDark: "#C026D3",
  amber: "#FBBF24",
  amberDark: "#D97706",
  emerald: "#34D399",
  rose: "#FB7185",
};

export const PIPELINE_STAGES = [
  { id: "ingest", name: "1. Ingest", desc: "Crystal structures & DFT active-space integrals" },
  { id: "downfold", name: "2. Downfold", desc: "Effective low-energy Hubbard & molecular MOs" },
  { id: "encode", name: "3. Encode", desc: "Jordan-Wigner fermion-to-qubit mapping" },
  { id: "solve", name: "4. Quantum Solve", desc: "VQE execution with UCCD & HVA ansätze" },
  { id: "mitigate", name: "5. Mitigate", desc: "Depolarizing noise & Richardson ZNE extrapolation" },
  { id: "rank", name: "6. Rank", desc: "Electrochemical OCV & Pareto candidate screening" },
];
