require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do frontend (compilado pelo Vite na pasta public)
app.use(express.static(path.join(__dirname, '../public')));

// Token de sessão gerado dinamicamente ao iniciar o servidor
const SESSION_TOKEN = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

// Middleware de Autenticação
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const tokenQuery = req.query.token;
  const bypassToken = process.env.BYPASS_TOKEN;

  // 1. Permite se o token query param for igual ao bypass token
  if (tokenQuery && bypassToken && tokenQuery === bypassToken) {
    return next();
  }

  // 2. Permite se o header Authorization for o token de sessão ou o bypass token
  if (authHeader) {
    const token = authHeader.split(' ')[1]; // "Bearer <token>"
    if (token === SESSION_TOKEN || (bypassToken && token === bypassToken)) {
      return next();
    }
  }

  return res.status(401).json({ error: 'Não autorizado. Faça login para continuar.' });
};

// Configuração do PostgreSQL Pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  // Add SSL if needed, e.g., in production
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Rota de Login Único
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const correctUsername = process.env.APP_USERNAME || 'suporte';
  const correctPassword = process.env.APP_PASSWORD || 'suasenha_segura';

  if (username === correctUsername && password === correctPassword) {
    return res.json({ token: SESSION_TOKEN });
  }
  return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
});

// Endpoint para testar conexão com o banco
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// GET /api/filiais-da-rede?cnpj=... or ?rede=... or ?codigo_rede=... (Replica Consulta_todas_filiais)
app.get('/api/filiais-da-rede', authenticate, async (req, res) => {
  const { cnpj, rede, codigo_rede } = req.query;
  if (!cnpj && !rede && !codigo_rede) {
    return res.status(400).json({ error: 'CNPJ, rede ou codigo_rede é obrigatório.' });
  }
  try {
    let query = `
      SELECT 
          f.cnpj,
          f.nome_fantasia AS empresa,
          r.descricao_rede,
          f.cidade,
          f.uf,
          f.unidade_negocio_id,
          r.codigo_rede,
          r.usuario AS acesso,
          r.senha,
          r.descricao_versao AS versao_retaguarda,
          f.ativo,
          f.cfi_bl_imendes,
          f.data_ultima_venda
      FROM 
          filial f
      JOIN 
          rede r ON f.codigo_rede = r.codigo_rede
    `;
    
    const params = [];
    if (cnpj) {
      query += `
        WHERE f.codigo_rede = (
            SELECT codigo_rede 
            FROM filial 
            WHERE cnpj = $1
        );
      `;
      params.push(cnpj);
    } else if (codigo_rede) {
      query += `
        WHERE f.codigo_rede = $1;
      `;
      params.push(parseInt(codigo_rede, 10));
    } else if (rede) {
      query += `
        WHERE r.descricao_rede ILIKE $1;
      `;
      params.push(`%${rede}%`);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao consultar filiais da rede.', details: err.message });
  }
});

// GET /api/filial/:cnpj (Replica Consulta_filial)
app.get('/api/filial/:cnpj', authenticate, async (req, res) => {
  const { cnpj } = req.params;
  try {
    const query = `
      SELECT 
          f.cnpj,
          f.nome_fantasia,
          r.descricao_rede,
          f.cidade,
          f.uf,
          f.unidade_negocio_id,
          r.codigo_rede,
          r.usuario AS acesso,
          r.senha,
          r.descricao_versao AS versao_retaguarda,
          f.ativo,
          f.cfi_bl_imendes,
          f.data_ultima_venda
      FROM 
          filial f
      JOIN 
          rede r ON f.codigo_rede = r.codigo_rede
      WHERE 
          f.cnpj = $1;
    `;
    const result = await pool.query(query, [cnpj]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Filial não encontrada.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao consultar filial.', details: err.message });
  }
});

// GET /api/acessos?cnpj=... (Replica Consulta_acessos)
app.get('/api/acessos', authenticate, async (req, res) => {
  const { cnpj } = req.query;
  if (!cnpj) {
    return res.status(400).json({ error: 'CNPJ é obrigatório para listar acessos.' });
  }
  try {
    const query = `
      SELECT *
      FROM acessos_remotos
      WHERE cnpj = $1
      ORDER BY id ASC;
    `;
    const result = await pool.query(query, [cnpj]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao consultar acessos.', details: err.message });
  }
});

// POST /api/acessos (Replica Cadastro_acessos)
app.post('/api/acessos', authenticate, async (req, res) => {
  const {
    id_filial,
    id_rede,
    equipamento,
    setor,
    software,
    id_acesso,
    senha,
    created_by,
    cnpj,
    usuario
  } = req.body;

  if (!cnpj || !id_acesso) {
    return res.status(400).json({ error: 'CNPJ e ID de Acesso são obrigatórios.' });
  }

  try {
    const query = `
      INSERT INTO public.acessos_remotos
      (
          id,
          id_filial,
          id_rede,
          equipamento,
          setor,
          software,
          id_acesso,
          senha,
          created_at,
          created_by,
          updated_at,
          updated_by,
          cnpj,
          usuario
      )
      VALUES
      (
          nextval('equipamentos_acesso_id_seq'::regclass),
          $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8, CURRENT_TIMESTAMP, NULL, $9, $10
      )
      RETURNING *;
    `;
    const values = [
      id_filial,
      id_rede,
      (equipamento || '').toUpperCase(),
      (setor || '').toUpperCase(),
      software,
      id_acesso,
      senha,
      created_by || 'Chatwoot Agent',
      cnpj,
      (usuario || '').toUpperCase()
    ];
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao cadastrar acesso.', details: err.message });
  }
});

// PUT /api/acessos/:id (Replica Altera_cadastro_acesso)
app.put('/api/acessos/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const {
    equipamento,
    setor,
    software,
    id_acesso,
    senha,
    usuario,
    updated_by
  } = req.body;

  try {
    const query = `
      UPDATE public.acessos_remotos
      SET 
          equipamento = $1,
          setor = $2,
          software = $3,
          id_acesso = $4,
          senha = $5,
          usuario = $6,
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $7
      WHERE 
          id = $8
      RETURNING *;
    `;
    const values = [
      (equipamento || '').toUpperCase(),
      (setor || '').toUpperCase(),
      software,
      id_acesso,
      senha,
      (usuario || '').toUpperCase(),
      updated_by || 'Chatwoot Agent',
      id
    ];
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Acesso não encontrado.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao alterar acesso.', details: err.message });
  }
});

// DELETE /api/acessos/:id (Extra utility just in case)
app.delete('/api/acessos/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM public.acessos_remotos WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Acesso não encontrado.' });
    }
    res.json({ success: true, message: 'Acesso deletado com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar acesso.', details: err.message });
  }
});

// Servir index.html do React para qualquer outra rota (Fallback de SPA)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
