/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as audit from "../audit.js";
import type * as http from "../http.js";
import type * as rbac from "../rbac.js";
import type * as responses from "../responses.js";
import type * as reviews from "../reviews.js";
import type * as teams from "../teams.js";
import type * as templates from "../templates.js";
import type * as users from "../users.js";
import type * as validation from "../validation.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  audit: typeof audit;
  http: typeof http;
  rbac: typeof rbac;
  responses: typeof responses;
  reviews: typeof reviews;
  teams: typeof teams;
  templates: typeof templates;
  users: typeof users;
  validation: typeof validation;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
