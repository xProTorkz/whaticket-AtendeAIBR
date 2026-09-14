import React from "react";
import { BrowserRouter, Switch } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import LoggedInLayout from "../layout";
import Dashboard from "../pages/Dashboard/";
import Tickets from "../pages/Tickets/";
import Signup from "../pages/Signup/";
import Login from "../pages/Login/";
import Connections from "../pages/Connections/";
import Settings from "../pages/Settings/";
import Users from "../pages/Users";
import Contacts from "../pages/Contacts/";
import QuickAnswers from "../pages/QuickAnswers/";
import Queues from "../pages/Queues/";
import InternalChat from "../pages/InternalChat/";
import { AuthProvider } from "../context/Auth/AuthContext";
import { WhatsAppsProvider } from "../context/WhatsApp/WhatsAppsContext";
import { ThemeProvider } from "../context/DarkMode";
import Route from "./Route";

const Routes = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <Switch>
            <Route exact path="/login" component={Login} />
            <Route exact path="/signup" component={Signup} />
            <WhatsAppsProvider>
              <LoggedInLayout>
                <Route exact path="/" component={Dashboard} isPrivate />
                <Route exact path="/tickets/:ticketId?" component={Tickets} isPrivate />
                <Route exact path="/internal-chat" component={InternalChat} isPrivate allowedRoles={["visitor", "collaborator", "agent", "user", "manager", "admin", "superadmin"]} />
                <Route exact path="/connections" component={Connections} isPrivate allowedRoles={["admin", "superadmin"]} />
                <Route exact path="/contacts" component={Contacts} isPrivate allowedRoles={["collaborator", "agent", "user", "manager", "admin", "superadmin"]} />
                <Route exact path="/users" component={Users} isPrivate allowedRoles={["manager", "admin", "superadmin"]} />
                <Route exact path="/quickAnswers" component={QuickAnswers} isPrivate allowedRoles={["agent", "user", "manager", "admin", "superadmin"]} />
                <Route exact path="/Settings" component={Settings} isPrivate allowedRoles={["admin", "superadmin"]} />
                <Route exact path="/settings" component={Settings} isPrivate allowedRoles={["admin", "superadmin"]} />
                <Route exact path="/Queues" component={Queues} isPrivate allowedRoles={["manager", "admin", "superadmin"]} />
                <Route exact path="/queues" component={Queues} isPrivate allowedRoles={["manager", "admin", "superadmin"]} />
              </LoggedInLayout>
            </WhatsAppsProvider>
          </Switch>
          <ToastContainer autoClose={3000} />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default Routes;
