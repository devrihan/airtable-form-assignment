import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Builder from './pages/Builder';
import Viewer from './pages/Viewer';
import Responses from './pages/Responses'; 
import Login from './pages/Login'; 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/builder" element={<Builder />} />
        
        <Route path="/viewer/:id" element={<Viewer />} />
        
        <Route path="/responses/:id" element={<Responses />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;