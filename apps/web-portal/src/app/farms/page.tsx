'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Loader from '@/components/Loader';

export default function FarmsAndAnimals() {
  const [activeTab, setActiveTab] = useState<'farms' | 'animals'>('farms');
  const [farms, setFarms] = useState<any[]>([]);
  const [animals, setAnimals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected Detail views
  const [selectedFarm, setSelectedFarm] = useState<any | null>(null);
  const [selectedAnimal, setSelectedAnimal] = useState<any | null>(null);

  // Form Modals
  const [farmForm, setFarmForm] = useState<any | null>(null); // { id?, name, ownerName, address, contactNumber, location }
  const [animalForm, setAnimalForm] = useState<any | null>(null); // { id?, tagNumber, name, species, breed, gender, age, weight, farmId, status }
  const [treatmentForm, setTreatmentForm] = useState<any | null>(null); // { drugName, dosage, administrationDate, withdrawalPeriod }
  const [vaccinationForm, setVaccinationForm] = useState<any | null>(null); // { vaccineName, vaccinationDate, nextDueDate }
  const [healthForm, setHealthForm] = useState<any | null>(null); // { diseases, diagnosis, treatmentNotes, date }

  // Refresh lists
  const refreshData = async () => {
    setLoading(true);
    try {
      const farmsRes = await apiFetch('/farms');
      const animalsRes = await apiFetch('/animals');
      setFarms(farmsRes);
      setAnimals(animalsRes);

      // Refresh selected items if open
      if (selectedFarm) {
        const updatedFarm = farmsRes.find((f: any) => f.id === selectedFarm.id);
        if (updatedFarm) {
          const detail = await apiFetch(`/farms/${updatedFarm.id}`);
          setSelectedFarm(detail);
        }
      }
      if (selectedAnimal) {
        const detail = await apiFetch(`/animals/${selectedAnimal.id}`);
        setSelectedAnimal(detail);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Handlers
  const handleSaveFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (farmForm.id) {
        await apiFetch(`/farms/${farmForm.id}`, {
          method: 'PUT',
          body: JSON.stringify(farmForm),
        });
      } else {
        await apiFetch('/farms', {
          method: 'POST',
          body: JSON.stringify(farmForm),
        });
      }
      setFarmForm(null);
      refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteFarm = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this farm? All associated animal records will be affected.')) return;
    try {
      await apiFetch(`/farms/${id}`, { method: 'DELETE' });
      if (selectedFarm?.id === id) setSelectedFarm(null);
      refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveAnimal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (animalForm.id) {
        await apiFetch(`/animals/${animalForm.id}`, {
          method: 'PUT',
          body: JSON.stringify(animalForm),
        });
      } else {
        await apiFetch('/animals', {
          method: 'POST',
          body: JSON.stringify(animalForm),
        });
      }
      setAnimalForm(null);
      refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteAnimal = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this animal profile?')) return;
    try {
      await apiFetch(`/animals/${id}`, { method: 'DELETE' });
      if (selectedAnimal?.id === id) setSelectedAnimal(null);
      refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/treatments', {
        method: 'POST',
        body: JSON.stringify({
          ...treatmentForm,
          animalId: selectedAnimal.id,
        }),
      });
      setTreatmentForm(null);
      refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddVaccination = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/vaccinations', {
        method: 'POST',
        body: JSON.stringify({
          ...vaccinationForm,
          animalId: selectedAnimal.id,
        }),
      });
      setVaccinationForm(null);
      refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddHealthRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/health-records', {
        method: 'POST',
        body: JSON.stringify({
          ...healthForm,
          animalId: selectedAnimal.id,
        }),
      });
      setHealthForm(null);
      refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading && farms.length === 0) {
    return <Loader message="Loading farm and livestock data..." />;
  }

  if (error) {
    return (
      <div style={{ padding: '24px', background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <i className="fa fa-exclamation-circle" style={{ fontSize: '2rem' }}></i>
        <div>
          <h3 style={{ borderBottom: 'none', paddingBottom: '4px', marginBottom: 0, color: '#991b1b' }}>Error Loading Data</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in delay-1">
      {/* Header Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', marginBottom: '24px', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '24px' }}>
          <button 
            onClick={() => { setActiveTab('farms'); setSelectedFarm(null); setSelectedAnimal(null); }}
            style={{
              fontSize: '1.1rem',
              fontWeight: activeTab === 'farms' ? 600 : 500,
              color: activeTab === 'farms' ? 'var(--accent-primary)' : 'var(--text-muted)',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              position: 'relative',
              paddingBottom: '8px',
            }}
          >
            Farms Directory
            {activeTab === 'farms' && <span style={{ position: 'absolute', bottom: -13, left: 0, right: 0, height: '2px', background: 'var(--accent-primary)' }}></span>}
          </button>
          <button 
            onClick={() => { setActiveTab('animals'); setSelectedFarm(null); setSelectedAnimal(null); }}
            style={{
              fontSize: '1.1rem',
              fontWeight: activeTab === 'animals' ? 600 : 500,
              color: activeTab === 'animals' ? 'var(--accent-primary)' : 'var(--text-muted)',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              position: 'relative',
              paddingBottom: '8px',
            }}
          >
            Livestock Registry
            {activeTab === 'animals' && <span style={{ position: 'absolute', bottom: -13, left: 0, right: 0, height: '2px', background: 'var(--accent-primary)' }}></span>}
          </button>
        </div>

        <div>
          {activeTab === 'farms' ? (
            <button 
              onClick={() => setFarmForm({ name: '', ownerName: '', address: '', contactNumber: '', location: '' })}
              style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
            >
              <i className="fa fa-plus"></i> Add Farm
            </button>
          ) : (
            <button 
              onClick={() => setAnimalForm({ tagNumber: '', name: '', species: 'CATTLE', breed: '', gender: 'FEMALE', age: '', weight: '', farmId: farms[0]?.id || '', status: 'HEALTHY' })}
              style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
            >
              <i className="fa fa-plus"></i> Register Animal
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'farms' && !selectedFarm && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {farms.map((farm) => (
            <div 
              key={farm.id} 
              className="glass-panel" 
              onClick={async () => {
                const detail = await apiFetch(`/farms/${farm.id}`);
                setSelectedFarm(detail);
              }}
              style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ border: 'none', padding: 0, margin: 0, fontSize: '1.2rem' }}>{farm.name}</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setFarmForm(farm); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <i className="fa fa-edit"></i>
                  </button>
                  <button 
                    onClick={(e) => handleDeleteFarm(farm.id, e)}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                  >
                    <i className="fa fa-trash"></i>
                  </button>
                </div>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <div><i className="fa fa-user" style={{ width: '18px' }}></i> Owner: {farm.ownerName}</div>
                <div><i className="fa fa-map-marker" style={{ width: '18px' }}></i> {farm.address}</div>
                <div><i className="fa fa-phone" style={{ width: '18px' }}></i> {farm.contactNumber}</div>
              </div>
              <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600 }}>
                <span>Registered Herd:</span>
                <span style={{ color: 'var(--accent-primary)' }}>{farm._count?.animals || 0} animals</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Farm Detail View */}
      {activeTab === 'farms' && selectedFarm && (
        <div className="animate-fade-in">
          <button 
            onClick={() => setSelectedFarm(null)} 
            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 600, cursor: 'pointer', marginBottom: '16px' }}
          >
            <i className="fa fa-arrow-left"></i> Back to Farms Directory
          </button>
          
          <div className="glass-panel" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2>{selectedFarm.name}</h2>
                <p style={{ color: 'var(--text-muted)' }}>{selectedFarm.address} • Location: {selectedFarm.location}</p>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <strong>Contact:</strong> {selectedFarm.contactNumber}
              </div>
            </div>
          </div>

          <h3>Animals Registered at {selectedFarm.name}</h3>
          <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            {selectedFarm.animals.length === 0 ? (
              <p style={{ padding: '24px', color: 'var(--text-muted)', textAlign: 'center' }}>No animals registered to this farm yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid var(--border-light)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px' }}>RFID Tag</th>
                    <th style={{ padding: '12px 16px' }}>Name</th>
                    <th style={{ padding: '12px 16px' }}>Species/Breed</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>MRL Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedFarm.animals.map((ani: any) => (
                    <tr 
                      key={ani.id} 
                      onClick={async () => {
                        const detail = await apiFetch(`/animals/${ani.id}`);
                        setSelectedAnimal(detail);
                        setActiveTab('animals');
                      }}
                      style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{ani.tagNumber}</td>
                      <td style={{ padding: '12px 16px' }}>{ani.name}</td>
                      <td style={{ padding: '12px 16px' }}>{ani.species} ({ani.breed})</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`badge ${ani.status === 'HEALTHY' ? 'success' : 'warning'}`}>{ani.status}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`badge ${ani.mrlStatus === 'CLEARED' ? 'success' : ani.mrlStatus === 'CLEARING_SOON' ? 'warning' : 'danger'}`}>
                          {ani.mrlStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Livestock Animals List */}
      {activeTab === 'animals' && !selectedAnimal && (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          {animals.length === 0 ? (
            <p style={{ padding: '24px', color: 'var(--text-muted)', textAlign: 'center' }}>No animals registered in the system.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid var(--border-light)', textAlign: 'left' }}>
                  <th style={{ padding: '14px 16px' }}>RFID Tag</th>
                  <th style={{ padding: '14px 16px' }}>Name</th>
                  <th style={{ padding: '14px 16px' }}>Species & Breed</th>
                  <th style={{ padding: '14px 16px' }}>Farm</th>
                  <th style={{ padding: '14px 16px' }}>Status</th>
                  <th style={{ padding: '14px 16px' }}>MRL Compliance</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {animals.map((ani) => (
                  <tr 
                    key={ani.id} 
                    onClick={async () => {
                      const detail = await apiFetch(`/animals/${ani.id}`);
                      setSelectedAnimal(detail);
                    }}
                    style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-light)', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{ani.tagNumber}</td>
                    <td style={{ padding: '14px 16px' }}>{ani.name}</td>
                    <td style={{ padding: '14px 16px' }}>{ani.species} • {ani.breed}</td>
                    <td style={{ padding: '14px 16px' }}>{ani.farm?.name}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${ani.status === 'HEALTHY' ? 'success' : 'warning'}`}>{ani.status}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${ani.mrlStatus === 'CLEARED' ? 'success' : ani.mrlStatus === 'CLEARING_SOON' ? 'warning' : 'danger'}`}>
                        {ani.mrlStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => setAnimalForm(ani)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginRight: '10px' }}
                      >
                        <i className="fa fa-edit"></i>
                      </button>
                      <button 
                        onClick={(e) => handleDeleteAnimal(ani.id, e)}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                      >
                        <i className="fa fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Selected Animal Profile (Medical history, Treatment, Vaccinations) */}
      {activeTab === 'animals' && selectedAnimal && (
        <div className="animate-fade-in">
          <button 
            onClick={() => setSelectedAnimal(null)} 
            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 600, cursor: 'pointer', marginBottom: '16px' }}
          >
            <i className="fa fa-arrow-left"></i> Back to Animal Registry
          </button>

          {/* Animal Identity Header */}
          <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>ANIMAL NAME / RFID</span>
              <h2 style={{ border: 'none', margin: 0, padding: 0 }}>{selectedAnimal.name}</h2>
              <code style={{ fontSize: '1rem', color: 'var(--accent-primary)', fontWeight: 600 }}>{selectedAnimal.tagNumber}</code>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>SPECIES & BREED</span>
              <div style={{ fontWeight: 600, fontSize: '1.05rem', marginTop: '4px' }}>{selectedAnimal.species} ({selectedAnimal.breed})</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selectedAnimal.gender} • {selectedAnimal.age} months</div>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>LOCATION / WEIGHT</span>
              <div style={{ fontWeight: 600, fontSize: '1.05rem', marginTop: '4px' }}><i className="fa fa-home"></i> {selectedAnimal.farm?.name}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Weight: {selectedAnimal.weight} kg</div>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>MRL STATUS</span>
              <span className={`badge ${selectedAnimal.mrlStatus === 'CLEARED' ? 'success' : selectedAnimal.mrlStatus === 'CLEARING_SOON' ? 'warning' : 'danger'}`} style={{ fontSize: '0.9rem', padding: '6px 12px' }}>
                {selectedAnimal.mrlStatus.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* Quick Actions for Animal */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <button 
              onClick={() => setHealthForm({ diseases: '', diagnosis: '', treatmentNotes: '', date: '' })}
              style={{ padding: '8px 16px', background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
            >
              <i className="fa fa-stethoscope"></i> Log Diagnosis
            </button>
            <button 
              onClick={() => setTreatmentForm({ drugName: '', dosage: '', administrationDate: '', withdrawalPeriod: '' })}
              style={{ padding: '8px 16px', background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
            >
              <i className="fa fa-medkit"></i> Record Treatment (AMU)
            </button>
            <button 
              onClick={() => setVaccinationForm({ vaccineName: '', vaccinationDate: '', nextDueDate: '' })}
              style={{ padding: '8px 16px', background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
            >
              <i className="fa fa-shield"></i> Add Vaccination
            </button>
          </div>

          {/* Medical Logs Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
            {/* Health Records */}
            <div className="glass-panel">
              <h3>Health History</h3>
              {selectedAnimal.healthRecords.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No medical logs found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedAnimal.healthRecords.map((hr: any) => (
                    <div key={hr.id} style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                        <span>{hr.diseases} ({hr.diagnosis})</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(hr.date).toLocaleDateString()}</span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>{hr.treatmentNotes}</p>
                      <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '4px' }}>Vet: {hr.veterinarianName}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Treatment & Antimicrobial Usage */}
            <div className="glass-panel">
              <h3>Antimicrobial Treatments (AMU)</h3>
              {selectedAnimal.treatments.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No antimicrobial usage logged.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedAnimal.treatments.map((tr: any) => (
                    <div key={tr.id} style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                        <span>{tr.drugName} ({tr.dosage})</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(tr.administrationDate).toLocaleDateString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '6px' }}>
                        <span>Withdrawal Period:</span>
                        <strong>{tr.withdrawalPeriod} days</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--danger)' }}>
                        <span>Completion Date:</span>
                        <strong>{new Date(tr.withdrawalCompletionDate).toLocaleDateString()}</strong>
                      </div>
                      <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '4px' }}>Vet: {tr.veterinarianName}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Vaccinations */}
            <div className="glass-panel">
              <h3>Vaccination Log</h3>
              {selectedAnimal.vaccinations.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No vaccinations recorded.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedAnimal.vaccinations.map((vac: any) => (
                    <div key={vac.id} style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                        <span>{vac.vaccineName}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(vac.vaccinationDate).toLocaleDateString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--warning)', marginTop: '6px' }}>
                        <span>Next Due Date:</span>
                        <strong>{new Date(vac.nextDueDate).toLocaleDateString()}</strong>
                      </div>
                      <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '4px' }}>Vet: {vac.veterinarianName}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================== MODAL DIALOGS ==================================== */}

      {/* Farm Form Modal */}
      {farmForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={handleSaveFarm} className="glass-panel" style={{ width: '90%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3>{farmForm.id ? 'Edit Farm' : 'Add New Farm'}</h3>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Farm Name</label>
              <input type="text" required value={farmForm.name} onChange={(e) => setFarmForm({ ...farmForm, name: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Owner Name</label>
              <input type="text" required value={farmForm.ownerName} onChange={(e) => setFarmForm({ ...farmForm, ownerName: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Address</label>
              <input type="text" required value={farmForm.address} onChange={(e) => setFarmForm({ ...farmForm, address: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Contact Number</label>
              <input type="text" required value={farmForm.contactNumber} onChange={(e) => setFarmForm({ ...farmForm, contactNumber: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Geographic Coordinates (Location)</label>
              <input type="text" required placeholder="e.g. 45.4215, -75.6972" value={farmForm.location} onChange={(e) => setFarmForm({ ...farmForm, location: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button type="button" onClick={() => setFarmForm(null)} style={{ padding: '8px 16px', background: 'none', border: '1px solid var(--border-light)', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Save Farm</button>
            </div>
          </form>
        </div>
      )}

      {/* Animal Form Modal */}
      {animalForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={handleSaveAnimal} className="glass-panel" style={{ width: '90%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3>{animalForm.id ? 'Edit Animal Details' : 'Register Animal'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Tag (RFID)</label>
                <input type="text" required disabled={!!animalForm.id} value={animalForm.tagNumber} onChange={(e) => setAnimalForm({ ...animalForm, tagNumber: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Name</label>
                <input type="text" required value={animalForm.name} onChange={(e) => setAnimalForm({ ...animalForm, name: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Species</label>
                <select value={animalForm.species} onChange={(e) => setAnimalForm({ ...animalForm, species: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                  <option value="CATTLE">Cattle</option>
                  <option value="SHEEP">Sheep</option>
                  <option value="PIG">Pig</option>
                  <option value="GOAT">Goat</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Breed</label>
                <input type="text" required value={animalForm.breed} onChange={(e) => setAnimalForm({ ...animalForm, breed: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Gender</label>
                <select value={animalForm.gender} onChange={(e) => setAnimalForm({ ...animalForm, gender: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Age (months)</label>
                <input type="number" required value={animalForm.age} onChange={(e) => setAnimalForm({ ...animalForm, age: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Weight (kg)</label>
                <input type="number" required value={animalForm.weight} onChange={(e) => setAnimalForm({ ...animalForm, weight: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Farm Location</label>
                <select value={animalForm.farmId} onChange={(e) => setAnimalForm({ ...animalForm, farmId: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                  {farms.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Health Status</label>
                <select value={animalForm.status} onChange={(e) => setAnimalForm({ ...animalForm, status: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
                  <option value="HEALTHY">Healthy</option>
                  <option value="UNDER_TREATMENT">Under Treatment</option>
                  <option value="QUARANTINED">Quarantined</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button type="button" onClick={() => setAnimalForm(null)} style={{ padding: '8px 16px', background: 'none', border: '1px solid var(--border-light)', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Save Animal</button>
            </div>
          </form>
        </div>
      )}

      {/* Health Record Diagnosis Modal */}
      {healthForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={handleAddHealthRecord} className="glass-panel" style={{ width: '90%', maxWidth: '460px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3>Log Health Issue & Diagnosis</h3>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Disease / Symptom</label>
              <input type="text" required placeholder="e.g. Mastitis, Bovine respiratory disease" value={healthForm.diseases} onChange={(e) => setHealthForm({ ...healthForm, diseases: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Diagnosis Details</label>
              <input type="text" required placeholder="Detailed clinical observations" value={healthForm.diagnosis} onChange={(e) => setHealthForm({ ...healthForm, diagnosis: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Treatment & Prescription Notes</label>
              <textarea placeholder="e.g. Prescribed antibiotic administration..." value={healthForm.treatmentNotes} onChange={(e) => setHealthForm({ ...healthForm, treatmentNotes: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)', minHeight: '80px', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Date</label>
              <input type="date" value={healthForm.date} onChange={(e) => setHealthForm({ ...healthForm, date: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button type="button" onClick={() => setHealthForm(null)} style={{ padding: '8px 16px', background: 'none', border: '1px solid var(--border-light)', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Log Record</button>
            </div>
          </form>
        </div>
      )}

      {/* AMU Treatment Record Modal */}
      {treatmentForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={handleAddTreatment} className="glass-panel" style={{ width: '90%', maxWidth: '460px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3>Record Antimicrobial Treatment (AMU)</h3>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Antimicrobial / Drug Name</label>
              <input type="text" required placeholder="e.g. Penicillin G, Tetracycline" value={treatmentForm.drugName} onChange={(e) => setTreatmentForm({ ...treatmentForm, drugName: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Dosage</label>
              <input type="text" required placeholder="e.g. 10 mL IM, 500mg daily" value={treatmentForm.dosage} onChange={(e) => setTreatmentForm({ ...treatmentForm, dosage: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Administration Date</label>
                <input type="date" value={treatmentForm.administrationDate} onChange={(e) => setTreatmentForm({ ...treatmentForm, administrationDate: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Withdrawal (Days)</label>
                <input type="number" required placeholder="MRL Limit" value={treatmentForm.withdrawalPeriod} onChange={(e) => setTreatmentForm({ ...treatmentForm, withdrawalPeriod: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }} />
              </div>
            </div>
            <div style={{ padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
              ⚠️ Logging this treatment will recalculate MRL and assign a "DO NOT SELL" lock on this animal profile.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button type="button" onClick={() => setTreatmentForm(null)} style={{ padding: '8px 16px', background: 'none', border: '1px solid var(--border-light)', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Record Log</button>
            </div>
          </form>
        </div>
      )}

      {/* Vaccination Record Modal */}
      {vaccinationForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={handleAddVaccination} className="glass-panel" style={{ width: '90%', maxWidth: '460px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3>Log Vaccination</h3>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Vaccine Name</label>
              <input type="text" required placeholder="e.g. Bovi-Shield FP 5, Bovilis" value={vaccinationForm.vaccineName} onChange={(e) => setVaccinationForm({ ...vaccinationForm, vaccineName: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Administration Date</label>
                <input type="date" value={vaccinationForm.vaccinationDate} onChange={(e) => setVaccinationForm({ ...vaccinationForm, vaccinationDate: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '4px' }}>Next Due Date</label>
                <input type="date" required value={vaccinationForm.nextDueDate} onChange={(e) => setVaccinationForm({ ...vaccinationForm, nextDueDate: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button type="button" onClick={() => setVaccinationForm(null)} style={{ padding: '8px 16px', background: 'none', border: '1px solid var(--border-light)', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Add Log</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
