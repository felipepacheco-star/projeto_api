const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'senai2026',
  database: 'tarefas_db',
  dateStrings: true
});

// Formata os dados retornados pelo banco
function formatar(linha) {
  return {
    id: linha.id,
    nome: linha.nome,
    descricao: linha.descricao,
    responsavel: linha.responsavel,
    dataTarefa: linha.data_tarefa,
    concluido: Boolean(linha.concluido)
  };
}

// Valida os dados recebidos
function validar(corpo) {
  if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) {
    return 'Envie os dados da tarefa em formato JSON';
  }

  if (typeof corpo.nome !== 'string' || !corpo.nome.trim()) {
    return 'O nome é obrigatório';
  }

  if (
    typeof corpo.responsavel !== 'string' ||
    !corpo.responsavel.trim()
  ) {
    return 'O responsável é obrigatório';
  }

  if (
    typeof corpo.dataTarefa !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(corpo.dataTarefa) ||
    !Number.isFinite(Date.parse(corpo.dataTarefa)) ||
    new Date(corpo.dataTarefa).toISOString().slice(0, 10) !== corpo.dataTarefa
  ) {
    return 'Informe uma data válida no formato yyyy-MM-dd';
  }

  if (
    corpo.concluido !== undefined &&
    typeof corpo.concluido !== 'boolean'
  ) {
    return 'O campo concluido deve ser true ou false';
  }

  return null;
}

// CADASTRAR TAREFA
app.post('/tarefas', async (req, res, next) => {
  try {
    const erro = validar(req.body);

    if (erro) {
      return res.status(400).json({ erro });
    }

    const {
      nome,
      descricao,
      responsavel,
      dataTarefa,
      concluido
    } = req.body;

    const [resultado] = await db.execute(
      `INSERT INTO tarefas
      (nome, descricao, responsavel, data_tarefa, concluido)
      VALUES (?, ?, ?, ?, ?)`,
      [
        nome.trim(),
        descricao ?? null,
        responsavel.trim(),
        dataTarefa,
        concluido ?? false
      ]
    );

    res.status(201).json({
      id: resultado.insertId,
      nome: nome.trim(),
      descricao: descricao ?? null,
      responsavel: responsavel.trim(),
      dataTarefa,
      concluido: concluido ?? false
    });
  } catch (erro) {
    next(erro);
  }
});

// LISTAR TAREFAS POR PERÍODO
app.get('/tarefas', async (req, res, next) => {
  try {
    const { inicio, fim } = req.query;

    if (!inicio || !fim) {
      return res.status(400).json({
        erro: 'Informe inicio e fim (yyyy-MM-dd)'
      });
    }

    const [linhas] = await db.execute(
      `SELECT * FROM tarefas
       WHERE data_tarefa BETWEEN ? AND ?
       ORDER BY data_tarefa, id`,
      [inicio, fim]
    );

    res.json(linhas.map(formatar));
  } catch (erro) {
    next(erro);
  }
});

// BUSCAR TAREFA POR ID
app.get('/tarefas/:id', async (req, res, next) => {
  try {
    const [linhas] = await db.execute(
      'SELECT * FROM tarefas WHERE id = ?',
      [req.params.id]
    );

    if (linhas.length === 0) {
      return res.status(404).json({
        erro: 'Tarefa não encontrada'
      });
    }

    res.json(formatar(linhas[0]));
  } catch (erro) {
    next(erro);
  }
});

// ATUALIZAR TAREFA
app.put('/tarefas/:id', async (req, res, next) => {
  try {
    const erro = validar(req.body);

    if (erro) {
      return res.status(400).json({ erro });
    }

    const {
      nome,
      descricao,
      responsavel,
      dataTarefa,
      concluido
    } = req.body;

    const [resultado] = await db.execute(
      `UPDATE tarefas
       SET nome = ?, descricao = ?, responsavel = ?,
           data_tarefa = ?, concluido = ?
       WHERE id = ?`,
      [
        nome.trim(),
        descricao ?? null,
        responsavel.trim(),
        dataTarefa,
        concluido ?? false,
        req.params.id
      ]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        erro: 'Tarefa não encontrada'
      });
    }

    res.json({
      id: Number(req.params.id),
      nome: nome.trim(),
      descricao: descricao ?? null,
      responsavel: responsavel.trim(),
      dataTarefa,
      concluido: concluido ?? false
    });
  } catch (erro) {
    next(erro);
  }
});

// EXCLUIR TAREFA
app.delete('/tarefas/:id', async (req, res, next) => {
  try {
    const [resultado] = await db.execute(
      'DELETE FROM tarefas WHERE id = ?',
      [req.params.id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        erro: 'Tarefa não encontrada'
      });
    }

    res.status(204).send();
  } catch (erro) {
    next(erro);
  }
});

// TRATAMENTO DE ERROS
app.use((erro, req, res, next) => {
  console.error('Erro na API:', erro);

  if (res.headersSent) {
    return next(erro);
  }

  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({
      erro: 'JSON inválido. Confira o formato enviado.'
    });
  }

  res.status(500).json({
    erro: 'Erro interno do servidor',
    detalhe: erro.message
  });
});

// TESTA A CONEXÃO ANTES DE INICIAR A API
async function iniciarServidor() {
  try {
    await db.query('SELECT 1');

    app.listen(3000, () => {
      console.log('API rodando em http://localhost:3000');
      console.log('Conexão com o MariaDB funcionando!');
    });
  } catch (erro) {
    console.error('Não foi possível conectar ao MariaDB:', erro.message);
  }
}

iniciarServidor();