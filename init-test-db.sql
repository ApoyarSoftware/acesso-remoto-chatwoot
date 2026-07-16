-- Criar a tabela de Rede
CREATE TABLE IF NOT EXISTS public.rede (
    codigo_rede SERIAL PRIMARY KEY,
    descricao_rede VARCHAR(100) NOT NULL,
    usuario VARCHAR(100),
    senha VARCHAR(100),
    descricao_versao VARCHAR(50)
);

-- Criar a tabela de Filial
CREATE TABLE IF NOT EXISTS public.filial (
    cnpj VARCHAR(20) PRIMARY KEY,
    nome_fantasia VARCHAR(150) NOT NULL,
    cidade VARCHAR(100),
    uf VARCHAR(2),
    unidade_negocio_id INT NOT NULL,
    codigo_rede INT REFERENCES public.rede(codigo_rede),
    ativo BOOLEAN DEFAULT TRUE,
    cfi_bl_imendes BOOLEAN DEFAULT FALSE,
    data_ultima_venda TIMESTAMP
);

-- Criar sequence para ID de acessos remotos
CREATE SEQUENCE IF NOT EXISTS public.equipamentos_acesso_id_seq;

-- Criar a tabela de Acessos Remotos
CREATE TABLE IF NOT EXISTS public.acessos_remotos (
    id INT PRIMARY KEY DEFAULT nextval('public.equipamentos_acesso_id_seq'),
    id_filial INT,
    id_rede INT,
    equipamento VARCHAR(100),
    setor VARCHAR(100),
    software VARCHAR(50),
    id_acesso VARCHAR(100),
    senha VARCHAR(100),
    usuario VARCHAR(100),
    cnpj VARCHAR(20) REFERENCES public.filial(cnpj),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100)
);

-- ==========================================
-- INSERÇÃO DE DADOS DE TESTE (SEED)
-- ==========================================

-- 1. Inserir redes
INSERT INTO public.rede (codigo_rede, descricao_rede, usuario, senha, descricao_versao)
VALUES 
(1, 'Rede Supermercados Alpha', 'admin_alpha', 'SenhaRede123', 'v14.2.8'),
(2, 'Rede Postos de Combustível Beta', 'admin_beta', 'BetaRede987', 'v15.0.1');

-- 2. Inserir filiais (CNPJs fictícios de teste)
INSERT INTO public.filial (cnpj, nome_fantasia, cidade, uf, unidade_negocio_id, codigo_rede, ativo, cfi_bl_imendes, data_ultima_venda)
VALUES
('12345678000199', 'Alpha - Filial Centro', 'Belo Horizonte', 'MG', 101, 1, TRUE, TRUE, '2026-07-16 10:00:00'),
('12345678000200', 'Alpha - Filial Norte', 'Contagem', 'MG', 102, 1, TRUE, FALSE, '2026-07-15 18:30:00'),
('98765432000188', 'Beta Posto - Centro', 'São Paulo', 'SP', 201, 2, TRUE, TRUE, '2026-07-16 09:15:00');

-- 3. Inserir Acessos Remotos de Teste
INSERT INTO public.acessos_remotos (id_filial, id_rede, equipamento, setor, software, id_acesso, senha, usuario, cnpj, created_by)
VALUES
-- Filial 1 (Alpha Centro)
(101, 1, 'SERVIDOR CAIXA', 'ADMINISTRAÇÃO', 'ANYDESK', '123 456 789', 'senhaAny123', 'GERENTE_ALPHA', '12345678000199', 'Sistema'),
(101, 1, 'PDV 1', 'PISTA', 'RUSTDESK', '987654321', 'senhaRustPDV1', 'CAIXA_1', '12345678000199', 'Sistema'),
(101, 1, 'PDV 2', 'PISTA', 'ANYDESK', '111 222 333', 'senhaAnyPDV2', 'CAIXA_2', '12345678000199', 'Sistema'),

-- Filial 3 (Beta Posto Centro)
(201, 2, 'SERVIDOR RETAGUARDA', 'ADMINISTRAÇÃO', 'RUSTDESK', '555666777', 'senhaRustBeta', 'SUPORTE_BETA', '98765432000188', 'Sistema');
