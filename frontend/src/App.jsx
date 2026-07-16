import React, { useState, useEffect } from 'react';
import { 
  Laptop, 
  Plus, 
  Edit2, 
  Copy, 
  Check, 
  Search, 
  X, 
  RefreshCw, 
  Database,
  User,
  Lock,
  ExternalLink,
  Shield,
  Layers,
  FileText
} from 'lucide-react';
import './App.css';

const API_BASE = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

const EQUIPAMENTOS = [
  'SERVIDOR CAIXA',
  'SERVIDOR RETAGUARDA',
  'PDV 1',
  'PDV 2',
  'PDV 3',
  'PDV 4',
  'PDV 5',
  'PDV 6',
  'PDV 7',
  'PDV 8',
  'PDV 9',
  'PDV 10'
];

const SETORES = [
  'PISTA',
  'CONVENIÊNCIA',
  'TROCA DE ÓLEO',
  'RESTAURANTE',
  'ADMINISTRAÇÃO'
];

const SOFTWARES = [
  'ANYDESK',
  'RUSTDESK'
];

function App() {
  // Chatwoot & Context State
  const [chatwootData, setChatwootData] = useState(null);
  const [agentName, setAgentName] = useState('Suporte');
  const [initialCnpj, setInitialCnpj] = useState('');

  // App State
  const [filiais, setFiliais] = useState([]);
  const [selectedCnpj, setSelectedCnpj] = useState('');
  const [selectedFilial, setSelectedFilial] = useState(null);
  const [acessos, setAcessos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Loading & UI States
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [toast, setToast] = useState(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    id: '',
    equipamento: EQUIPAMENTOS[0],
    setor: SETORES[0],
    software: SOFTWARES[0],
    id_acesso: '',
    senha: '',
    usuario: ''
  });

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Copy to clipboard helper
  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copiado para a área de transferência!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 1. Escuta eventos do Chatwoot
  useEffect(() => {
    function handleMessage(event) {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.event === 'appContext' && payload?.data) {
          console.log('Contexto do Chatwoot recebido:', payload.data);
          setChatwootData(payload.data);

          if (payload.data.currentAgent?.name) {
            setAgentName(payload.data.currentAgent.name);
          }

          const cnpjAttr = payload.data.contact?.custom_attributes?.cnpj;
          if (cnpjAttr) {
            const cleanCnpj = cnpjAttr.replace(/\D/g, '');
            setInitialCnpj(cleanCnpj);
            setSelectedCnpj(cleanCnpj);
          }
        }
      } catch (e) {
        // Ignora mensagens que não são JSON
      }
    }

    window.addEventListener('message', handleMessage);

    // Solicita informações ao Chatwoot
    window.parent.postMessage('chatwoot-dashboard-app:fetch-info', '*');

    // Fallback para testes locais
    const urlParams = new URLSearchParams(window.location.search);
    const testCnpj = urlParams.get('cnpj');
    if (testCnpj) {
      const cleanCnpj = testCnpj.replace(/\D/g, '');
      setInitialCnpj(cleanCnpj);
      setSelectedCnpj(cleanCnpj);
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 2. Busca filiais da rede quando o CNPJ inicial muda
  useEffect(() => {
    if (!selectedCnpj) return;

    const fetchFiliaisDaRede = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/filiais-da-rede?cnpj=${selectedCnpj}`);
        if (!response.ok) throw new Error('Erro ao buscar filiais da rede.');
        const data = await response.json();
        setFiliais(data);
        
        // Se a filial atual não estiver na lista de filiais da rede, escolhemos a primeira ou a que bate com o CNPJ
        const matchesCurrent = data.find(f => f.cnpj.replace(/\D/g, '') === selectedCnpj.replace(/\D/g, ''));
        if (matchesCurrent) {
          setSelectedCnpj(matchesCurrent.cnpj);
        } else if (data.length > 0) {
          setSelectedCnpj(data[0].cnpj);
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchFiliaisDaRede();
  }, [initialCnpj]);

  // 3. Busca detalhes da filial e os acessos quando o CNPJ selecionado muda
  useEffect(() => {
    if (!selectedCnpj) return;

    const fetchDetailsAndAcessos = async () => {
      setLoading(true);
      try {
        // Busca Detalhes da Filial
        const resFilial = await fetch(`${API_BASE}/filial/${selectedCnpj}`);
        if (resFilial.ok) {
          const detail = await resFilial.json();
          setSelectedFilial(detail);
        } else {
          setSelectedFilial(null);
        }

        // Busca Acessos
        const resAcessos = await fetch(`${API_BASE}/acessos?cnpj=${selectedCnpj}`);
        if (resAcessos.ok) {
          const accessList = await resAcessos.json();
          setAcessos(accessList);
        } else {
          setAcessos([]);
        }
      } catch (err) {
        showToast('Erro ao atualizar informações da filial.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchDetailsAndAcessos();
  }, [selectedCnpj]);

  // Iniciar formulário de cadastro
  const handleOpenCreateModal = () => {
    setFormData({
      id: '',
      equipamento: EQUIPAMENTOS[0],
      setor: SETORES[0],
      software: SOFTWARES[0],
      id_acesso: '',
      senha: '',
      usuario: ''
    });
    setIsCreateModalOpen(true);
  };

  // Iniciar formulário de edição
  const handleOpenEditModal = (acesso) => {
    setFormData({
      id: acesso.id,
      equipamento: acesso.equipamento || EQUIPAMENTOS[0],
      setor: acesso.setor || SETORES[0],
      software: acesso.software || SOFTWARES[0],
      id_acesso: acesso.id_acesso || '',
      senha: acesso.senha || '',
      usuario: acesso.usuario || ''
    });
    setIsEditModalOpen(true);
  };

  // Cadastrar Acesso
  const handleCreateAcesso = async (e) => {
    e.preventDefault();
    if (!selectedFilial) {
      showToast('Nenhuma filial selecionada.', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/acessos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_filial: selectedFilial.unidade_negocio_id,
          id_rede: selectedFilial.codigo_rede,
          equipamento: formData.equipamento,
          setor: formData.setor,
          software: formData.software,
          id_acesso: formData.id_acesso,
          senha: formData.senha,
          created_by: agentName,
          cnpj: selectedCnpj,
          usuario: formData.usuario
        })
      });

      if (!response.ok) throw new Error('Erro ao salvar novo acesso.');
      
      const newAccess = await response.json();
      setAcessos(prev => [...prev, newAccess]);
      setIsCreateModalOpen(false);
      showToast('Acesso cadastrado com sucesso!');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Editar Acesso
  const handleEditAcesso = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/acessos/${formData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipamento: formData.equipamento,
          setor: formData.setor,
          software: formData.software,
          id_acesso: formData.id_acesso,
          senha: formData.senha,
          usuario: formData.usuario,
          updated_by: agentName
        })
      });

      if (!response.ok) throw new Error('Erro ao atualizar acesso.');
      
      const updatedAccess = await response.json();
      setAcessos(prev => prev.map(a => a.id === updatedAccess.id ? updatedAccess : a));
      setIsEditModalOpen(false);
      showToast('Acesso atualizado com sucesso!');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Abrir software de acesso remoto
  const handleConnect = (acesso) => {
    if (!acesso.id_acesso) return;
    const cleanId = acesso.id_acesso.replace(/\s+/g, '');
    if (acesso.software === 'ANYDESK') {
      window.location.href = `anydesk:${cleanId}`;
    } else if (acesso.software === 'RUSTDESK') {
      const url = acesso.senha 
        ? `rustdesk://${cleanId}?password=${encodeURIComponent(acesso.senha)}`
        : `rustdesk://${cleanId}`;
      window.location.href = url;
    } else {
      showToast('Software de acesso desconhecido.', 'error');
    }
  };

  // Filtrar Acessos
  const filteredAcessos = acessos.filter(acesso => {
    const term = searchTerm.toLowerCase();
    return (
      (acesso.equipamento || '').toLowerCase().includes(term) ||
      (acesso.setor || '').toLowerCase().includes(term) ||
      (acesso.software || '').toLowerCase().includes(term) ||
      (acesso.id_acesso || '').toLowerCase().includes(term) ||
      (acesso.usuario || '').toLowerCase().includes(term)
    );
  });

  // Função para formatar CNPJ
  const formatCnpj = (val) => {
    if (!val) return '';
    const clean = val.replace(/\D/g, '');
    return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toast && (
        <div className="toast" style={{ borderColor: toast.type === 'error' ? 'var(--error)' : 'var(--accent)' }}>
          <Shield size={16} color={toast.type === 'error' ? 'var(--error)' : 'var(--accent)'} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header>
        <div className="header-title">
          <Laptop className="copyable" color="var(--accent)" size={24} />
          Acessos Remotos
        </div>
        <div className="header-subtitle">
          Agente ativo: <strong>{agentName}</strong>
        </div>
      </header>

      {/* Select Filial */}
      <div className="select-container">
        <label className="select-label">Selecione a Filial</label>
        <select 
          value={selectedCnpj} 
          onChange={(e) => setSelectedCnpj(e.target.value)}
          disabled={loading && filiais.length === 0}
        >
          <option value="">-- Selecione uma Filial --</option>
          {filiais.map(f => (
            <option key={f.cnpj} value={f.cnpj}>
              {f.empresa} ({formatCnpj(f.cnpj)})
            </option>
          ))}
        </select>
      </div>

      {/* Details Card */}
      {selectedFilial && (
        <div className="filial-card">
          <div className="filial-title">
            <span>{selectedFilial.nome_fantasia || selectedFilial.empresa}</span>
            <span className={`badge ${selectedFilial.ativo ? 'badge-active' : 'badge-inactive'}`}>
              {selectedFilial.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">CNPJ</span>
              <span className="info-value">{formatCnpj(selectedFilial.cnpj)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Região</span>
              <span className="info-value">{selectedFilial.cidade} - {selectedFilial.uf}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Rede</span>
              <span className="info-value">{selectedFilial.descricao_rede}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Versão Retaguarda</span>
              <span className="info-value">{selectedFilial.versao_retaguarda || 'Não inf.'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">IMendes</span>
              <span className="info-value">{selectedFilial.cfi_bl_imendes ? 'Ativado' : 'Desativado'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">ID Filial / ID Rede</span>
              <span className="info-value">F: {selectedFilial.unidade_negocio_id} / R: {selectedFilial.codigo_rede}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Rede Acesso / Senha</span>
              <span className="info-value">
                <span>{selectedFilial.acesso}</span>
                {selectedFilial.senha && (
                  <button 
                    className="btn-icon" 
                    title="Copiar Senha da Rede"
                    onClick={() => copyToClipboard(selectedFilial.senha, 'rede-pwd')}
                  >
                    {copiedId === 'rede-pwd' ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                  </button>
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Access List Section */}
      <div className="section-header">
        <span className="section-title">Acessos Remotos Disponíveis</span>
        <button 
          className="btn btn-primary" 
          onClick={handleOpenCreateModal}
          disabled={!selectedFilial}
        >
          <Plus size={16} /> Novo Acesso
        </button>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: '14px', position: 'relative' }}>
        <input 
          type="text" 
          placeholder="Filtrar acessos por equipamento, software, usuário..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ paddingLeft: '36px' }}
        />
        <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
      </div>

      {loading && acessos.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', gap: '8px' }}>
          <RefreshCw className="spin" size={20} /> Carregando acessos...
        </div>
      ) : filteredAcessos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', border: '1px dashed var(--border)', borderRadius: '10px' }}>
          Nenhum acesso remoto cadastrado para esta filial.
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="table-container hidden-mobile">
            <table>
              <thead>
                <tr>
                  <th>Software</th>
                  <th>Equipamento</th>
                  <th>Setor</th>
                  <th>ID Acesso</th>
                  <th>Senha</th>
                  <th>Usuário</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredAcessos.map(acesso => (
                  <tr key={acesso.id}>
                    <td>
                      <span className={`badge ${acesso.software === 'ANYDESK' ? 'badge-software-anydesk' : 'badge-software-rustdesk'}`}>
                        {acesso.software}
                      </span>
                    </td>
                    <td>{acesso.equipamento}</td>
                    <td>{acesso.setor}</td>
                    <td className="copyable" onClick={() => copyToClipboard(acesso.id_acesso, `id-${acesso.id}`)}>
                      <div className="flex-center">
                        {acesso.id_acesso}
                        {copiedId === `id-${acesso.id}` ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                      </div>
                    </td>
                    <td className="copyable" onClick={() => copyToClipboard(acesso.senha, `senha-${acesso.id}`)}>
                      <div className="flex-center">
                        ••••••••
                        {copiedId === `senha-${acesso.id}` ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                      </div>
                    </td>
                    <td>{acesso.usuario || '-'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn-icon" 
                        onClick={() => handleConnect(acesso)}
                        title={`Conectar via ${acesso.software === 'ANYDESK' ? 'AnyDesk' : 'RustDesk'}`}
                        style={{ marginRight: '6px', color: 'var(--accent)' }}
                      >
                        <ExternalLink size={14} />
                      </button>
                      <button 
                        className="btn-icon" 
                        onClick={() => handleOpenEditModal(acesso)}
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile/Sidebar Cards View */}
          <div className="cards-list hidden-desktop">
            {filteredAcessos.map(acesso => (
              <div key={acesso.id} className="access-card">
                <div className="access-card-header">
                  <span className="access-card-title">{acesso.equipamento}</span>
                  <span className={`badge ${acesso.software === 'ANYDESK' ? 'badge-software-anydesk' : 'badge-software-rustdesk'}`}>
                    {acesso.software}
                  </span>
                </div>
                <div className="access-card-subtitle">{acesso.setor}</div>
                
                <div className="access-card-body">
                  <div>
                    <span className="info-label">ID Acesso</span>
                    <div 
                      className="info-value copyable" 
                      onClick={() => copyToClipboard(acesso.id_acesso, `id-m-${acesso.id}`)}
                    >
                      {acesso.id_acesso}
                      {copiedId === `id-m-${acesso.id}` ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                    </div>
                  </div>
                  <div>
                    <span className="info-label">Senha</span>
                    <div 
                      className="info-value copyable" 
                      onClick={() => copyToClipboard(acesso.senha, `senha-m-${acesso.id}`)}
                    >
                      ••••••••
                      {copiedId === `senha-m-${acesso.id}` ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                    </div>
                  </div>
                  {acesso.usuario && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <span className="info-label">Usuário</span>
                      <div className="info-value">{acesso.usuario}</div>
                    </div>
                  )}
                </div>

                <div className="access-card-actions">
                  <button 
                    className="btn btn-primary" 
                    style={{ padding: '4px 10px', fontSize: '12px', marginRight: 'auto' }}
                    onClick={() => handleConnect(acesso)}
                  >
                    <ExternalLink size={12} /> Conectar
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                    onClick={() => handleOpenEditModal(acesso)}
                  >
                    <Edit2 size={12} /> Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">Novo Acesso Remoto</span>
              <button className="btn-icon" onClick={() => setIsCreateModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateAcesso}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Equipamento</label>
                  <select 
                    value={formData.equipamento}
                    onChange={(e) => setFormData({...formData, equipamento: e.target.value})}
                  >
                    {EQUIPAMENTOS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Setor</label>
                  <select 
                    value={formData.setor}
                    onChange={(e) => setFormData({...formData, setor: e.target.value})}
                  >
                    {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Software</label>
                  <select 
                    value={formData.software}
                    onChange={(e) => setFormData({...formData, software: e.target.value})}
                  >
                    {SOFTWARES.map(sw => <option key={sw} value={sw}>{sw}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>ID Acesso</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.id_acesso} 
                    onChange={(e) => setFormData({...formData, id_acesso: e.target.value})} 
                  />
                </div>

                <div className="form-group">
                  <label>Senha</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.senha} 
                    onChange={(e) => setFormData({...formData, senha: e.target.value})} 
                  />
                </div>

                <div className="form-group">
                  <label>Usuário</label>
                  <input 
                    type="text" 
                    value={formData.usuario} 
                    onChange={(e) => setFormData({...formData, usuario: e.target.value})} 
                    placeholder="Opcional"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">Alterar Acesso</span>
              <button className="btn-icon" onClick={() => setIsEditModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditAcesso}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Equipamento</label>
                  <select 
                    value={formData.equipamento}
                    onChange={(e) => setFormData({...formData, equipamento: e.target.value})}
                  >
                    {EQUIPAMENTOS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Setor</label>
                  <select 
                    value={formData.setor}
                    onChange={(e) => setFormData({...formData, setor: e.target.value})}
                  >
                    {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Software</label>
                  <select 
                    value={formData.software}
                    onChange={(e) => setFormData({...formData, software: e.target.value})}
                  >
                    {SOFTWARES.map(sw => <option key={sw} value={sw}>{sw}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>ID Acesso</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.id_acesso} 
                    onChange={(e) => setFormData({...formData, id_acesso: e.target.value})} 
                  />
                </div>

                <div className="form-group">
                  <label>Senha</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.senha} 
                    onChange={(e) => setFormData({...formData, senha: e.target.value})} 
                  />
                </div>

                <div className="form-group">
                  <label>Usuário</label>
                  <input 
                    type="text" 
                    value={formData.usuario} 
                    onChange={(e) => setFormData({...formData, usuario: e.target.value})} 
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Atualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
