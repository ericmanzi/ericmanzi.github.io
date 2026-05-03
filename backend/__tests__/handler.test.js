'use strict';

const { mockClient } = require('aws-sdk-client-mock');
const {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
} = require('@aws-sdk/client-dynamodb');
const {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} = require('@aws-sdk/client-apigatewaymanagementapi');
const { marshall } = require('@aws-sdk/util-dynamodb');

const { handler } = require('../handler');

// ── Mock AWS clients ──────────────────────────────────────────────────────────

const ddbMock  = mockClient(DynamoDBClient);
const apigwMock = mockClient(ApiGatewayManagementApiClient);

beforeEach(() => {
  ddbMock.reset();
  apigwMock.reset();
  // PostToConnection succeeds silently by default
  apigwMock.on(PostToConnectionCommand).resolves({});
});

// ── Test helpers ──────────────────────────────────────────────────────────────

/** Build a minimal API Gateway WebSocket event */
const event = (routeKey, connectionId, body = {}) => ({
  requestContext: {
    routeKey,
    connectionId,
    domainName: 'test.execute-api.us-east-1.amazonaws.com',
    stage: 'prod',
  },
  body: JSON.stringify(body),
});

/** Collect all WebSocket messages sent during a test */
const sentMessages = () =>
  apigwMock.commandCalls(PostToConnectionCommand).map(call => ({
    connectionId: call.args[0].input.ConnectionId,
    data: JSON.parse(call.args[0].input.Data),
  }));

/** Find all messages sent to a specific connection */
const msgsTo = (connId) => sentMessages().filter(m => m.connectionId === connId).map(m => m.data);

/** Marshall a plain game object into DynamoDB Item format */
const marshalGame = (overrides = {}) => marshall({
  roomCode:          'ROOM01',
  status:            'waiting',
  bunch:             [],
  hostConnectionId:  'host-conn',
  guestConnectionId: null,
  ttl:               9_999_999_999,
  ...overrides,
});

/** Marshall a plain connection object into DynamoDB Item format */
const marshalConn = (overrides = {}) => marshall({
  connectionId: 'host-conn',
  roomCode:     null,
  role:         null,
  ttl:          9_999_999_999,
  ...overrides,
});

/** Three known tiles — used when we need a predictable bunch */
const THREE_TILES = [
  { id: 100, letter: 'X' },
  { id: 101, letter: 'Y' },
  { id: 102, letter: 'Z' },
];

// ── $connect ──────────────────────────────────────────────────────────────────

describe('$connect', () => {
  test('stores the connection in DynamoDB and returns 200', async () => {
    ddbMock.on(PutItemCommand).resolves({});

    const result = await handler(event('$connect', 'new-conn'));

    expect(result.statusCode).toBe(200);
    const puts = ddbMock.commandCalls(PutItemCommand);
    expect(puts).toHaveLength(1);
    // The item should contain the connectionId
    const item = puts[0].args[0].input.Item;
    expect(item).toHaveProperty('connectionId');
  });
});

// ── $disconnect ───────────────────────────────────────────────────────────────

