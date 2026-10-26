CREATE DATABASE IF NOT EXISTS tarefas_db;

USE tarefas_db;

CREATE TABLE IF NOT EXISTS tarefas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(500),
    responsavel VARCHAR(100) NOT NULL,
    data_tarefa DATE NOT NULL,
    concluido BOOLEAN NOT NULL DEFAULT FALSE
);
