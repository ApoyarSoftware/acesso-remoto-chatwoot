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

// Icones de Software customizados (AnyDesk e RustDesk) para identificação visual rápida
const AnyDeskIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '6px', flexShrink: 0 }}>
    <path d="M12 1.5L7.4 6.1L12 10.7L16.6 6.1L12 1.5Z" fill="#ff4a4a"/>
    <path d="M12 13.3L7.4 17.9L12 22.5L16.6 17.9L12 13.3Z" fill="#ff4a4a"/>
    <path d="M6.1 7.4L1.5 12L6.1 16.6L10.7 12L6.1 7.4Z" fill="#ff4a4a"/>
    <path d="M17.9 7.4L13.3 12L17.9 16.6L22.5 12L17.9 7.4Z" fill="#ff4a4a"/>
    <path d="M12 7.4L7.4 12L12 16.6L16.6 12L12 7.4Z" fill="#ffffff"/>
  </svg>
);

const RustDeskIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '6px', flexShrink: 0 }}>
    <rect width="24" height="24" rx="5" fill="#0ea5e9" />
    <path d="M5 8C5 6.89543 5.89543 6 7 6H17C18.1046 6 19 6.89543 19 8V14C19 15.1046 18.1046 16 17 16H7C5.89543 16 5 15.1046 5 14V8Z" stroke="white" strokeWidth="2" />
    <path d="M9 20H15" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 16V20" stroke="white" strokeWidth="2" />
  </svg>
);

