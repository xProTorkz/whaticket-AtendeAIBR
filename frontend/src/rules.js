const rules = {
	visitor: {
		static: [
			"drawer-tickets:view",
		],
	},

	collaborator: {
		static: [
			"drawer-tickets:view",
			"drawer-contacts:view",
		],
	},

	agent: {
		static: [
			"drawer-tickets:view",
			"drawer-contacts:view",
			"drawer-quick-answers:view",
			"ticket-options:transferWhatsapp",
		],
	},

	// Alias legado para compatibilidade com registros existentes
	user: {
		static: [
			"drawer-tickets:view",
			"drawer-contacts:view",
			"drawer-quick-answers:view",
			"ticket-options:transferWhatsapp",
		],
	},

	supervisor: {
		static: [
			"dashboard:view",
			"drawer-tickets:view",
			"drawer-contacts:view",
			"drawer-quick-answers:view",
			"drawer-manager-items:view",
			"tickets-manager:showall",
			"user-modal:editQueues",
			"ticket-options:transferWhatsapp",
			"users-page:editUser",
		],
	},

	manager: {
		static: [
			"dashboard:view",
			"drawer-tickets:view",
			"drawer-contacts:view",
			"drawer-quick-answers:view",
			"drawer-manager-items:view",
			"tickets-manager:showall",
			"user-modal:editQueues",
			"ticket-options:transferWhatsapp",
			"users-page:editUser",
		],
	},

	admin: {
		static: [
			"dashboard:view",
			"drawer-tickets:view",
			"drawer-contacts:view",
			"drawer-quick-answers:view",
			"drawer-admin-items:view",
			"drawer-manager-items:view",
			"drawer-connections:view",
			"drawer-settings:view",
			"tickets-manager:showall",
			"user-modal:editProfile",
			"user-modal:editQueues",
			"ticket-options:deleteTicket",
			"ticket-options:transferWhatsapp",
			"contacts-page:deleteContact",
			"settings:edit",
			"connections:manage",
			"connections-page:actionButtons",
			"connections-page:addConnection",
			"connections-page:editOrDeleteConnection",
			"users-page:addUser",
			"users-page:editUser",
			"users-page:deleteUser",
		],
	},

	superadmin: {
		static: [
			"dashboard:view",
			"drawer-tickets:view",
			"drawer-contacts:view",
			"drawer-quick-answers:view",
			"drawer-admin-items:view",
			"drawer-manager-items:view",
			"drawer-connections:view",
			"drawer-settings:view",
			"tickets-manager:showall",
			"user-modal:editProfile",
			"user-modal:editQueues",
			"ticket-options:deleteTicket",
			"ticket-options:transferWhatsapp",
			"contacts-page:deleteContact",
			"settings:edit",
			"connections:manage",
			"connections-page:actionButtons",
			"connections-page:addConnection",
			"connections-page:editOrDeleteConnection",
			"companies:manage",
			"users-page:addUser",
			"users-page:editUser",
			"users-page:deleteUser",
		],
	},
};

export default rules;