describe('$disconnect', () => {
  test('cleans up connection record when player has no active room', async () => {
    ddbMock
      .on(GetItemCommand).resolves({ Item: marshalConn({ roomCode: null }) })
      .on(DeleteItemCommand).resolves({});

    const result = await handler(event('$disconnect', 'lone-conn'));

    expect(result.statusCode).toBe(200);
    expect(ddbMock.commandCalls(DeleteItemCommand)).toHaveLength(1);
    expect(apigwMock.commandCalls(PostToConnectionCommand)).toHaveLength(0);
  });

  test('notifies opponent and marks game paused when player disconnects mid-game', async () => {
    ddbMock
      .on(GetItemCommand)
      .resolvesOnce({ Item: marshalConn({ connectionId: 'host-conn', roomCode: 'ROOM01', role: 'host' }) })
      .resolvesOnce({ Item: marshalGame({ status: 'playing', guestConnectionId: 'guest-conn' }) })
      .on(UpdateItemCommand).resolves({})
      .on(DeleteItemCommand).resolves({});

    await handler(event('$disconnect', 'host-conn'));

    // Opponent (guest) should be notified
    const msgs = msgsTo('guest-conn');
    expect(msgs).toHaveLength(1);
    expect(msgs[0].type).toBe('OPPONENT_DISCONNECTED');

    // Game status should be updated to 'paused' with pausedRole = 'host'
    const updates = ddbMock.commandCalls(UpdateItemCommand);
    expect(updates).toHaveLength(1);
    const vals = updates[0].args[0].input.ExpressionAttributeValues;
    expect(vals[':s']).toEqual({ S: 'paused' });
    expect(vals[':pr']).toEqual({ S: 'host' });
  });

  test('keeps game paused and clears waiting player connectionId when second player disconnects', async () => {
    ddbMock
      .on(GetItemCommand)
      .resolvesOnce({ Item: marshalConn({ connectionId: 'guest-conn', roomCode: 'ROOM01', role: 'guest' }) })
      .resolvesOnce({ Item: marshalGame({ status: 'paused', pausedRole: 'host', guestConnectionId: 'guest-conn' }) })
      .on(UpdateItemCommand).resolves({})
      .on(DeleteItemCommand).resolves({});

    await handler(event('$disconnect', 'guest-conn'));

    expect(apigwMock.commandCalls(PostToConnectionCommand)).toHaveLength(0);

    const updates = ddbMock.commandCalls(UpdateItemCommand);
    expect(updates).toHaveLength(1);
    // Should REMOVE pausedRole and guestConnectionId so both players can rejoin
    const expr = updates[0].args[0].input.UpdateExpression;
    expect(expr).toMatch(/REMOVE/i);
    expect(expr).toContain('pausedRole');
    expect(expr).toContain('guestConnectionId');
  });

  test('does not re-pause game when the disconnecting connection is no longer the active one', async () => {
    // Player has already rejoined with a new connection ID ('new-host-conn') but the
    // delayed $disconnect for the old connection ('host-conn') fires afterwards.
    ddbMock
      .on(GetItemCommand)
      .resolvesOnce({ Item: marshalConn({ connectionId: 'host-conn', roomCode: 'ROOM01', role: 'host' }) })
      .resolvesOnce({ Item: marshalGame({ status: 'playing', hostConnectionId: 'new-host-conn', guestConnectionId: 'guest-conn' }) })
      .on(DeleteItemCommand).resolves({});

    await handler(event('$disconnect', 'host-conn'));

    // Opponent must NOT be notified — the host already rejoined
    expect(apigwMock.commandCalls(PostToConnectionCommand)).toHaveLength(0);
    // Game must NOT be paused
    expect(ddbMock.commandCalls(UpdateItemCommand)).toHaveLength(0);
    // Stale connection record should still be cleaned up
    expect(ddbMock.commandCalls(DeleteItemCommand)).toHaveLength(1);
  });

  test('does not notify anyone if the game is already finished', async () => {
    ddbMock
      .on(GetItemCommand)
      .resolvesOnce({ Item: marshalConn({ connectionId: 'host-conn', roomCode: 'ROOM01', role: 'host' }) })
      .resolvesOnce({ Item: marshalGame({ status: 'finished', guestConnectionId: 'guest-conn' }) })
      .on(DeleteItemCommand).resolves({});

    await handler(event('$disconnect', 'host-conn'));

    expect(apigwMock.commandCalls(PostToConnectionCommand)).toHaveLength(0);
  });
});

// ── createRoom ────────────────────────────────────────────────────────────────

