import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { conflictError, unauthorizedError } from "../core/errors.js";
import type { Role } from "../core/roles.js";
import type { UserRepository } from "../repositories/user.repo.js";
import type { UserModel as User } from "../repositories/types.js";
import type { LoginInput, RegisterInput } from "../schemas/auth.schema.js";

const SALT_ROUNDS = 10;

export interface AuthResult {
  token: string;
  user: PublicUser;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

function toPublicUser(user: User): PublicUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role as Role };
}

function issueToken(user: User): string {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export class AuthService {
  constructor(private readonly users: UserRepository) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw conflictError("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await this.users.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: "PATIENT",
    });

    return { token: issueToken(user), user: toPublicUser(user) };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.users.findByEmail(input.email);
    if (!user) {
      throw unauthorizedError("Invalid email or password");
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw unauthorizedError("Invalid email or password");
    }

    return { token: issueToken(user), user: toPublicUser(user) };
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw unauthorizedError();
    }
    return toPublicUser(user);
  }
}
