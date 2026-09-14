import React, { useContext } from "react";
import { Route as RouterRoute, Redirect } from "react-router-dom";

import { AuthContext } from "../context/Auth/AuthContext";
import BackdropLoading from "../components/BackdropLoading";
import { check } from "../components/Can";
import rules from "../rules";

const Route = ({
  component: Component,
  isPrivate = false,
  allowedRoles,
  perform,
  ...rest
}) => {
  const { isAuth, loading, user } = useContext(AuthContext);

  if (!isAuth && isPrivate) {
    return (
      <>
        {loading && <BackdropLoading />}
        <Redirect to={{ pathname: "/login", state: { from: rest.location } }} />
      </>
    );
  }

  if (isAuth && !isPrivate) {
    return (
      <>
        {loading && <BackdropLoading />}
        <Redirect to={{ pathname: "/", state: { from: rest.location } }} />
      </>
    );
  }

  if (isAuth && isPrivate) {
    const isSuper = user?.isSuperAdmin === true || user?.profile === "superadmin";

    if (!isSuper) {
      if (allowedRoles && Array.isArray(allowedRoles)) {
        const currentRole = user?.profile === "user" ? "agent" : user?.profile;
        const normalizedAllowed = allowedRoles.map(r => (r === "user" ? "agent" : r));
        if (!normalizedAllowed.includes(currentRole)) {
          return (
            <>
              {loading && <BackdropLoading />}
              <Redirect to={{ pathname: "/tickets", state: { from: rest.location } }} />
            </>
          );
        }
      }

      if (perform && !check(rules, user?.profile, perform, null, isSuper)) {
        return (
          <>
            {loading && <BackdropLoading />}
            <Redirect to={{ pathname: "/tickets", state: { from: rest.location } }} />
          </>
        );
      }
    }
  }

  return (
    <>
      {loading && <BackdropLoading />}
      <RouterRoute {...rest} component={Component} />
    </>
  );
};

export default Route;
