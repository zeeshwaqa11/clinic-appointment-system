import type { Role } from "../core/roles.js";
import type { PrismaDb, UserModel } from "./types.js";

export class UserRepository {
  constructor(private readonly db: PrismaDb) {}

  findByEmail(email: string): Promise<UserModel | null> {
    return this.db.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<UserModel | null> {
    return this.db.user.findUnique({ where: { id } });
  }

  create(data: {
    name: string;
    email: string;
    passwordHash: string;
    role: Role;
  }): Promise<UserModel> {
    return this.db.user.create({ data });
  }
}
