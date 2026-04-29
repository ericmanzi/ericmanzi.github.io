/**
 * Bananagrams Online — WebSocket Lambda Handler
 *
 * Routes:
 *   $connect    → record connection
 *   $disconnect → notify opponent, clean up
 *   $default    → game actions (createRoom, joinRoom, peel, dump, status)
 *
 * DynamoDB tables (see template.yaml):
 *   bananagrams-games       PK: roomCode
 *   bananagrams-connections PK: connectionId
 */

const {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
} = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  DeleteConnectionCommand,
} = require('@aws-sdk/client-apigatewaymanagementapi');

const { STARTING_TILES, NUM_PLAYERS, shuffle, createTileBag, generateRoomCode } = require('./utils');

const dynamo = new DynamoDBClient({});
const GAMES_TABLE = process.env.GAMES_TABLE || 'bananagrams-games';
const CONNS_TABLE = process.env.CONNS_TABLE || 'bananagrams-connections';
const TTL_SECONDS = 2 * 60 * 60; // 2 hours

// ── DynamoDB helpers ──────────────────────────────────────────────────────────

async function getGame(roomCode) {
  const res = await dynamo.send(new GetItemCommand({
    TableName: GAMES_TABLE,
    Key: marshall({ roomCode }),
  }));
  return res.Item ? unmarshall(res.Item) : null;
}

async function getConn(connectionId) {
  const res = await dynamo.send(new GetItemCommand({
    TableName: CONNS_TABLE,
    Key: marshall({ connectionId }),
  }));
  return res.Item ? unmarshall(res.Item) : null;
}

// ── WebSocket helpers ─────────────────────────────────────────────────────────

async function post(apigw, connectionId, data) {
  try {
    await apigw.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(data),
    }));
  } catch (err) {
    // 410 Gone = connection closed; ignore
    if (err.$metadata?.httpStatusCode !== 410) throw err;
  }
}

// ── Lambda entrypoint ─────────────────────────────────────────────────────────

