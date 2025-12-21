import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(req: any, res: any) {
  return await NextAuth(req, res, authOptions)
}

export async function POST(req: any, res: any) {
  return await NextAuth(req, res, authOptions)
}
