const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { WebSocketServer } = require('ws');
const { Client } = require('../.homeybuild/lib/Client');
const { Switch } = require('../.homeybuild/lib/Switch');
const { Dimmer } = require('../.homeybuild/lib/Dimmer');
const { normaliseFunctionId, parseConfiguration } = require('../.homeybuild/lib/protocol');
const SYSTEM = '00000000-0000-0000-0000-000000000000';
const channel = (functionID = '7', value = '0') => ({ displayName: 'Light', functionID,
  inputs: { idp0000: { pairingID: 1, value: '0' } }, outputs: { odp0000: { pairingID: 256, value } } });
const config = channels => ({ [SYSTEM]: { devices: { ABB123: { channels } } } });
function waitFor(emitter, event, predicate) {
  if (predicate()) { return Promise.resolve(); }
  return new Promise(resolve => { const listener = () => { if (predicate()) { emitter.removeListener(event, listener); resolve(); } }; emitter.on(event, listener); });
}
async function fixture(t, initial = config({ ch0000: channel() })) {
  const state = { config: initial, status: 200, commands: [], commandStatus: 204, commandBody: '', auth: [] };
  const server = http.createServer(async (request, response) => {
    state.auth.push(request.headers.authorization);
    if (request.method === 'PUT') {
      let body = ''; for await (const chunk of request) { body += chunk; }
      state.commands.push({ path: request.url, body });
      response.writeHead(state.commandStatus); response.end(state.commandBody); return;
    }
    response.writeHead(state.status, { 'Content-Type': 'application/json' });
    response.end(typeof state.config === 'string' ? state.config : JSON.stringify(state.config));
  });
  const sockets = new WebSocketServer({ server });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const client = new Client(`127.0.0.1:${server.address().port}`, 'installer', 'secret');
  t.after(async () => {
    client.stopListen();
    for (const socket of sockets.clients) { socket.terminate(); }
    await new Promise(resolve => sockets.close(resolve));
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  });
  return { client, state, sockets, server };
}
async function connect(client) {
  const ready = waitFor(client, 'status', () => client.connected);
  await client.start(); await ready;
}
test('normalises documented hex strings and numeric IDs without partial parses', () => {
  for (const id of ['12', '0012', '0x12', 18]) { assert.equal(normaliseFunctionId(id), '0012'); }
  for (const id of [null, '', '12junk', '0x', -1, 65536, 1.5]) { assert.equal(normaliseFunctionId(id), undefined); }
  assert.equal(normaliseFunctionId('23'), '0023');
});
test('parses missing input/output maps, numeric values and multiple system IDs', () => {
  const result = parseConfiguration({ sysap: { devices: { A: { channels: { ch0000: {functionID:'F',outputs:{odp0000:{pairingID:53,value:true}}} } } } } });
  assert.equal(result[0].systemId, 'sysap'); assert.deepEqual(result[0].inputs, {});
  assert.equal(result[0].datapoints.odp0000,'1');
  assert.deepEqual(parseConfiguration({devices:{}}), []);
  assert.throws(() => parseConfiguration({message:'unauthorized'}), /permissions/);
});
test('discovers devices, authenticates, preserves identity and accepts malformed socket messages safely', {timeout:5000}, async t => {
  const {client,state,sockets} = await fixture(t);
  const diagnostics = []; client.on('diagnostic', message => diagnostics.push(message));
  await connect(client);
  const device = client.devices[0]; assert.ok(device instanceof Switch);
  state.config = config({ch0000: channel('0007','1')});
  await client.refresh(); assert.equal(client.devices[0], device); assert.equal(device.isOn(), true);
  const changed = once(device,'updated');
  for (const socket of sockets.clients) {
    socket.send('not JSON'); socket.send(JSON.stringify({[SYSTEM]:{datapoints:{'ABB123/ch0000/odp0000':0,'bad/path':'1'}}}));
  }
  await changed; assert.equal(device.isOn(),false); assert.equal(diagnostics.length,1);
  assert.ok(state.auth.every(auth => auth === `Basic ${Buffer.from('installer:secret').toString('base64')}`));
});
test('reports authentication, malformed JSON and missing config instead of empty discovery', {timeout:5000}, async t => {
  const {client,state} = await fixture(t);
  state.status=403; await assert.rejects(client.refresh(), /access denied/);
  state.status=200; state.config='invalid'; await assert.rejects(client.refresh(), /invalid JSON/);
  state.config={}; await assert.rejects(client.refresh(), /permissions/);
  state.config=config({ch0000:channel('FFFF')}); await client.refresh();
  assert.match(client.discoverySummary,/FFFF/); assert.equal(client.devices.length,0);
});
test('reconnects and reloads current state without replacing subscribed device instances', {timeout:6000}, async t => {
  const {client,state,sockets} = await fixture(t);
  await connect(client); const device=client.devices[0];
  const offline=waitFor(client,'status',()=>!client.connected);
  state.config=config({ch0000:channel('7','1')});
  for(const socket of sockets.clients){socket.terminate();}
  await offline; await waitFor(client,'status',()=>client.connected);
  assert.equal(client.devices[0],device); assert.equal(device.isOn(),true);
});
test('recovers after failed initial discovery and stops pending retries on shutdown', {timeout:6000}, async t => {
  const {client,state}=await fixture(t); state.status=503;
  await assert.rejects(client.start(), /HTTP 503/); assert.equal(client.connected,false);
  state.status=200; await waitFor(client,'status',()=>client.connected);
  client.stopListen(); assert.equal(client.reconnectTimer,undefined); assert.equal(client.heartbeat,undefined);
});
test('heartbeat detects silent connection loss', {timeout:5000}, async t => {
  const {client}=await fixture(t);
  let heartbeat;
  const original=setInterval;
  t.mock.method(global,'setInterval',(callback,delay,...args)=>{
    if(delay===20000){heartbeat=callback;return original(()=>{},20000);}
    return original(callback,delay,...args);
  });
  await connect(client); assert.ok(heartbeat); heartbeat(); heartbeat();
  assert.equal(client.connected,false); assert.match(client.connectionError,/stopped responding/);
});
test('checks command HTTP errors, accepts empty success bodies, and never changes feedback on failure', {timeout:5000}, async t => {
  const {client,state}=await fixture(t); await connect(client); const device=client.devices[0];
  state.commandStatus=500; await assert.rejects(device.turnOn(), /HTTP 500/); assert.equal(device.isOn(),false);
  state.commandStatus=204; await device.turnOn(); assert.equal(device.isOn(),false);
  assert.equal(state.commands[1].body,'1'); assert.match(state.commands[1].path,/ABB123.ch0000.idp0000$/);
  state.commandStatus=200;state.commandBody='{"success":false}'; await assert.rejects(device.turnOn(),/rejected/);
});
test('changing credentials cannot be overwritten by old discovery or socket close callbacks', {timeout:5000}, async t => {
  const {client,state}=await fixture(t); await connect(client);
  const ready=waitFor(client,'status',()=>client.connected && client.username==='new-user');
  await client.updateLogin(client.host,'new-user','new-secret'); await ready;
  assert.ok(state.auth.includes(`Basic ${Buffer.from('new-user:new-secret').toString('base64')}`));
  assert.equal(client.connected,true);
});
test('request cancellation does not install stale configurations', {timeout:5000}, async t => {
  const {client,server}=await fixture(t);
  server.removeAllListeners('request');
  const requested=once(server,'request'); const pending=client.refresh(); await requested;
  client.stopListen(); await assert.rejects(pending,/cancelled/); assert.deepEqual(client.devices,[]);
});
test('a configuration refresh cannot overwrite newer WebSocket feedback', {timeout:5000}, async t=>{
  const {client,server,sockets}=await fixture(t);await connect(client);
  const device=client.devices[0];
  server.removeAllListeners('request');
  const requested=once(server,'request');const pending=client.refresh();
  const [,response]=await requested;
  const changed=once(device,'updated');
  for(const socket of sockets.clients){socket.send(JSON.stringify({[SYSTEM]:{datapoints:{'ABB123/ch0000/odp0000':'1'}}}));}
  await changed;
  response.writeHead(200,{'Content-Type':'application/json'});response.end(JSON.stringify(config({ch0000:channel('7','0')})));
  await pending;assert.equal(device.isOn(),true);
});
test('hung HTTP requests time out rather than blocking discovery forever', {timeout:5000}, async t=>{
  const {client,server}=await fixture(t);server.removeAllListeners('request');
  let expire;const original=setTimeout;
  t.mock.method(global,'setTimeout',(callback,delay,...args)=>{
    if(delay===10000){expire=callback;}
    return original(callback,delay,...args);
  });
  const requested=once(server,'request');const pending=client.refresh();await requested;
  assert.ok(expire);expire();await assert.rejects(pending,/timed out/);
});
test('sensor-only and actuator-only channels do not crash discovery', {timeout:5000},async t=>{
  const {client}=await fixture(t,config({
    ch0000:{functionID:'F',outputs:{odp0000:{pairingID:53,value:'1'}}},
    ch0001:{functionID:'7',inputs:{idp0000:{pairingID:1,value:'0'}}}
  }));
  await client.refresh();assert.equal(client.devices.length,2);
  assert.equal(client.devices[0].isOpen(),true);assert.equal(client.devices[1].isOn(),null);
});
