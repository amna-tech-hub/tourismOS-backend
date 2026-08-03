// src/services/redis.service.js
const { createClient } = require("redis");

class RedisService {
  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

    this.client.on("error", (err) => console.error("Redis Client Error:", err));
    this.client.on("connect", () => console.log("Connected to Redis server."));

    this.connect();
  }

  async connect() {
    if (!this.client.isOpen) {
      await this.client.connect().catch((err) => {
        console.error("Failed to connect to Redis:", err.message);
      });
    }
  }

  async get(key) {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error(`Redis Get Error for key [${key}]:`, err.message);
      return null;
    }
  }

  async set(key, value, ttlInSeconds = 1800) {
    try {
      const stringified = JSON.stringify(value);
      if (ttlInSeconds) {
        await this.client.setEx(key, ttlInSeconds, stringified);
      } else {
        await this.client.set(key, stringified);
      }
    } catch (err) {
      console.error(`Redis Set Error for key [${key}]:`, err.message);
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
    } catch (err) {
      console.error(`Redis Del Error for key [${key}]:`, err.message);
    }
  }
}

module.exports = new RedisService();