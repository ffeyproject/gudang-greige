import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './Pages/Login';
import Middleware from './Middleware';
import Dashboard from './Pages/Dashboard';
import ErrorPage from './ErrorPage';
import LaporanStockGreige from './Pages/LaporanStockGreige';
import LaporanStockGreigePrint from './Pages/Print/LaporanStockGreigePrint';


const App = () => {
  return (
    <Router>
      <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/error" element={<ErrorPage />} />
          <Route path="/" element={<Middleware><Dashboard /></Middleware>} />

          <Route path="/laporan-stock-greige" element={<Middleware><LaporanStockGreige/></Middleware>} />
          <Route path="/laporan-stock-greige/print" element={<Middleware><LaporanStockGreigePrint/></Middleware>} />

      </Routes>
    </Router>
  );
};

export default App;