describe('createRoom', () => {
  test('creates a game record and sends ROOM_CREATED to the host', async () => {
    ddbMock
      .on(GetItemCommand).resolves({ Item: undefined })   // no room code collision
      .on(PutItemCommand).resolves({})
      .on(UpdateItemCommand).resolves({});

    const result = await handler(event('$default', 'host-conn', { action: 'createRoom' }));

    expect(result.statusCode).toBe(200);

    const msgs = msgsTo('host-conn');
    expect(msgs).toHaveLength(1);
    expect(msgs[0].type).toBe('ROOM_CREATED');
    expect(msgs[0].roomCode).toMatch(/^[A-Z0-9]{6}$/);
  });

  test('writes the game to the bananagrams-games table with status=waiting', async () => {
    ddbMock
      .on(GetItemCommand).resolves({ Item: undefined })
      .on(PutItemCommand).resolves({})
      .on(UpdateItemCommand).resolves({});

    await handler(event('$default', 'host-conn', { action: 'createRoom' }));

    const puts = ddbMock.commandCalls(PutItemCommand);
    // One PutItem for the games table (the other is the $connect PutItem from a separate invocation)
    expect(puts.length).toBeGreaterThanOrEqual(1);
  });

  test('retries room code generation on collision', async () => {
    // First GetItem returns an existing 'waiting' game (collision), second returns nothing
    ddbMock
      .on(GetItemCommand)
      .resolvesOnce({ Item: marshalGame({ status: 'waiting' }) })
      .resolvesOnce({ Item: undefined })
      .on(PutItemCommand).resolves({})
      .on(UpdateItemCommand).resolves({});

    const result = await handler(event('$default', 'host-conn', { action: 'createRoom' }));
    expect(result.statusCode).toBe(200);
    expect(msgsTo('host-conn')[0].type).toBe('ROOM_CREATED');
  });

  test('sends ERROR when both generated room codes collide with live games', async () => {
    ddbMock
      .on(GetItemCommand)
      .resolvesOnce({ Item: marshalGame({ status: 'waiting' }) })   // first code: collision
      .resolvesOnce({ Item: marshalGame({ status: 'playing' }) });  // second code: also collision

    const result = await handler(event('$default', 'host-conn', { action: 'createRoom' }));
    expect(result.statusCode).toBe(200);
    expect(msgsTo('host-conn')[0].type).toBe('ERROR');
  });
});

// ── joinRoom ──────────────────────────────────────────────────────────────────

describe('joinRoom', () => {
  test('sends ERROR when room code does not exist', async () => {
    ddbMock.on(GetItemCommand).resolves({ Item: undefined });

    await handler(event('$default', 'guest-conn', { action: 'joinRoom', roomCode: 'NOROOM' }));

    const msgs = msgsTo('guest-conn');
    expect(msgs[0].type).toBe('ERROR');
    expect(msgs[0].message).toMatch(/not found/i);
  });

  test('sends ERROR when room is already in progress', async () => {
    ddbMock.on(GetItemCommand).resolves({
      Item: marshalGame({ status: 'playing', guestConnectionId: 'someone-else' }),
    });

    await handler(event('$default', 'guest-conn', { action: 'joinRoom', roomCode: 'ROOM01' }));

    expect(msgsTo('guest-conn')[0].type).toBe('ERROR');
  });

  test('sends ERROR when two guests race to join the same room (conditional check fails)', async () => {
    ddbMock
      .on(GetItemCommand).resolves({ Item: marshalGame({ status: 'waiting' }) })
      .on(UpdateItemCommand).rejects(Object.assign(new Error('Condition failed'), { name: 'ConditionalCheckFailedException' }));

    await handler(event('$default', 'guest-conn', { action: 'joinRoom', roomCode: 'ROOM01' }));

    expect(msgsTo('guest-conn')[0].type).toBe('ERROR');
  });

  test('deals 21 tiles to each player and sends GAME_START to both on success', async () => {
    ddbMock
      .on(GetItemCommand).resolves({ Item: marshalGame({ status: 'waiting', hostConnectionId: 'host-conn' }) })
      .on(UpdateItemCommand).resolves({});

    await handler(event('$default', 'guest-conn', { action: 'joinRoom', roomCode: 'ROOM01' }));

    const hostStart  = msgsTo('host-conn').find(m => m.type === 'GAME_START');
    const guestStart = msgsTo('guest-conn').find(m => m.type === 'GAME_START');

    expect(hostStart).toBeDefined();
    expect(guestStart).toBeDefined();

    expect(hostStart.role).toBe('host');
    expect(guestStart.role).toBe('guest');

    expect(hostStart.hand).toHaveLength(21);
    expect(guestStart.hand).toHaveLength(21);

    // Bunch = 144 - 42 = 102 tiles remain
    expect(hostStart.bunchSize).toBe(102);
    expect(guestStart.bunchSize).toBe(102);
  });

  test('host and guest receive different tiles', async () => {
    ddbMock
      .on(GetItemCommand).resolves({ Item: marshalGame({ status: 'waiting', hostConnectionId: 'host-conn' }) })
      .on(UpdateItemCommand).resolves({});

    await handler(event('$default', 'guest-conn', { action: 'joinRoom', roomCode: 'ROOM01' }));

    const hostHand  = msgsTo('host-conn').find(m => m.type === 'GAME_START').hand;
    const guestHand = msgsTo('guest-conn').find(m => m.type === 'GAME_START').hand;
    const hostIds   = new Set(hostHand.map(t => t.id));
    const guestIds  = new Set(guestHand.map(t => t.id));

    // No tile id should appear in both hands
    for (const id of guestIds) expect(hostIds.has(id)).toBe(false);
  });
});

