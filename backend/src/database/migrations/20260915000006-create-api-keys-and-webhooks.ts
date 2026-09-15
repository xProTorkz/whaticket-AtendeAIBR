import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // 1. ApiKeys
    await queryInterface.createTable("ApiKeys", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      keyPrefix: {
        type: DataTypes.STRING(32),
        allowNull: false
      },
      keyHash: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true
      },
      scopes: {
        type: DataTypes.JSON,
        allowNull: false
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      revokedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      lastUsedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      companyId: {
        type: DataTypes.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      userId: {
        type: DataTypes.INTEGER,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex("ApiKeys", ["companyId"]);
    await queryInterface.addIndex("ApiKeys", ["keyHash"]);

    // 2. ApiIdempotencyKeys
    await queryInterface.createTable("ApiIdempotencyKeys", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      idempotencyKey: {
        type: DataTypes.STRING(128),
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      method: {
        type: DataTypes.STRING(10),
        allowNull: false
      },
      path: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      statusCode: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      responseBody: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex("ApiIdempotencyKeys", ["companyId", "idempotencyKey"], {
      unique: true,
      name: "api_idempotency_company_key_unique"
    });

    // 3. Webhooks
    await queryInterface.createTable("Webhooks", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      url: {
        type: DataTypes.STRING(500),
        allowNull: false
      },
      secret: {
        type: DataTypes.STRING(128),
        allowNull: false
      },
      events: {
        type: DataTypes.JSON,
        allowNull: false
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      companyId: {
        type: DataTypes.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex("Webhooks", ["companyId"]);

    // 4. WebhookDeliveries
    await queryInterface.createTable("WebhookDeliveries", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      webhookId: {
        type: DataTypes.INTEGER,
        references: { model: "Webhooks", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      event: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      payload: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "PENDING"
      },
      attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      lastResponseStatus: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      lastResponseBody: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      lastError: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      nextRetryAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      deliveredAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      companyId: {
        type: DataTypes.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex("WebhookDeliveries", ["webhookId"]);
    await queryInterface.addIndex("WebhookDeliveries", ["companyId"]);
    await queryInterface.addIndex("WebhookDeliveries", ["status"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("WebhookDeliveries");
    await queryInterface.dropTable("Webhooks");
    await queryInterface.dropTable("ApiIdempotencyKeys");
    await queryInterface.dropTable("ApiKeys");
  }
};
