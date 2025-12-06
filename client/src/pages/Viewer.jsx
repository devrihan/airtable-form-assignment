

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { shouldShowQuestion } from "../utils/logicEngine";

const Viewer = () => {
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  
  // New state to track upload status
  const [uploading, setUploading] = useState(false);

  // --- CONFIGURATION ---
  // REPLACE THESE WITH YOUR ACTUAL CLOUDINARY DETAILS
  const CLOUD_NAME = "dv50sgdmf"; 
  const UPLOAD_PRESET = "unsigned_preset"; 
  // ---------------------

  useEffect(() => {
    axios.get(`http://localhost:5000/api/forms/${id}`)
      .then((res) => setForm(res.data))
      .catch((err) => console.error(err));
  }, [id]);

  const handleChange = (key, value) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  // --- NEW: HANDLE FILE UPLOAD ---
  const handleFileUpload = async (questionKey, e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET); 

    try {
      // Upload to Cloudinary
      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto//upload`,
        formData
      );

      // Get the URL
      const fileUrl = res.data.secure_url;
      console.log("Uploaded successfully:", fileUrl);

      // Format for Airtable (Must be an array of objects with a 'url' property)
      const airtableAttachmentFormat = [{ url: fileUrl }];

      // Save to answers
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

              {/* Text Input */}
              {field.type === "singleLineText" && (
                <input
                  type="text"
                  required={field.required}
                  style={{width:'100%', padding:8}}
                  onChange={(e) => handleChange(field.questionKey, e.target.value)}
                />
              )}

              {/* Select Input */}
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

              {/* URL Input */}
              {field.type === "url" && (
                <input
                  type="url"
                  placeholder="https://..."
                  required={field.required}
                  style={{width:'100%', padding:8}}
                  onChange={(e) => handleChange(field.questionKey, e.target.value)}
                />
              )}

              {/* FILE UPLOAD INPUT */}
              {field.type === "multipleAttachments" && (
                <div>
                  <input
                    type="file"
                    required={field.required && !answers[field.questionKey]} // Only required if not already uploaded
                    disabled={uploading}
                    onChange={(e) => handleFileUpload(field.questionKey, e)}
                  />
                  {uploading && <span style={{marginLeft:10, color:'blue'}}>Uploading...</span>}
                  
                  {/* Show success message if uploaded */}
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

// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import { useParams } from "react-router-dom";
// import { shouldShowQuestion } from "../utils/logicEngine";

// const Viewer = () => {
//   const { id } = useParams();
//   const [form, setForm] = useState(null);
//   const [answers, setAnswers] = useState({});
//   const [submitted, setSubmitted] = useState(false);
//   const [uploading, setUploading] = useState(false);
//   const [uploadError, setUploadError] = useState(null);

//   // --- CONFIG ---
//   const CLOUD_NAME = "dv50sgdmf"; 
//   const UPLOAD_PRESET = "unsigned_preset"; 

//   useEffect(() => {
//     axios.get(`http://localhost:5000/api/forms/${id}`)
//       .then((res) => setForm(res.data))
//       .catch((err) => console.error(err));
//   }, [id]);

//   const handleChange = (key, value) => {
//     setAnswers(prev => ({ ...prev, [key]: value }));
//   };

//   const handleFileUpload = async (questionKey, e) => {
//     const file = e.target.files[0];
//     if (!file) return;

//     setUploading(true);
//     setUploadError(null);

//     const formData = new FormData();
//     formData.append("file", file);
//     formData.append("upload_preset", UPLOAD_PRESET); 

//     try {
//       const res = await axios.post(
//         `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
//         formData
//       );
      
//       const fileUrl = res.data.secure_url;
//       setAnswers(prev => ({ ...prev, [questionKey]: [{ url: fileUrl }] }));
//     } catch (error) {
//       console.error("Upload failed", error);
//       setUploadError("Upload failed. Try again.");
//     } finally {
//       setUploading(false);
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (uploading) return;
//     try {
//       await axios.post(`http://localhost:5000/api/forms/${id}/submit`, { answers });
//       setSubmitted(true);
//     } catch (err) {
//       alert("Submission Failed");
//     }
//   };

//   if (!form) return <div className="form-container" style={{textAlign:'center'}}>Loading...</div>;
  
//   if (submitted) return (
//     <div className="form-container" style={{textAlign:'center'}}>
//       <div style={{fontSize: 50, marginBottom: 20}}>🎉</div>
//       <h2 className="form-title">Application Received!</h2>
//       <p style={{color:'#666'}}>Thank you for applying. We will review your resume shortly.</p>
//     </div>
//   );

//   return (
//     <div className="form-container">
//       <h1 className="form-title">{form.title}</h1>
      
//       <form onSubmit={handleSubmit}>
//         {form.fields.map((field) => {
//           const isVisible = shouldShowQuestion(field.conditionalRules, answers);
//           if (!isVisible) return null;

//           return (
//             <div key={field.questionKey} className="form-group">
//               <label className="form-label">
//                 {field.label} {field.required && <span className="required-star">*</span>}
//               </label>

//               {/* TEXT INPUT */}
//               {field.type === "singleLineText" && (
//                 <input
//                   type="text"
//                   className="form-input"
//                   required={field.required}
//                   placeholder="Type your answer..."
//                   onChange={(e) => handleChange(field.questionKey, e.target.value)}
//                 />
//               )}

//               {/* DROPDOWN */}
//               {field.type === "singleSelect" && (
//                 <select
//                   className="form-select"
//                   required={field.required}
//                   onChange={(e) => handleChange(field.questionKey, e.target.value)}
//                 >
//                   <option value="">Select an option...</option>
//                   {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
//                 </select>
//               )}

//               {/* URL INPUT */}
//               {field.type === "url" && (
//                 <input
//                   type="url"
//                   className="form-input"
//                   placeholder="https://example.com"
//                   required={field.required}
//                   onChange={(e) => handleChange(field.questionKey, e.target.value)}
//                 />
//               )}

//               {/* FILE UPLOAD */}
//               {field.type === "multipleAttachments" && (
//                 <div className="file-upload-box">
//                   <input
//                     type="file"
//                     className="file-input"
//                     disabled={uploading}
//                     required={field.required && !answers[field.questionKey]}
//                     onChange={(e) => handleFileUpload(field.questionKey, e)}
//                   />
                  
//                   {uploading && <div className="status-msg status-uploading">⏳ Uploading file...</div>}
//                   {uploadError && <div className="status-msg status-error">❌ {uploadError}</div>}
//                   {answers[field.questionKey] && (
//                     <div className="status-msg status-success">✅ File Attached! Ready to submit.</div>
//                   )}
//                 </div>
//               )}
//             </div>
//           );
//         })}
        
//         <button 
//           type="submit" 
//           className="submit-btn"
//           disabled={uploading || uploadError}
//         >
//           {uploading ? "Please Wait..." : "Submit Application"}
//         </button>
//       </form>
//     </div>
//   );
// };

// export default Viewer;