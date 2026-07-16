require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const dbName = process.env.DB_DATABASE || 'crm_parceiro';

// Pool de conexão padrão para criar o banco de dados se necessário
const defaultPool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: 'postgres', // Conecta ao banco padrão do postgres
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

const targetPool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: dbName,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function runSeed() {
  console.log('Iniciando o seeding do banco de dados local...');
  
  // 1. Garantir que o banco de dados existe
  try {
    console.log(`Verificando se o banco de dados "${dbName}" existe...`);
    const defaultClient = await defaultPool.connect();
    try {
      const checkDb = await defaultClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
      if (checkDb.rows.length === 0) {
        console.log(`Banco de dados "${dbName}" não encontrado. Criando...`);
        // CREATE DATABASE não aceita parâmetros parametrizados, então concatenamos (dbName é seguro pois vem do .env)
        await defaultClient.query(`CREATE DATABASE ${dbName}`);
        console.log(`Banco de dados "${dbName}" criado com sucesso!`);
      } else {
        console.log(`Banco de dados "${dbName}" já existe.`);
      }
    } finally {
      defaultClient.release();
    }
  } catch (err) {
    console.error('Erro ao verificar/criar o banco de dados:', err.message);
    await defaultPool.end();
    await targetPool.end();
    return;
  } finally {
    await defaultPool.end();
  }

  // 2. Executar as queries do arquivo SQL
  const sqlPath = path.join(__dirname, '../../init-test-db.sql');
  try {
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Arquivo init-test-db.sql não encontrado em: ${sqlPath}`);
    }
    
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log(`Conectando ao banco "${dbName}"...`);
    const client = await targetPool.connect();
    
    try {
      console.log('Executando queries do arquivo init-test-db.sql...');
      await client.query(sql);
      console.log('Banco de dados populado com dados de teste com sucesso!');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao popular o banco de dados:', error.message);
  } finally {
    await targetPool.end();
  }
}

runSeed();
