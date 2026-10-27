const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());


const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'tarefas_db',
  dateStrings: true
});

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

function validar(corpo) {
  if (!corpo.nome) return 'O nome é obrigatório';
  if (!corpo.responsavel) return 'O responsável é obrigatório';
  if (!corpo.dataTarefa) {
    return 'A data da tarefa é obrigatória (yyyy-MM-dd)';
  }

  return null;
}

// POST - Criar tarefa
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
      'INSERT INTO tarefas (nome, descricao, responsavel, data_tarefa, concluido) VALUES (?, ?, ?, ?, ?)',
      [
        nome,
        descricao ?? null,
        responsavel,
        dataTarefa,
        concluido ?? false
      ]
    );

    res.status(201).json({
      id: resultado.insertId,
      ...req.body
    });

  } catch (erro) {
    next(erro);
  }
});

app.get('/tarefas', async (req, res, next) => {
  try {
    const { inicio, fim } = req.query;

    if (!inicio || !fim) {
      return res.status(400).json({
        erro: 'Informe inicio e fim (yyyy-MM-dd)'
      });
    }

    const [linhas] = await db.execute(
      'SELECT * FROM tarefas WHERE data_tarefa BETWEEN ? AND ? ORDER BY data_tarefa, id',
      [inicio, fim]
    );

    res.json(linhas.map(formatar));

  } catch (erro) {
    next(erro);
  }
});


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
      'UPDATE tarefas SET nome = ?, descricao = ?, responsavel = ?, data_tarefa = ?, concluido = ? WHERE id = ?',
      [
        nome,
        descricao ?? null,
        responsavel,
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
      ...req.body
    });

  } catch (erro) {
    next(erro);
  }
});


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


app.use((erro, req, res, next) => {
  console.error(erro);

  res.status(500).json({
    erro: 'Erro interno do servidor'
  });
});

app.listen(3000, () => {
  console.log('API rodando em http://localhost:3000');
});