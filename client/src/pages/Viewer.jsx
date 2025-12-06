import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { shouldShowQuestion } from "../utils/logicEngine";

const Viewer = () => {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  

  const [uploading, setUploading] = useState(false);


  const CLOUD_NAME = "dv50sgdmf"; 
  const UPLOAD_PRESET = "unsigned_preset"; 


  useEffect(() => {
    axios.get(`http://localhost:5000/api/forms/${id}`)
      .then((res) => setForm(res.data))
      .catch((err) => console.error(err));
  }, [id]);

  const handleChange = (key, value) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };


  const handleFileUpload = async (questionKey, e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET); 

    try {
      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
        formData
      );

      const fileUrl = res.data.secure_url;
      console.log("Uploaded successfully:", fileUrl);

      const airtableAttachmentFormat = [{ url: fileUrl }];
      setAnswers(prev => ({ ...prev, [questionKey]: airtableAttachmentFormat }));
      
    } catch (error) {
      console.error("Upload failed", error);
      alert("File upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (uploading) {
      alert("Please wait for the file to finish uploading.");
      return;
    }
    try {
      await axios.post(`http://localhost:5000/api/forms/${id}/submit`, { answers });
      setSubmitted(true);
    } catch (err) {
      alert("Submission Failed");
    }
  };

  if (!form) return <div style={{padding:20}}>Loading...</div>;
  if (submitted) return <div style={{padding:40, textAlign:'center'}}><h2>✅ Application Sent!</h2></div>;

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 20, border: '1px solid #ddd' }}>
      <h1>{form.title}</h1>
      <form onSubmit={handleSubmit}>
        {form.fields.map((field) => {
          const isVisible = shouldShowQuestion(field.conditionalRules, answers);
          if (!isVisible) return null;

          return (
            <div key={field.questionKey} style={{ marginBottom: 20 }}>
              <label style={{display:'block', fontWeight:'bold'}}>
                {field.label} {field.required && <span style={{color:'red'}}>*</span>}
              </label>

              {field.type === "singleLineText" && (
                <input
                  type="text"
                  required={field.required}
                  style={{width:'100%', padding:8}}
                  onChange={(e) => handleChange(field.questionKey, e.target.value)}
                />
              )}

              {field.type === "singleSelect" && (
                <select
                  required={field.required}
                  style={{width:'100%', padding:8}}
                  onChange={(e) => handleChange(field.questionKey, e.target.value)}
                >
                  <option value="">Select...</option>
                  {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              )}

              {field.type === "url" && (
                <input
                  type="url"
                  placeholder="https://..."
                  required={field.required}
                  style={{width:'100%', padding:8}}
                  onChange={(e) => handleChange(field.questionKey, e.target.value)}
                />
              )}

              {field.type === "multipleAttachments" && (
                <div>
                  <input
                    type="file"
                    required={field.required && !answers[field.questionKey]} 
                    disabled={uploading}
                    onChange={(e) => handleFileUpload(field.questionKey, e)}
                  />
                  {uploading && <span style={{marginLeft:10, color:'blue'}}>Uploading...</span>}
                  
                  {answers[field.questionKey] && (
                    <div style={{color:'green', fontSize:'0.9em', marginTop:5}}>
                      ✓ File attached ready for submission
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        
        <button 
          type="submit" 
          disabled={uploading}
          style={{
            padding:'10px 20px', 
            background: uploading ? '#ccc' : 'blue', 
            color:'white', 
            border:'none',
            cursor: uploading ? 'not-allowed' : 'pointer'
          }}
        >
          {uploading ? "Uploading File..." : "Submit Application"}
        </button>
      </form>
    </div>
  );
};

export default Viewer;
