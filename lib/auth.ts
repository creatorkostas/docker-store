import { NextAuthOptions } from "next-auth"
import GithubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import AuthentikProvider from "next-auth/providers/authentik"

const providers = []

if (process.env.AUTHENTIK_ID && process.env.AUTHENTIK_SECRET && process.env.AUTHENTIK_ISSUER) {
  providers.push(
    AuthentikProvider({
      name: "Authentik",
      clientId: process.env.AUTHENTIK_ID,
      clientSecret: process.env.AUTHENTIK_SECRET,
      issuer: process.env.AUTHENTIK_ISSUER,
    })
  )
}

if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GithubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    })
  )
}

if (process.env.GOOGLE_ID && process.env.GOOGLE_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    })
  )
}

if (process.env.CUSTOM_PROVIDER_ID && process.env.CUSTOM_PROVIDER_SECRET) {
  const customProvider: any = {
    id: "custom",
    name: process.env.CUSTOM_PROVIDER_NAME || "Custom Login",
    type: "oauth",
    clientId: process.env.CUSTOM_PROVIDER_ID,
    clientSecret: process.env.CUSTOM_PROVIDER_SECRET,
    authorization: { params: { scope: "openid email profile" } },
    idToken: true,
    checks: ["pkce", "state"],
    profile(profile: any) {
      return {
        id: profile.sub || profile.id,
        name: profile.name || profile.preferred_username || profile.login,
        email: profile.email,
        image: profile.picture || profile.avatar_url,
      }
    },
  }

  if (process.env.CUSTOM_PROVIDER_ISSUER) {
    customProvider.wellKnown = `${process.env.CUSTOM_PROVIDER_ISSUER}/.well-known/openid-configuration`
  } else if (
    process.env.CUSTOM_PROVIDER_AUTH_URL &&
    process.env.CUSTOM_PROVIDER_TOKEN_URL &&
    process.env.CUSTOM_PROVIDER_USERINFO_URL
  ) {
    customProvider.authorization = process.env.CUSTOM_PROVIDER_AUTH_URL
    customProvider.token = process.env.CUSTOM_PROVIDER_TOKEN_URL
    customProvider.userinfo = process.env.CUSTOM_PROVIDER_USERINFO_URL
  }

  if (customProvider.wellKnown || customProvider.userinfo) {
    providers.push(customProvider)
  }
}

if (process.env.DEBUG === "true" && process.env.NODE_ENV === "development") {
  console.warn("⚠️ Debug Login Provider Enabled! Do not use in production.");
  providers.push(
    CredentialsProvider({
      name: "Debug Login",
      credentials: {},
      async authorize(credentials, req) {
        return { id: "1", name: "Debug User", email: "debug@example.com" }
      },
    })
  )
}

if (!process.env.NEXTAUTH_SECRET && process.env.NODE_ENV === "production") {
    console.error("❌ NEXTAUTH_SECRET is not set in production. Authentication is insecure.");
}

export const authOptions: NextAuthOptions = {
  providers,
  secret: process.env.NEXTAUTH_SECRET,
}