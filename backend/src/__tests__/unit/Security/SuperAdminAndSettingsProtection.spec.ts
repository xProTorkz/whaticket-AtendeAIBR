import AppError from "../../../errors/AppError";
import CheckSettings, { ALLOWED_GLOBAL_FALLBACK_KEYS } from "../../../helpers/CheckSettings";
import Setting from "../../../models/Setting";
import Company from "../../../models/Company";
import User from "../../../models/User";
import DeleteCompanyService from "../../../services/CompanyService/DeleteCompanyService";
import CreateCompanyService from "../../../services/CompanyService/CreateCompanyService";
import DeleteUserService from "../../../services/UserServices/DeleteUserService";
import CreateAuditLogService from "../../../services/AuditServices/CreateAuditLogService";

jest.mock("../../../models/Setting");
jest.mock("../../../models/Company");
jest.mock("../../../models/User");
jest.mock("../../../helpers/UpdateDeletedUserOpenTicketsStatus", () => jest.fn());
jest.mock("../../../services/AuditServices/CreateAuditLogService", () => jest.fn());

describe("SuperAdmin, Settings & Company Safeguards", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("CheckSettings Isolation & Fallback", () => {
    it("should return tenant's own setting when it exists", async () => {
      (Setting.findOne as jest.Mock).mockResolvedValueOnce({
        key: "userCreation",
        value: "disabled",
        companyId: 2
      });

      const value = await CheckSettings("userCreation", 2);
      expect(value).toBe("disabled");
      expect(Setting.findOne).toHaveBeenCalledWith({
        where: { key: "userCreation", companyId: 2 }
      });
    });

    it("should fallback to company 1 for allowed non-sensitive keys when tenant setting is missing", async () => {
      // 1st call for tenant 2 returns null
      (Setting.findOne as jest.Mock).mockResolvedValueOnce(null);
      // 2nd call for company 1 fallback returns setting
      (Setting.findOne as jest.Mock).mockResolvedValueOnce({
        key: "userCreation",
        value: "enabled",
        companyId: 1
      });

      const value = await CheckSettings("userCreation", 2);
      expect(value).toBe("enabled");
      expect(Setting.findOne).toHaveBeenCalledTimes(2);
      expect(Setting.findOne).toHaveBeenNthCalledWith(2, {
        where: { key: "userCreation", companyId: 1 }
      });
    });

    it("should NEVER fallback to company 1 for sensitive keys like userApiToken", async () => {
      // Tenant 2 has no userApiToken
      (Setting.findOne as jest.Mock).mockResolvedValueOnce(null);

      await expect(CheckSettings("userApiToken", 2)).rejects.toMatchObject({
        message: "ERR_NO_SETTING_FOUND",
        statusCode: 404
      });

      // Should only query tenant 2, never query company 1 fallback
      expect(Setting.findOne).toHaveBeenCalledTimes(1);
      expect(Setting.findOne).toHaveBeenCalledWith({
        where: { key: "userApiToken", companyId: 2 }
      });
    });

    it("should ensure ALLOWED_GLOBAL_FALLBACK_KEYS only contains safe, non-sensitive keys", () => {
      expect(ALLOWED_GLOBAL_FALLBACK_KEYS).not.toContain("userApiToken");
      expect(ALLOWED_GLOBAL_FALLBACK_KEYS).not.toContain("jwtSecret");
      expect(ALLOWED_GLOBAL_FALLBACK_KEYS).not.toContain("apiSecret");
      expect(ALLOWED_GLOBAL_FALLBACK_KEYS).toContain("userCreation");
      expect(ALLOWED_GLOBAL_FALLBACK_KEYS).toContain("CheckMsgIsGroup");
    });
  });

  describe("DeleteCompanyService Safeguards", () => {
    it("should prevent deletion of default company (id: 1)", async () => {
      await expect(
        DeleteCompanyService({ companyId: 1, confirmCompanyName: "Empresa Padrão" })
      ).rejects.toMatchObject({
        message: expect.stringContaining("ERR_CANNOT_DELETE_DEFAULT_COMPANY"),
        statusCode: 400
      });

      expect(Company.findByPk).not.toHaveBeenCalled();
    });

    it("should throw 404 if company does not exist", async () => {
      (Company.findByPk as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        DeleteCompanyService({ companyId: 99, confirmCompanyName: "NonExistent" })
      ).rejects.toMatchObject({
        message: "ERR_NO_COMPANY_FOUND",
        statusCode: 404
      });
    });

    it("should require exact company name confirmation to prevent accidental deletion", async () => {
      const mockCompany = {
        id: 5,
        name: "Acme Corp",
        destroy: jest.fn()
      };
      (Company.findByPk as jest.Mock).mockResolvedValueOnce(mockCompany);

      await expect(
        DeleteCompanyService({ companyId: 5, confirmCompanyName: "Wrong Name" })
      ).rejects.toMatchObject({
        message: expect.stringContaining("ERR_COMPANY_DELETE_CONFIRMATION_REQUIRED"),
        statusCode: 400
      });

      expect(mockCompany.destroy).not.toHaveBeenCalled();
      expect(CreateAuditLogService).not.toHaveBeenCalled();
    });

    it("should delete company and record audit log when confirmation matches exactly", async () => {
      const destroyMock = jest.fn().mockResolvedValue(true);
      const mockCompany = {
        id: 5,
        name: "Acme Corp",
        users: [{ id: 1 }],
        tickets: [],
        contacts: [],
        destroy: destroyMock
      };
      (Company.findByPk as jest.Mock).mockResolvedValueOnce(mockCompany);

      await DeleteCompanyService({
        companyId: 5,
        confirmCompanyName: "Acme Corp",
        actorUserId: 1
      });

      expect(CreateAuditLogService).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 5,
          userId: 1,
          action: "COMPANY_DELETED",
          entity: "Company",
          entityId: 5,
          details: expect.objectContaining({
            deletedCompanyName: "Acme Corp"
          })
        })
      );
      expect(destroyMock).toHaveBeenCalled();
    });
  });

  describe("CreateCompanyService Tenant Initialization", () => {
    it("should reject creation if company name is empty or missing", async () => {
      await expect(CreateCompanyService({ name: "" })).rejects.toMatchObject({
        statusCode: 400
      });
    });

    it("should create company and seed isolated settings with unique api token", async () => {
      const mockCreatedCompany = {
        id: 10,
        name: "Nova Empresa",
        plan: "pro",
        status: true
      };
      (Company.create as jest.Mock).mockResolvedValueOnce(mockCreatedCompany);
      (Setting.create as jest.Mock).mockResolvedValue({});

      const company = await CreateCompanyService({
        name: "Nova Empresa",
        plan: "pro"
      });

      expect(Company.create).toHaveBeenCalledWith({
        name: "Nova Empresa",
        plan: "pro",
        status: true
      });
      expect(Setting.create).toHaveBeenCalledWith({
        companyId: 10,
        key: "userCreation",
        value: "enabled"
      });
      expect(Setting.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 10,
          key: "userApiToken",
          value: expect.any(String)
        })
      );
      expect(company).toEqual(mockCreatedCompany);
    });
  });

  describe("DeleteUserService SuperAdmin Safeguards", () => {
    it("should prevent non-superadmin from deleting a SuperAdmin user", async () => {
      const mockSuperAdminUser = {
        id: 99,
        isSuperAdmin: true,
        destroy: jest.fn()
      };
      (User.findOne as jest.Mock).mockResolvedValueOnce(mockSuperAdminUser);

      await expect(
        DeleteUserService(99, 1, false)
      ).rejects.toMatchObject({
        message: expect.stringContaining("ERR_CANNOT_DELETE_SUPERADMIN"),
        statusCode: 403
      });

      expect(mockSuperAdminUser.destroy).not.toHaveBeenCalled();
    });

    it("should allow a SuperAdmin actor to delete another SuperAdmin user", async () => {
      const destroyMock = jest.fn().mockResolvedValue(true);
      const mockSuperAdminUser = {
        id: 99,
        isSuperAdmin: true,
        $get: jest.fn().mockResolvedValue([]),
        destroy: destroyMock
      };
      (User.findOne as jest.Mock).mockResolvedValueOnce(mockSuperAdminUser);

      await DeleteUserService(99, 1, true);

      expect(destroyMock).toHaveBeenCalled();
    });

    it("should allow deleting regular users without superadmin flag", async () => {
      const destroyMock = jest.fn().mockResolvedValue(true);
      const mockRegularUser = {
        id: 88,
        isSuperAdmin: false,
        $get: jest.fn().mockResolvedValue([]),
        destroy: destroyMock
      };
      (User.findOne as jest.Mock).mockResolvedValueOnce(mockRegularUser);

      await DeleteUserService(88, 1, false);

      expect(destroyMock).toHaveBeenCalled();
    });
  });
});
