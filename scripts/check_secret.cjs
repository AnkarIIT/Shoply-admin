require('dotenv').config();
const {Pool} = require('pg');
const p = new Pool({connectionString: process.env.DATABASE_URL});
(async () => {
  try {
    const r = await p.query('SELECT totp_secret, totp_enabled FROM admins WHERE email=$1', ['test@shoply.local']);
    console.log(JSON.stringify(r.rows[0], null, 2));
  } catch(e) {
    console.log('ERR:', e.message, e.stack);
  } finally {
    await p.end();
  }
})();