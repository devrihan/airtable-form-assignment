import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Use relative URL so Vercel proxy handles it
  const API_URL = ""; 

  useEffect(() => {
    axios.get(`${API_URL}/api/forms`, { withCredentials: true })
      .then((res) => {
        setForms(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading your forms...</div>;

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: 20 }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <h1 style={{ margin: 0 }}>My Forms</h1>
        <Link to="/builder">
          <button className="btn-primary" style={{ textDecoration: 'none' }}>
            + Create New Form
          </button>
        </Link>
      </div>

      {/* FORMS LIST */}
      {forms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, background: 'white', borderRadius: 12, boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
          <h3>No forms yet!</h3>
          <p style={{ color: '#666' }}>Create your first form to get started.</p>
          <Link to="/builder">
            <button className="btn-primary" style={{ marginTop: 10 }}>Create Form</button>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          {forms.map((form) => (
            <div key={form._id} style={{ 
              background: 'white', 
              padding: 20, 
              borderRadius: 12, 
              boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0' }}>{form.title || "Untitled Form"}</h3>
                <small style={{ color: '#888' }}>
                  Created: {new Date(form.createdAt).toLocaleDateString()}
                </small>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                {/* View Live Form */}
                <Link to={`/viewer/${form._id}`} target="_blank">
                  <button style={{ 
                    padding: '8px 12px', 
                    background: 'white', 
                    border: '1px solid #ddd', 
                    borderRadius: 6,
                    cursor: 'pointer'
                  }}>
                    View ↗
                  </button>
                </Link>

                {/* View Responses */}
                <Link to={`/responses/${form._id}`}>
                  <button style={{ 
                    padding: '8px 12px', 
                    background: '#eff6ff', 
                    color: '#2563eb', 
                    border: 'none', 
                    borderRadius: 6, 
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}>
                    Responses
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;