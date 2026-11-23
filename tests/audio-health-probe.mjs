import assert from 'node:assert/strict';
import {audioHealthText} from '../src/VtuberFriends/wwwroot/audio-health.js';
assert.match(audioHealthText({}),/Esperando/);
const receiver={audioHealth:{active:2,tracked:2,faulted:0,lastPcmAgeMs:null}};
assert.match(audioHealthText(receiver),/todavía no recibido/);
for(const state of ['waiting','reconnecting','recovered','paused','blocked']){const text=audioHealthText({...receiver,recovery:{state,attempts:2}});assert.match(text,/2\/3/);assert(!text.includes('undefined'));}
assert.match(audioHealthText({...receiver,audioHealth:{...receiver.audioHealth,lastPcmAgeMs:60000}}),/60 s/);
console.log('PASS: audio health diagnostics cover idle, PCM age, bounded recovery and fatal DAVE display.');
