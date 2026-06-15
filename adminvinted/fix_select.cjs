const fs = require('fs');
const files = [
  'g:/vinted-updated/adminvinted/src/pages/Transactions.jsx',
  'g:/vinted-updated/adminvinted/src/pages/UserPayoutMethods.jsx',
  'g:/vinted-updated/adminvinted/src/pages/WithdrawalRequests.jsx'
];
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.split('className="wallet-filter-select"').join('className="admin-filter-select"');
  fs.writeFileSync(f, content);
});
console.log('Done');
