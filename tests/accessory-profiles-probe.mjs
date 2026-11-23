import assert from 'node:assert/strict';
import {switchAccessoryAvatar,storeAccessoryProfile,applyAccessoryDraft} from '../src/VtuberFriends/wwwroot/puppet/accessory-profiles.js';
const slot={avatar:'cyan-puppet',accessoryGlasses:'sun',accessoryHat:'top',objectAnimation:'sway',objectSpeed:2,accessoryEdits:{'cyan-dragon:glasses-sun':{x:80,y:20,scale:.8,rotation:10}}};
switchAccessoryAvatar(slot,'amber-puppet');assert.equal(slot.accessoryGlasses,'none');assert.equal(slot.objectSpeed,1);slot.accessoryGlasses='round';slot.objectAnimation='none';storeAccessoryProfile(slot);
const draft=structuredClone(slot);draft.accessoryEdits['amber-dragon:glasses-round']={x:-30,y:-50,scale:1.2,rotation:0};
switchAccessoryAvatar(slot,'cyan-puppet');assert.equal(slot.accessoryGlasses,'sun');assert.equal(slot.accessoryHat,'top');assert.equal(slot.objectSpeed,2);
slot.accessoryEdits['cyan-dragon:glasses-sun'].x=95;
applyAccessoryDraft(slot,draft,'amber-puppet');assert.equal(slot.avatar,'cyan-puppet');assert.equal(slot.accessoryGlasses,'sun');assert.equal(slot.accessoryEdits['cyan-dragon:glasses-sun'].x,95,'Saving another Puppet must preserve current edits');
assert.equal(slot.accessoryEdits['amber-dragon:glasses-round'].x,-30);
switchAccessoryAvatar(slot,'amber-puppet');assert.equal(slot.accessoryGlasses,'round');assert.equal(slot.accessoryHat,'none');assert.equal(slot.objectAnimation,'none');
const reset=structuredClone(slot);delete reset.accessoryEdits['amber-dragon:glasses-round'];applyAccessoryDraft(slot,reset,'amber-puppet');assert(!slot.accessoryEdits['amber-dragon:glasses-round']);assert.equal(slot.accessoryEdits['cyan-dragon:glasses-sun'].x,95);
switchAccessoryAvatar(slot,'jade-puppet');assert.equal(slot.accessoryGlasses,'none');switchAccessoryAvatar(slot,'cyan-puppet');assert.equal(slot.accessoryGlasses,'sun');
console.log('PASS: separate model selections/idle, restore on switching, scoped editor apply/reset and save after switching without overwriting other Puppet transforms.');

const model={avatar:'cyan-puppet',accessoryAura:'energy',ambientEffects:['orbs'],puppetParts:{head:{x:20}},puppetPadding:320,accessoryEdits:{'cyan-dragon:effect-aura':{x:50,color:'#ffaa00'}}};
switchAccessoryAvatar(model,'jade-puppet');assert.equal(model.accessoryAura,'none');assert.equal(model.puppetPadding,280);model.ambientEffects.push('runes');model.puppetParts.head={x:-10};
switchAccessoryAvatar(model,'cyan-puppet');assert.equal(model.accessoryAura,'energy');assert.equal(model.puppetParts.head.x,20);assert.deepEqual(model.ambientEffects,['orbs']);assert.equal(model.puppetPadding,320);assert.equal(model.accessoryEdits['cyan-dragon:effect-aura'].color,'#ffaa00');
console.log('PASS: per-model effects/parts/padding/ambient isolation with deep copies and preserved transforms.');
