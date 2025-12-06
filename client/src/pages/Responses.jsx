import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
const API_URL = import.meta.env.VITE_API_URL;

const Responses = () => {
  const { id } = useParams();
  const [responses, setResponses] = useState([]);

  useEffect(() => {

    axios.get(`${API_URL}/api/forms/${id}/responses`)
      .then((res) => setResponses(res.data))
      .catch((err) => console.error(err));
  }, [id]);

  return (
    <div style={{ padding: 20 }}>
      <h2>Form Responses</h2>
      <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Submitted At</th>
            <th>Airtable Record ID</th>
            <th>Answers (JSON)</th>
          </tr>
        </thead>
        <tbody>
          {responses.map((r) => (
            <tr key={r._id}>
              <td>{new Date(r.createdAt).toLocaleString()}</td>
              <td>{r.airtableRecordId}</td>
              <td>
                <pre style={{fontSize:10}}>{JSON.stringify(r.answers, null, 2)}</pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Responses;