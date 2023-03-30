import { matrixTestConfig } from './matrixTestUtilServer';

export const dummyUserName = 'dummy';
export const dummyUserPass = 'dumdum';
export const HOMESERVER_NAME = 'localhost:8888';
export const { baseUrl } = matrixTestConfig;
export const userLoginInfo = {
  userId: dummyUserName,
  password: dummyUserPass,
  baseUrl,
};
export const userIdWithServer = `@${dummyUserName}:${HOMESERVER_NAME}`;

export const spaceAlias = `#eweser-db_space______~${userIdWithServer}`;
export const registryAlias = `#eweser-db_registry_____~${userIdWithServer}`;
