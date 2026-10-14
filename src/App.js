import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './Pages/Login';
import Middleware from './Middleware';
import Dashboard from './Pages/Dashboard';
import ErrorPage from './ErrorPage';
import LaporanStockGreige from './Pages/LaporanStockGreige';
import LaporanStockGreigePrint from './Pages/Print/LaporanStockGreigePrint';
import LaporanStockOpname from './Pages/LaporanStockOpname';
import LaporanStockOpnamePrint from './Pages/Print/LaporanStockOpnamePrint';
import LaporanStockGreigePerMotif from './Pages/LaporanStockGreigePerMotif';
import StockGreigeDaily from './Pages/StockGreigeDaily';


const App = () => {
  return (
    <Router>
      <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/error" element={<ErrorPage />} />
          <Route path="/" element={<Middleware><Dashboard /></Middleware>} />

          <Route path="/laporan-stock-greige" element={<Middleware><LaporanStockGreige/></Middleware>} />
          <Route path="/laporan-stock-greige-motif" element={<Middleware><LaporanStockGreigePerMotif/></Middleware>} />
          <Route path="/laporan-stock-greige/print" element={<Middleware><LaporanStockGreigePrint/></Middleware>} />
          <Route path="/laporan-stock-opname" element={<Middleware><LaporanStockOpname/></Middleware>} />
          <Route path="/laporan-stock-opname/print" element={<Middleware><LaporanStockOpnamePrint/></Middleware>} />
          <Route path="/stock-greige-daily" element={<Middleware><StockGreigeDaily/></Middleware>} />


      </Routes>
    </Router>
  );
};

export default App;

