-- =====================================================
-- ASTROTRACKER - Banco de dados COMPLETO (MySQL)
-- Use este script num computador novo: ele cria tudo.
-- Rode no MySQL Workbench (Ctrl + Shift + Enter).
-- É seguro rodar mais de uma vez (não duplica nada).
-- =====================================================

CREATE DATABASE IF NOT EXISTS astrotracker
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE astrotracker;


-- =====================================================
-- 1. USUARIOS
-- perfil: cacador, comprador ou geologo
-- (geólogos NÃO se cadastram pelo site: são inseridos aqui no banco)
-- =====================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id      INT AUTO_INCREMENT PRIMARY KEY,
    nome    VARCHAR(100) NOT NULL,
    email   VARCHAR(150) NOT NULL UNIQUE,
    senha   VARCHAR(255) NOT NULL,              -- hash bcrypt, nunca texto puro
    perfil  ENUM('cacador', 'comprador', 'geologo') NOT NULL DEFAULT 'cacador',
    ativo   TINYINT(1) NOT NULL DEFAULT 1
);


-- =====================================================
-- 2. DESCOBERTAS
-- status:
--   pendente  = aguardando os dois laudos
--   aprovada  = dois geólogos aprovaram (está no leilão)
--   retida    = laudos divergentes (análise física)
--   reprovada = dois geólogos reprovaram
--   vendida   = leilão encerrado (o maior lance venceu)
-- =====================================================
CREATE TABLE IF NOT EXISTS descobertas (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    cacador_id       INT NOT NULL,
    nome_rocha       VARCHAR(100) NOT NULL,
    local_descoberta VARCHAR(150) NOT NULL,
    peso_kg          DECIMAL(10,3) NOT NULL,
    descricao        TEXT,
    lance_inicial    DECIMAL(12,2) NOT NULL DEFAULT 100.00,
    status           ENUM('pendente', 'aprovada', 'retida', 'reprovada', 'vendida')
                     NOT NULL DEFAULT 'pendente',
    data_registro    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_descoberta_cacador
        FOREIGN KEY (cacador_id) REFERENCES usuarios(id)
);


-- =====================================================
-- 3. FOTOS DA DESCOBERTA (guarda só o caminho do arquivo)
-- =====================================================
CREATE TABLE IF NOT EXISTS fotos_descoberta (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    descoberta_id INT NOT NULL,
    caminho       VARCHAR(255) NOT NULL,
    CONSTRAINT fk_foto_descoberta
        FOREIGN KEY (descoberta_id) REFERENCES descobertas(id)
        ON DELETE CASCADE
);


-- =====================================================
-- 4. LAUDOS (votos dos geólogos)
-- O UNIQUE impede o mesmo geólogo de votar duas vezes na mesma peça.
-- =====================================================
CREATE TABLE IF NOT EXISTS laudos (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    descoberta_id INT NOT NULL,
    geologo_id    INT NOT NULL,
    voto          ENUM('aprovado', 'reprovado') NOT NULL,
    parecer       TEXT,
    data_laudo    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_laudo_descoberta
        FOREIGN KEY (descoberta_id) REFERENCES descobertas(id),
    CONSTRAINT fk_laudo_geologo
        FOREIGN KEY (geologo_id) REFERENCES usuarios(id),
    CONSTRAINT uq_laudo_geologo_descoberta
        UNIQUE (descoberta_id, geologo_id)
);


-- =====================================================
-- 5. LANCES (leilão virtual)
-- =====================================================
CREATE TABLE IF NOT EXISTS lances (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    descoberta_id INT NOT NULL,
    usuario_id    INT NOT NULL,
    valor         DECIMAL(12,2) NOT NULL,
    data_lance    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lance_descoberta
        FOREIGN KEY (descoberta_id) REFERENCES descobertas(id),
    CONSTRAINT fk_lance_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);


-- =====================================================
-- 6. CERTIFICADOS (criado automaticamente quando a peça é aprovada)
-- =====================================================
CREATE TABLE IF NOT EXISTS certificados (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    descoberta_id INT NOT NULL UNIQUE,
    data_emissao  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_certificado_descoberta
        FOREIGN KEY (descoberta_id) REFERENCES descobertas(id)
);


-- =====================================================
-- USUÁRIOS DE TESTE (senha de todos: 123456)
-- Só cria se o e-mail ainda não existir.
-- =====================================================
INSERT INTO usuarios (nome, email, senha, perfil)
SELECT t.nome, t.email,
       '$2b$10$vRHs1VV9EGR5PoX.0kBWzOHxR09wXLBPDsDz1I1Sx1.9GgjbAPyT6',
       t.perfil
FROM (
    SELECT 'Carlos Caçador'       AS nome, 'cacador@teste.com'    AS email, 'cacador'   AS perfil
    UNION ALL SELECT 'Geóloga Ana',           'geologo1@teste.com',   'geologo'
    UNION ALL SELECT 'Geólogo Bruno',         'geologo2@teste.com',   'geologo'
    UNION ALL SELECT 'Museu de Teste',        'comprador@teste.com',  'comprador'
    UNION ALL SELECT 'Universidade de Teste', 'comprador2@teste.com', 'comprador'
) AS t
WHERE NOT EXISTS (
    SELECT 1 FROM usuarios u WHERE u.email = t.email
);


-- Conferência
SELECT id, nome, email, perfil FROM usuarios;