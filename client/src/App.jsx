import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import Transactions from './pages/Transactions';
import Addresses from './pages/Addresses';
import AddressDetail from './pages/AddressDetail';
import TransactionDetail from './pages/TransactionDetail';
import Query from './pages/Query';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/events" element={<Events />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/addresses" element={<Addresses />} />
        <Route path="/address/:address" element={<AddressDetail />} />
        <Route path="/tx/:txHash" element={<TransactionDetail />} />
        <Route path="/query" element={<Query />} />
      </Routes>
    </Layout>
  );
}

export default App;

