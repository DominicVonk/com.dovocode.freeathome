const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Dimmer,Switch,Shutter,Blind,Thermostat,MovementDetector,ContactSensor}=require('../.homeybuild/lib');
function resource(Model,inputs={},outputs={},datapoints={}) {
  const writes=[];
  const device=new Model({setValue:async(device,point,value)=>{writes.push({point,value});}},
    {systemId:'system',id:'A',channel:'ch0',name:'Test',deviceType:'test',inputs,outputs,datapoints,unresponsive:false});
  return {device,writes};
}
test('uses pairing metadata rather than assumed datapoint offsets for switching and dimming',async()=>{
  const {device,writes}=resource(Dimmer,{idp0050:1,idp0055:17},{odp0040:256,odp0045:272},{odp0040:'0',odp0045:'25'});
  assert.equal(device.isOn(),false);assert.equal(device.getBrightness(),.25);
  await device.turnOn();await device.setBrightness(.426);
  assert.deepEqual(writes,[{point:'idp0050',value:'1'},{point:'idp0055',value:'43'}]);
  assert.equal(device.isOn(),false);
  device.handleUpdate('odp0040','1');assert.equal(device.isOn(),true);
  await assert.rejects(device.setBrightness(NaN),/finite/);
});
test('does not guess controls when pairing metadata names a different function',async()=>{
  const {device}=resource(Switch,{idp0000:32},{},{idp0000:'0'});
  await assert.rejects(device.turnOn(),/required control/);
});
test('shutters use up/down values and separate stop control; feedback represents motion',async()=>{
  const {device,writes}=resource(Shutter,{idp0004:32,idp0008:33},{odp0005:288,odp0007:289},{odp0005:'2',odp0007:'40'});
  assert.equal(device.getState(),'up');assert.equal(device.getPosition(),40);assert.equal(device.isClosed(),false);
  await device.open();await device.close();await device.stop();
  assert.deepEqual(writes,[{point:'idp0004',value:'0'},{point:'idp0004',value:'1'},{point:'idp0008',value:'0'}]);
  device.handleUpdate('odp0005','0');assert.equal(device.getState(),'idle');
  device.handleUpdate('odp0005','3');assert.equal(device.getState(),'down');
});
test('blind tilt is scaled to Homey 0..1 and notifications reach listeners',async()=>{
  const {device,writes}=resource(Blind,{idp0009:36},{odp0010:290},{odp0010:'50'});
  assert.equal(device.getTilt(),.5);await device.setTilt(.25);assert.deepEqual(writes,[{point:'idp0009',value:'25'}]);
  let updates=0;device.on('updated',()=>updates++);device.handleUpdate('odp0010','75');
  assert.equal(updates,1);assert.equal(device.getTilt(),.75);
});
test('thermostats retain zero feedback, reject malformed numbers, expose eco mode and validate writes',async()=>{
  const {device,writes}=resource(Thermostat,{idp1:320,idp2:66,idp3:58},{odp1:304,odp2:51,odp3:56,odp4:68},{odp1:'0',odp2:'0',odp3:'1',odp4:'0'});
  assert.equal(device.getCurrentTemperature(),0);assert.equal(device.getTargetTemperature(),0);
  assert.equal(device.getHeatingEnabled(),true);assert.equal(device.getMode(),'0');
  device.handleUpdate('odp1','bad');assert.equal(device.getCurrentTemperature(),null);
  await device.setTargetTemperature(21.5);await device.disableHeating();await device.setMode('1');
  assert.deepEqual(writes,[{point:'idp1',value:'21.5'},{point:'idp2',value:'0'},{point:'idp3',value:'1'}]);
  assert.equal(device.getTargetTemperature(),0);
  await assert.rejects(device.setTargetTemperature(Infinity),/finite/);
});
test('missing or malformed readings remain unknown rather than inventing states',()=>{
  assert.equal(resource(Shutter).device.getPosition(),null);
  assert.equal(resource(Thermostat).device.getCurrentTemperature(),null);
  const motion=resource(MovementDetector,{}, {odp1:6},{odp1:'1'}).device;
  assert.equal(motion.getMotion(),true);
  const contact=resource(ContactSensor,{}, {odp1:53},{odp1:'0'}).device;
  assert.equal(contact.isOpen(),false);
});
