// Context type definition for Hono middleware
export interface UserContext {
  sub: string;
  tenantId: string;
  email?: string;
  name?: string;
}

export type AppContext = {
  Variables: {
    user: UserContext;
  };
};
