import { IRealmAccess } from './realm-access';
import { IResourceAccess } from './resource-access';

export interface IUserData {
    exp:                number;
    iat:                number;
    jti:                string;
    iss:                string;
    sub:                string;
    typ:                string;
    azp:                string;
    session_state:      string;
    acr:                string;
    "allowed-origins":  string[];
    realm_access:       IRealmAccess;
    resource_access:    IResourceAccess;
    scope:              string;
    email_verified:     boolean;
    name:               string;
    preferred_username: string;
    given_name:         string;
    family_name:        string;
    email:              string;
  }
  