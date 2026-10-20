const {test,mock}=require('node:test');
const assert=require('node:assert/strict');
const Module=require('node:module');
const {EventEmitter}=require('node:events');
class FakeDevice {
  constructor(){this.capabilities={};this.controls={};this.homey={};this.logs=[];}
  getData(){return {serialNumber:'A',channel:'ch0'};}
  hasCapability(){return true;}
  getCapabilityValue(key){return this.capabilities[key];}
  async setCapabilityValue(key,value){assert.notEqual(typeof value==='number'&&Number.isNaN(value),true);this.capabilities[key]=value;}
  async setAvailable(){this.available=true;}
  async setUnavailable(message){this.available=false;this.reason=message;}
  registerCapabilityListener(key,callback){this.controls[key]=callback;}
  log(...args){this.logs.push(args);}
  error(...args){this.logs.push(args);}
}
class FakeDriver{constructor(){this.homey={};}}
class FakeApp{log(){} error(){}}
const original=Module._load;
const loader=mock.method(Module,'_load',function(request,...args){
  if(request==='homey'){return {Device:FakeDevice,Driver:FakeDriver,App:FakeApp};}
  return original.call(this,request,...args);
});
const Light=require('../.homeybuild/drivers/lightswitch/device');
const DimmerDevice=require('../.homeybuild/drivers/dimmer/device');
const LightDriver=require('../.homeybuild/drivers/lightswitch/driver');
const ShutterDriver=require('../.homeybuild/drivers/shutter/driver');
const App=require('../.homeybuild/app');
loader.mock.restore();
const {Switch,Dimmer,Blind,Shutter,Client}=require('../.homeybuild/lib');
function configuration(){return {systemId:'system',id:'A',channel:'ch0',name:'Test',deviceType:'7',inputs:{idp:1},outputs:{odp:256},datapoints:{odp:'1'},unresponsive:false};}
function client(){const client=new EventEmitter();client.devices=[];client.connected=false;client.connectionError='Connecting';client.setValue=async()=>{};return client;}
function attach(Type,client){const device=new Type();device.homey.app={getClient:()=>client};return device;}
test('paired devices survive missing discovery, recover later and detach subscriptions on removal',async()=>{
  const connection=client();const device=attach(Light,connection);await device.onInit();
  assert.equal(device.available,false);assert.match(device.reason,/Connecting/);
  const light=new Switch(connection,configuration());connection.devices=[light];connection.connected=true;connection.emit('devices');await device.syncing;
  assert.equal(device.available,true);assert.equal(device.capabilities.onoff,true);
  light.handleUpdate('odp','0');await device.syncing;assert.equal(device.capabilities.onoff,false);
  connection.connected=false;connection.connectionError='Offline';connection.emit('status');await device.syncing;
  await assert.rejects(device.controls.onoff(true),/Offline/);
  connection.connected=true;const replacement=new Switch(connection,configuration());connection.devices=[replacement];connection.emit('devices');await device.syncing;
  assert.equal(light.listenerCount('updated'),0);assert.equal(replacement.listenerCount('updated'),1);
  replacement.configuration.unresponsive=true;replacement.emit('updated');await device.syncing;assert.match(device.reason,/unreachable/);
  await device.onDeleted();assert.equal(replacement.listenerCount('updated'),0);assert.equal(connection.listenerCount('devices'),0);assert.equal(connection.listenerCount('status'),0);
});
test('legacy light-switch pairings remain usable when a dimmer is discovered',async()=>{
  const connection=client();connection.connected=true;
  const dimmer=new Dimmer(connection,{...configuration(),outputs:{odp:256,brightness:272},datapoints:{odp:'1',brightness:'50'}});
  connection.devices=[dimmer];const legacy=attach(Light,connection);await legacy.onInit();assert.equal(legacy.available,true);
  const device=attach(DimmerDevice,connection);await device.onInit();assert.equal(device.capabilities.dim,.5);
  await legacy.onDeleted();await device.onDeleted();
});
test('pairing lists do not offer dimmers twice or blinds as shutters',async()=>{
  const all=[new Switch({},configuration()),new Dimmer({},configuration()),new Shutter({},configuration()),new Blind({},configuration())];
  const app={listDevices:async predicate=>all.filter(predicate)};
  const lights=new LightDriver();lights.homey.app=app;assert.deepEqual((await lights.onPairListDevices()).map(x=>x.constructor),[Switch]);
  const shutters=new ShutterDriver();shutters.homey.app=app;assert.deepEqual((await shutters.onPairListDevices()).map(x=>x.constructor),[Shutter]);
});
test('credential settings are serialized, read together and unrelated settings do not reconnect',async t=>{
  const settings=new EventEmitter();const values={};settings.get=key=>values[key];
  const app=new App();app.homey={settings};await app.onInit();
  const calls=[];t.mock.method(Client.prototype,'updateLogin',async function(host,username,password){this.host=host;this.username=username;this.password=password;calls.push([host,username,password]);});
  Object.assign(values,{ip:'127.0.0.1',username:'installer',password:'secret'});
  settings.emit('set','username');settings.emit('set','password');settings.emit('set','ip');settings.emit('set','unrelated');
  await app.settingsQueue;assert.deepEqual(calls,[['127.0.0.1','installer','secret']]);
  await app.onUninit();assert.equal(settings.listenerCount('set'),0);
});
test('pairing surfaces discovery failures and useful unsupported-device diagnostics',async()=>{
  const app=new App();const connection=client();connection.refresh=async()=>{throw new Error('Access denied');};app.client=connection;
  await assert.rejects(app.listDevices(()=>true),/Access denied/);
  connection.refresh=async()=>{};connection.discoverySummary='Unsupported function IDs: FFFF.';
  await assert.rejects(app.listDevices(()=>true),/FFFF/);
});
test('device update failures are reported and later feedback can recover',async()=>{
  const connection=client();connection.connected=true;const light=new Switch(connection,configuration());connection.devices=[light];
  const device=attach(Light,connection);let fail=true;
  device.setCapabilityValue=async(key,value)=>{if(fail){throw new Error('Homey update failed');}device.capabilities[key]=value;};
  device.setUnavailable=async()=>{throw new Error('Device temporarily unavailable in SDK');};
  await device.onInit();assert.ok(device.logs.length>=2);
  fail=false;light.handleUpdate('odp','0');await device.syncing;assert.equal(device.available,true);assert.equal(device.capabilities.onoff,false);
  await device.onDeleted();
});