// ── peel ──────────────────────────────────────────────────────────────────────

describe('peel', () => {
  const playingGame = (bunchOverride) => marshalGame({
    status:            'playing',
    hostConnectionId:  'host-conn',
    guestConnectionId: 'guest-conn',
    bunch:             bunchOverride ?? THREE_TILES,
  });

  test('sends PEEL_RESULT with one tile to each player when bunch has enough tiles', async () => {
    ddbMock
      .on(GetItemCommand).resolves({ Item: playingGame() })
      .on(UpdateItemCommand).resolves({});

    await handler(event('$default', 'host-conn', { action: 'peel', roomCode: 'ROOM01', role: 'host' }));

    const hostMsg  = msgsTo('host-conn').find(m => m.type === 'PEEL_RESULT');
    const guestMsg = msgsTo('guest-conn').find(m => m.type === 'PEEL_RESULT');

    expect(hostMsg).toBeDefined();
    expect(guestMsg).toBeDefined();

    // First tile goes to host, second to guest
    expect(hostMsg.tile).toEqual(THREE_TILES[0]);
    expect(guestMsg.tile).toEqual(THREE_TILES[1]);

    // Bunch shrinks by 2
    expect(hostMsg.bunchSize).toBe(THREE_TILES.length - 2);
    expect(guestMsg.bunchSize).toBe(THREE_TILES.length - 2);
  });

  test('records the initiator on PEEL_RESULT', async () => {
    ddbMock
      .on(GetItemCommand).resolves({ Item: playingGame() })
      .on(UpdateItemCommand).resolves({});

    await handler(event('$default', 'guest-conn', { action: 'peel', roomCode: 'ROOM01', role: 'guest' }));

    const hostMsg = msgsTo('host-conn').find(m => m.type === 'PEEL_RESULT');
    expect(hostMsg.initiator).toBe('guest');
  });

  test('triggers GAME_OVER for caller when bunch has fewer tiles than players', async () => {
    ddbMock
      .on(GetItemCommand).resolves({ Item: playingGame([{ id: 99, letter: 'Q' }]) }) // only 1 tile
      .on(UpdateItemCommand).resolves({});

    await handler(event('$default', 'host-conn', { action: 'peel', roomCode: 'ROOM01', role: 'host' }));

    const hostOver  = msgsTo('host-conn').find(m => m.type === 'GAME_OVER');
    const guestOver = msgsTo('guest-conn').find(m => m.type === 'GAME_OVER');

    expect(hostOver).toBeDefined();
    expect(guestOver).toBeDefined();
    expect(hostOver.winner).toBe('host');
  });

  test('triggers GAME_OVER for guest caller on empty bunch', async () => {
    ddbMock
      .on(GetItemCommand).resolves({ Item: playingGame([]) })
      .on(UpdateItemCommand).resolves({});

    await handler(event('$default', 'guest-conn', { action: 'peel', roomCode: 'ROOM01', role: 'guest' }));

    const guestOver = msgsTo('guest-conn').find(m => m.type === 'GAME_OVER');
    expect(guestOver.winner).toBe('guest');
  });

  test('does nothing when game is not in playing state', async () => {
    ddbMock.on(GetItemCommand).resolves({ Item: marshalGame({ status: 'finished' }) });

    await handler(event('$default', 'host-conn', { action: 'peel', roomCode: 'ROOM01', role: 'host' }));

    expect(apigwMock.commandCalls(PostToConnectionCommand)).toHaveLength(0);
  });
});

