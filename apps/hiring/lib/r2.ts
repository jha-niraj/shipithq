import "server-only"
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

/*
 * Private R2 storage for the hiring app (plan/hiring-app HA-13): the same bucket
 * and credentials as the student app. Objects here are never public; a reader
 * gets a signed URL that lasts minutes.
 */

const BUCKET = () => process.env.R2_BUCKET_NAME || "user-documents"

function client() {
    return new S3Client({
        region: "auto",
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
    })
}

/** Whether R2 is set up (not merely present: a copied placeholder doesn't count). */
export function r2Configured(): boolean {
    const ok = (v: string | undefined) => Boolean(v?.trim()) && !/your|here|xxx|placeholder|change[_-]?me|example|<|>/i.test(v!)
    return ok(process.env.R2_ACCOUNT_ID) && ok(process.env.R2_ACCESS_KEY_ID) && ok(process.env.R2_SECRET_ACCESS_KEY)
}

export async function putObject(key: string, body: Uint8Array, contentType: string): Promise<void> {
    await client().send(new PutObjectCommand({ Bucket: BUCKET(), Key: key, Body: body, ContentType: contentType }))
}

export async function deleteObject(key: string): Promise<void> {
    await client().send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key }))
}

/** A short-lived link to read one object; ten minutes by default. */
export async function signedUrl(key: string, expiresIn = 600): Promise<string> {
    return getSignedUrl(client(), new GetObjectCommand({ Bucket: BUCKET(), Key: key }), { expiresIn })
}

/**
 * Public objects (plan/hiring-ui HU-11): company covers, logos and Life photos, under
 * the one prefix apps/main's /api/media will serve (the same bucket holds resumes, so
 * nothing outside it is ever public).
 */
export const PUBLIC_PREFIX = "avatars/"

/** A stable URL for a public object: the bucket domain when set, else apps/main's /api/media. */
export function publicUrl(key: string): string {
    const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "")
    if (base) return `${base}/${key}`
    const main = (process.env.NEXT_PUBLIC_MAIN_URL || "https://app.shipithq.com").replace(/\/$/, "")
    return `${main}/api/media/${key}`
}
