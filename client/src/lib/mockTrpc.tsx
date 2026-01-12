import React, { createContext, useContext } from 'react';

// Mock tRPC context for static deployment
const MockTrpcContext = createContext<any>(null);

// Create a mock that returns empty/default values for all queries
const createMockProxy = (): any => {
  return new Proxy({}, {
    get: (target, prop) => {
      if (prop === 'useQuery') {
        return () => ({
          data: null,
          isLoading: false,
          error: null,
          refetch: () => Promise.resolve({ data: null }),
        });
      }
      if (prop === 'useMutation') {
        return () => ({
          mutate: () => {},
          mutateAsync: () => Promise.resolve(null),
          isPending: false,
          error: null,
        });
      }
      if (prop === 'useUtils') {
        return () => createMockUtilsProxy();
      }
      // Return another proxy for nested access
      return createMockProxy();
    },
  });
};

const createMockUtilsProxy = (): any => {
  return new Proxy({}, {
    get: () => ({
      setData: () => {},
      invalidate: () => Promise.resolve(),
    }),
  });
};

export const mockTrpc = createMockProxy();

export const MockTrpcProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <MockTrpcContext.Provider value={mockTrpc}>
      {children}
    </MockTrpcContext.Provider>
  );
};

export const useMockTrpc = () => useContext(MockTrpcContext);
