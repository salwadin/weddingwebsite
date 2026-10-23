"use server";

import { can } from "../access";
import { allows, requireOrg } from "../dashboard";
import { isDemoWedding } from "../demo";
import { signedUpload, type UploadPurpose } from "../uploads";

/**
 * Step one of an image upload (components/photo-upload.tsx): checks this organizer may
 * change what the image is for, then returns a one-time URL the browser uploads to directly.
 * The form then saves the returned path, and the save action checks it again.
 */
export async function startUpload(purpose: UploadPurpose, contentType: string, size: number, eventId?: string): Promise<{ path: string; url: string } | { error: string }> {
  const area = purpose === "invitation" ? "invitations" : "website";
  const o = await requireOrg(area, "edit");
  if (!can(o.scope, area, "edit")) return { error: "You don't have permission to change this." };
  // The shared public demo can't fill anyone's storage with uploads.
  // (The end-to-end tests upload through the demo wedding on purpose: QUBOOL_DEMO_UPLOADS=on, tests only.)
  if (isDemoWedding(o.ctx.wedding.id) && process.env.QUBOOL_DEMO_UPLOADS !== "on") return { error: "Uploads are turned off in the demo." };
  if (purpose === "invitation") {
    if (!allows(o, "invitation_designer")) return { error: "Uploading your own invitation is part of Plus and Signature." };
    if (!eventId || !o.events.some((e) => e.id === eventId)) return { error: "That event isn't yours to edit." };
  }
  return signedUpload(purpose, o.ctx.wedding.id, contentType, size, eventId);
}
