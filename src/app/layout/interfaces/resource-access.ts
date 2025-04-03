import { IRealmAccess } from './realm-access';

export interface IResourceAccess {
    [key: string]: IRealmAccess[];
}
