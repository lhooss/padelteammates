import { config } from 'dotenv';

// Injecte les variables de .env.test dans process.env avant tout import applicatif.
// override:true car un .env pourrait deja avoir ete charge dans le process.
config({ path: '.env.test', override: true });
