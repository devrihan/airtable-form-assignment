import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
const API_URL = "";

const Builder = () => {
  const [bases, setBases] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedBase, setSelectedBase] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [availableFields, setAvailableFields] = useState([]);
  const [formFields, setFormFields] = useState([]);
  const navigate = useNavigate();

  const api = axios.create({ baseURL: `${API_URL}/api`, withCredentials: true });

  useEffect(() => {
    api.get('/forms/bases').then(res => setBases(res.data));
  }, []);

  const handleBaseChange = async (e) => {
    const baseId = e.target.value;
    setSelectedBase(baseId);
    const res = await api.get(`/forms/bases/${baseId}/tables`);
    setTables(res.data);
  };

  const handleTableChange = (e) => {
    const tableId = e.target.value;
    setSelectedTable(tableId);
    const table = tables.find(t => t.id === tableId);
    setAvailableFields(table.fields);
  };

  const addFieldToForm = (field) => {
    let extractedOptions = [];
    if (field.options && field.options.choices) {
      extractedOptions = field.options.choices.map(c => c.name);
    }
    setFormFields([...formFields, {
      questionKey: field.id,
      airtableFieldId: field.id,
      label: field.name,
      type: field.type,
      required: false,
      options: extractedOptions,
      conditionalRules: { logic: 'AND', conditions: [] }
    }]);
  };

  const updateFieldProperty = (index, key, value) => {
    const updated = [...formFields];
    updated[index][key] = value;
    setFormFields(updated);
  };

  const addCondition = (index) => {
    const updated = [...formFields];
    updated[index].conditionalRules.conditions.push({ questionKey: '', operator: 'equals', value: '' });
    setFormFields(updated);
  };

  const updateCondition = (fieldIndex, condIndex, key, val) => {
    const updated = [...formFields];
    updated[fieldIndex].conditionalRules.conditions[condIndex][key] = val;
    setFormFields(updated);
  };

  const saveForm = async () => {
    try {
      const res = await api.post('/forms', {
        baseId: selectedBase,
        tableId: selectedTable,
        title: "My Job Application",
        fields: formFields
      });
      navigate(`/viewer/${res.data._id}`);
    } catch(e) { alert("Error saving"); }
  };

  return (
    <div className="builder-layout">

      <div className="builder-sidebar">
        <h2 style={{marginTop:0}}>Form Builder</h2>
        
        <div className="sidebar-section">
          <div className="sidebar-title">1. Connect Airtable</div>
          <select onChange={handleBaseChange}>
            <option>Select Base</option>
            {bases.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select onChange={handleTableChange} disabled={!selectedBase}>
            <option>Select Table</option>
            {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {availableFields.length > 0 && (
          <div className="sidebar-section">
            <div className="sidebar-title">2. Add Fields</div>
            {availableFields.map(f => (
              <div key={f.id} className="field-pill">
                <span>{f.name}</span>
                <button className="btn-primary btn-sm" onClick={() => addFieldToForm(f)}>Add</button>
              </div>
            ))}
          </div>
        )}
      </div>


      <div className="builder-canvas">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20}}>
          <h2 style={{margin:0}}>Form Preview</h2>
          <button className="btn-primary" onClick={saveForm} disabled={formFields.length === 0}>
            Save & Publish
          </button>
        </div>

        {formFields.length === 0 && (
          <div style={{textAlign:'center', padding: 50, color:'#9ca3af', border:'2px dashed #e5e7eb', borderRadius: 8}}>
            Select a table from the left, then add fields here.
          </div>
        )}

        {formFields.map((f, i) => (
          <div key={i} className="canvas-field">
            <div className="field-header">
              <div style={{flex: 1}}>
                <label style={{fontSize:12, fontWeight:'bold', color:'#6b7280'}}>LABEL</label>
                <input 
                  value={f.label} 
                  onChange={(e) => updateFieldProperty(i, 'label', e.target.value)}
                  style={{fontWeight:'bold', fontSize:16, marginTop:2}}
                />
              </div>
              <div style={{textAlign:'right'}}>
                <span className="field-type-badge">{f.type}</span>
                <div style={{marginTop:5}}>
                  <label style={{fontSize:13}}>
                    <input 
                      type="checkbox" 
                      checked={f.required} 
                      onChange={(e) => updateFieldProperty(i, 'required', e.target.checked)} 
                      style={{width:'auto', marginRight:5}}
                    /> Required
                  </label>
                </div>
              </div>
            </div>


            <div className="logic-section">
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <strong style={{fontSize:13}}>Conditional Logic</strong>
                <button className="btn-sm" onClick={() => addCondition(i)} style={{background:'#fff', border:'1px solid #ddd'}}>+ Rule</button>
              </div>
              
              {f.conditionalRules.conditions.length === 0 && <p style={{fontSize:12, color:'#9ca3af', margin:'5px 0 0'}}>Always visible</p>}

              {f.conditionalRules.conditions.map((c, ci) => (
                <div key={ci} className="logic-row">
                  <span style={{fontSize:12}}>Show if:</span>
                  <select onChange={(e) => updateCondition(i, ci, 'questionKey', e.target.value)} style={{width:'auto', flex:1}}>
                    <option value="">Select Field...</option>
                    {formFields.map(prev => <option key={prev.questionKey} value={prev.questionKey}>{prev.label}</option>)}
                  </select>
                  <select onChange={(e) => updateCondition(i, ci, 'operator', e.target.value)} style={{width:'auto'}}>
                    <option value="equals">Equals</option>
                    <option value="notEquals">Not Equals</option>
                  </select>
                  <input placeholder="Value" onChange={(e) => updateCondition(i, ci, 'value', e.target.value)} style={{flex:1}} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Builder;