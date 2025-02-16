"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateLoginUrl = void 0;
const shared_1 = require("@eweser/shared");
const generateLoginUrl = (db) => 
/**
 *
 * @param redirect default uses window.location
 * @param appDomain default uses window.location.hostname
 * @param collections default 'all', which collections your app would like to have write access to
 * @returns a string you can use to redirect the user to the auth server's login page
 */
(options) => {
    const url = new URL(db.authServer);
    const params = (0, shared_1.loginOptionsToQueryParams)({
        redirect: options?.redirect || window.location.href.split('?')[0],
        domain: options?.domain || window.location.host,
        collections: options?.collections ?? ['all'],
        name: options.name,
    });
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
    });
    return url.toString();
};
exports.generateLoginUrl = generateLoginUrl;
//# sourceMappingURL=generateLoginUrl.js.map