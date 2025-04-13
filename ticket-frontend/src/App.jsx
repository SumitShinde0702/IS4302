// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router";
import { WagmiClientProvider } from "./providers/WagmiProvider";
import "@rainbow-me/rainbowkit/styles.css";
import Navbar from "./components/Navbar";
import ListingPage from "./pages/ListingPage";
import HomePage from './pages/HomePage';
import UseTicketsPage from './pages/UseTickets';
import ResaleListingPage from './pages/ResaleListingPage';
import RefundPage from './pages/RefundPage';

function App() {
  return (
    <WagmiClientProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 w-full flex flex-col">
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/create-listing" element={<ListingPage />} />
            <Route path="/create-resale-listing" element={<ResaleListingPage />} />
            <Route path="/use-tickets" element={<UseTicketsPage />} />
            <Route path="/refund" element={<RefundPage />} />
            {/* Add other routes as you build more pages */}
          </Routes>
        </div>
      </Router>
    </WagmiClientProvider>
  );
}

export default App;
