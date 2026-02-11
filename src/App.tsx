import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProductProvider } from './context/ProductContext';
import { SimulationProvider } from './context/SimulationContext';
import CommandCenter from './views/CommandCenter';
import ComponentDeepDive from './views/ComponentDeepDive';
import ScenarioSimulator from './views/ScenarioSimulator';
import ShouldCostSimulator from './views/ShouldCostSimulator';
import NegotiationWorkspace from './views/NegotiationWorkspace';
import SavingsAttribution from './views/SavingsAttribution';
import AgentOrchestra from './views/AgentOrchestra';
import DataSources from './views/DataSources';
import DataSync from './views/DataSync';

function App() {
  return (
    <Router>
      <ProductProvider>
        <SimulationProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/command-center" replace />} />
            <Route path="/command-center" element={<CommandCenter />} />
            <Route path="/should-cost" element={<ShouldCostSimulator />} />
            <Route path="/negotiation" element={<NegotiationWorkspace />} />
            <Route path="/savings" element={<SavingsAttribution />} />
            <Route path="/agent-orchestrator" element={<AgentOrchestra />} />
            <Route path="/component-deep-dive/:componentId" element={<ComponentDeepDive />} />
            <Route path="/data-sources" element={<DataSources />} />
            <Route path="/data-sync" element={<DataSync />} />
            <Route path="/scenarios" element={<ScenarioSimulator />} />
            <Route path="*" element={<Navigate to="/command-center" replace />} />
          </Routes>
        </SimulationProvider>
      </ProductProvider>
    </Router>
  );
};

export default App;
