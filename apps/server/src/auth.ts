/* ============================================================
   Autenticazione: registrazione, login, ospite (bcrypt + JWT).
   ============================================================ */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db.js';
import { ENV } from './env.js';
import { AppError } from './errors.js';

export interface UserRow {
  id: string;
  nick: string;
  username: string | null;
  email: string | null;
  pass_hash: string | null;
  is_guest: boolean;
  notifications_enabled: boolean;
}

export interface PublicUser {
  id: string;
  nick: string;
  username: string | null;
  email: string | null;
  isGuest: boolean;
}

const toPublic = (u: UserRow): PublicUser => ({
  id: u.id,
  nick: u.nick,
  username: u.username,
  email: u.email,
  isGuest: u.is_guest,
});

export function signToken(userId: string): string {
  return jwt.sign({ uid: userId }, ENV.JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, ENV.JWT_SECRET) as { uid?: string };
    return payload.uid ?? null;
  } catch {
    return null;
  }
}

export async function getUser(id: string): Promise<UserRow | null> {
  const r = await query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
  return r.rows[0] ?? null;
}

export async function register(input: {
  username: string;
  email?: string;
  password: string;
}): Promise<{ token: string; user: PublicUser }> {
  const username = input.username?.trim();
  // email opzionale: serve solo per il recupero password e NON è univoca
  const rawEmail = input.email?.trim().toLowerCase();
  const email = rawEmail ? rawEmail : null;
  if (!username) throw new AppError(400, 'Nome utente obbligatorio');
  if (username.length < 3) throw new AppError(400, 'Il nome utente deve avere almeno 3 caratteri');
  if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
    throw new AppError(400, 'Il nome utente può contenere solo lettere, numeri e . _ -');
  }
  if (email && !email.includes('@')) throw new AppError(400, 'Email non valida');
  if (!input.password || input.password.length < 6) {
    throw new AppError(400, 'La password deve avere almeno 6 caratteri');
  }
  const exists = await query('SELECT 1 FROM users WHERE lower(username) = lower($1)', [username]);
  if (exists.rowCount) throw new AppError(409, 'Nome utente già in uso');

  const hash = await bcrypt.hash(input.password, 10);
  // il nome utente è anche il nome mostrato in gioco (nick)
  const r = await query<UserRow>(
    `INSERT INTO users (nick, username, email, pass_hash, is_guest)
     VALUES ($1, $1, $2, $3, false) RETURNING *`,
    [username, email, hash],
  );
  const user = r.rows[0]!;
  return { token: signToken(user.id), user: toPublic(user) };
}

export async function login(input: {
  username: string;
  password: string;
}): Promise<{ token: string; user: PublicUser }> {
  const username = input.username?.trim();
  if (!username || !input.password) throw new AppError(400, 'Nome utente e password obbligatori');
  const r = await query<UserRow>('SELECT * FROM users WHERE lower(username) = lower($1)', [username]);
  const user = r.rows[0];
  if (!user || !user.pass_hash) throw new AppError(401, 'Credenziali non valide');
  const ok = await bcrypt.compare(input.password, user.pass_hash);
  if (!ok) throw new AppError(401, 'Credenziali non valide');
  return { token: signToken(user.id), user: toPublic(user) };
}

export async function guest(input: { nick?: string }): Promise<{ token: string; user: PublicUser }> {
  const nick = input.nick?.trim() || 'Ospite';
  const r = await query<UserRow>(
    `INSERT INTO users (nick, is_guest) VALUES ($1, true) RETURNING *`,
    [nick],
  );
  const user = r.rows[0]!;
  return { token: signToken(user.id), user: toPublic(user) };
}
