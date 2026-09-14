import { Request, Response, NextFunction } from "express";
import AppError from "../../../errors/AppError";
import isRole, {
  isAdmin,
  isManagerOrAdmin,
  isAgentOrAbove,
  isCollaboratorOrAbove,
  Role
} from "../../../middleware/isRole";

describe("RBAC Middleware", () => {
  const mockRes = {} as Response;
  const mockNext = jest.fn() as NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createReq = (
    profile?: Role | string,
    isSuperAdmin?: boolean,
    companyId = 1
  ): Request => {
    return {
      user: profile
        ? { id: "1", profile, companyId, isSuperAdmin: !!isSuperAdmin }
        : undefined
    } as unknown as Request;
  };

  describe("Authentication Check", () => {
    it("should throw 401 ERR_SESSION_EXPIRED when req.user is undefined", () => {
      const req = createReq();
      const middleware = isRole(["admin"]);

      expect(() => middleware(req, mockRes, mockNext)).toThrow(AppError);
      try {
        middleware(req, mockRes, mockNext);
      } catch (err: any) {
        expect(err.statusCode).toBe(401);
        expect(err.message).toBe("ERR_SESSION_EXPIRED");
      }
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("Role: visitor", () => {
    it("should allow visitor on visitor-accessible routes", () => {
      const req = createReq("visitor");
      const middleware = isRole(["visitor", "collaborator", "agent", "manager", "admin"]);

      middleware(req, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should deny visitor with 403 on agent-or-above routes", () => {
      const req = createReq("visitor");
      expect(() => isAgentOrAbove(req, mockRes, mockNext)).toThrow(AppError);
      try {
        isAgentOrAbove(req, mockRes, mockNext);
      } catch (err: any) {
        expect(err.statusCode).toBe(403);
        expect(err.message).toBe("ERR_NO_PERMISSION");
      }
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should deny visitor with 403 on admin-only routes", () => {
      const req = createReq("visitor");
      expect(() => isAdmin(req, mockRes, mockNext)).toThrow(AppError);
      try {
        isAdmin(req, mockRes, mockNext);
      } catch (err: any) {
        expect(err.statusCode).toBe(403);
        expect(err.message).toBe("ERR_NO_PERMISSION");
      }
    });
  });

  describe("Role: collaborator", () => {
    it("should allow collaborator on collaborator-or-above routes", () => {
      const req = createReq("collaborator");
      isCollaboratorOrAbove(req, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should deny collaborator with 403 on agent-or-above operations", () => {
      const req = createReq("collaborator");
      expect(() => isAgentOrAbove(req, mockRes, mockNext)).toThrow(AppError);
      try {
        isAgentOrAbove(req, mockRes, mockNext);
      } catch (err: any) {
        expect(err.statusCode).toBe(403);
        expect(err.message).toBe("ERR_NO_PERMISSION");
      }
    });
  });

  describe("Role: agent", () => {
    it("should allow agent on agent-or-above routes", () => {
      const req = createReq("agent");
      isAgentOrAbove(req, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should deny agent with 403 on manager-or-admin routes", () => {
      const req = createReq("agent");
      expect(() => isManagerOrAdmin(req, mockRes, mockNext)).toThrow(AppError);
      try {
        isManagerOrAdmin(req, mockRes, mockNext);
      } catch (err: any) {
        expect(err.statusCode).toBe(403);
        expect(err.message).toBe("ERR_NO_PERMISSION");
      }
    });

    it("should deny agent with 403 on admin-only routes", () => {
      const req = createReq("agent");
      expect(() => isAdmin(req, mockRes, mockNext)).toThrow(AppError);
      try {
        isAdmin(req, mockRes, mockNext);
      } catch (err: any) {
        expect(err.statusCode).toBe(403);
        expect(err.message).toBe("ERR_NO_PERMISSION");
      }
    });
  });

  describe("Role: manager", () => {
    it("should allow manager on manager-or-admin routes", () => {
      const req = createReq("manager");
      isManagerOrAdmin(req, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should allow manager on agent-or-above routes", () => {
      const req = createReq("manager");
      isAgentOrAbove(req, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it("should deny manager with 403 on admin-only routes", () => {
      const req = createReq("manager");
      expect(() => isAdmin(req, mockRes, mockNext)).toThrow(AppError);
      try {
        isAdmin(req, mockRes, mockNext);
      } catch (err: any) {
        expect(err.statusCode).toBe(403);
        expect(err.message).toBe("ERR_NO_PERMISSION");
      }
    });
  });

  describe("Role: admin", () => {
    it("should allow admin on all role tiers within tenant", () => {
      const req = createReq("admin");

      isAdmin(req, mockRes, mockNext);
      isManagerOrAdmin(req, mockRes, mockNext);
      isAgentOrAbove(req, mockRes, mockNext);
      isCollaboratorOrAbove(req, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(4);
    });
  });

  describe("Role: isSuperAdmin", () => {
    it("should bypass role restrictions regardless of user profile", () => {
      const req = createReq("visitor", true);

      isAdmin(req, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      isManagerOrAdmin(req, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(2);
    });
  });
});