exports.handler = async (event) => {
  const { routeKey, connectionId, domainName, stage } = event.requestContext;

  const apigw = new ApiGatewayManagementApiClient({
    endpoint: `https://${domainName}/${stage}`,
  });
  const send = (connId, data) => post(apigw, connId, data);
  const ttl = () => Math.floor(Date.now() / 1000) + TTL_SECONDS;

  try {
    // ── $connect ──────────────────────────────────────────────────────────────
    if (routeKey === '$connect') {
      await dynamo.send(new PutItemCommand({
        TableName: CONNS_TABLE,
        Item: marshall({ connectionId, roomCode: null, role: null, ttl: ttl() }),
      }));
      return { statusCode: 200 };
    }

    // ── $disconnect ───────────────────────────────────────────────────────────
    if (routeKey === '$disconnect') {
      const conn = await getConn(connectionId);
      if (conn?.roomCode) {
        const game = await getGame(conn.roomCode);
        if (game && game.status === 'playing') {
          const opponentConnId = conn.role === 'host'
            ? game.guestConnectionId
            : game.hostConnectionId;
          if (opponentConnId) {
            await send(opponentConnId, { type: 'OPPONENT_DISCONNECTED' });
          }
          // Mark game finished so no further actions are accepted
          await dynamo.send(new UpdateItemCommand({
            TableName: GAMES_TABLE,
            Key: marshall({ roomCode: conn.roomCode }),
            UpdateExpression: 'SET #s = :s',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: marshall({ ':s': 'abandoned' }),
          }));
        }
      }
      await dynamo.send(new DeleteItemCommand({
        TableName: CONNS_TABLE,
        Key: marshall({ connectionId }),
      }));
      return { statusCode: 200 };
    }

    // ── $default — game actions ───────────────────────────────────────────────
    const body = JSON.parse(event.body || '{}');
    const { action } = body;

    // createRoom ──────────────────────────────────────────────────────────────
    if (action === 'createRoom') {
      let roomCode = generateRoomCode();
      // Retry once on collision (astronomically rare at our traffic levels)
      const existing = await getGame(roomCode);
      if (existing && existing.status !== 'finished' && existing.status !== 'abandoned') {
        roomCode = generateRoomCode();
      }

      await dynamo.send(new PutItemCommand({
        TableName: GAMES_TABLE,
        Item: marshall({
          roomCode,
          status: 'waiting',
          bunch: [],
          hostConnectionId: connectionId,
          guestConnectionId: null,
          ttl: ttl(),
        }),
      }));

      // Record this connection's room association
      await dynamo.send(new UpdateItemCommand({
        TableName: CONNS_TABLE,
        Key: marshall({ connectionId }),
        UpdateExpression: 'SET roomCode = :rc, #r = :role',
        ExpressionAttributeNames: { '#r': 'role' },
        ExpressionAttributeValues: marshall({ ':rc': roomCode, ':role': 'host' }),
      }));

      await send(connectionId, { type: 'ROOM_CREATED', roomCode });
      return { statusCode: 200 };
    }

    // joinRoom ────────────────────────────────────────────────────────────────
    if (action === 'joinRoom') {
      const { roomCode } = body;
      const game = await getGame(roomCode);

      if (!game) {
        await send(connectionId, { type: 'ERROR', message: 'Room not found. Check the code and try again.' });
        return { statusCode: 200 };
      }
      if (game.status !== 'waiting') {
        await send(connectionId, { type: 'ERROR', message: 'This room is no longer available.' });
        return { statusCode: 200 };
      }

      const bag = createTileBag();
      const hostHand = bag.slice(0, STARTING_TILES);
      const guestHand = bag.slice(STARTING_TILES, STARTING_TILES * 2);
      const bunch = bag.slice(STARTING_TILES * 2);

      // Conditional update: only succeed if still 'waiting' (prevents double-join)
      try {
        await dynamo.send(new UpdateItemCommand({
          TableName: GAMES_TABLE,
          Key: marshall({ roomCode }),
          UpdateExpression: 'SET #s = :playing, bunch = :bunch, guestConnectionId = :gid, #ttl = :ttl',
          ConditionExpression: '#s = :waiting',
          ExpressionAttributeNames: { '#s': 'status', '#ttl': 'ttl' },
          ExpressionAttributeValues: marshall({
            ':playing': 'playing',
            ':waiting': 'waiting',
            ':bunch': bunch,
            ':gid': connectionId,
            ':ttl': ttl(),
          }),
        }));
      } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
          await send(connectionId, { type: 'ERROR', message: 'Someone else just joined this room.' });
          return { statusCode: 200 };
        }
        throw err;
      }

      // Record guest's connection
      await dynamo.send(new UpdateItemCommand({
        TableName: CONNS_TABLE,
        Key: marshall({ connectionId }),
        UpdateExpression: 'SET roomCode = :rc, #r = :role',
        ExpressionAttributeNames: { '#r': 'role' },
        ExpressionAttributeValues: marshall({ ':rc': roomCode, ':role': 'guest' }),
      }));

      await send(game.hostConnectionId, { type: 'GAME_START', hand: hostHand, bunchSize: bunch.length, role: 'host' });
      await send(connectionId,           { type: 'GAME_START', hand: guestHand, bunchSize: bunch.length, role: 'guest' });
      return { statusCode: 200 };
    }

    // peel ────────────────────────────────────────────────────────────────────
    if (action === 'peel') {
      const { roomCode, role } = body;
      const game = await getGame(roomCode);
      if (!game || game.status !== 'playing') return { statusCode: 200 };

      const { bunch, hostConnectionId, guestConnectionId } = game;

      if (bunch.length < NUM_PLAYERS) {
        // Caller wins — not enough tiles for everyone
        await dynamo.send(new UpdateItemCommand({
          TableName: GAMES_TABLE,
          Key: marshall({ roomCode }),
          UpdateExpression: 'SET #s = :s, winner = :w',
          ExpressionAttributeNames: { '#s': 'status' },
          ExpressionAttributeValues: marshall({ ':s': 'finished', ':w': role }),
        }));
        await send(hostConnectionId,  { type: 'GAME_OVER', winner: role });
        await send(guestConnectionId, { type: 'GAME_OVER', winner: role });
        return { statusCode: 200 };
      }

      const hostTile  = bunch[0];
      const guestTile = bunch[1];
      const newBunch  = bunch.slice(2);

      await dynamo.send(new UpdateItemCommand({
        TableName: GAMES_TABLE,
        Key: marshall({ roomCode }),
        UpdateExpression: 'SET bunch = :b',
        ExpressionAttributeValues: marshall({ ':b': newBunch }),
      }));

      await send(hostConnectionId,  { type: 'PEEL_RESULT', tile: hostTile,  bunchSize: newBunch.length, initiator: role });
      await send(guestConnectionId, { type: 'PEEL_RESULT', tile: guestTile, bunchSize: newBunch.length, initiator: role });
      return { statusCode: 200 };
    }

    // dump ────────────────────────────────────────────────────────────────────
    if (action === 'dump') {
      const { roomCode, role, tile } = body;
      const game = await getGame(roomCode);
      if (!game || game.status !== 'playing') return { statusCode: 200 };

      const callerConnId = role === 'host' ? game.hostConnectionId : game.guestConnectionId;
      const { bunch } = game;

      if (bunch.length < 3) {
        await send(callerConnId, { type: 'DUMP_ERROR', reason: 'Not enough tiles in the bunch!' });
        return { statusCode: 200 };
      }

      const newTiles = bunch.slice(0, 3);
      const newBunch = shuffle([...bunch.slice(3), tile]);

      await dynamo.send(new UpdateItemCommand({
        TableName: GAMES_TABLE,
        Key: marshall({ roomCode }),
        UpdateExpression: 'SET bunch = :b',
        ExpressionAttributeValues: marshall({ ':b': newBunch }),
      }));

      await send(callerConnId, {
        type: 'DUMP_RESULT',
        tiles: newTiles,
        removedTileId: tile.id,
        removedLetter: tile.letter,
        bunchSize: newBunch.length,
      });
      return { statusCode: 200 };
    }

    // status ──────────────────────────────────────────────────────────────────
    if (action === 'status') {
      const { roomCode, role, handSize, wordCount } = body;
      const game = await getGame(roomCode);
      if (!game) return { statusCode: 200 };

      const opponentConnId = role === 'host' ? game.guestConnectionId : game.hostConnectionId;
      if (opponentConnId) {
        await send(opponentConnId, { type: 'OPPONENT_STATUS', handSize, wordCount });
      }
      return { statusCode: 200 };
    }

    return { statusCode: 200 };

  } catch (err) {
    console.error('Unhandled error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
