/**
 * Re-export of useAuth from AuthProvider context for backward compatibility.
 * All consumers should resolve to the single shared instance via the provider.
 */
export {
  useAuth,
  AuthProvider,
  type AuthHookReturn,
  type AuthState,
} from '../context/AuthProvider';
