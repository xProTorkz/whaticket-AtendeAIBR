import rules from "../../rules";

const check = (role, action, data) => {
	// SuperAdmin bypass
	if (role === "superadmin" || data?.isSuperAdmin) {
		return true;
	}

	// Normaliza perfil legado "user" para "agent"
	const normalizedRole = role === "user" ? "agent" : role;

	const permissions = rules[normalizedRole];
	if (!permissions) {
		// role is not present in the rules
		return false;
	}

	const staticPermissions = permissions.static;

	if (staticPermissions && staticPermissions.includes(action)) {
		return true;
	}

	const dynamicPermissions = permissions.dynamic;

	if (dynamicPermissions) {
		const permissionCondition = dynamicPermissions[action];
		if (!permissionCondition) {
			return false;
		}

		return permissionCondition(data);
	}
	return false;
};

const Can = ({ role, perform, data, yes, no }) =>
	check(role, perform, data) ? yes() : no();

Can.defaultProps = {
	yes: () => null,
	no: () => null,
};

export { Can, check };