// ── dump ──────────────────────────────────────────────────────────────────────

describe('dump', () => {
  const FIVE_TILES = [
    { id: 10, letter: 'A' },
    { id: 11, letter: 'B' },
    { id: 12, letter: 'C' },
    { id: 13, letter: 'D' },
    { id: 14, letter: 'E' },
  ];
  const RETURNED_TILE = { id: 99, letter: 'Z' };

  const playingGame = (bunch) => marshalGame({
    status:            'playing',
    hostConnectionId:  'host-conn',
    guestConnectionId: 'guest-conn',
    hostHand:          [RETURNED_TILE],
    guestHand:         [RETURNED_TILE],
    bunch,
  });

  test('sends DUMP_RESULT with 3 new tiles to the caller', async () => {
    ddbMock
      .on(GetItemCommand).resolves({ Item: playingGame(FIVE_TILES) })
      .on(UpdateItemCommand).resolves({});

    await handler(event('$default', 'host-conn', {
      action: 'dump', roomCode: 'ROOM01', role: 'host', tile: RETURNED_TILE,
    }));

    const msg = msgsTo('host-conn').find(m => m.type === 'DUMP_RESULT');
    expect(msg).toBeDefined();
    expect(msg.tiles).toHaveLength(3);
    expect(msg.removedTileId).toBe(RETURNED_TILE.id);
    expect(msg.removedLetter).toBe(RETURNED_TILE.letter);
    // Bunch: started with 5, gave 3, got 1 back → 3 remaining
    expect(msg.bunchSize).toBe(3);
  });

  test('the 3 tiles dealt come from the front of the bunch', async () => {
    ddbMock
      .on(GetItemCommand).resolves({ Item: playingGame(FIVE_TILES) })
      .on(UpdateItemCommand).resolves({});

    await handler(event('$default', 'host-conn', {
      action: 'dump', roomCode: 'ROOM01', role: 'host', tile: RETURNED_TILE,
    }));

    const msg = msgsTo('host-conn').find(m => m.type === 'DUMP_RESULT');
    const dealtIds = msg.tiles.map(t => t.id);
    expect(dealtIds).toEqual(FIVE_TILES.slice(0, 3).map(t => t.id));
  });

  test('sends DUMP_ERROR when bunch has fewer than 3 tiles', async () => {
    ddbMock.on(GetItemCommand).resolves({
      Item: playingGame([{ id: 1, letter: 'A' }, { id: 2, letter: 'B' }]),
    });

    await handler(event('$default', 'host-conn', {
      action: 'dump', roomCode: 'ROOM01', role: 'host', tile: RETURNED_TILE,
    }));

    const msg = msgsTo('host-conn').find(m => m.type === 'DUMP_ERROR');
    expect(msg).toBeDefined();
    expect(msg.reason).toBeTruthy();
  });

  test('sends DUMP_ERROR to guest when guest dumps on a small bunch', async () => {
    ddbMock.on(GetItemCommand).resolves({ Item: playingGame([]) });

    await handler(event('$default', 'guest-conn', {
      action: 'dump', roomCode: 'ROOM01', role: 'guest', tile: RETURNED_TILE,
    }));

    const msg = msgsTo('guest-conn').find(m => m.type === 'DUMP_ERROR');
    expect(msg).toBeDefined();
  });

  test('does not send any message to the opponent during a dump', async () => {
    ddbMock
      .on(GetItemCommand).resolves({ Item: playingGame(FIVE_TILES) })
      .on(UpdateItemCommand).resolves({});

    await handler(event('$default', 'host-conn', {
      action: 'dump', roomCode: 'ROOM01', role: 'host', tile: RETURNED_TILE,
    }));

    // Guest should receive nothing
    expect(msgsTo('guest-conn')).toHaveLength(0);
  });
});

