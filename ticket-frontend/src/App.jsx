// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router";
import { WagmiClientProvider } from "./providers/WagmiProvider";
import "@rainbow-me/rainbowkit/styles.css";
import Navbar from "./components/Navbar";
import ListingPage from "./pages/ListingPage";
// import HomePage from './pages/HomePage';

function App() {
  return (
    <WagmiClientProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 w-full flex flex-col">
          <Navbar />
          <Routes>
            <Route path="/" element={<ListingPage />} />
            {/* <Route path="/create-listing" element={<ListingPage />} /> */}
            {/* Add other routes as you build more pages */}
          </Routes>
        </div>
      </Router>
    </WagmiClientProvider>
  );
}

export default App;
