// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import { useParams } from "react-router-dom";
// const API_URL = "";

// const Responses = () => {
//   const { id } = useParams();
//   const [responses, setResponses] = useState([]);

//   useEffect(() => {

//     axios.get(`${API_URL}/api/forms/${id}/responses`)
//       .then((res) => setResponses(res.data))
//       .catch((err) => console.error(err));
//   }, [id]);

//   return (
//     <div style={{ padding: 20 }}>
//       <h2>Form Responses</h2>
//       <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse' }}>
//         <thead>
//           <tr>
//             <th>Submitted At</th>
//             <th>Airtable Record ID</th>
//             <th>Answers (JSON)</th>
//           </tr>
//         </thead>
//         <tbody>
//           {responses.map((r) => (
//             <tr key={r._id}>
//               <td>{new Date(r.createdAt).toLocaleString()}</td>
//               <td>{r.airtableRecordId}</td>
//               <td>
//                 <pre style={{fontSize:10}}>{JSON.stringify(r.answers, null, 2)}</pre>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// };

// export default Responses;

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, Link } from "react-router-dom";

const Responses = () => {
  const { id } = useParams();
  const [responses, setResponses] = useState([]);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);

  // Relative URL for Vercel Proxy
  const API_URL = ""; 

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch both the Form (for labels) and the Responses (for data)
        const [formRes, responsesRes] = await Promise.all([
          axios.get(`${API_URL}/api/forms/${id}`),
          axios.get(`${API_URL}/api/forms/${id}/responses`)
        ]);

        setForm(formRes.data);
        setResponses(responsesRes.data);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // --- EXPORT TO CSV FUNCTION ---
  const downloadCSV = () => {
    if (!form || responses.length === 0) return alert("No data to export");

    // 1. Create Headers (Questions)
    const headers = [
      "Submitted At",
      "Airtable Record ID",
      ...form.fields.map(f => `"${f.label.replace(/"/g, '""')}"`) // Escape quotes
    ];

    // 2. Create Rows (Answers)
    const rows = responses.map(r => {
      const rowData = [
        `"${new Date(r.createdAt).toLocaleString()}"`,
        `"${r.airtableRecordId}"`,
        ...form.fields.map(f => {
          let val = r.answers[f.questionKey];
          
          // Handle File Uploads & Arrays (e.g. Multiple Select)
          if (Array.isArray(val)) {
            val = val.map(item => (item && item.url) ? item.url : item).join(", ");
          }
          
          // Handle Text (Escape quotes for CSV)
          if (!val) return '""';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
      ];
      return rowData.join(",");
    });

    // 3. Combine & Download
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${form.title}_responses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- EXPORT TO JSON FUNCTION ---
  const downloadJSON = () => {
    if (!responses.length) return alert("No data to export");
    
    const jsonContent = JSON.stringify(responses, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${form.title}_responses.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading data...</div>;
  if (!form) return <div style={{ padding: 40, textAlign: 'center' }}>Form not found</div>;

  return (
    <div style={{ maxWidth: 1000, margin: '40px auto', padding: 20 }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Link to="/dashboard" style={{ textDecoration: 'none', color: '#666' }}>← Back to Dashboard</Link>
          <h1 style={{ marginTop: 10 }}>{form.title} - Responses</h1>
        </div>
        
        {/* EXPORT BUTTONS */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={downloadCSV} style={{ padding: '10px 15px', background: '#10b981', color: 'white', border: 'none', borderRadius: 6, fontWeight: 'bold' }}>
            Download CSV
          </button>
          <button onClick={downloadJSON} style={{ padding: '10px 15px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, fontWeight: 'bold' }}>
            Download JSON
          </button>
        </div>
      </div>

      {/* DATA TABLE */}
      <div style={{ overflowX: 'auto', background: 'white', borderRadius: 8, boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
          <thead style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: 15, textAlign: 'left', fontSize: 13, color: '#6b7280' }}>Submitted At</th>
              {form.fields.map(f => (
                <th key={f.questionKey} style={{ padding: 15, textAlign: 'left', fontSize: 13, color: '#6b7280' }}>
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {responses.length === 0 ? (
              <tr>
                <td colSpan={form.fields.length + 1} style={{ padding: 30, textAlign: 'center', color: '#888' }}>
                  No responses yet.
                </td>
              </tr>
            ) : (
              responses.map((r) => (
                <tr key={r._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: 15, fontSize: 14 }}>
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  
                  {form.fields.map((f) => {
                    const answer = r.answers[f.questionKey];
                    return (
                      <td key={f.questionKey} style={{ padding: 15, fontSize: 14 }}>
                        {/* Render Arrays/Files nicely */}
                        {Array.isArray(answer) ? (
                          answer.map((item, i) => (
                            <div key={i}>
                              {item.url ? (
                                <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: 'blue' }}>
                                  View File 📎
                                </a>
                              ) : item}
                            </div>
                          ))
                        ) : (
                          // Render simple text
                          String(answer || "-")
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Responses;