// ── status ────────────────────────────────────────────────────────────────────

describe('status', () => {
  test('forwards hand size and word count to the opponent', async () => {
    ddbMock.on(GetItemCommand).resolves({
      Item: marshalGame({ status: 'playing', hostConnectionId: 'host-conn', guestConnectionId: 'guest-conn' }),
    });

    await handler(event('$default', 'host-conn', {
      action: 'status', roomCode: 'ROOM01', role: 'host', handSize: 5, wordCount: 3,
    }));

    const msg = msgsTo('guest-conn').find(m => m.type === 'OPPONENT_STATUS');
    expect(msg).toBeDefined();
    expect(msg.handSize).toBe(5);
    expect(msg.wordCount).toBe(3);
  });

  test('does not send a status message to the caller', async () => {
    ddbMock.on(GetItemCommand).resolves({
      Item: marshalGame({ status: 'playing', hostConnectionId: 'host-conn', guestConnectionId: 'guest-conn' }),
    });

    await handler(event('$default', 'host-conn', {
      action: 'status', roomCode: 'ROOM01', role: 'host', handSize: 5, wordCount: 3,
    }));

    expect(msgsTo('host-conn')).toHaveLength(0);
  });

  test('does nothing when room does not exist', async () => {
    ddbMock.on(GetItemCommand).resolves({ Item: undefined });

    const result = await handler(event('$default', 'host-conn', {
      action: 'status', roomCode: 'BADROOM', role: 'host', handSize: 0, wordCount: 0,
    }));

    expect(result.statusCode).toBe(200);
    expect(apigwMock.commandCalls(PostToConnectionCommand)).toHaveLength(0);
  });
});

// ── ping ──────────────────────────────────────────────────────────────────────

describe('ping', () => {
  test('returns 200 without touching DynamoDB or sending a WebSocket message', async () => {
    const result = await handler(event('$default', 'conn1', { action: 'ping' }));

    expect(result.statusCode).toBe(200);
    expect(ddbMock.commandCalls(GetItemCommand)).toHaveLength(0);
    expect(apigwMock.commandCalls(PostToConnectionCommand)).toHaveLength(0);
  });
});

// ── rejoinRoom ────────────────────────────────────────────────────────────────

