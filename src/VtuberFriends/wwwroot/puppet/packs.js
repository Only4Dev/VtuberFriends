export const puppetPacks={
 'frost-puppet':{id:'frost-dragon',name:'Boreal · Puppet 2D'},
 'rose-puppet':{id:'rose-dragon',name:'Rosalía · Puppet 2D'},
 'patch-puppet':{id:'patch-dragon',name:'Remiendo · Puppet 2D'},
 'ember-puppet':{id:'ember-dragon',name:'Ascua · Puppet 2D'},
 'amber-puppet':{id:'amber-dragon',name:'Ámbar · Puppet 2D'},
 'thoxer-puppet':{id:'thoxer-dragon',name:'Thoxer · Puppet 2D'},
 'cyan-puppet':{id:'cyan-dragon',name:'Cian · Puppet 2D'},
 'jade-puppet':{id:'jade-dragon',name:'Jade celestial · Puppet 2D'}
};
export const isPuppet=kind=>Object.hasOwn(puppetPacks,kind);
