const dns = require('dns');

console.log('Default servers:', dns.getServers());

dns.resolveSrv('_mongodb._tcp.vinted.ek5p4it.mongodb.net', (err, addresses) => {
  if (err) {
    console.error('Default DNS failed:', err.message);
    
    // Try Google DNS
    dns.setServers(['8.8.8.8', '8.8.4.4']);
    console.log('Set servers to:', dns.getServers());
    dns.resolveSrv('_mongodb._tcp.vinted.ek5p4it.mongodb.net', (err2, addresses2) => {
      if (err2) {
        console.error('Google DNS failed:', err2.message);
      } else {
        console.log('Google DNS success:', addresses2);
      }
    });
  } else {
    console.log('Default DNS success:', addresses);
  }
});
