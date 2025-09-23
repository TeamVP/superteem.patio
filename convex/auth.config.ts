// Convex auth configuration placeholder.
// In a real Convex project, you would configure providers here. For the DEV shim
// we conceptually allow tokens with issuer dev://local signed via HS256 with secret VITE_DEV_JWT_SECRET.
// Production build tools should exclude the DEV provider (guarded by VITE_DEV_AUTH at runtime on client side).

// No production auth providers configured yet. Clerk integration handled via http action.
export default {
  providers: [],
};
