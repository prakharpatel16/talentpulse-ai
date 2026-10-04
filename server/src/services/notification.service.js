const Notification = require('../models/Notification');
const logger = require('../utils/logger');
const {
  connectRedis,
  createRedisSubscriber,
  publishRedisMessage,
} = require('../config/redis');

const SOCKET_EVENT_CHANNEL = 'talentpulse:socket-events';

let ioInstance = null;
let redisSubscriber = null;
let retryTimer = null;

const emitToSocketRoom = (io, event) => {
  io.to(`user_${event.userId}`).emit('notification', event.notification);
};

const startSocketEventSubscriber = async () => {
  if (!ioInstance || redisSubscriber) return;

  const subscriber = createRedisSubscriber();
  redisSubscriber = subscriber;
  subscriber.on('error', (error) => {
    logger.warn(`Socket event Redis subscriber error (${error.name || 'RedisError'}).`);
  });

  try {
    await connectRedis(subscriber);
    await subscriber.subscribe(SOCKET_EVENT_CHANNEL, (message) => {
      try {
        const event = JSON.parse(message);
        if (event.type === 'notification' && event.userId && event.notification) {
          emitToSocketRoom(ioInstance, event);
        }
      } catch (error) {
        logger.warn(`Ignoring invalid Redis socket event (${error.name}).`);
      }
    });
  } catch (error) {
    redisSubscriber = null;
    subscriber.disconnect();
    logger.warn(`Socket event Redis subscription unavailable (${error.name || 'RedisError'}).`);
    if (!ioInstance) return;
    retryTimer = setTimeout(startSocketEventSubscriber, 5000);
    retryTimer.unref?.();
  }
};

const setSocketIO = (io) => {
  ioInstance = io;
  if (io) void startSocketEventSubscriber();
  else if (retryTimer) clearTimeout(retryTimer);
};

const closeSocketEventSubscriber = async () => {
  ioInstance = null;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  const subscriber = redisSubscriber;
  redisSubscriber = null;
  if (subscriber?.isOpen) {
    await subscriber.quit().catch(() => subscriber.disconnect());
  }
};

const createNotification = async ({ userId, type, title, message, referenceId = null, referenceType = 'application' }) => {
  try {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      referenceId,
      referenceType,
      isRead: false
    });

    if (ioInstance) {
      emitToSocketRoom(ioInstance, {
        userId: userId.toString(),
        notification,
      });
    } else {
      await publishRedisMessage(
        SOCKET_EVENT_CHANNEL,
        JSON.stringify({
          type: 'notification',
          userId: userId.toString(),
          notification: notification.toObject(),
        }),
      ).catch((error) => {
        logger.warn(`Could not publish notification socket event (${error.name || 'RedisError'}).`);
      });
    }

    logger.info(`Notification sent to user ${userId}: ${title}`);
    return notification;
  } catch (err) {
    logger.error(`Error sending notification: ${err.message}`);
    return null;
  }
};

module.exports = {
  setSocketIO,
  createNotification,
  closeSocketEventSubscriber,
};
