import React from "react";
import { useSimulationStore } from "./store/simulationStore";
import { Navbar } from "./components/Layout/Navbar";
import { Sidebar } from "./components/Layout/Sidebar";
import { CommandPalette } from "./components/CommandPalette";
import { ExplainDrawer } from "./components/ExplainDrawer";

import { MissionControl } from "./pages/MissionControl";
import { MoleculeLab } from "./pages/MoleculeLab";
import { VoltageExplorer } from "./pages/VoltageExplorer";
import { NoiseLab } from "./pages/NoiseLab";
import { CandidateRanking } from "./pages/CandidateRanking";
import { ActiveLearning } from "./pages/ActiveLearning";
import { FaultTolerant } from "./pages/FaultTolerant";
import { BatteryDigitalTwin } from "./pages/BatteryDigitalTwin";
import { AboutMethodology } from "./pages/AboutMethodology";

export function App() {
  const { activePage } = useSimulationStore();

  const renderActivePage = () => {
    switch (activePage) {
      case "mission-control":
        return <MissionControl />;
      case "molecule-lab":
        return <MoleculeLab />;
      case "voltage-explorer":
        return <VoltageExplorer />;
      case "noise-lab":
        return <NoiseLab />;
      case "candidate-ranking":
        return <CandidateRanking />;
      case "active-learning":
        return <ActiveLearning />;
      case "fault-tolerant":
        return <FaultTolerant />;
      case "battery-twin":
        return <BatteryDigitalTwin />;
      case "about-methodology":
        return <AboutMethodology />;
      default:
        return <MissionControl />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#E6EDF7] flex flex-col font-sans selection:bg-quantum-cyan/20 selection:text-quantum-cyan">
      {/* Top Navigation */}
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#0B1220]">
          <div className="max-w-7xl mx-auto">
            {renderActivePage()}
          </div>
        </main>
      </div>

      {/* Global Interactive Modals & Drawers */}
      <CommandPalette />
      <ExplainDrawer />
    </div>
  );
}

export default App;