function App() {
  // Chatwoot & Context State
  const [chatwootData, setChatwootData] = useState(null);
  const [agentName, setAgentName] = useState('Suporte');
  const [initialQuery, setInitialQuery] = useState(null);

  // Auth State
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken') || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setAuthToken('');
  };

  // Helper to handle API 401 errors
  const handleUnauthorized = () => {
    localStorage.removeItem('authToken');
    setAuthToken('');
    showToast('Sessão expirada. Faça login novamente.', 'error');
  };

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!response.ok) {
        throw new Error('Usuário ou senha incorretos.');
      }
      const data = await response.json();
      localStorage.setItem('authToken', data.token);
      setAuthToken(data.token);
      showToast('Login realizado com sucesso!');
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // App State
  const [filiais, setFiliais] = useState([]);
  const [selectedCnpj, setSelectedCnpj] = useState('');
  const [selectedFilial, setSelectedFilial] = useState(null);
  const [acessos, setAcessos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Global Search State
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState([]);

  // Global search handler
  const handleGlobalSearch = async (e) => {
    e.preventDefault();
    if (!globalSearchTerm.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/filiais/search?q=${encodeURIComponent(globalSearchTerm)}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!response.ok) throw new Error('Erro ao pesquisar filiais.');
      const data = await response.json();
      setGlobalSearchResults(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Select a search result
  const handleSelectSearchResult = (filial) => {
    setInitialQuery({ cnpj: filial.cnpj });
    setSelectedCnpj(filial.cnpj);
    setGlobalSearchResults([]);
    setGlobalSearchTerm('');
  };

  // Reset selected filial to search again
  const handleResetSelection = () => {
    setSelectedCnpj('');
    setSelectedFilial(null);
    setFiliais([]);
    setAcessos([]);
    setInitialQuery(null);
  };
  
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
            setInitialQuery({ cnpj: cleanCnpj });
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
    const testRede = urlParams.get('rede');
    const testCodigoRede = urlParams.get('codigo_rede');
    const urlToken = urlParams.get('token');

    if (urlToken) {
      localStorage.setItem('authToken', urlToken);
      setAuthToken(urlToken);
    }

    if (testCnpj) {
      const cleanCnpj = testCnpj.replace(/\D/g, '');
      setInitialQuery({ cnpj: cleanCnpj });
      setSelectedCnpj(cleanCnpj);
    } else if (testRede) {
      setInitialQuery({ rede: testRede });
    } else if (testCodigoRede) {
      setInitialQuery({ codigo_rede: testCodigoRede });
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 2. Busca filiais da rede quando o query inicial muda
  useEffect(() => {
    if (!initialQuery) return;

    const fetchFiliaisDaRede = async () => {
      setLoading(true);
      try {
        let url = `${API_BASE}/filiais-da-rede`;
        if (initialQuery.cnpj) {
          url += `?cnpj=${initialQuery.cnpj}`;
        } else if (initialQuery.rede) {
          url += `?rede=${encodeURIComponent(initialQuery.rede)}`;
        } else if (initialQuery.codigo_rede) {
          url += `?codigo_rede=${initialQuery.codigo_rede}`;
        }

        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.status === 401) {
          handleUnauthorized();
          return;
        }
        if (!response.ok) throw new Error('Erro ao buscar filiais da rede.');
        const data = await response.json();
        setFiliais(data);
        
        // Se a filial atual não estiver na lista de filiais da rede, escolhemos a primeira ou a que bate com o CNPJ
        if (data.length > 0) {
          const matchesCurrent = initialQuery.cnpj
            ? data.find(f => f.cnpj.replace(/\D/g, '') === initialQuery.cnpj.replace(/\D/g, ''))
            : null;
          if (matchesCurrent) {
            setSelectedCnpj(matchesCurrent.cnpj);
          } else {
            setSelectedCnpj(data[0].cnpj);
          }
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchFiliaisDaRede();
  }, [initialQuery, authToken]);

  // 3. Busca detalhes da filial e os acessos quando o CNPJ selecionado muda
  useEffect(() => {
    if (!selectedCnpj) return;

    const fetchDetailsAndAcessos = async () => {
      setLoading(true);
      try {
        // Busca Detalhes da Filial
        const resFilial = await fetch(`${API_BASE}/filial/${selectedCnpj}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (resFilial.status === 401) {
          handleUnauthorized();
          return;
        }
        if (resFilial.ok) {
          const detail = await resFilial.json();
          setSelectedFilial(detail);
        } else {
          setSelectedFilial(null);
        }

        // Busca Acessos
        const resAcessos = await fetch(`${API_BASE}/acessos?cnpj=${selectedCnpj}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (resAcessos.status === 401) {
          handleUnauthorized();
          return;
        }
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
  }, [selectedCnpj, authToken]);

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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
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

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
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

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
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

  if (!authToken) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem' }}>
        {toast && (
          <div className="toast" style={{ borderColor: toast.type === 'error' ? 'var(--error)' : 'var(--accent)' }}>
            <Shield size={16} color={toast.type === 'error' ? 'var(--error)' : 'var(--accent)'} />
            <span>{toast.message}</span>
          </div>
        )}
        <div className="login-card" style={{ maxWidth: '400px', width: '100%', padding: '2.5rem 2rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--card-bg)', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Laptop color="var(--accent)" size={48} style={{ marginBottom: '1rem', filter: 'drop-shadow(0 0 8px var(--accent))' }} />
            <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Acessos Remotos</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Acesso restrito para equipe de suporte</p>
          </div>
          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>Usuário</label>
              <input 
                type="text" 
                required 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'rgba(255, 255, 255, 0.03)', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>Senha</label>
              <input 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'rgba(255, 255, 255, 0.03)', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
            {loginError && (
              <p style={{ color: 'var(--error)', fontSize: '0.875rem', marginBottom: '1.25rem', textAlign: 'center', fontWeight: '500' }}>{loginError}</p>
            )}
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
              style={{ width: '100%', padding: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

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
        <div className="header-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>Agente ativo: <strong>{agentName}</strong></span>
          <button 
            onClick={handleLogout}
            className="btn btn-secondary" 
            style={{ padding: '4px 8px', fontSize: '0.75rem', minHeight: 'auto', background: 'rgba(255, 255, 255, 0.05)', borderColor: 'var(--border)' }}
          >
            Sair
          </button>
        </div>
      </header>

      {!selectedCnpj ? (
        <div className="global-search-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '1rem', width: '100%' }}>
          <div style={{ textAlign: 'center', margin: '2rem 0 1rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem', background: 'linear-gradient(90deg, var(--text-primary), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Pesquisar Filial ou Rede
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>Busque por CNPJ, nome da filial ou rede para visualizar os acessos</p>
          </div>

          <form onSubmit={handleGlobalSearch} style={{ display: 'flex', gap: '10px', maxWidth: '600px', width: '100%', margin: '0 auto' }}>
            <input 
              type="text" 
              placeholder="Digite o CNPJ, nome da filial ou rede..." 
              value={globalSearchTerm} 
              onChange={(e) => setGlobalSearchTerm(e.target.value)}
              style={{ flex: 1, padding: '0.85rem 1.2rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none' }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '8px', fontSize: '1rem' }}>
              <Search size={18} />
              Buscar
            </button>
          </form>

          {loading && (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
              <RefreshCw className="spin" size={32} style={{ marginBottom: '1rem', color: 'var(--accent)' }} />
              <p>Pesquisando filiais...</p>
            </div>
          )}

          {!loading && globalSearchResults.length > 0 && (
            <div className="search-results-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem', maxWidth: '1000px', width: '100%', margin: '0 auto' }}>
              {globalSearchResults.map(f => (
                <div 
                  key={f.cnpj} 
                  onClick={() => handleSelectSearchResult(f)}
                  style={{ padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card-bg)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                  className="search-result-card"
                >
                  <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{f.empresa}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>CNPJ: {formatCnpj(f.cnpj)}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', color: 'var(--accent)' }}>{f.descricao_rede}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{f.cidade} - {f.uf}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && globalSearchTerm && globalSearchResults.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem 2rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', maxWidth: '500px', margin: '0 auto', width: '100%' }}>
              Nenhuma filial encontrada para o termo pesquisado.
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Select Filial */}
          <div className="select-container" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
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
            <button 
              onClick={handleResetSelection}
              className="btn btn-secondary"
              style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', padding: '0 1rem' }}
            >
              <Search size={16} /> Nova Busca
            </button>
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
            <span className="section-title">Acessos Remotos Disponíveis ({filteredAcessos.length})</span>
            <button 
              className="btn btn-primary" 
              onClick={handleOpenCreateModal}
              disabled={!selectedFilial}
            >
              <Plus size={16} /> Novo Acesso
            </button>
          </div>

          {/* local search and accesses view container */}
          <div className="search-bar">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar por equipamento, setor, software, ID ou usuário..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Desktop Table View */}
          <div className="table-responsive hidden-mobile">
            <table>
              <thead>
                <tr>
                  <th>Equipamento</th>
                  <th>Setor</th>
                  <th>Software</th>
                  <th>ID de Acesso</th>
                  <th>Senha</th>
                  <th>Usuário</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredAcessos.map(acesso => (
                  <tr key={acesso.id}>
                    <td className="font-bold">{acesso.equipamento}</td>
                    <td>{acesso.setor}</td>
                    <td>
                      <span className={`badge ${acesso.software === 'ANYDESK' ? 'badge-software-anydesk' : 'badge-software-rustdesk'}`}>
                        {acesso.software === 'ANYDESK' ? <AnyDeskIcon /> : <RustDeskIcon />}
                        {acesso.software}
                      </span>
                    </td>
                    <td>
                      <div 
                        className="info-value copyable" 
                        title="Copiar ID"
                        onClick={() => copyToClipboard(acesso.id_acesso, `id-${acesso.id}`)}
                      >
                        {acesso.id_acesso}
                        {copiedId === `id-${acesso.id}` ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                      </div>
                    </td>
                    <td>
                      <div 
                        className="info-value copyable" 
                        title="Copiar Senha"
                        onClick={() => copyToClipboard(acesso.senha, `senha-${acesso.id}`)}
                      >
                        ••••••••
                        {copiedId === `senha-${acesso.id}` ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                      </div>
                    </td>
                    <td>{acesso.usuario || '-'}</td>
                    <td>
                      <button 
                        className="btn-icon" 
                        onClick={() => handleConnect(acesso)}
                        title="Conectar remotamente"
                        style={{ marginRight: '6px', color: 'var(--accent)' }}
                      >
                        <ExternalLink size={14} />
                      </button>
                      <button 
                        className="btn-icon" 
                        onClick={() => handleOpenEditModal(acesso)}
                        title="Editar acesso"
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
                    {acesso.software === 'ANYDESK' ? <AnyDeskIcon /> : <RustDeskIcon />}
                    {acesso.software}
                  </span>
                </div>
                <div className="access-card-subtitle">{acesso.setor}</div>
                
                <div className="access-card-body">
                  <div>
                    <span className="info-label">ID Acesso</span>
                    <div 
                      className="info-value copyable" 
                      title="Copiar ID"
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
                      title="Copiar Senha"
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
                    title="Conectar remotamente"
                  >
                    <ExternalLink size={12} /> Conectar
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                    onClick={() => handleOpenEditModal(acesso)}
                    title="Editar acesso"
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
