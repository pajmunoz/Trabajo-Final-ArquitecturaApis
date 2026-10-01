import bcrypt from 'bcryptjs';
import type { Hasher } from '../../application/ports/servicios.js';

export class BcryptHasher implements Hasher {
  constructor(private readonly costo = 10) {}

  hash(valor: string): Promise<string> {
    return bcrypt.hash(valor, this.costo);
  }

  comparar(valor: string, hash: string): Promise<boolean> {
    return bcrypt.compare(valor, hash);
  }
}
