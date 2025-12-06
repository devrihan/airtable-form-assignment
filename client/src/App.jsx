import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Builder from './pages/Builder';
import Viewer from './pages/Viewer';
import Responses from './pages/Responses'; // Import the new page
import Login from './pages/Login'; // Assuming you have this

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/builder" element={<Builder />} />
        
        {/* Public View Route */}
        <Route path="/viewer/:id" element={<Viewer />} />
        
        {/* Admin Responses Route */}
        <Route path="/responses/:id" element={<Responses />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;