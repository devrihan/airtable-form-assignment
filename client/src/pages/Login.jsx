import React from 'react';

const Login = () => {
  const handleLogin = () => {
    window.location.href = 'http://localhost:5000/api/auth/airtable';
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