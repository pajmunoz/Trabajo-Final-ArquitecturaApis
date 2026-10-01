// Genera el par de claves RSA del JWT (RS256) y la configuración de Kong con la
// clave pública. Las claves no se versionan: cada entorno genera las suyas.
//   node scripts/generar-claves.mjs [--forzar]
import { generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const dirClaves = join(raiz, 'keys');
const privada = join(dirClaves, 'jwt-private.pem');
const publica = join(dirClaves, 'jwt-public.pem');

mkdirSync(dirClaves, { recursive: true });
if (!existsSync(privada) || process.argv.includes('--forzar')) {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  writeFileSync(privada, privateKey, { mode: 0o600 });
  writeFileSync(publica, publicKey);
  console.log('Claves RSA generadas en keys/');
} else {
  console.log('Las claves ya existen (use --forzar para regenerarlas)');
}

const plantilla = readFileSync(join(raiz, 'kong', 'kong.template.yml'), 'utf8');
const pem = readFileSync(publica, 'utf8').trim().split('\n').map((l) => `          ${l}`).join('\n');
writeFileSync(join(raiz, 'kong', 'kong.yml'), plantilla.replace('__JWT_PUBLIC_KEY__', `|\n${pem}`));
console.log('kong/kong.yml generado con la clave pública');
