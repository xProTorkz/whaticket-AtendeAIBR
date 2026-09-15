import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // 1. Create Plans table
    await queryInterface.createTable("Plans", {
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
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      maxUsers: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3
      },
      maxConnections: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      maxContacts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1000
      },
      maxCampaigns: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 2
      },
      maxContactLists: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5
      },
      maxSchedules: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 50
      },
      maxApiKeys: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      maxWebhooks: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 2
      },
      maxStorageMb: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1024
      },
      maxAiTokens: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      capabilities: {
        type: DataTypes.JSON,
        allowNull: false
      },
      price: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      billingCycle: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "monthly"
      },
      isPublic: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    // 2. Seed default reference plans
    const now = new Date();
    await queryInterface.bulkInsert("Plans", [
      {
        id: 1,
        name: "Start",
        description: "Plano ideal para pequenas empresas e início de operação",
        maxUsers: 3,
        maxConnections: 1,
        maxContacts: 1000,
        maxCampaigns: 2,
        maxContactLists: 5,
        maxSchedules: 50,
        maxApiKeys: 1,
        maxWebhooks: 2,
        maxStorageMb: 1024,
        maxAiTokens: 0,
        capabilities: JSON.stringify({
          crm: true,
          kanban: true,
          campaigns: true,
          schedules: true,
          internalChat: true,
          apiIntegrations: false,
          customBranding: false,
          ai: false
        }),
        price: 9900,
        billingCycle: "monthly",
        isPublic: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 2,
        name: "Pro",
        description: "Plano profissional para times em expansão com integrações completas",
        maxUsers: 10,
        maxConnections: 3,
        maxContacts: 10000,
        maxCampaigns: 20,
        maxContactLists: 50,
        maxSchedules: 500,
        maxApiKeys: 5,
        maxWebhooks: 10,
        maxStorageMb: 10240,
        maxAiTokens: 50000,
        capabilities: JSON.stringify({
          crm: true,
          kanban: true,
          campaigns: true,
          schedules: true,
          internalChat: true,
          apiIntegrations: true,
          customBranding: true,
          ai: true
        }),
        price: 24900,
        billingCycle: "monthly",
        isPublic: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 3,
        name: "Scale",
        description: "Plano para grandes operações de atendimento com alta demanda",
        maxUsers: 50,
        maxConnections: 10,
        maxContacts: 50000,
        maxCampaigns: 100,
        maxContactLists: 200,
        maxSchedules: 5000,
        maxApiKeys: 20,
        maxWebhooks: 50,
        maxStorageMb: 51200,
        maxAiTokens: 500000,
        capabilities: JSON.stringify({
          crm: true,
          kanban: true,
          campaigns: true,
          schedules: true,
          internalChat: true,
          apiIntegrations: true,
          customBranding: true,
          ai: true
        }),
        price: 59900,
        billingCycle: "monthly",
        isPublic: true,
        createdAt: now,
        updatedAt: now
      }
    ]);

    // 3. Add Columns to Companies
    await queryInterface.addColumn("Companies", "planId", {
      type: DataTypes.INTEGER,
      references: { model: "Plans", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      allowNull: true,
      defaultValue: 2
    });

    await queryInterface.addColumn("Companies", "subscriptionStatus", {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "active"
    });

    await queryInterface.addColumn("Companies", "isTrial", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.addColumn("Companies", "trialEndsAt", {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.addColumn("Companies", "gracePeriodUntil", {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.addColumn("Companies", "customLimits", {
      type: DataTypes.JSON,
      allowNull: true
    });

    await queryInterface.addColumn("Companies", "customCapabilities", {
      type: DataTypes.JSON,
      allowNull: true
    });

    await queryInterface.addColumn("Companies", "brandName", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("Companies", "brandLogo", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("Companies", "primaryColor", {
      type: DataTypes.STRING(30),
      allowNull: true,
      defaultValue: "#006b52"
    });

    await queryInterface.addColumn("Companies", "secondaryColor", {
      type: DataTypes.STRING(30),
      allowNull: true,
      defaultValue: "#004d40"
    });

    await queryInterface.addColumn("Companies", "brandFavicon", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("Companies", "loginMessage", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    // 4. Create TenantOnboardings table
    await queryInterface.createTable("TenantOnboardings", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false,
        unique: true
      },
      currentStep: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "company_info"
      },
      completedSteps: {
        type: DataTypes.JSON,
        allowNull: false
      },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "in_progress"
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true
      },
      completedAt: {
        type: DataTypes.DATE,
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

    // 5. Create TenantSubscriptions table
    await queryInterface.createTable("TenantSubscriptions", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      planId: {
        type: DataTypes.INTEGER,
        references: { model: "Plans", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      provider: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "manual"
      },
      externalId: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "active"
      },
      currentPeriodStart: {
        type: DataTypes.DATE,
        allowNull: false
      },
      currentPeriodEnd: {
        type: DataTypes.DATE,
        allowNull: false
      },
      metadata: {
        type: DataTypes.JSON,
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

    await queryInterface.addIndex("TenantSubscriptions", ["companyId"]);
    await queryInterface.addIndex("TenantSubscriptions", ["status"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("TenantSubscriptions");
    await queryInterface.dropTable("TenantOnboardings");

    await queryInterface.removeColumn("Companies", "loginMessage");
    await queryInterface.removeColumn("Companies", "brandFavicon");
    await queryInterface.removeColumn("Companies", "secondaryColor");
    await queryInterface.removeColumn("Companies", "primaryColor");
    await queryInterface.removeColumn("Companies", "brandLogo");
    await queryInterface.removeColumn("Companies", "brandName");
    await queryInterface.removeColumn("Companies", "customCapabilities");
    await queryInterface.removeColumn("Companies", "customLimits");
    await queryInterface.removeColumn("Companies", "gracePeriodUntil");
    await queryInterface.removeColumn("Companies", "trialEndsAt");
    await queryInterface.removeColumn("Companies", "isTrial");
    await queryInterface.removeColumn("Companies", "subscriptionStatus");
    await queryInterface.removeColumn("Companies", "planId");

    await queryInterface.dropTable("Plans");
  }
};
