const key = require('./keys');

// express set up
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// postgress set up
const { Client } = require('pg');
const keys = require('./keys');
const pgClient = new Client({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
});

pgClient.on('error', () => console.log('No PG connection'));

pgClient
  .connect()
  .then(() => console.log('connected'))
  .catch((err) => console.error('connection error', err.stack));

pgClient.query('CREATE TABLE IF NOT EXISTS values (number INT)', (err, res) => {
  if (err) throw err;
  console.log(res);
});

// redis client setup
const redis = require('redis');

const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000,
});

const redisPublisher = redisClient.duplicate();

// express route handlres

app.get('/', (req, res) => {
  res.send('Hi :)');
});

app.get('/values/all', async (req, res) => {
  const values = await pgClient
    .query('SELECT * from values')
    .then((res) => {
      return res;
    })
    .catch((err) => {
      console.log(err);
    });
  res.send(values.rows);
});

app.get('/values/current', async (req, res) => {
  redisClient.hgetall('values', (err, values) => {
    res.send(values);
  });
});

app.post('/values', async (req, res) => {
  const index = req.body.index;

  if (parseInt(index) > 40) {
    return res.status(422).send('Index too high');
  }

  redisClient.hset('values', index, 'Nothing yet!');
  redisPublisher.publish('insert', index);
  pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

  res.send({ working: true });
});

app.listen(5000, (erro) => {
  console.log('Listening');
});