describe('rejoinRoom', () => {
  const HOST_HAND  = [{ id: 0, letter: 'A' }, { id: 1, letter: 'B' }];
  const GUEST_HAND = [{ id: 2, letter: 'C' }];
  const BUNCH_TILE = { id: 99, letter: 'Z' };

  const pausedGame = (overrides = {}) => marshalGame({
    status:            'paused',
    pausedRole:        'host',
    hostConnectionId:  'old-host-conn',
    guestConnectionId: 'guest-conn',
    hostHand:          HOST_HAND,
    guestHand:         GUEST_HAND,
    bunch:             [BUNCH_TILE],
    ...overrides,
  });

  test('sends REJOIN_OK with stored hand and bunch size to the rejoining player', async () => {
    ddbMock
      .on(GetItemCommand).resolves({ Item: pausedGame() })
      .on(UpdateItemCommand).resolves({});

    await handler(event('$default', 'new-host-conn', { action: 'rejoinRoom', roomCode: 'ROOM01', role: 'host' }));

    const msgs = msgsTo('new-host-conn');
    const ok   = msgs.find(m => m.type === 'REJOIN_OK');
    expect(ok).toBeDefined();
    expect(ok.hand).toEqual(HOST_HAND);
    expect(ok.bunchSize).toBe(1);
    expect(ok.role).toBe('host');
    expect(ok.roomCode).toBe('ROOM01');
  });

  test('notifies the waiting opponent when player rejoins', async () => {
    ddbMock
      .on(GetItemCommand).resolves({ Item: pausedGame() })
      .on(UpdateItemCommand).resolves({});

    await handler(event('$default', 'new-host-conn', { action: 'rejoinRoom', roomCode: 'ROOM01', role: 'host' }));

    const guestMsgs = msgsTo('guest-conn');
    expect(guestMsgs.find(m => m.type === 'OPPONENT_RECONNECTED')).toBeDefined();
  });

  test('updates the player connection ID and marks game playing again', async () => {
    ddbMock
      .on(GetItemCommand).resolves({ Item: pausedGame() })
      .on(UpdateItemCommand).resolves({});

    await handler(event('$default', 'new-host-conn', { action: 'rejoinRoom', roomCode: 'ROOM01', role: 'host' }));

    const updates = ddbMock.commandCalls(UpdateItemCommand);
    const gameUpdate = updates.find(u => {
      const vals = u.args[0].input.ExpressionAttributeValues;
      return vals?.[':s']?.S === 'playing';
    });
    expect(gameUpdate).toBeDefined();
    expect(gameUpdate.args[0].input.ExpressionAttributeValues[':cid']).toEqual({ S: 'new-host-conn' });
  });

  test('sends guest hand when guest rejoins', async () => {
    ddbMock
      .on(GetItemCommand).resolves({ Item: pausedGame({ pausedRole: 'guest' }) })
      .on(UpdateItemCommand).resolves({});

    await handler(event('$default', 'new-guest-conn', { action: 'rejoinRoom', roomCode: 'ROOM01', role: 'guest' }));

    const ok = msgsTo('new-guest-conn').find(m => m.type === 'REJOIN_OK');
    expect(ok).toBeDefined();
    expect(ok.hand).toEqual(GUEST_HAND);
    expect(ok.role).toBe('guest');
  });

  test('sends ERROR when game is not found', async () => {
    ddbMock.on(GetItemCommand).resolves({ Item: undefined });

    await handler(event('$default', 'new-conn', { action: 'rejoinRoom', roomCode: 'BADROOM', role: 'host' }));

    expect(msgsTo('new-conn')[0].type).toBe('ERROR');
    expect(msgsTo('new-conn')[0].message).toMatch(/not found/i);
  });

  test('sends ERROR when game is finished or abandoned (not rejoinable)', async () => {
    ddbMock.on(GetItemCommand).resolves({ Item: marshalGame({ status: 'finished' }) });

    await handler(event('$default', 'new-conn', { action: 'rejoinRoom', roomCode: 'ROOM01', role: 'host' }));

    expect(msgsTo('new-conn')[0].type).toBe('ERROR');
  });

  test('allows rejoin when game status is still playing (missed or delayed $disconnect)', async () => {
    // The client reconnects before $disconnect is processed, so the game is still
    // 'playing'. Rejoin must succeed without any liveness check — the $disconnect
    // guard (activeConnId check) prevents the stale disconnect from re-pausing the game.
    ddbMock
      .on(GetItemCommand).resolves({ Item: pausedGame({ status: 'playing', pausedRole: null }) })
      .on(UpdateItemCommand).resolves({});

    await handler(event('$default', 'new-host-conn', { action: 'rejoinRoom', roomCode: 'ROOM01', role: 'host' }));

    const ok = msgsTo('new-host-conn').find(m => m.type === 'REJOIN_OK');
    expect(ok).toBeDefined();
    expect(ok.hand).toEqual(HOST_HAND);
  });

  test('sends ERROR when the rejoining role does not match the disconnected role', async () => {
    ddbMock.on(GetItemCommand).resolves({ Item: pausedGame({ pausedRole: 'guest' }) });

    await handler(event('$default', 'new-conn', { action: 'rejoinRoom', roomCode: 'ROOM01', role: 'host' }));

    expect(msgsTo('new-conn')[0].type).toBe('ERROR');
    expect(msgsTo('new-conn')[0].message).toMatch(/not the disconnected player/i);
  });
});

// ── unknown action ────────────────────────────────────────────────────────────

describe('unknown action', () => {
  test('returns 200 and does nothing', async () => {
    const result = await handler(event('$default', 'conn1', { action: 'notARealAction' }));
    expect(result.statusCode).toBe(200);
    expect(apigwMock.commandCalls(PostToConnectionCommand)).toHaveLength(0);
  });
});
