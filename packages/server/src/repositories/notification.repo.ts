import type { NotificationModel, PrismaDb } from "./types.js";

export class NotificationRepository {
  constructor(private readonly db: PrismaDb) {}

  create(userId: string, message: string): Promise<NotificationModel> {
    return this.db.notification.create({ data: { userId, message } });
  }

  listForUser(userId: string): Promise<NotificationModel[]> {
    return this.db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  markRead(userId: string, id: string, readAt: Date): Promise<void> {
    return this.db.notification
      .updateMany({ where: { id, userId }, data: { readAt } })
      .then(() => undefined);
  }
}
