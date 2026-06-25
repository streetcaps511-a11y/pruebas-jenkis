/* === COMPONENTE REUTILIZABLE === 
   Pieza modular de interfaz (como Tarjetas, Modales o Botones). 
   Recibe información a través de 'props' y notifica eventos hacia arriba (a la Página principal). */

import React from 'react';
import { FaIdCard, FaTimes } from "react-icons/fa";
import '../styles/PersonalInfo.css';

const getFormattedPhone = (phone) => {
  if (!phone) return "—";
  const cleanPhone = String(phone).replace(/\D/g, '');
  return cleanPhone;
};

const cleanPhoneForInput = (value) => {
  if (!value) return '';
  const clean = String(value).replace(/\D/g, '');
  if (clean.startsWith('57') && clean.length > 10) {
    return clean.substring(2);
  }
  return clean;
};

const PersonalInfo = ({ isEditing, handleEditClick, handleSaveClick, handleChange, formData, errors = {}, setIsEditing }) => {
  const formatDocTypeLabel = (val) => {
    const map = {
      'Cédula de Ciudadanía': 'CC',
      'Cédula de Extranjería': 'CE',
      'Permiso Especial (PEP)': 'PEP',
      'Permiso Temporal (PPT)': 'PPT',
      'Pasaporte': 'Pasaporte',
      'NIT': 'NIT',
      'Tarjeta de Identidad': 'TI'
    };
    return map[val] || val;
  };

  return (
    <div className="gm-personal-info-card">
      <div className="gm-section-header">
        <div className="gm-section-title-wrapper">
          <FaIdCard color="#FFC107" size={20} />
          <h3 className="gm-section-title">Información Personal</h3>
        </div>
        {!isEditing && (
          <button 
            onClick={handleEditClick} 
            className="gm-edit-btn"
          >
            Editar datos
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="gm-form-container">
          <div className="gm-form-grid">
            {/* Tipo de Documento */}
            <div className="gm-form-group">
              <label className="gm-form-label">Tipo de Documento</label>
              <select
                name="documentType"
                value={formData.documentType || ''}
                onChange={handleChange}
                className={`gm-form-select ${errors.documentType ? 'error' : ''}`}
              >
                <option value="">Seleccione...</option>
                {["Cédula de Ciudadanía", "Tarjeta de Identidad", "Cédula de Extranjería", "NIT", "Pasaporte", "Permiso Especial (PEP)"].map(opt => (
                  <option key={opt} value={opt}>
                    {formatDocTypeLabel(opt)}
                  </option>
                ))}
              </select>
              {errors.documentType && <span className="gm-field-error">{errors.documentType}</span>}
            </div>

            {/* Número de Documento */}
            <div className="gm-form-group">
              <label className="gm-form-label">Número de Documento</label>
              <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  name="documentNumber"
                  value={formData.documentNumber || ''}
                  onChange={(e) => {
                    const onlyNums = e.target.value.replace(/\D/g, '').slice(0, 15);
                    handleChange({ target: { name: 'documentNumber', value: onlyNums } });
                  }}
                  className={`gm-form-input ${errors.documentNumber ? 'error' : ''}`}
                  placeholder="Número de Documento"
                />
                {formData.documentNumber && (
                  <button
                    type="button"
                    className="gm-clear-input-btn"
                    onClick={() => handleChange({ target: { name: 'documentNumber', value: '' } })}
                    tabIndex={-1}
                  >
                    <FaTimes />
                  </button>
                )}
                {errors.documentNumber && (
                  <span className="gm-field-error" style={{position: 'absolute', bottom: '-20px'}}>{errors.documentNumber}</span>
                )}
              </div>
            </div>

            {/* Nombre */}
            <div className="gm-form-group">
              <label className="gm-form-label">Nombre</label>
              <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleChange}
                  className={`gm-form-input ${errors.name ? 'error' : ''}`}
                  placeholder="Nombre"
                />
                {formData.name && (
                  <button
                    type="button"
                    className="gm-clear-input-btn"
                    onClick={() => handleChange({ target: { name: 'name', value: '' } })}
                    tabIndex={-1}
                  >
                    <FaTimes />
                  </button>
                )}
                {errors.name && (
                  <span className="gm-field-error" style={{position: 'absolute', bottom: '-20px'}}>{errors.name}</span>
                )}
              </div>
            </div>

            {/* Teléfono */}
            <div className="gm-form-group">
              <label className="gm-form-label">Teléfono</label>
              <div style={{ display: 'flex', gap: '8px', position: 'relative', width: '100%', alignItems: 'center' }}>
                <div style={{ flex: '0 0 90px' }}>
                  <select
                    name="countryCode"
                    value={formData.countryCode || '+57'}
                    onChange={handleChange}
                    className="gm-form-select"
                    style={{ padding: '0 8px' }}
                  >
                    <option value="+57">🇨🇴 +57</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+34">🇪🇸 +34</option>
                    <option value="+52">🇲🇽 +52</option>
                    <option value="+54">🇦🇷 +54</option>
                    <option value="+56">🇨🇱 +56</option>
                    <option value="+51">🇵🇪 +51</option>
                    <option value="+58">🇻🇪 +58</option>
                    <option value="+507">🇵🇦 +507</option>
                    <option value="+55">🇧🇷 +55</option>
                    <option value="+593">🇪🇨 +593</option>
                    <option value="+591">🇧🇴 +591</option>
                    <option value="+598">🇺🇾 +598</option>
                    <option value="+595">🇵🇾 +595</option>
                    <option value="+506">🇨🇷 +506</option>
                    <option value="+502">🇬🇹 +502</option>
                    <option value="+504">🇭🇳 +504</option>
                    <option value="+503">🇸🇻 +503</option>
                    <option value="+505">🇳🇮 +505</option>
                  </select>
                </div>
                <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    name="phone"
                    value={cleanPhoneForInput(formData.phone)}
                    onChange={handleChange}
                    className={`gm-form-input ${errors.phone ? 'error' : ''}`}
                    placeholder="Número"
                  />
                  {formData.phone && (
                    <button
                      type="button"
                      className="gm-clear-input-btn"
                      onClick={() => handleChange({ target: { name: 'phone', value: '' } })}
                      tabIndex={-1}
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
                {errors.phone && (
                  <span className="gm-field-error" style={{position: 'absolute', bottom: '-20px'}}>{errors.phone}</span>
                )}
              </div>
            </div>

            {/* Email (Cuenta) */}
            <div className="gm-form-group">
              <label className="gm-form-label">Email (Cuenta)</label>
              <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  className={`gm-form-input ${errors.email ? 'error' : ''}`}
                  placeholder="ejemplo@gmail.com"
                />
                {formData.email && (
                  <button
                    type="button"
                    className="gm-clear-input-btn"
                    onClick={() => handleChange({ target: { name: 'email', value: '' } })}
                    tabIndex={-1}
                  >
                    <FaTimes />
                  </button>
                )}
                {errors.email && (
                  <span className="gm-field-error" style={{position: 'absolute', bottom: '-20px'}}>{errors.email}</span>
                )}
              </div>
            </div>

            {/* Ciudad */}
            <div className="gm-form-group">
              <label className="gm-form-label">Ciudad</label>
              <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  name="city"
                  value={formData.city || ''}
                  onChange={handleChange}
                  className={`gm-form-input ${errors.city ? 'error' : ''}`}
                  placeholder="Ciudad"
                />
                {formData.city && (
                  <button
                    type="button"
                    className="gm-clear-input-btn"
                    onClick={() => handleChange({ target: { name: 'city', value: '' } })}
                    tabIndex={-1}
                  >
                    <FaTimes />
                  </button>
                )}
                {errors.city && (
                  <span className="gm-field-error" style={{position: 'absolute', bottom: '-20px'}}>{errors.city}</span>
                )}
              </div>
            </div>

            {/* Dirección */}
            <div className="gm-form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="gm-form-label">Dirección</label>
              <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  name="address"
                  value={formData.address || ''}
                  onChange={handleChange}
                  className={`gm-form-input ${errors.address ? 'error' : ''}`}
                  placeholder="Dirección"
                />
                {formData.address && (
                  <button
                    type="button"
                    className="gm-clear-input-btn"
                    onClick={() => handleChange({ target: { name: 'address', value: '' } })}
                    tabIndex={-1}
                  >
                    <FaTimes />
                  </button>
                )}
                {errors.address && (
                  <span className="gm-field-error" style={{position: 'absolute', bottom: '-20px'}}>{errors.address}</span>
                )}
              </div>
            </div>
          </div>
          <div className="gm-form-actions">
            <button onClick={handleSaveClick} className="gm-save-btn">Guardar Cambios</button>
            <button onClick={() => setIsEditing(false)} className="gm-cancel-btn">Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="gm-info-grid">
          <div className="gm-info-item">
            <label className="gm-info-label">Tipo de Documento</label>
            <div className="gm-info-value">{formatDocTypeLabel(formData.documentType) || "—"}</div>
          </div>
          <div className="gm-info-item">
            <label className="gm-info-label">Número de Documento</label>
            <div className="gm-info-value">{formData.documentNumber || "—"}</div>
          </div>
          <div className="gm-info-item">
            <label className="gm-info-label">Nombre completo</label>
            <div className="gm-info-value">{formData.name || "—"}</div>
          </div>
          <div className="gm-info-item">
            <label className="gm-info-label">Teléfono</label>
            <div className="gm-info-value">{getFormattedPhone(formData.phone) || "—"}</div>
          </div>
          <div className="gm-info-item">
            <label className="gm-info-label">Correo Electrónico</label>
            <div className="gm-info-value">{formData.email || "—"}</div>
          </div>
          <div className="gm-info-item">
            <label className="gm-info-label">Ciudad</label>
            <div className="gm-info-value">{formData.city || "—"}</div>
          </div>
          <div className="gm-info-item" style={{ gridColumn: '1 / -1' }}>
            <label className="gm-info-label">Dirección completa</label>
            <div className="gm-info-value">{formData.address || "—"}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalInfo;
