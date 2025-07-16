import { LogLevel } from '@azure/msal-browser'

export const msalConfig = {
  auth: {
    clientId: "5a63d647-5bbd-492f-8926-d1be9295a80e",
    authority: "https://login.microsoftonline.com/ff189d9f-fc2d-4796-ac63-0d34f35a02d1",
    redirectUri: "http://localhost:5173",
    postLogoutRedirectUri: "http://localhost:5173"
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return
        switch (level) {
          case LogLevel.Error:
            console.error('[MSAL Error]:', message)
            return
          case LogLevel.Info:
            console.info('[MSAL Info]:', message)
            return
          case LogLevel.Warning:
            console.warn('[MSAL Warning]:', message)
            return
        }
      },
      piiLoggingEnabled: false
    }
  }
}

export const loginRequest = {
  scopes: ["User.Read"],
  prompt: "select_account"
}
