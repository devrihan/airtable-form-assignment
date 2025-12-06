import React from 'react';
const API_URL = import.meta.env.VITE_API_URL;

const Login = () => {
  const handleLogin = () => {
    window.location.href = `${API_URL}/api/auth/airtable`;
  };

  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>Airtable Form Builder</h1>
      <button onClick={handleLogin} style={{ padding: '10px 20px', fontSize: '16px' }}>
        Log in with Airtable
      </button>
    </div>
  );
};

export default Login;