require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

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

// GET /api/filiais/search (Pesquisa global por CNPJ, Filial ou Rede)
app.get('/api/filiais/search', authenticate, async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Termo de pesquisa é obrigatório.' });
  }
  try {
    const query = `
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
      WHERE 
          f.cnpj LIKE $1
          OR f.nome_fantasia ILIKE $1
          OR r.descricao_rede ILIKE $1
      LIMIT 15;
    `;
    const searchPattern = `%${q}%`;
    const result = await pool.query(query, [searchPattern]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao pesquisar filiais.', details: err.message });
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

// PUT /api/filial/:cnpj (Altera cadastro de filial e rede)
app.put('/api/filial/:cnpj', authenticate, async (req, res) => {
  const { cnpj } = req.params;
  const {
    nome_fantasia,
    cidade,
    uf,
    ativo,
    cfi_bl_imendes,
    descricao_rede,
    acesso,
    senha,
    versao_retaguarda
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Atualizar filial
    const filialQuery = `
      UPDATE public.filial
      SET 
          nome_fantasia = $1,
          cidade = $2,
          uf = $3,
          ativo = $4,
          cfi_bl_imendes = $5
      WHERE 
          cnpj = $6
      RETURNING *;
    `;
    const filialValues = [
      nome_fantasia,
      cidade,
      uf,
      ativo,
      cfi_bl_imendes,
      cnpj
    ];
    const filialResult = await client.query(filialQuery, filialValues);

    if (filialResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Filial não encontrada.' });
    }

    const filial = filialResult.rows[0];

    // 2. Atualizar rede associada se existir
    if (filial.codigo_rede) {
      const redeQuery = `
        UPDATE public.rede
        SET 
            descricao_rede = $1,
            usuario = $2,
            senha = $3,
            descricao_versao = $4
        WHERE 
            codigo_rede = $5;
      `;
      const redeValues = [
        descricao_rede,
        acesso,
        senha,
        versao_retaguarda,
        filial.codigo_rede
      ];
      await client.query(redeQuery, redeValues);
    }

    await client.query('COMMIT');

    // Retorna a filial atualizada completa
    const resultQuery = `
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
    const result = await client.query(resultQuery, [cnpj]);
    res.json(result.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Erro ao alterar dados da filial.', details: err.message });
  } finally {
    client.release();
  }
});

// POST /api/launch-webposto
app.post('/api/launch-webposto', authenticate, async (req, res) => {
  const { user, password } = req.body;
  if (!user || !password) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
  }

  const userProfile = process.env.USERPROFILE || 'C:\\Users\\JuniorCastro';
  const credPath = path.join(userProfile, 'AppData\\Roaming\\Quality\\Bin\\Credenciais.txt');
  const exePath = 'C:\\Quality\\web\\QualityPosto.exe';

  try {
    let jsonData = {
      SENHA_DO_DIA: "",
      DATA_ULTIMO_LOGIN: new Date().toLocaleDateString('pt-BR'),
      USER: user,
      PASS: password
    };

    // Tenta ler o arquivo existente para manter outros campos (como SENHA_DO_DIA) se houver
    if (fs.existsSync(credPath)) {
      try {
        const fileContent = fs.readFileSync(credPath, 'utf8').trim();
        if (fileContent) {
          const decoded = Buffer.from(fileContent, 'base64').toString('utf8');
          const parsed = JSON.parse(decoded);
          jsonData = { ...parsed, USER: user, PASS: password };
        }
      } catch (readErr) {
        console.warn('Não foi possível ler/decodificar o arquivo de credenciais existente, criando novo.', readErr);
      }
    }

    // Certificar de que a pasta de destino existe
    const dirPath = path.dirname(credPath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Codifica para Base64 e escreve
    const base64Str = Buffer.from(JSON.stringify(jsonData)).toString('base64');
    fs.writeFileSync(credPath, base64Str, 'utf8');

    // Inicia o executável local do WebPosto
    if (fs.existsSync(exePath)) {
      exec(`start "" "${exePath}"`, (err) => {
        if (err) {
          console.error('Erro ao executar QualityPosto.exe:', err);
        }
      });
      return res.json({ success: true, message: 'WebPosto iniciado com sucesso!' });
    } else {
      return res.status(404).json({ error: 'Executável QualityPosto.exe não encontrado em C:\\Quality\\web\\' });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao configurar credenciais do WebPosto.', details: err.message });
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
