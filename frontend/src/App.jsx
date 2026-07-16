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
  FileText,
  Zap
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
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '6px', flexShrink: 0, filter: 'drop-shadow(0 1px 2px rgba(255, 74, 74, 0.3))' }}>
    <path d="M12 2L6.5 7.5L12 13L17.5 7.5L12 2Z" fill="#ff4a4a"/>
    <path d="M12 11L6.5 16.5L12 22L17.5 16.5L12 11Z" fill="#ff4a4a"/>
    <path d="M5.5 8.5L0 14L5.5 19.5L11 14L5.5 8.5Z" fill="#ff4a4a"/>
    <path d="M18.5 8.5L13 14L18.5 19.5L24 14L18.5 8.5Z" fill="#ff4a4a"/>
    <path d="M12 8L7.5 12.5L12 17L16.5 12.5L12 8Z" fill="#ffffff"/>
  </svg>
);

const RustDeskIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '6px', flexShrink: 0, filter: 'drop-shadow(0 1px 2px rgba(14, 165, 233, 0.3))' }}>
    <rect width="24" height="24" rx="6" fill="#0ea5e9" />
    <path d="M6 8C6 7.44772 6.44772 7 7 7H17C17.5523 7 18 7.44772 18 8V13C18 13.5523 17.5523 14 17 14H7C6.44772 14 6 13.5523 6 13V8Z" stroke="white" strokeWidth="1.8" fill="rgba(255,255,255,0.15)" />
    <path d="M9 18H15" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M12 14V18" stroke="white" strokeWidth="1.8" />
    <circle cx="12" cy="10.5" r="1.5" fill="white" />
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

  // Reusable search function
  const performGlobalSearch = async (term) => {
    if (!term.trim()) {
      setGlobalSearchResults([]);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/filiais/search?q=${encodeURIComponent(term)}`, {
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

  // Auto-search effect with 400ms debounce
  useEffect(() => {
    if (!authToken) return;
    const delayDebounceFn = setTimeout(() => {
      performGlobalSearch(globalSearchTerm);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [globalSearchTerm, authToken]);

  // Keep form submit handler to prevent default behavior and force instant search if enter is pressed
  const handleGlobalSearch = (e) => {
    if (e) e.preventDefault();
    performGlobalSearch(globalSearchTerm);
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
  const [isEditFilialModalOpen, setIsEditFilialModalOpen] = useState(false);

  // Form States
  const [filialFormData, setFilialFormData] = useState({
    nome_fantasia: '',
    cidade: '',
    uf: '',
    ativo: true,
    cfi_bl_imendes: false,
    descricao_rede: '',
    acesso: '',
    senha: '',
    versao_retaguarda: ''
  });

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

  // Copy to clipboard helper with fallback for iframes (like Chatwoot)
  const copyToClipboard = (text, id) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
          .then(() => {
            setCopiedId(id);
            showToast('Copiado para a área de transferência!');
            setTimeout(() => setCopiedId(null), 2000);
          })
          .catch(() => {
            fallbackCopyToClipboard(text, id);
          });
      } else {
        fallbackCopyToClipboard(text, id);
      }
    } catch (err) {
      fallbackCopyToClipboard(text, id);
    }
  };

  const fallbackCopyToClipboard = (text, id) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setCopiedId(id);
        showToast('Copiado para a área de transferência!');
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        showToast('Não foi possível copiar automaticamente.', 'error');
      }
    } catch (err) {
      showToast('Erro ao copiar texto.', 'error');
    }
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
    if (!authToken) return; // Evita chamadas antes do token de autenticação estar disponível

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
    if (!authToken) return; // Evita chamadas antes do token de autenticação estar disponível

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

  // Iniciar formulário de edição de filial
  const handleOpenEditFilialModal = () => {
    setFilialFormData({
      nome_fantasia: selectedFilial.nome_fantasia || selectedFilial.empresa || '',
      cidade: selectedFilial.cidade || '',
      uf: selectedFilial.uf || '',
      ativo: selectedFilial.ativo,
      cfi_bl_imendes: selectedFilial.cfi_bl_imendes || false,
      descricao_rede: selectedFilial.descricao_rede || '',
      acesso: selectedFilial.acesso || '',
      senha: selectedFilial.senha || '',
      versao_retaguarda: selectedFilial.versao_retaguarda || ''
    });
    setIsEditFilialModalOpen(true);
  };

  // Alterar Filial
  const handleEditFilial = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/filial/${selectedCnpj}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(filialFormData)
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!response.ok) throw new Error('Erro ao atualizar filial.');
      
      const updatedFilial = await response.json();
      setSelectedFilial(updatedFilial);
      setFiliais(prev => prev.map(f => f.cnpj === updatedFilial.cnpj ? { ...f, empresa: updatedFilial.nome_fantasia } : f));
      setIsEditFilialModalOpen(false);
      showToast('Dados da filial atualizados com sucesso!');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

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

  // Iniciar e preencher o WebPosto local via protocolo personalizado
  const handleLaunchWebposto = (user, password) => {
    if (!user || !password) {
      showToast('Dados de acesso (usuário/senha) não encontrados para o WebPosto.', 'error');
      return;
    }
    try {
      const encodedUser = encodeURIComponent(user);
      const encodedPass = encodeURIComponent(password);
      window.location.href = `quality://login?user=${encodedUser}&pass=${encodedPass}`;
      showToast('Abrindo o WebPosto local...');
    } catch (err) {
      showToast('Erro ao iniciar o WebPosto.', 'error');
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
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', marginBottom: '1.25rem', boxShadow: '0 0 20px rgba(59, 130, 246, 0.15)' }}>
              <Zap color="var(--accent)" size={32} style={{ filter: 'drop-shadow(0 0 6px var(--accent))' }} />
            </div>
            <h2 style={{ fontSize: '1.85rem', fontWeight: '800', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
              <span style={{ color: '#fff' }}>Apoio</span>
              <span style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Connect</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Portal de Acessos Remotos</p>
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

      <header>
        <div className="header-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap className="copyable" color="var(--accent)" size={20} style={{ filter: 'drop-shadow(0 0 5px var(--accent))' }} />
          <span style={{ fontWeight: '800', fontSize: '1.35rem', letterSpacing: '-0.02em', color: '#fff' }}>Apoio</span>
          <span style={{ fontWeight: '800', fontSize: '1.35rem', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Connect</span>
          <span style={{ fontSize: '0.65rem', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent)', border: '1px solid rgba(59, 130, 246, 0.2)', marginLeft: '4px', letterSpacing: '0.05em' }}>PRO</span>
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
              <div className="filial-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{selectedFilial.nome_fantasia || selectedFilial.empresa}</span>
                  <button 
                    onClick={handleOpenEditFilialModal}
                    className="btn-icon" 
                    title="Editar Dados da Empresa"
                    style={{ padding: '4px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', background: 'rgba(255, 255, 255, 0.05)' }}
                  >
                    <Edit2 size={14} color="var(--accent)" />
                  </button>
                </div>
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
                  <span className="info-label">ID Filial | ID Rede</span>
                  <span className="info-value">F: {selectedFilial.unidade_negocio_id} | R: {selectedFilial.codigo_rede}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Rede Acesso | Senha</span>
                  <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>{selectedFilial.acesso}</span>
                    {selectedFilial.senha && (
                      <>
                        <span style={{ color: 'var(--text-secondary)' }}>|</span>
                        <div 
                          className="info-value copyable" 
                          title="Copiar Senha da Rede"
                          onClick={() => copyToClipboard(selectedFilial.senha, 'rede-pwd')}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '2px 6px' }}
                        >
                          ••••••••
                          {copiedId === 'rede-pwd' ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                        </div>
                        <button
                          onClick={() => handleLaunchWebposto(selectedFilial.acesso, selectedFilial.senha)}
                          className="btn btn-primary"
                          style={{ padding: '4px 10px', fontSize: '11px', height: '24px', borderRadius: '6px', marginLeft: '6px', gap: '4px', whiteSpace: 'nowrap' }}
                          title="Abrir WebPosto com Login Automático"
                          disabled={loading}
                        >
                          <ExternalLink size={10} /> Abrir WebPosto
                        </button>
                      </>
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

      {/* EDIT FILIAL MODAL */}
      {isEditFilialModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <span className="modal-title">Editar Dados da Empresa</span>
              <button className="btn-icon" onClick={() => setIsEditFilialModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditFilial}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--accent)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '700' }}>Dados da Filial</h3>
                
                <div className="form-group">
                  <label>Nome Fantasia / Empresa</label>
                  <input 
                    type="text" 
                    required 
                    value={filialFormData.nome_fantasia} 
                    onChange={(e) => setFilialFormData({...filialFormData, nome_fantasia: e.target.value})} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Cidade</label>
                    <input 
                      type="text" 
                      value={filialFormData.cidade} 
                      onChange={(e) => setFilialFormData({...filialFormData, cidade: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label>UF</label>
                    <input 
                      type="text" 
                      maxLength="2"
                      value={filialFormData.uf} 
                      onChange={(e) => setFilialFormData({...filialFormData, uf: e.target.value.toUpperCase()})} 
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '20px', margin: '8px 0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={filialFormData.ativo} 
                      onChange={(e) => setFilialFormData({...filialFormData, ativo: e.target.checked})} 
                    />
                    Empresa Ativa
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={filialFormData.cfi_bl_imendes} 
                      onChange={(e) => setFilialFormData({...filialFormData, cfi_bl_imendes: e.target.checked})} 
                    />
                    IMendes Ativo
                  </label>
                </div>

                <h3 style={{ fontSize: '0.9rem', color: 'var(--accent)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginTop: '12px', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '700' }}>Dados da Rede</h3>

                <div className="form-group">
                  <label>Nome da Rede</label>
                  <input 
                    type="text" 
                    required 
                    value={filialFormData.descricao_rede} 
                    onChange={(e) => setFilialFormData({...filialFormData, descricao_rede: e.target.value})} 
                  />
                </div>

                <div className="form-group">
                  <label>Versão Retaguarda</label>
                  <input 
                    type="text" 
                    value={filialFormData.versao_retaguarda} 
                    onChange={(e) => setFilialFormData({...filialFormData, versao_retaguarda: e.target.value})} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Rede Acesso / Usuário</label>
                    <input 
                      type="text" 
                      value={filialFormData.acesso} 
                      onChange={(e) => setFilialFormData({...filialFormData, acesso: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Senha da Rede</label>
                    <input 
                      type="text" 
                      value={filialFormData.senha} 
                      onChange={(e) => setFilialFormData({...filialFormData, senha: e.target.value})} 
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditFilialModalOpen(false)}>
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
